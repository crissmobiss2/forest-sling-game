/* ============================================================================
   FOREST SLING  —  web edition
   A physics slingshot arcade game. Canvas 2D + WebAudio, no dependencies.
   ============================================================================ */
"use strict";
(function () {

// ------------------------------------------------------------------ utils ---
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const now = () => performance.now() / 1000;
function fmt(n){ return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}

// ------------------------------------------------------------------ data ----
const RARITY = { common:"#b7c2cc", uncommon:"#5fd06a", rare:"#41a6ff", epic:"#c264ff", legendary:"#ffb638", mythic:"#ff4d7d" };

const BALLS = [
  { id:"wood",      name:"Wood Ball",      rar:"common",    r:14, mass:0.9, dmg:13, bounce:.42, spd:1.05, effect:"none", ep:0,  color:"#caa06a", accent:"#efd8ad", price:0,    desc:"A trusty starter. Reliable all-rounder." },
  { id:"stone",     name:"Stone Ball",     rar:"common",    r:16, mass:1.5, dmg:16, bounce:.3,  spd:0.98, effect:"heavy", ep:0, color:"#9a9088", accent:"#cfc8c0", price:150,  desc:"Heavy hitter. Great against tough trees." },
  { id:"iron",      name:"Iron Ball",      rar:"uncommon",  r:17, mass:2.1, dmg:26, bounce:.24, spd:0.95, effect:"heavy", ep:0, color:"#7d848c", accent:"#c2ccd6", price:600,  desc:"Dense iron. Smashes through armor." },
  { id:"fire",      name:"Fire Ball",      rar:"rare",      r:15, mass:1.2, dmg:22, bounce:.3,  spd:1.08, effect:"fire",  ep:60, color:"#ff5a2c", accent:"#ffd06a", price:1600, desc:"Bursts into flame on impact." },
  { id:"ice",       name:"Ice Ball",       rar:"rare",      r:15, mass:1.4, dmg:22, bounce:.5,  spd:1.02, effect:"none",  ep:0, color:"#6fd4ff", accent:"#d8f7ff", price:1600, desc:"Bouncy and cold — extra ricochets." },
  { id:"bomb",      name:"Bomb Ball",      rar:"epic",      r:18, mass:1.7, dmg:20, bounce:.18, spd:0.95, effect:"explode", ep:150, color:"#3a3a42", accent:"#ff7a2e", price:4000, desc:"Massive area explosion on impact." },
  { id:"lightning", name:"Lightning Ball", rar:"epic",      r:14, mass:1.0, dmg:26, bounce:.32, spd:1.2,  effect:"chain", ep:4, color:"#ffe14d", accent:"#fff7c0", price:6500, desc:"Chains lightning between nearby trees." },
  { id:"diamond",   name:"Diamond Ball",   rar:"legendary", r:16, mass:2.0, dmg:44, bounce:.5,  spd:1.15, effect:"crit",  ep:0, color:"#bff0ff", accent:"#ffffff", price:20000, desc:"Brilliant power with high critical hits." },
];
const ballById = id => BALLS.find(b => b.id === id) || BALLS[0];

const WORLDS = [
  { name:"Green Forest",  sky:["#6fb7ff","#cfe9ff"], ground:"#4f8f39", groundD:"#3c6f2b", hill:"#3f6f4c", trunk:"#6b4a2b", leaf:"#57a84a", leaf2:"#3f8f3a", boss:"#4a6a30", night:false, root:57, scale:"major" },
  { name:"Autumn Forest", sky:["#e8a24a","#ffd9a0"], ground:"#8a5a2a", groundD:"#6f4420", hill:"#7a5230", trunk:"#5c3f22", leaf:"#e08a2a", leaf2:"#c05a1a", boss:"#7a4420", night:false, root:55, scale:"minor" },
  { name:"Snow Forest",   sky:["#bcd8ef","#eef7ff"], ground:"#d6e3ec", groundD:"#b3c6d4", hill:"#bcd0dd", trunk:"#50381f", leaf:"#2f7a4a", leaf2:"#bfe9ff", boss:"#7a95a8", night:false, root:60, scale:"minor" },
  { name:"Desert Forest", sky:["#f2c25a","#ffe6a8"], ground:"#d8b06a", groundD:"#b89a4c", hill:"#c8a85c", trunk:"#6b4a2b", leaf:"#8fae4a", leaf2:"#6a8a2f", boss:"#c09a4a", night:false, root:53, scale:"phrygian" },
  { name:"Crystal Forest",sky:["#7fd6ff","#d6f7ff"], ground:"#5a7a8a", groundD:"#445e6b", hill:"#6fa6bd", trunk:"#4a6b7a", leaf:"#7fe6ff", leaf2:"#59b7d6", boss:"#5a9ab0", night:false, root:62, scale:"lydian" },
  { name:"Volcano Forest",sky:["#6a2a24","#d85a3a"], ground:"#3a2320", groundD:"#281512", hill:"#5a2a22", trunk:"#3a2320", leaf:"#ff6a3a", leaf2:"#c0361f", boss:"#a03020", night:true,  root:51, scale:"phrygian" },
  { name:"Thunder Forest",sky:["#3a3f5a","#6a6f9a"], ground:"#2f3a4a", groundD:"#232c38", hill:"#3a4560", trunk:"#55606b", leaf:"#7a8894", leaf2:"#b477ff", boss:"#5a5f8a", night:true,  root:59, scale:"minor" },
  { name:"Sky Forest",    sky:["#8fb7ff","#e0eeff"], ground:"#bcd0e6", groundD:"#9fb6d0", hill:"#a6c0e0", trunk:"#6b5a4a", leaf:"#b477ff", leaf2:"#7fe6ff", boss:"#8aa6d0", night:false, root:64, scale:"lydian" },
  { name:"Dragon Forest", sky:["#2a1a2a","#6a2a4a"], ground:"#2a1a24", groundD:"#1a0f18", hill:"#40203a", trunk:"#3a2320", leaf:"#ff5a2c", leaf2:"#b04fd0", boss:"#8a2a4a", night:true,  root:49, scale:"phrygian" },
  { name:"Cosmic Forest", sky:["#140a2a","#3a1a5a"], ground:"#1a1030", groundD:"#0f0820", hill:"#2a1a4a", trunk:"#4a3a5a", leaf:"#d0a0ff", leaf2:"#ff7fd6", boss:"#7a4fd0", night:true,  root:45, scale:"minor" },
];
const worldIndex = lvl => clamp(Math.floor((lvl - 1) / 10), 0, 9);
const localLevel = lvl => ((lvl - 1) % 10) + 1;
const isBossLevel = lvl => lvl % 10 === 0;
const MAX_LEVEL = 100;
const MAX_POWER = 50;
const powerCost = p => Math.round(120 * Math.pow(1.16, p - 1));
const launchPowerFactor = p => 1 + (p - 1) * 0.05;   // affects speed
const damageFactor = p => 1 + (p - 1) * 0.045;

const ACHS = [
  { id:"trees100", name:"Lumberjack", metric:"trees", target:100, reward:400, icon:"🌲" },
  { id:"trees1000", name:"Deforester", metric:"trees", target:1000, reward:2000, icon:"🌳" },
  { id:"lvl25", name:"Adventurer", metric:"highest", target:25, reward:1500, icon:"🏁" },
  { id:"lvl50", name:"Trailblazer", metric:"highest", target:50, reward:4000, icon:"🏁" },
  { id:"lvl100", name:"Forest Legend", metric:"highest", target:100, reward:12000, icon:"👑" },
  { id:"boss5", name:"Giant Slayer", metric:"bosses", target:5, reward:3000, icon:"💀" },
  { id:"boss10", name:"Boss Master", metric:"bosses", target:10, reward:8000, icon:"💀" },
  { id:"combo15", name:"Combo King", metric:"bestcombo", target:15, reward:2000, icon:"🔥" },
  { id:"allballs", name:"Collector", metric:"balls", target:BALLS.length, reward:5000, icon:"⚫" },
  { id:"power50", name:"Fully Charged", metric:"power", target:50, reward:6000, icon:"🏹" },
];

// ------------------------------------------------------------------ save ----
const SAVE_KEY = "forestsling_save_v1";
let save;
function defaultSave() {
  return {
    coins: 0, highest: 1, power: 1,
    ownedBalls: ["wood"], ball: "wood",
    stars: {}, achs: [],
    stats: { trees: 0, bosses: 0, bestcombo: 0, shots: 0, levels: 0 },
    settings: { music: 0.5, sfx: 0.8, shake: true, damageNums: true },
  };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    save = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
    save.settings = Object.assign(defaultSave().settings, save.settings || {});
    save.stats = Object.assign(defaultSave().stats, save.stats || {});
  } catch (e) { save = defaultSave(); }
}
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }, 250);
}
function statMax(key, v) { if (v > (save.stats[key] || 0)) { save.stats[key] = v; persist(); checkAchievements(); } }
function statAdd(key, v) { save.stats[key] = (save.stats[key] || 0) + v; persist(); checkAchievements(); }
function addCoins(v) { save.coins = Math.max(0, save.coins + v); persist(); refreshHUD(); }

function checkAchievements() {
  for (const a of ACHS) {
    if (save.achs.includes(a.id)) continue;
    let cur = 0;
    if (a.metric === "trees") cur = save.stats.trees;
    else if (a.metric === "highest") cur = save.highest;
    else if (a.metric === "bosses") cur = save.stats.bosses;
    else if (a.metric === "bestcombo") cur = save.stats.bestcombo;
    else if (a.metric === "balls") cur = save.ownedBalls.length;
    else if (a.metric === "power") cur = save.power;
    if (cur >= a.target) {
      save.achs.push(a.id); save.coins += a.reward; persist();
      toast(`🏆 ${a.name}  +${fmt(a.reward)} 🪙`); Audio.sfx("achievement"); refreshHUD();
    }
  }
}

// ------------------------------------------------------------------ audio ---
const Audio = (function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicTimer = null, nextNote = 0, step = 0, curWorld = null, musicOn = false;
  const SCALES = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], phrygian:[0,1,3,5,7,8,10], lydian:[0,2,4,6,7,9,11] };
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      applyVolumes();
    } catch (e) { ctx = null; }
  }
  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = 0.9;
    musicGain.gain.value = save.settings.music;
    sfxGain.gain.value = save.settings.sfx;
  }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tone(freq, t0, dur, type, gain, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(dest || sfxGain);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, gain, filterFreq, dest) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterFreq || 4000;
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t0);
  }
  function sfx(name) {
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case "launch": tone(680, t, 0.12, "sawtooth", 0.25); noise(t, 0.05, 0.15, 3000); break;
      case "impact": noise(t, 0.06, 0.3, 2500); tone(160, t, 0.08, "sine", 0.25); break;
      case "impactHard": noise(t, 0.1, 0.4, 1800); tone(120, t, 0.12, "sine", 0.35); break;
      case "wood": noise(t, 0.16, 0.35, 2200); tone(240, t, 0.08, "square", 0.15); tone(180, t + 0.03, 0.08, "square", 0.12); break;
      case "stone": noise(t, 0.22, 0.4, 1400); tone(110, t, 0.15, "sine", 0.3); break;
      case "shatter": noise(t, 0.14, 0.3, 5000); for (let i = 0; i < 5; i++) tone(1400 - i * 150, t + i * 0.015, 0.1, "triangle", 0.1); break;
      case "explosion": noise(t, 0.5, 0.6, 1200); tone(90, t, 0.4, "sine", 0.4); tone(200, t, 0.2, "sawtooth", 0.2); break;
      case "coin": tone(midi(84), t, 0.08, "triangle", 0.22); tone(midi(91), t + 0.05, 0.12, "triangle", 0.24); break;
      case "gem": for (let i = 0; i < 3; i++) tone(midi(79 + i * 5), t + i * 0.05, 0.14, "sine", 0.2); break;
      case "chain": tone(900, t, 0.05, "sawtooth", 0.2); tone(600, t + 0.03, 0.06, "sawtooth", 0.15); break;
      case "click": tone(640, t, 0.05, "square", 0.16); break;
      case "purchase": [0,4,7].forEach((n,i) => tone(midi(72+n), t+i*0.05, 0.16, "triangle", 0.2)); break;
      case "achievement": [0,4,7,12].forEach((n,i) => tone(midi(72+n), t+i*0.07, 0.2, "square", 0.2)); break;
      case "bossHit": tone(300, t, 0.14, "square", 0.25); noise(t, 0.08, 0.2, 2000); break;
      case "bossDie": noise(t, 0.8, 0.6, 1000); for (let i = 0; i < 5; i++) tone(midi(60-i*3), t+i*0.1, 0.5, "sawtooth", 0.2); break;
      case "win": [0,4,7,12,16].forEach((n,i) => tone(midi(60+n), t+i*0.09, 0.3, "triangle", 0.24)); break;
      case "lose": [0,-3,-6,-9].forEach((n,i) => tone(midi(64+n), t+i*0.14, 0.4, "triangle", 0.22)); break;
      case "revive": [0,7,12].forEach((n,i)=>tone(midi(72+n),t+i*0.06,0.2,"sine",0.2)); break;
    }
  }
  function startMusic(world) {
    init(); if (!ctx) return;
    curWorld = world; musicOn = true;
    if (musicTimer) return;
    nextNote = ctx.currentTime + 0.1; step = 0;
    musicTimer = setInterval(schedule, 60);
  }
  function stopMusic() { musicOn = false; if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function schedule() {
    if (!ctx || !musicOn) return;
    const scale = SCALES[curWorld ? curWorld.scale : "major"] || SCALES.major;
    const root = curWorld ? curWorld.root : 57;
    const beat = 0.34;
    while (nextNote < ctx.currentTime + 0.2) {
      const t = nextNote, b = step % 16;
      const chordDeg = [0, 5, 3, 4][Math.floor(step / 4) % 4];
      // bass
      if (b % 4 === 0) tone(midi(root - 12 + scale[chordDeg % 7]), t, beat * 1.8, "triangle", 0.16, musicGain);
      // arp
      const deg = chordDeg + [0, 2, 4, 2][b % 4];
      tone(midi(root + scale[deg % 7] + 12 * Math.floor(deg / 7)), t, beat * 0.8, "square", 0.05, musicGain);
      // hats
      noise(t, 0.03, 0.03, 8000, musicGain);
      step++; nextNote += beat;
    }
  }
  return { init, sfx, startMusic, stopMusic, applyVolumes, ready: () => !!ctx };
})();

// ------------------------------------------------------------------ canvas --
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let DPR = 1, cssW = 0, cssH = 0, S = 1;
const GROUND_Y = 600, SLING_X = 200, VIEW_H = 780;
const GRAVITY = 1750;      // shared by the simulation AND the aim preview
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth; cssH = window.innerHeight;
  canvas.width = Math.floor(cssW * DPR); canvas.height = Math.floor(cssH * DPR);
  S = cssH / VIEW_H;
}
window.addEventListener("resize", resize);

const cam = { x: SLING_X + 260, y: GROUND_Y - 170, zoom: 1, tzoom: 1, shx: 0, shy: 0, shMag: 0, shT: 0 };
function w2s(wx, wy) { return { x: (wx - cam.x) * S * cam.zoom + cssW / 2 + cam.shx, y: (wy - cam.y) * S * cam.zoom + cssH / 2 + cam.shy }; }
function s2w(sx, sy) { return { x: (sx - cssW / 2) / (S * cam.zoom) + cam.x, y: (sy - cssH / 2) / (S * cam.zoom) + cam.y }; }
function shake(mag) { if (!save.settings.shake) return; cam.shMag = Math.max(cam.shMag, mag); cam.shT = 0.35; }
function zoomPunch(z) { cam.tzoom = z; }

// ------------------------------------------------------------------ state ---
const G = {
  state: "menu",          // menu | play | over
  level: 1, world: WORLDS[0], fieldW: 2000,
  trees: [], boss: null, chests: [], particles: [], bolts: [],
  ball: null, aim: { active: false, px: 0, py: 0, wx: 0, wy: 0 },
  shots: 6, shotsLeft: 6, treesLeft: 0, treesTotal: 0,
  coinsEarned: 0, shotsUsed: 0, reviveUsed: false,
  combo: 0, comboT: 0, bestCombo: 0,
  canAim: false, timeScale: 1, hitstopT: 0, ended: false, ctxParticleParent: null,
};

// ------------------------------------------------------------------ level ---
function seedRand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function generateLevel(lvl) {
  const w = WORLDS[worldIndex(lvl)];
  G.level = lvl; G.world = w; G.ended = false; G.reviveUsed = false;
  G.trees = []; G.boss = null; G.chests = []; G.particles = []; G.bolts = [];
  G.coinsEarned = 0; G.shotsUsed = 0; G.combo = 0; G.comboT = 0; G.bestCombo = 0;
  const rng = seedRand(lvl * 2654435761);
  const hpScale = 1 + (lvl - 1) * 0.05;

  if (isBossLevel(lvl)) {
    G.fieldW = 1500;
    G.boss = makeBoss(w, lvl, 170 + worldIndex(lvl) * 130 + lvl * 5);
    G.treesTotal = 1; G.treesLeft = 1;
    G.shots = 12 + worldIndex(lvl); G.shotsLeft = G.shots;
    // a few decorative trees
    const deco = 2 + randi(0, 2);
    for (let i = 0; i < deco; i++) addTree(rand(900, 1350), w, 24 * hpScale, rng, false);
    return;
  }

  const count = Math.min(4 + localLevel(lvl) + worldIndex(lvl), 22);
  let x = 500 + rng() * 70;
  for (let i = 0; i < count; i++) {
    const hp = (11 + lvl * 4 + worldIndex(lvl) * 7) * rand(0.85, 1.2);
    addTree(x, w, hp, rng, true);
    let gap = 112;
    gap *= rng() < 0.35 ? rand(0.5, 0.72) : rand(0.95, 1.45);
    x += gap;
  }
  G.fieldW = x + 300;
  G.treesTotal = count; G.treesLeft = count;
  G.shots = Math.ceil(count * 0.85) + 2; G.shotsLeft = G.shots;
  // chest chance
  if (rng() < 0.18) G.chests.push({ x: rand(760, G.fieldW - 400), y: GROUND_Y, opened: false, s: 1, a: 1 });
}

function addTree(x, w, hp, rng, counts) {
  const scale = rand(0.9, 1.25);
  const pine = (rng ? rng() : Math.random()) < 0.4;
  const trunkH = 60 * scale, trunkW = 16 * scale, canopyR = 48 * scale;
  G.trees.push({
    x, hp, maxHp: hp, world: w, pine, scale, trunkH, trunkW, canopyR,
    canopyCy: GROUND_Y - trunkH - canopyR * 0.55,
    shakeT: 0, hurtT: 0, dead: false, topple: 0, fallDir: 1, hitCd: {}, counts,
    a: 1, phase: Math.random() * 6.28,
  });
}

function makeBoss(w, lvl, hp) {
  return {
    x: 900, y: GROUND_Y - 220, r: 92, hp, maxHp: hp, phase: 0, t: 0, dead: false,
    weakOpen: true, weakT: 1.6, flash: 0, invuln: 0, cx: 900, world: w,
    eye: "#ff5a4a", wob: 0,
  };
}

// ------------------------------------------------------------------ ball ----
function makeBall(data) {
  return {
    data, x: SLING_X, y: GROUND_Y - 18, vx: 0, vy: 0, r: data.r,
    held: true, launched: false, dead: false, restT: 0, air: 0, bounces: 0, kills: 0,
    trail: [], recent: {},
  };
}
function loadBall() {
  if (!G.canAimAllowed()) return;
  G.ball = makeBall(ballById(save.ball));
  G.ball.x = SLING_X; G.ball.y = GROUND_Y - 18;
  G.aim.active = false; G.canAim = true;
  cam.follow = false;
}
G.canAimAllowed = () => G.state === "play" && !G.ended && G.shotsLeft > 0;

function fireBall(dirx, diry, power) {
  const b = G.ball; if (!b) return;
  const speed = power * 1700 * launchPowerFactor(save.power) * b.data.spd;
  b.vx = dirx * speed; b.vy = diry * speed;
  b.held = false; b.launched = true;
  G.canAim = false; G.aim.active = false;
  G.shotsUsed++; G.shotsLeft = Math.max(0, G.shotsLeft - 1);
  statAdd("shots", 1);
  cam.follow = true;
  Audio.sfx("launch");
  refreshShots();
}

// physics step for the ball
function stepBall(dt) {
  const b = G.ball;
  if (!b || b.held || b.dead) return;
  b.air += dt;
  b.vy += GRAVITY * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;

  // decay recent-hit timers
  for (const k in b.recent) { b.recent[k] -= dt; if (b.recent[k] <= 0) delete b.recent[k]; }

  // ground
  if (b.y + b.r > GROUND_Y) {
    b.y = GROUND_Y - b.r;
    if (b.vy > 120) { spawnDust(b.x, GROUND_Y, 6); if (b.vy > 400) Audio.sfx("impact"); }
    b.vy *= -b.data.bounce; b.vx *= 0.72; b.bounces++;
    if (Math.abs(b.vy) < 60) b.vy = 0;
  }
  // walls
  if (b.x - b.r < -40) { b.x = -40 + b.r; b.vx *= -b.data.bounce; }
  if (b.x + b.r > G.fieldW + 40) { b.x = G.fieldW + 40 - b.r; b.vx *= -b.data.bounce; }

  // trees
  for (const t of G.trees) {
    if (t.dead) continue;
    hitTestTree(b, t);
  }
  // boss
  if (G.boss && !G.boss.dead) hitTestBoss(b, G.boss);
  // chests
  for (const c of G.chests) if (!c.opened) {
    if (dist2(b.x, b.y, c.x, c.y - 24) < (b.r + 34) * (b.r + 34)) openChest(c);
  }

  // trail
  b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 18) b.trail.pop();

  // rest / expire
  const spd = Math.hypot(b.vx, b.vy);
  if (spd < 30) { b.restT += dt; if (b.restT > 0.5) expireBall(); }
  else b.restT = 0;
  if (b.air > 9 || b.y > 3000) expireBall();
}

function hitTestTree(b, t) {
  // canopy circle + trunk rect
  let nx = 0, ny = 0, pen = 0, hit = false;
  const dc = Math.hypot(b.x - t.x, b.y - t.canopyCy);
  if (dc < b.r + t.canopyR) { hit = true; const inv = dc > 0.001 ? 1 / dc : 0; nx = (b.x - t.x) * inv; ny = (b.y - t.canopyCy) * inv; pen = b.r + t.canopyR - dc; }
  else {
    // trunk rect
    const rx = t.x - t.trunkW / 2, ry = GROUND_Y - t.trunkH, rw = t.trunkW, rh = t.trunkH;
    const cx = clamp(b.x, rx, rx + rw), cy = clamp(b.y, ry, ry + rh);
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d < b.r) { hit = true; const inv = d > 0.001 ? 1 / d : 0; nx = dx * inv || 0; ny = dy * inv || -1; pen = b.r - d; }
  }
  if (!hit) return;
  const spd = Math.hypot(b.vx, b.vy);
  const key = G.trees.indexOf(t);
  const canDamage = !(b.recent[key] > 0) && (b.vx * nx + b.vy * ny) < 60;
  b.x += nx * pen; b.y += ny * pen;                 // push out of overlap
  let destroyed = false;
  if (canDamage) { b.recent[key] = 0.12; destroyed = dealDamage(t, b, spd, { x: b.x, y: b.y }); }
  if (destroyed) {
    // Smash through — keep most momentum so a fast shot rakes a whole row.
    b.vx *= 0.82; b.vy *= 0.82;
  } else {
    // Bonk off a surviving tree, shedding energy so it never rockets away.
    const vn = b.vx * nx + b.vy * ny;
    b.vx -= (1 + b.data.bounce * 0.5) * vn * nx; b.vy -= (1 + b.data.bounce * 0.5) * vn * ny;
    b.vx *= 0.72; b.vy *= 0.72;
  }
}

function dealDamage(t, b, spd, at) {
  const sf = clamp(spd / 900, 0.5, 1.7);
  let dmg = b.data.dmg * damageFactor(save.power) * sf;
  let crit = Math.random() < (b.data.effect === "crit" ? 0.35 : 0.06);
  if (crit) dmg *= 2;
  const destroyed = applyTreeDamage(t, dmg, crit, at, false);
  impactFX(at.x, at.y, spd, b.data.color);

  // effects
  if (b.data.effect === "explode") {
    areaDamage(at.x, at.y, 150, dmg * 0.7);
    explosionFX(at.x, at.y, 150, b.data.accent); Audio.sfx("explosion"); shake(16); zoomPunch(1.06);
  } else if (b.data.effect === "fire") {
    areaDamage(at.x, at.y, 90, dmg * 0.5);
    explosionFX(at.x, at.y, 80, "#ff7a2e");
  } else if (b.data.effect === "chain") {
    chainLightning(at.x, at.y, dmg * 0.6, t);
  } else if (b.data.effect === "heavy") {
    t.shakeT = 0.3;
  }
  if (b.data.effect === "ice" && b.bounces < 4) b.vx *= 1.04;
  return destroyed;
}

function applyTreeDamage(t, dmg, crit, at, chain) {
  if (t.dead) return false;
  t.hp -= dmg; t.shakeT = 0.2; t.hurtT = 1.6;
  t.fallDir = at.x < t.x ? 1 : -1;
  if (!chain && save.settings.damageNums) popup(at.x, t.canopyCy - t.canopyR, Math.round(dmg), crit ? "#ff5470" : "#fff4d6", crit ? 26 : 18);
  if (t.hp <= 0) { destroyTree(t, chain); return true; }
  return false;
}

function areaDamage(x, y, radius, dmg) {
  for (const t of G.trees) { if (t.dead) continue; if (dist2(x, y, t.x, t.canopyCy) < radius * radius) applyTreeDamage(t, dmg, false, { x: t.x, y: t.canopyCy }, true); }
  if (G.boss && !G.boss.dead && dist2(x, y, G.boss.x, G.boss.y) < (radius + G.boss.r) * (radius + G.boss.r)) damageBoss(G.boss, dmg, { x, y });
}

function chainLightning(x, y, dmg, source) {
  const targets = G.trees.filter(t => !t.dead && t !== source).sort((a, b) => dist2(x, y, a.x, a.canopyCy) - dist2(x, y, b.x, b.canopyCy)).slice(0, 4);
  let prev = { x, y };
  for (const t of targets) {
    if (dist2(x, y, t.x, t.canopyCy) > 360 * 360) break;
    G.bolts.push({ ax: prev.x, ay: prev.y, bx: t.x, by: t.canopyCy, t: 0.25 });
    applyTreeDamage(t, dmg, false, { x: t.x, y: t.canopyCy }, true);
    prev = { x: t.x, y: t.canopyCy };
  }
  Audio.sfx("chain");
}

function destroyTree(t, chain) {
  if (t.dead) return;
  t.dead = true; t.topple = 0.001;
  const cx = t.x, cy = t.canopyCy;
  treeBreakFX(cx, cy, t);
  Audio.sfx(t.pine ? "wood" : "shatter");
  shake(4);
  statAdd("trees", 1);
  if (t.counts) G.treesLeft = Math.max(0, G.treesLeft - 1);

  // combo & coins
  G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.comboT = 2.6;
  statMax("bestcombo", G.combo);
  showCombo();
  const mult = 1 + Math.min(G.combo, 30) * 0.1 + worldIndex(G.level) * 0.05;
  let reward = Math.round((5 + G.level * 0.6) * mult * (chain ? 1.5 : 1));
  G.coinsEarned += reward; addCoins(reward);
  coinPop(cx, cy, reward);

  // chain reaction
  if (t.counts || chain) {
    const radius = t.canopyR * 2 + 50;
    for (const o of G.trees) { if (o === t || o.dead) continue; if (dist2(t.x, t.canopyCy, o.x, o.canopyCy) < radius * radius) applyTreeDamage(o, t.maxHp * 0.6 + 20, false, { x: t.x, y: t.canopyCy }, true); }
  }
  if (G.treesLeft <= 0 && G.boss == null) winLevel();
}

// ------------------------------------------------------------------ boss ----
function hitTestBoss(b, boss) {
  const d = Math.hypot(b.x - boss.x, b.y - boss.y);
  if (d < b.r + boss.r) {
    const inv = d > 0.001 ? 1 / d : 0, nx = (b.x - boss.x) * inv, ny = (b.y - boss.y) * inv;
    b.x += nx * (b.r + boss.r - d); const vn = b.vx * nx + b.vy * ny;
    b.vx -= (1 + b.data.bounce) * vn * nx; b.vy -= (1 + b.data.bounce) * vn * ny;
    const key = "boss";
    if (!(b.recent[key] > 0)) {
      b.recent[key] = 0.15;
      const spd = Math.hypot(b.vx, b.vy), sf = clamp(spd / 1000, 0.5, 1.6);
      let dmg = b.data.dmg * damageFactor(save.power) * sf;
      damageBoss(boss, dmg, { x: b.x, y: b.y });
    }
  }
}
function damageBoss(boss, dmg, at) {
  if (boss.dead || boss.invuln > 0) { Audio.sfx("bossHit"); return; }
  const weakY = boss.y + boss.r * 0.35;
  const hitWeak = boss.weakOpen && dist2(at.x, at.y, boss.x, weakY) < 88 * 88;
  // Bosses take extra from solid impacts; weak point triples it.
  const mult = hitWeak ? 3.0 : (boss.weakOpen ? 1.0 : 0.7);
  dmg *= 1.9 * mult;
  if (hitWeak) explosionFX(at.x, at.y, 40, "#ffe14d");
  boss.hp = Math.max(0, boss.hp - dmg); boss.flash = 0.12; boss.wob = (at.x < boss.x ? 1 : -1) * 14;
  if (save.settings.damageNums) popup(at.x, at.y - 20, Math.round(dmg), hitWeak ? "#ffe14d" : "#fff", hitWeak ? 24 : 18);
  Audio.sfx("bossHit"); shake(6);
  refreshBossBar();
  // phases
  const ratio = boss.hp / boss.maxHp, np = ratio <= 0.33 ? 2 : ratio <= 0.66 ? 1 : 0;
  if (np > boss.phase) { boss.phase = np; boss.invuln = 0.7; boss.eye = ["#ff5a4a","#ff7a2a","#ff2a6a"][np]; shake(14); toast("The boss enrages!"); }
  if (boss.hp <= 0) killBoss(boss);
}
function killBoss(boss) {
  boss.dead = true; statAdd("bosses", 1);
  Audio.sfx("bossDie"); shake(22); flash("#fff", 0.5);
  for (let i = 0; i < 40; i++) G.particles.push({ x: boss.x + rand(-60, 60), y: boss.y + rand(-60, 60), vx: rand(-300, 300), vy: rand(-400, 100), life: rand(0.6, 1.2), max: 1.2, r: rand(3, 8), col: boss.world.leaf, g: 500 });
  setTimeout(() => { if (G.state === "play") winLevel(); }, 900);
}
function stepBoss(boss, dt) {
  boss.t += dt;
  const sp = 1 + boss.phase * 0.3;
  boss.x = boss.cx + Math.sin(boss.t * 0.42 * sp) * 110;
  boss.y = GROUND_Y - 220 + Math.sin(boss.t * 0.9 * sp) * 18;
  boss.wob *= 0.9;
  boss.weakT -= dt; if (boss.weakT <= 0) { boss.weakOpen = !boss.weakOpen; boss.weakT = boss.weakOpen ? [2.4,2.0,1.6][boss.phase] : [0.8,0.75,0.65][boss.phase]; }
  if (boss.flash > 0) boss.flash -= dt;
  if (boss.invuln > 0) boss.invuln -= dt;
}

// ------------------------------------------------------------------ chest ---
function openChest(c) {
  c.opened = true;
  const coins = randi(80, 260); addCoins(coins); coinPop(c.x, c.y - 30, coins);
  statAdd("trees", 0);
  for (let i = 0; i < 16; i++) G.particles.push({ x: c.x, y: c.y - 24, vx: rand(-160, 160), vy: rand(-320, -60), life: rand(0.5, 1), max: 1, r: rand(2, 5), col: "#ffcf4a", g: 500 });
  Audio.sfx("purchase"); shake(5);
  toast(`Chest!  +${fmt(coins)} 🪙`);
}

// ------------------------------------------------------------------ FX ------
function impactFX(x, y, spd, color) {
  const n = clamp(4 + spd / 120, 4, 14) | 0;
  for (let i = 0; i < n; i++) G.particles.push({ x, y, vx: rand(-spd/4, spd/4) - 0, vy: rand(-160, -30), life: rand(0.25, 0.5), max: 0.5, r: rand(2, 4), col: color, g: 700 });
  if (spd > 420) { Audio.sfx("impactHard"); shake(clamp(spd/120, 3, 8)); } else Audio.sfx("impact");
}
function spawnDust(x, y, n) { for (let i = 0; i < n; i++) G.particles.push({ x: x + rand(-10, 10), y, vx: rand(-60, 60), vy: rand(-80, -20), life: rand(0.3, 0.6), max: 0.6, r: rand(3, 6), col: "#b8a374", g: 300 }); }
function treeBreakFX(x, y, t) {
  for (let i = 0; i < 20; i++) G.particles.push({ x, y, vx: rand(-260, 260), vy: rand(-360, -40), life: rand(0.5, 1), max: 1, r: rand(3, 7), col: i % 2 ? t.world.leaf : t.world.leaf2, g: 700 });
  for (let i = 0; i < 6; i++) G.particles.push({ x, y: y + t.canopyR, vx: rand(-120, 120), vy: rand(-200, -40), life: rand(0.4, 0.8), max: 0.8, r: rand(2, 5), col: t.world.trunk, g: 700 });
}
function explosionFX(x, y, radius, color) {
  for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), s = rand(radius, radius * 3); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, life: rand(0.3, 0.6), max: 0.6, r: rand(3, 7), col: i % 3 ? color : "#fff0b0", g: 200 }); }
}
function stepParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) { G.bolts[i].t -= dt; if (G.bolts[i].t <= 0) G.bolts.splice(i, 1); }
}

// DOM popups
function popup(wx, wy, text, color, size) {
  const s = w2s(wx, wy);
  const e = el("div", { class: "popup", style: `left:${s.x}px;top:${s.y}px;color:${color};font-size:${size}px;transform:translate(-50%,-50%)` }, "" + text);
  fxLayer.append(e); setTimeout(() => e.remove(), 1100);
}
function coinPop(wx, wy, amount) {
  const s = w2s(wx, wy - 10);
  const e = el("div", { class: "popup", style: `left:${s.x}px;top:${s.y}px;color:#ffcf4a;font-size:18px;transform:translate(-50%,-50%)` }, `+${amount}`);
  fxLayer.append(e); setTimeout(() => e.remove(), 1100);
  Audio.sfx("coin");
}
let flashEl = null;
function flash(color, dur) {
  if (!flashEl) { flashEl = el("div", { style: "position:absolute;inset:0;pointer-events:none;opacity:0" }); fxLayer.append(flashEl); }
  flashEl.style.background = color; flashEl.style.transition = "none"; flashEl.style.opacity = "0.35";
  requestAnimationFrame(() => { flashEl.style.transition = `opacity ${dur}s`; flashEl.style.opacity = "0"; });
}
let comboT = 0;
function showCombo() {
  if (G.combo < 2) return;
  const mult = 1 + Math.min(G.combo, 30) * 0.1;
  comboEl.querySelector(".big").textContent = `COMBO x${G.combo}`;
  comboEl.querySelector(".mult").textContent = `${mult.toFixed(1)}× coins`;
  comboEl.style.opacity = "1"; comboEl.style.transform = "translateX(-50%) scale(1.15)";
  setTimeout(() => comboEl.style.transform = "translateX(-50%) scale(1)", 90);
  comboT = 2.6;
}
function toast(msg) {
  const t = el("div", { class: "toast" }, msg); toastLayer.append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; setTimeout(() => t.remove(), 400); }, 2200);
  while (toastLayer.children.length > 4) toastLayer.firstChild.remove();
}

// ------------------------------------------------------------------ flow ----
function startLevel(lvl) {
  Audio.init();
  generateLevel(lvl);
  G.state = "play"; G.ended = false;
  cam.x = SLING_X + 260; cam.y = GROUND_Y - 170; cam.zoom = 1; cam.tzoom = 1; cam.follow = false;
  showScreen(null); hud.classList.remove("hidden");
  refreshHUD(); refreshShots(); refreshBalls(); refreshBossBar();
  bossBarEl.classList.toggle("hidden", !G.boss);
  Audio.startMusic(G.world);
  loadBall();
}
function turnEnded() {
  if (G.ended) return;
  if (G.treesLeft <= 0 && !G.boss) return;
  if (G.boss && G.boss.dead) return;
  if (G.shotsLeft <= 0) {
    // no revive in web build for simplicity -> lose
    loseLevel();
  } else {
    setTimeout(() => { if (G.state === "play" && !G.ended) loadBall(); }, 300);
  }
}
function expireBall() {
  const b = G.ball; if (!b || b.dead) return; b.dead = true;
  if (b.kills >= 3) { toast("Perfect shot!"); Audio.sfx("win"); }
  G.ball = null; cam.follow = false;
  turnEnded();
}
function winLevel() {
  if (G.ended) return; G.ended = true; G.state = "over";
  Audio.stopMusic(); Audio.sfx("win"); flash("#fff", 0.4);
  let stars = 1; if (G.shotsUsed <= Math.ceil(G.treesTotal * 0.6)) stars = 3; else if (G.shotsUsed <= G.treesTotal) stars = 2;
  if (G.boss) stars = Math.max(stars, 2);
  const bonus = Math.round(30 + G.level * 6); addCoins(bonus); G.coinsEarned += bonus;
  save.stars[G.level] = Math.max(save.stars[G.level] || 0, stars);
  save.stats.levels = (save.stats.levels || 0) + 1;
  if (G.level < MAX_LEVEL) { save.highest = Math.max(save.highest, G.level + 1); statMax("highest", save.highest); }
  persist();
  setTimeout(() => showVictory(stars), 700);
}
function loseLevel() {
  if (G.ended) return; G.ended = true; G.state = "over";
  Audio.stopMusic(); Audio.sfx("lose");
  setTimeout(() => showDefeat(), 400);
}

// ------------------------------------------------------------------ input ---
let pointerId = null;
function onDown(e) {
  Audio.init();
  if (G.state !== "play" || !G.canAim || G.ended) return;
  const p = pointFromEvent(e);
  // ignore if over a HUD button (they handle their own events)
  pointerId = e.pointerId != null ? e.pointerId : 1;
  G.aim.active = true; updateAim(p);
}
function onMove(e) {
  if (!G.aim.active) return;
  updateAim(pointFromEvent(e));
}
function onUp(e) {
  if (!G.aim.active) return;
  G.aim.active = false;
  const rest = { x: SLING_X, y: GROUND_Y - 18 };
  const pull = { x: G.aim.wx - rest.x, y: G.aim.wy - rest.y };
  const len = Math.hypot(pull.x, pull.y);
  const ratio = clamp(len / 150, 0, 1);
  if (ratio < 0.12 || !G.ball) { return; }
  fireBall(-pull.x / len, -pull.y / len, ratio);
}
function updateAim(p) {
  const w = s2w(p.x, p.y);
  const rest = { x: SLING_X, y: GROUND_Y - 18 };
  let dx = w.x - rest.x, dy = w.y - rest.y;
  const len = Math.hypot(dx, dy);
  if (len > 150) { dx = dx / len * 150; dy = dy / len * 150; }
  G.aim.wx = rest.x + dx; G.aim.wy = rest.y + dy;
  if (G.ball) { G.ball.x = rest.x + dx; G.ball.y = rest.y + dy; }
}
function pointFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: cx - r.left, y: cy - r.top };
}
canvas.addEventListener("pointerdown", onDown);
window.addEventListener("pointermove", onMove);
window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", () => G.aim.active = false);
window.addEventListener("keydown", e => {
  if (e.key === "Escape" && G.state === "play" && !G.ended) togglePause();
});

// ------------------------------------------------------------------ update --
function update(dt) {
  // hitstop
  if (G.hitstopT > 0) { G.hitstopT -= dt; dt *= 0.15; }
  // camera
  let tx = cam.x, ty = cam.y;
  if (G.state === "play") {
    if (cam.follow && G.ball && !G.ball.held) { tx = G.ball.x; ty = clamp(G.ball.y, GROUND_Y - 420, GROUND_Y - 120); }
    else if (G.boss) { tx = G.boss.cx; ty = GROUND_Y - 220; }
    else { tx = SLING_X + 260; ty = GROUND_Y - 170; }
    const halfW = (cssW / 2) / (S * cam.zoom);
    tx = clamp(tx, halfW - 120, Math.max(halfW - 120, G.fieldW - halfW + 120));
  }
  cam.x = lerp(cam.x, tx, clamp((cam.follow ? 7 : 4) * dt, 0, 1));
  cam.y = lerp(cam.y, ty, clamp(5 * dt, 0, 1));
  cam.zoom = lerp(cam.zoom, cam.tzoom, clamp(8 * dt, 0, 1));
  if (Math.abs(cam.zoom - cam.tzoom) < 0.002) cam.tzoom = 1;
  // shake
  if (cam.shT > 0) { cam.shT -= dt; const m = cam.shMag * (cam.shT / 0.35); cam.shx = rand(-1, 1) * m; cam.shy = rand(-1, 1) * m; } else { cam.shx *= 0.8; cam.shy *= 0.8; cam.shMag = 0; }

  if (G.state === "play" && !G.ended) {
    const sub = 4;
    for (let i = 0; i < sub; i++) stepBall(dt / sub);
    for (const t of G.trees) { if (t.shakeT > 0) t.shakeT -= dt; if (t.hurtT > 0) t.hurtT -= dt; if (t.dead && t.topple > 0) { t.topple += dt; t.a = Math.max(0, 1 - (t.topple - 0.5) * 2); } }
    G.trees = G.trees.filter(t => !(t.dead && t.a <= 0));
    if (G.boss && !G.boss.dead) stepBoss(G.boss, dt);
    for (const c of G.chests) if (c.opened && c.a > 0) { c.a -= dt * 2; c.s += dt; }
    // combo timer
    if (G.combo > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; comboEl.style.opacity = "0"; } }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) comboEl.style.opacity = "0"; }
  }
  stepParticles(dt);
}

// ------------------------------------------------------------------ render --
let cloudT = 0;
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const w = G.world;
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
  // stars for night worlds
  if (w.night) { ctx.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 60; i++) { const sx = (i * 137.5 % cssW), sy = (i * 89.3 % (cssH * 0.6)); ctx.globalAlpha = 0.3 + 0.5 * ((i * 13) % 10) / 10; ctx.fillRect(sx, sy, 2, 2); } ctx.globalAlpha = 1; }
  // sun
  const sun = w2s(G.fieldW * 0.5, GROUND_Y - 1400);
  ctx.fillStyle = w.night ? "rgba(255,240,200,.5)" : "rgba(255,245,200,.9)";
  ctx.beginPath(); ctx.arc(cssW * 0.75, cssH * 0.22, 46 * S, 0, 6.28); ctx.fill();
  // clouds
  cloudT += 0.02;
  ctx.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 4; i++) { const cx = ((i * 420 + cloudT * 10 - cam.x * 0.1) % (cssW + 300)) - 150; const cy = cssH * (0.12 + i * 0.06); cloud(cx, cy, 40 * S); }
  // hills
  drawHills(0.3, w.hill, "#0003");
  drawHills(0.55, shade(w.hill, -0.1), "#0002");

  // world transform
  ctx.save();
  ctx.translate(cssW / 2 + cam.shx, cssH / 2 + cam.shy);
  ctx.scale(S * cam.zoom, S * cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // ground
  ctx.fillStyle = w.ground; ctx.fillRect(-400, GROUND_Y, G.fieldW + 800, 500);
  ctx.fillStyle = w.groundD; ctx.fillRect(-400, GROUND_Y, G.fieldW + 800, 12);
  // subtle grass tufts
  ctx.strokeStyle = shade(w.ground, 0.15); ctx.lineWidth = 2;
  for (let gx = -200; gx < G.fieldW + 200; gx += 46) { ctx.beginPath(); ctx.moveTo(gx, GROUND_Y); ctx.lineTo(gx - 4, GROUND_Y - 10); ctx.moveTo(gx, GROUND_Y); ctx.lineTo(gx + 4, GROUND_Y - 10); ctx.stroke(); }

  for (const c of G.chests) drawChest(c);
  for (const t of G.trees) drawTree(t);
  if (G.boss && (!G.boss.dead || G.boss.hp > 0)) drawBoss(G.boss);
  drawParticles();
  drawBolts();
  drawBall();
  drawSlingshot();
  drawTrajectory();

  ctx.restore();
  requestAnimationFrame(loop);
}
function cloud(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.arc(x + r, y + r * 0.2, r * 0.8, 0, 6.28); ctx.arc(x - r, y + r * 0.2, r * 0.7, 0, 6.28); ctx.fill(); }
function drawHills(factor, color, shadow) {
  const baseY = w2s(0, GROUND_Y).y;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, cssH);
  const off = -cam.x * factor * S;
  for (let x = -100; x <= cssW + 100; x += 40) { const wx = x - off; const y = baseY - (60 + Math.abs(Math.sin(wx * 0.004)) * 90) * (0.6 + factor); ctx.lineTo(x, y); }
  ctx.lineTo(cssW + 100, cssH); ctx.closePath(); ctx.fill();
}
function drawTree(t) {
  ctx.save();
  ctx.translate(t.x, GROUND_Y);
  let rot = Math.sin((cloudT + t.phase) * 1.4) * 0.02;
  if (t.shakeT > 0) rot += Math.sin(cloudT * 40) * 0.06 * (t.shakeT / 0.2);
  if (t.dead) rot = (t.topple > 0 ? clamp(t.topple * 2.6, 0, 1.5) : 0) * t.fallDir;
  ctx.rotate(rot);
  ctx.globalAlpha = t.a;
  const w = t.world;
  // trunk
  ctx.fillStyle = shade(w.trunk, -0.1); ctx.fillRect(-t.trunkW / 2, -t.trunkH, t.trunkW, t.trunkH);
  ctx.fillStyle = w.trunk; ctx.fillRect(-t.trunkW / 2, -t.trunkH, t.trunkW * 0.4, t.trunkH);
  // canopy
  const cy = -t.trunkH - t.canopyR * 0.55, r = t.canopyR;
  if (t.pine) {
    for (let i = 0; i < 3; i++) { const by = -t.trunkH + 6 - i * r * 0.85, half = r * (1 - i * 0.22), top = by - r * 1.25; ctx.fillStyle = i % 2 ? w.leaf2 : w.leaf; tri(-half, by, half, by, 0, top); }
  } else {
    ctx.fillStyle = w.leaf2; circle(-r * 0.55, cy + r * 0.2, r * 0.75); circle(r * 0.55, cy + r * 0.2, r * 0.75);
    ctx.fillStyle = w.leaf; circle(0, cy, r);
    ctx.fillStyle = shade(w.leaf, 0.12); circle(-r * 0.3, cy - r * 0.35, r * 0.5);
  }
  // health bar
  if (t.hurtT > 0 && t.hp < t.maxHp && !t.dead) {
    const ratio = clamp(t.hp / t.maxHp, 0, 1), bw = Math.max(t.canopyR * 1.8, 44), by = cy - r - 16, a = clamp(t.hurtT, 0, 1);
    ctx.globalAlpha = a * t.a; ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(-bw / 2 - 2, by - 2, bw + 4, 11);
    ctx.fillStyle = ratio > 0.5 ? "#67d982" : ratio > 0.25 ? "#ffcf4a" : "#ff6a6a"; ctx.fillRect(-bw / 2, by, bw * ratio, 7);
    ctx.globalAlpha = t.a;
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawChest(c) {
  if (c.a <= 0) return;
  ctx.save(); ctx.translate(c.x, GROUND_Y); ctx.scale(c.s, c.s); ctx.globalAlpha = c.a;
  const w = 52, h = 40;
  ctx.fillStyle = "#7a4a24"; ctx.fillRect(-w / 2, -h, w, h);
  ctx.fillStyle = "#caa06a"; ctx.fillRect(-w / 2, -h, w, h * 0.35);
  ctx.fillStyle = "#8a5a2c"; ctx.fillRect(-w / 2, -h - 10, w, 12);
  ctx.fillStyle = "#ffcf4a"; ctx.fillRect(-6, -h * 0.6, 12, 12);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBoss(boss) {
  ctx.save(); ctx.translate(boss.x + boss.wob, boss.y); ctx.globalAlpha = boss.dead ? clamp(boss.hp, 0, 1) : 1;
  const r = boss.r, w = boss.world;
  // horns
  ctx.fillStyle = "#ffcf4a"; tri(-r * 0.7, -r * 0.5, -r * 0.4, -r * 1.15, -r * 0.25, -r * 0.55); tri(r * 0.7, -r * 0.5, r * 0.4, -r * 1.15, r * 0.25, -r * 0.55);
  // body
  ctx.fillStyle = shade(w.boss, -0.15); circle(0, 0, r);
  ctx.fillStyle = shade(w.boss, 0.12); circle(0, r * 0.2, r * 0.7);
  // eyes
  for (const sx of [-1, 1]) { ctx.fillStyle = "#fff"; circle(sx * r * 0.4, -r * 0.3, r * 0.2); ctx.fillStyle = boss.eye; circle(sx * r * 0.4, -r * 0.3, r * 0.1); }
  // mouth
  ctx.strokeStyle = "#1a0d0d"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // weak point
  const wy = r * 0.35;
  if (boss.weakOpen) { const pulse = 0.85 + 0.15 * Math.sin(boss.t * 8); ctx.fillStyle = "rgba(255,220,60,.35)"; circle(0, wy, r * 0.32 * pulse); ctx.fillStyle = "#ffd24d"; circle(0, wy, r * 0.2); ctx.fillStyle = "#fff2b0"; circle(0, wy, r * 0.1); }
  else { ctx.strokeStyle = "rgba(120,180,255,.8)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, wy, r * 0.34, 0, 6.28); ctx.stroke(); ctx.fillStyle = "rgba(80,110,150,.7)"; circle(0, wy, r * 0.24); }
  if (boss.flash > 0) { ctx.globalAlpha = boss.flash / 0.12; ctx.fillStyle = "#fff"; circle(0, 0, r); ctx.globalAlpha = 1; }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBall() {
  const b = G.ball; if (!b) return;
  // trail
  if (b.trail.length > 1 && !b.held) {
    for (let i = 0; i < b.trail.length - 1; i++) { const p = b.trail[i]; ctx.globalAlpha = (1 - i / b.trail.length) * 0.5; ctx.fillStyle = b.data.color; circle(p.x, p.y, b.r * (1 - i / b.trail.length) * 0.8); }
    ctx.globalAlpha = 1;
  }
  const r = b.r;
  ctx.fillStyle = b.data.color; circle(b.x, b.y, r);
  ctx.fillStyle = b.data.accent; circle(b.x - r * 0.3, b.y - r * 0.3, r * 0.4);
  if (b.data.effect !== "none" && b.data.effect !== "heavy") { ctx.strokeStyle = b.data.accent; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, r + 2, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawSlingshot() {
  const bx = SLING_X, by = GROUND_Y;
  // Y frame
  ctx.strokeStyle = "#64381a"; ctx.lineWidth = 15; ctx.lineCap = "round";
  line(bx, by, bx, by - 70);
  const lx = bx - 32, rx = bx + 32, ty = by - 118;
  line(bx, by - 66, lx, ty); line(bx, by - 66, rx, ty);
  ctx.strokeStyle = "#7a4a24"; ctx.lineWidth = 11; line(bx, by, bx, by - 70); line(bx, by - 66, lx, ty); line(bx, by - 66, rx, ty);
  // bands
  if (G.ball && (G.aim.active || G.canAim)) {
    const px = G.ball.x, py = G.ball.y;
    ctx.strokeStyle = "#c8503c"; ctx.lineWidth = 6;
    line(lx, ty, px, py); line(rx, ty, px, py);
    if (G.aim.active) { const ratio = Math.hypot(px - bx, py - (by - 18)) / 150; ctx.fillStyle = `rgba(${lerp(120,255,ratio)|0},${lerp(230,90,ratio)|0},90,.25)`; circle(px, py, G.ball.r + 6 + ratio * 8); }
  }
}
function drawTrajectory() {
  if (!G.aim.active || !G.ball) return;
  const rest = { x: SLING_X, y: GROUND_Y - 18 };
  let dx = G.aim.wx - rest.x, dy = G.aim.wy - rest.y; const len = Math.hypot(dx, dy);
  if (len < 8) return;
  const ratio = clamp(len / 150, 0, 1);
  const speed = ratio * 1700 * launchPowerFactor(save.power) * G.ball.data.spd;
  let vx = -dx / len * speed, vy = -dy / len * speed, x = rest.x, y = rest.y;
  const dt = 1 / 60; const steps = Math.floor(lerp(14, 46, ratio));
  for (let i = 0; i < steps * 3; i++) {
    x += vx * dt; y += vy * dt; vy += GRAVITY * dt;
    if (y > GROUND_Y) break;
    if (i % 3 === 0) { ctx.globalAlpha = clamp(1 - i / (steps * 3), 0.15, 0.9); ctx.fillStyle = lerpColor("#9fe86a", "#ff6a5a", ratio); circle(x, y, lerp(5, 2, i / (steps * 3))); }
  }
  ctx.globalAlpha = 1;
}
function drawParticles() { for (const p of G.particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; circle(p.x, p.y, p.r); } ctx.globalAlpha = 1; }
function drawBolts() { for (const b of G.bolts) { ctx.globalAlpha = clamp(b.t / 0.25, 0, 1); ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.ax, b.ay); const n = 5; for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(lerp(b.ax, b.bx, t) + rand(-14, 14), lerp(b.ay, b.by, t) + rand(-14, 14)); } ctx.lineTo(b.bx, b.by); ctx.stroke(); } ctx.globalAlpha = 1; }

// draw helpers
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); }
function tri(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function shade(hex, amt) { const c = hexToRgb(hex); return `rgb(${clamp(c.r + amt * 255, 0, 255) | 0},${clamp(c.g + amt * 255, 0, 255) | 0},${clamp(c.b + amt * 255, 0, 255) | 0})`; }
function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function lerpColor(a, b, t) { const c1 = hexToRgb(a), c2 = hexToRgb(b); return `rgb(${lerp(c1.r, c2.r, t) | 0},${lerp(c1.g, c2.g, t) | 0},${lerp(c1.b, c2.b, t) | 0})`; }

// ------------------------------------------------------------------ loop ----
let last = 0;
function loop(t) {
  const tt = t / 1000; let dt = last ? tt - last : 0.016; last = tt; dt = Math.min(dt, 0.05);
  update(dt);
  render();
}

// ------------------------------------------------------------------ UI ------
const uiLayer = document.getElementById("ui");
const fxLayer = document.getElementById("fx");
const toastLayer = document.getElementById("toasts");
let hud, comboEl, bossBarEl, shotsEl, ballsEl, hudInfoEl;

function buildHUD() {
  hud = el("div", { id: "hud", class: "hidden" });
  const top = el("div", { class: "hud-top" });
  hudInfoEl = el("div", { class: "hud-info" });
  shotsEl = el("div", { class: "shots" });
  const pause = el("button", { class: "iconbtn", onclick: togglePause, style: "pointer-events:auto" }, "⏸");
  top.append(hudInfoEl, el("div", { class: "spacer" }), shotsEl, el("div", { class: "spacer" }), pause);
  ballsEl = el("div", { class: "hud-balls" });
  bossBarEl = el("div", { class: "bossbar hidden" }, el("div", { class: "bn" }, "BOSS"), el("div", { class: "bar" }, el("span")));
  hud.append(top, ballsEl, bossBarEl);
  uiLayer.append(hud);
  comboEl = el("div", { id: "combo" }, el("div", { class: "big" }), el("div", { class: "mult" }));
  fxLayer.append(comboEl);
}
function refreshHUD() {
  if (!hudInfoEl) return;
  hudInfoEl.innerHTML = `<div class="lv">${G.boss ? "💀 Boss" : "Level " + G.level}</div><div class="wx">${G.world.name}</div>`;
}
function refreshShots() {
  if (!shotsEl) return;
  shotsEl.innerHTML = "";
  for (let i = 0; i < G.shots; i++) shotsEl.append(el("div", { class: "shot-dot" + (i < G.shotsLeft ? " on" : "") }));
}
function refreshBalls() {
  if (!ballsEl) return; ballsEl.innerHTML = "";
  for (const id of save.ownedBalls) {
    const b = ballById(id);
    const btn = el("div", { class: "hud-ball" + (id === save.ball ? " sel" : ""), title: b.name, onclick: () => { save.ball = id; persist(); refreshBalls(); if (G.ball && G.ball.held) loadBall(); Audio.sfx("click"); } },
      el("div", { class: "dot", style: `background:${b.color}` }));
    ballsEl.append(btn);
  }
}
function refreshBossBar() {
  if (!bossBarEl || !G.boss) return;
  bossBarEl.querySelector(".bn").textContent = `BOSS — Phase ${G.boss.phase + 1}/3`;
  bossBarEl.querySelector("span").style.width = `${clamp(G.boss.hp / G.boss.maxHp, 0, 1) * 100}%`;
}

// screens
let curScreen = null;
function showScreen(node) {
  if (curScreen) curScreen.remove();
  curScreen = node;
  if (node) { uiLayer.append(node); hud.classList.add("hidden"); }
}
function chip(icon, val, cls) { return el("div", { class: "chip " + cls }, el("span", { class: "ic" }, icon), fmt(val)); }
function currencyChips() { return el("div", { class: "chips" }, chip("🪙", save.coins, "coin")); }

function screenMenu() {
  Audio.startMusic(WORLDS[worldIndex(save.highest)]);
  const s = el("div", { class: "screen", id: "screen-menu" });
  s.append(
    el("div", { class: "logo" }, "FOREST SLING"),
    el("div", { class: "tagline" }, "Sling · Smash · Upgrade · Conquer"),
    el("div", { class: "progress-pill" }, `Level ${save.highest}/100  ·  Slingshot Lv ${save.power}  ·  🪙 ${fmt(save.coins)}`),
    el("div", { class: "menu-buttons" },
      el("button", { class: "btn-primary btn-lg", onclick: () => { click(); showScreen(screenLevels()); } }, "▶  PLAY"),
      el("div", { class: "menu-grid" },
        el("button", { onclick: () => { click(); showScreen(screenShop()); } }, "🛒 Shop"),
        el("button", { onclick: () => { click(); showScreen(screenAchievements()); } }, "🏆 Achievements"),
        el("button", { onclick: () => { click(); showScreen(screenSettings()); } }, "⚙ Settings"),
        el("button", { onclick: () => { click(); showScreen(screenCredits()); } }, "📜 Credits"),
      ),
    ),
    el("div", { class: "footer-note" }, "No ads · No pay-to-win · Just fun progression"),
  );
  return s;
}

function header(title, back) {
  const h = el("div", { class: "header" });
  if (back) h.append(el("button", { class: "btn-ghost", onclick: () => { click(); back(); } }, "‹ Back"));
  h.append(el("h1", {}, title), el("div", { class: "spacer" }), currencyChips());
  return h;
}
const toMenu = () => showScreen(screenMenu());

function screenLevels() {
  let selWorld = worldIndex(save.highest);
  const s = el("div", { class: "screen" });
  const worldsRow = el("div", { class: "worlds" });
  const levelsWrap = el("div", { class: "levels" });
  const title = el("div", { class: "section-title" });
  function rebuild() {
    worldsRow.innerHTML = "";
    WORLDS.forEach((w, i) => {
      const unlocked = save.highest >= i * 10 + 1;
      worldsRow.append(el("button", { class: "worldtab tab" + (i === selWorld ? " active" : ""), disabled: !unlocked, onclick: () => { selWorld = i; click(); rebuild(); } }, unlocked ? `${i + 1}. ${w.name}` : `🔒 ${w.name}`));
    });
    const w = WORLDS[selWorld];
    let done = 0; for (let i = 1; i <= 10; i++) if (save.stars[selWorld * 10 + i]) done++;
    title.textContent = `${w.name}  ·  ${done}/10 cleared`;
    levelsWrap.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const lvl = selWorld * 10 + i;
      const unlocked = lvl <= save.highest;
      const boss = isBossLevel(lvl);
      const stars = save.stars[lvl] || 0;
      const b = el("div", { class: "levelbtn" + (boss ? " boss" : "") + (unlocked ? "" : " locked"), onclick: unlocked ? () => { click(); startLevel(lvl); } : null },
        el("div", { class: "num" }, unlocked ? (boss ? "💀" : lvl) : "🔒"),
        unlocked ? el("div", { class: "stars" }, "★".repeat(stars) + "☆".repeat(3 - stars)) : el("div", { class: "stars" }, "Locked"));
      levelsWrap.append(b);
    }
  }
  rebuild();
  s.append(header("Select Level", toMenu), worldsRow, title, levelsWrap);
  return s;
}

function screenShop() {
  const s = el("div", { class: "screen" });
  let tab = "balls";
  const tabs = el("div", { class: "tabs" });
  const list = el("div", { class: "list" });
  function rebuild() {
    tabs.innerHTML = "";
    [["balls", "Balls"], ["power", "Slingshot"]].forEach(([id, name]) => tabs.append(el("div", { class: "tab" + (tab === id ? " active" : ""), onclick: () => { tab = id; click(); rebuild(); } }, name)));
    list.innerHTML = "";
    if (tab === "balls") {
      for (const b of BALLS) {
        const owned = save.ownedBalls.includes(b.id);
        const equipped = save.ball === b.id;
        let action;
        if (equipped) action = el("button", { disabled: true }, "Equipped");
        else if (owned) action = el("button", { class: "btn-ghost", onclick: () => { save.ball = b.id; persist(); click(); rebuild(); refreshBalls(); } }, "Equip");
        else action = el("button", { class: save.coins >= b.price ? "btn-gold" : "btn-ghost", onclick: () => buyBall(b, rebuild) }, `${fmt(b.price)} 🪙`);
        list.append(card(b.color, b.name, b.rar, `${b.desc}  ·  DMG ${b.dmg}`, action));
      }
    } else {
      const lvl = save.power;
      const info = el("div", { class: "card" },
        el("div", { class: "swatch", style: "background:linear-gradient(135deg,#c8503c,#7a4a24)" }),
        el("div", { class: "info" }, el("div", { class: "name" }, `Slingshot — Level ${lvl}/${MAX_POWER}`),
          el("div", { class: "desc" }, `Launch power ×${launchPowerFactor(lvl).toFixed(2)}  ·  Damage ×${damageFactor(lvl).toFixed(2)}`)));
      list.append(info);
      if (lvl < MAX_POWER) {
        const cost = powerCost(lvl);
        list.append(el("button", { class: "btn-primary btn-block btn-lg", disabled: save.coins < cost, onclick: () => { if (save.coins >= cost) { save.coins -= cost; save.power++; statMax("power", save.power); persist(); Audio.sfx("purchase"); toast(`Slingshot Level ${save.power}!`); refreshHUD(); rebuild(); } }, style: "max-width:820px;margin:0 auto;width:100%" }, `Upgrade to Level ${lvl + 1}  —  ${fmt(cost)} 🪙`));
      } else list.append(el("div", { class: "section-title", style: "text-align:center;color:var(--green)" }, "Fully upgraded! 🏹"));
    }
  }
  rebuild();
  s.append(header("Shop", toMenu), tabs, list);
  return s;
}
function buyBall(b, cb) {
  if (save.ownedBalls.includes(b.id)) return;
  if (save.coins < b.price) { toast("Not enough coins"); Audio.sfx("click"); return; }
  save.coins -= b.price; save.ownedBalls.push(b.id); save.ball = b.id; persist();
  Audio.sfx("purchase"); toast(`Unlocked ${b.name}!`); refreshHUD(); refreshBalls(); checkAchievements(); cb();
}
function card(color, name, rar, desc, action) {
  return el("div", { class: "card" },
    el("div", { class: "swatch", style: `background:radial-gradient(circle at 35% 30%, ${shade(color, 0.25)}, ${color})` }),
    el("div", { class: "info" }, el("div", { class: "name" }, name), el("div", { class: "rarity", style: `color:${RARITY[rar]}` }, rar), el("div", { class: "desc" }, desc)),
    action);
}

function screenAchievements() {
  const s = el("div", { class: "screen" });
  const list = el("div", { class: "list" });
  const unlocked = ACHS.filter(a => save.achs.includes(a.id)).length;
  list.append(el("div", { class: "section-title" }, `Unlocked ${unlocked}/${ACHS.length}`));
  for (const a of ACHS) {
    let cur = a.metric === "trees" ? save.stats.trees : a.metric === "highest" ? save.highest : a.metric === "bosses" ? save.stats.bosses : a.metric === "bestcombo" ? save.stats.bestcombo : a.metric === "balls" ? save.ownedBalls.length : save.power;
    const done = save.achs.includes(a.id);
    list.append(el("div", { class: "card", style: done ? "border-bottom-color:var(--accent)" : "" },
      el("div", { class: "swatch", style: `background:${done ? "#2a3a2a" : "#222"};display:flex;align-items:center;justify-content:center;font-size:26px` }, a.icon),
      el("div", { class: "info" }, el("div", { class: "name" }, a.name + (done ? " ✓" : "")),
        el("div", { class: "desc" }, `${fmt(Math.min(cur, a.target))} / ${fmt(a.target)}`),
        el("div", { class: "bar", style: "margin-top:6px" }, el("span", { style: `width:${clamp(cur / a.target, 0, 1) * 100}%;background:${done ? "var(--accent)" : "var(--blue)"}` }))),
      el("div", { class: "v", style: "color:var(--accent);font-weight:700;white-space:nowrap" }, `+${fmt(a.reward)} 🪙`)));
  }
  s.append(header("Achievements", toMenu), list);
  return s;
}

function screenSettings() {
  const s = el("div", { class: "screen" });
  const list = el("div", { class: "list" });
  list.append(sliderRow("Music Volume", save.settings.music, v => { save.settings.music = v; Audio.applyVolumes(); persist(); }));
  list.append(sliderRow("Sound FX Volume", save.settings.sfx, v => { save.settings.sfx = v; Audio.applyVolumes(); persist(); }));
  list.append(toggleRow("Screen Shake", save.settings.shake, v => { save.settings.shake = v; persist(); }));
  list.append(toggleRow("Damage Numbers", save.settings.damageNums, v => { save.settings.damageNums = v; persist(); }));
  list.append(el("button", { class: "btn-danger", style: "max-width:820px;margin:8px auto 0;width:100%", onclick: confirmReset }, "⚠ Reset All Progress"));
  s.append(header("Settings", toMenu), list);
  return s;
}
function sliderRow(label, val, cb) {
  const out = el("span", { style: "width:44px;text-align:right;color:var(--dim)" }, Math.round(val * 100) + "%");
  const r = el("input", { type: "range", min: 0, max: 1, step: 0.05, value: val });
  r.addEventListener("input", () => { out.textContent = Math.round(r.value * 100) + "%"; cb(parseFloat(r.value)); });
  return el("div", { class: "setting" }, el("label", {}, label), r, out);
}
function toggleRow(label, val, cb) {
  const t = el("div", { class: "toggle" + (val ? " on" : "") });
  t.addEventListener("click", () => { const on = !t.classList.contains("on"); t.classList.toggle("on", on); cb(on); Audio.sfx("click"); });
  return el("div", { class: "setting" }, el("label", {}, label), t);
}
function confirmReset() {
  modal(el("div", { class: "modal" },
    el("h2", {}, "Reset everything?"),
    el("div", { class: "sub" }, "This permanently deletes all coins, unlocks and progress."),
    el("div", { class: "row" },
      el("button", { class: "btn-ghost", onclick: closeModal }, "Cancel"),
      el("button", { class: "btn-danger", onclick: () => { save = defaultSave(); persist(); closeModal(); toMenu(); toast("Progress reset"); } }, "Reset"))));
}

function screenCredits() {
  const s = el("div", { class: "screen" });
  s.append(header("Credits", toMenu),
    el("div", { class: "list" },
      el("div", { class: "logo", style: "font-size:40px;text-align:center" }, "FOREST SLING"),
      el("div", { class: "credits-list" },
        el("p", {}, el("b", {}, "Design & Code: "), "Built with HTML5 Canvas & vanilla JS"),
        el("p", {}, el("b", {}, "Art: "), "100% procedural vector graphics"),
        el("p", {}, el("b", {}, "Audio: "), "Fully synthesised SFX & music (WebAudio)"),
        el("p", {}, el("b", {}, "Features: "), "8 balls · 100 levels · 10 worlds · 10 bosses · combos · chain reactions · chests · achievements · 50 upgrade levels"),
        el("p", { style: "color:var(--accent);text-align:center;font-size:20px" }, "Thanks for playing! ♥"))));
  return s;
}

// modals
let modalBg = null;
function modal(node) { closeModal(); modalBg = el("div", { class: "modal-bg" }, node); uiLayer.append(modalBg); }
function closeModal() { if (modalBg) { modalBg.remove(); modalBg = null; } }
function togglePause() {
  if (G.state !== "play" || G.ended) { if (modalBg) { closeModal(); } return; }
  if (modalBg) { closeModal(); return; }
  click();
  modal(el("div", { class: "modal" },
    el("h2", {}, "Paused"),
    el("button", { class: "btn-primary btn-block btn-lg", onclick: closeModal }, "▶ Resume"),
    el("button", { class: "btn-ghost btn-block", style: "margin-top:10px", onclick: () => { closeModal(); startLevel(G.level); } }, "↻ Restart"),
    el("button", { class: "btn-ghost btn-block", style: "margin-top:10px", onclick: () => { closeModal(); quitToMenu(); } }, "⏏ Quit to Menu")));
}
function quitToMenu() { Audio.stopMusic(); G.state = "menu"; G.ball = null; hud.classList.add("hidden"); toMenu(); }

function showVictory(stars) {
  const isFinal = G.level >= MAX_LEVEL;
  const m = el("div", { class: "modal" });
  m.append(el("h2", {}, isFinal ? "FOREST CONQUERED! 👑" : "Level Cleared!"));
  m.append(el("div", { class: "stars-big" }, "★".repeat(stars).padEnd(3, "☆").split("").map((c, i) => el("span", { style: `color:${i < stars ? "#ffcf4a" : "#444"}` }, c))));
  m.append(el("div", { class: "reward-row" }, el("span", {}, "🪙 Coins earned"), el("span", { class: "v" }, "+" + fmt(G.coinsEarned))));
  m.append(el("div", { class: "sub" }, `Shots used: ${G.shotsUsed}  ·  Best combo: x${G.bestCombo}`));
  const row = el("div", { class: "row" });
  if (!isFinal) row.append(el("button", { class: "btn-primary", onclick: () => { closeModal(); startLevel(G.level + 1); } }, "Next ›"));
  row.append(el("button", { class: "btn-ghost", onclick: () => { closeModal(); startLevel(G.level); } }, "↻ Replay"));
  row.append(el("button", { class: "btn-ghost", onclick: () => { closeModal(); quitToMenu(); } }, "⏏ Menu"));
  m.append(row);
  if (!isFinal) m.append(el("button", { class: "btn-gold btn-block", style: "margin-top:10px", onclick: () => { closeModal(); quitToMenu(); showScreen(screenShop()); } }, "🛒 Visit Shop"));
  else m.append(el("div", { class: "sub", style: "margin-top:10px;color:var(--green)" }, "You beat all 100 levels! Keep replaying for coins & stars."));
  modal(m);
}
function showDefeat() {
  modal(el("div", { class: "modal" },
    el("h2", {}, "Out of Shots"),
    el("div", { class: "sub" }, `${G.treesLeft} tree${G.treesLeft === 1 ? "" : "s"} left standing. You kept ${fmt(G.coinsEarned)} 🪙 earned.`),
    el("div", { class: "row" },
      el("button", { class: "btn-primary", onclick: () => { closeModal(); startLevel(G.level); } }, "↻ Try Again"),
      el("button", { class: "btn-ghost", onclick: () => { closeModal(); quitToMenu(); showScreen(screenShop()); } }, "🛒 Shop"),
      el("button", { class: "btn-ghost", onclick: () => { closeModal(); quitToMenu(); } }, "⏏ Menu"))));
}
function click() { Audio.init(); Audio.sfx("click"); }

// ------------------------------------------------------------------ init ----
function init() {
  loadSave();
  resize();
  buildHUD();
  toMenu();
  requestAnimationFrame(loop);
  window.addEventListener("pointerdown", () => Audio.init(), { once: false });
}
init();

// Debug/test handle (harmless in production; useful for automated checks).
window.__forest = {
  G, WORLDS, BALLS, getSave: () => save, startLevel,
  fire: fireBall, loadBall, update, render, canvas,
  step(n, dt) { for (let i = 0; i < n; i++) update(dt || 1 / 120); },
};

})();
