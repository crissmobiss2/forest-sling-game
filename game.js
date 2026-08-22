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

// Cosmetic ball trails (col(f) — f=1 at the head, 0 at the tail). Never affect gameplay.
const TRAILS = [
  { id: "none", name: "Classic Trail", rar: "common", cost: 0, cur: "coins", col: (f, bc) => bc },
  { id: "fire", name: "Fire Trail", rar: "rare", cost: 900, cur: "coins", col: f => lerpColor("#c0361f", "#fff2a0", f) },
  { id: "ice", name: "Ice Trail", rar: "rare", cost: 900, cur: "coins", col: f => lerpColor("#3a9fd6", "#ffffff", f) },
  { id: "neon", name: "Neon Trail", rar: "epic", cost: 1800, cur: "coins", col: f => lerpColor("#ff2ad6", "#2affd6", f) },
  { id: "rainbow", name: "Rainbow Trail", rar: "legendary", cost: 12, cur: "gems", col: f => `hsl(${(f * 200 + cloudT * 80) % 360},90%,62%)` },
  { id: "galaxy", name: "Galaxy Trail", rar: "legendary", cost: 16, cur: "gems", col: f => lerpColor("#2a1a5a", "#ff9fe0", f) },
];
const trailById = id => TRAILS.find(t => t.id === id) || TRAILS[0];

// Cosmetic slingshot skins.
const SKINS = [
  { id: "default", name: "Wood", rar: "common", cost: 0, cur: "coins", wood: "#8a5a2c", wood2: "#6b4420", band: "#c8503c" },
  { id: "gold", name: "Gold", rar: "epic", cost: 2500, cur: "coins", wood: "#e0b23a", wood2: "#a87a1a", band: "#fff2b0" },
  { id: "crystal", name: "Crystal", rar: "epic", cost: 2500, cur: "coins", wood: "#6fc6dd", wood2: "#3a8fae", band: "#e0fff7" },
  { id: "shadow", name: "Shadow", rar: "rare", cost: 1800, cur: "coins", wood: "#2a2a34", wood2: "#14141a", band: "#6a6a8a" },
  { id: "dragon", name: "Dragon", rar: "legendary", cost: 20, cur: "gems", wood: "#c0361f", wood2: "#6a1a1a", band: "#ffd24d" },
  { id: "neon", name: "Neon", rar: "legendary", cost: 14, cur: "gems", wood: "#ff2ad6", wood2: "#7a1080", band: "#2affd6" },
];
const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];
const cosmeticById = id => TRAILS.find(t => t.id === id) || SKINS.find(s => s.id === id);

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
const powerCost = p => Math.round(110 * Math.pow(1.135, p - 1));
const launchPowerFactor = p => 1 + (p - 1) * 0.05;   // affects speed
const damageFactor = p => 1 + (p - 1) * 0.045;

const ACHS = [
  { id:"trees100", name:"Lumberjack", metric:"trees", target:100, reward:400, icon:"🌲" },
  { id:"trees1000", name:"Deforester", metric:"trees", target:1000, reward:2000, gems:5, icon:"🌳" },
  { id:"trees5000", name:"Timber Titan", metric:"trees", target:5000, reward:8000, gems:15, icon:"🪓" },
  { id:"lvl25", name:"Adventurer", metric:"highest", target:25, reward:1500, icon:"🏁" },
  { id:"lvl50", name:"Trailblazer", metric:"highest", target:50, reward:4000, gems:8, icon:"🏁" },
  { id:"lvl100", name:"Forest Legend", metric:"highest", target:100, reward:12000, gems:30, icon:"👑" },
  { id:"boss5", name:"Giant Slayer", metric:"bosses", target:5, reward:3000, gems:6, icon:"💀" },
  { id:"boss10", name:"Boss Master", metric:"bosses", target:10, reward:8000, gems:20, icon:"💀" },
  { id:"combo15", name:"Combo King", metric:"bestcombo", target:15, reward:2000, gems:5, icon:"🔥" },
  { id:"combo30", name:"Chain Reactor", metric:"bestcombo", target:30, reward:6000, gems:15, icon:"⚡" },
  { id:"allballs", name:"Collector", metric:"balls", target:BALLS.length, reward:5000, gems:12, icon:"⚫" },
  { id:"power50", name:"Fully Charged", metric:"power", target:50, reward:6000, gems:10, icon:"🏹" },
  { id:"prestige1", name:"Reborn", metric:"prestige", target:1, reward:3000, gems:25, icon:"🌟" },
  { id:"prestige3", name:"Ascendant", metric:"prestige", target:3, reward:10000, gems:60, icon:"✨" },
];

// ------------------------------------------------------------------ save ----
const SAVE_KEY = "forestsling_save_v1";
let save;
function defaultSave() {
  return {
    coins: 0, gems: 0, highest: 1, power: 1,
    prestige: 0, champion: false, lastLogin: "", streak: 0, tutorialSeen: false,
    ownedBalls: ["wood"], ball: "wood",
    trail: "none", skin: "default", ownedCosmetics: ["none", "default"],
    stars: {}, bestScore: {}, starMilestone: 0, achs: [],
    stats: { trees: 0, bosses: 0, bestcombo: 0, shots: 0, levels: 0 },
    settings: { music: 0.5, sfx: 0.8, shake: true, damageNums: true, haptics: true, reduceMotion: false, aimGuide: true, muteAll: false, highContrast: false },
  };
}
function addGems(v) { save.gems = Math.max(0, (save.gems || 0) + v); persist(); refreshHUD(); }
function prestigeMult() { return 1 + (save.prestige || 0) * 0.3; }
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
    else if (a.metric === "prestige") cur = save.prestige || 0;
    if (cur >= a.target) {
      save.achs.push(a.id); save.coins += a.reward;
      if (a.gems) save.gems = (save.gems || 0) + a.gems;
      persist();
      toast(`🏆 ${a.name}  +${fmt(a.reward)} 🪙${a.gems ? "  +" + a.gems + " 💎" : ""}`);
      Audio.sfx("achievement"); refreshHUD();
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
    const mute = save.settings.muteAll ? 0 : 1;
    master.gain.value = 0.9 * mute;
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
function shake(mag) { if (!save.settings.shake) return; if (save.settings.reduceMotion) mag *= 0.35; cam.shMag = Math.max(cam.shMag, mag); cam.shT = 0.35; }
function triggerSlowmo(dur) { if (save.settings.reduceMotion) return; G.slowmoT = Math.max(G.slowmoT || 0, dur); }
function zoomPunch(z) { cam.tzoom = z; }

// ------------------------------------------------------------------ state ---
const G = {
  state: "menu",          // menu | play | over
  level: 1, world: WORLDS[0], fieldW: 2000,
  trees: [], boss: null, chests: [], particles: [], bolts: [],
  rings: [], coinFX: [], leaves: [], decor: [],
  ball: null, aim: { active: false, px: 0, py: 0, wx: 0, wy: 0 },
  shots: 6, shotsLeft: 6, treesLeft: 0, treesTotal: 0,
  coinsEarned: 0, shotsUsed: 0, reviveUsed: false,
  combo: 0, comboT: 0, bestCombo: 0,
  canAim: false, timeScale: 1, hitstopT: 0, slowmoT: 0, ended: false, ctxParticleParent: null,
};

// ------------------------------------------------------------------ level ---
function seedRand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function generateLevel(lvl) {
  const w = WORLDS[worldIndex(lvl)];
  G.level = lvl; G.world = w; G.ended = false; G.reviveUsed = false;
  G.trees = []; G.boss = null; G.chests = []; G.particles = []; G.bolts = [];
  G.rings = []; G.coinFX = []; G.leaves = []; G.decor = [];
  G.coinsEarned = 0; G.gemsEarned = 0; G.score = 0; G.coinMult = 1; G.giantShots = 0;
  G.shotsUsed = 0; G.combo = 0; G.comboT = 0; G.bestCombo = 0; G.wind = 0; G.balloons = [];
  const rng = seedRand(lvl * 2654435761);
  const hpScale = 1 + (save.prestige || 0) * 0.28;  // prestige makes everything tougher

  if (isBossLevel(lvl)) {
    G.fieldW = 1500;
    G.boss = makeBoss(w, lvl, (160 + worldIndex(lvl) * 120 + lvl * 4) * hpScale);
    G.treesTotal = 1; G.treesLeft = 1;
    G.shots = 14 + worldIndex(lvl); G.shotsLeft = G.shots;
    generateDecor(rng);
    return;
  }

  const count = Math.min(4 + localLevel(lvl) + worldIndex(lvl), 22);
  let x = 500 + rng() * 70;
  for (let i = 0; i < count; i++) {
    let hp = (11 + lvl * 4 + worldIndex(lvl) * 7) * rand(0.85, 1.2) * hpScale;
    let kind = "normal";
    const kr = rng();
    if (lvl >= 2 && kr < 0.05) kind = "gold";
    else if (lvl >= 3 && kr < 0.19) { kind = "tnt"; hp *= 0.7; }
    else if (lvl >= 7 && kr < 0.30) { kind = "armor"; hp *= 1.3; }
    addTree(x, w, hp, rng, true, kind);
    let gap = 112;
    gap *= rng() < 0.35 ? rand(0.5, 0.72) : rand(0.95, 1.45);
    x += gap;
  }
  G.fieldW = x + 300;
  G.treesTotal = count; G.treesLeft = count;
  G.shots = Math.ceil(count * 0.85) + 2; G.shotsLeft = G.shots;
  // chest / power-up crate
  if (rng() < 0.36) {
    const kinds = ["coins", "coins", "gems", "shots", "double", "giant"];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    G.chests.push({ x: rand(720, G.fieldW - 380), y: GROUND_Y, opened: false, s: 1, a: 1, kind });
  }
  // wind bends the trajectory on some levels (shown in the aim preview & HUD)
  if (lvl >= 8 && rng() < 0.32) G.wind = (rng() < 0.5 ? -1 : 1) * rand(150, 360);
  // floating balloon bonus targets — pop them for coins before they drift away
  if (lvl >= 5) { const nb = rng() < 0.5 ? (rng() < 0.4 ? 2 : 1) : 0; const bcols = ["#ff5a7a", "#5bb8ff", "#67d982", "#ffcf4a", "#c07bff"]; for (let i = 0; i < nb; i++) G.balloons.push({ x: rand(650, G.fieldW - 300), y: GROUND_Y - rand(60, 200), r: 20, vy: -rand(14, 28), col: bcols[Math.floor(rng() * 5)], popped: false, a: 1, phase: rng() * 6.28 }); }
  generateDecor(rng);
}

// Scatter rocks / bushes / flowers along the ground (seeded for consistency).
function generateDecor(rng) {
  const w = G.world;
  const n = Math.floor(G.fieldW / 90);
  const flowerCols = ["#ff6a8a", "#ffd24d", "#ff9a4a", "#c07bff", "#ffffff"];
  for (let i = 0; i < n; i++) {
    const x = rng() * G.fieldW;
    const r = rng();
    if (r < 0.4) G.decor.push({ type: "grass", x, s: 0.7 + rng() * 0.8, phase: rng() * 6.28, col: shade(w.ground, 0.14) });
    else if (r < 0.62) G.decor.push({ type: "bush", x, s: 0.7 + rng() * 0.7, phase: rng() * 6.28, col: w.leaf2, col2: shade(w.leaf, 0.1) });
    else if (r < 0.8) G.decor.push({ type: "rock", x, s: 0.6 + rng() * 0.9, col: shade(w.hill, 0.05) });
    else G.decor.push({ type: "flower", x, s: 0.7 + rng() * 0.6, phase: rng() * 6.28, col: flowerCols[(rng() * flowerCols.length) | 0] });
  }
  G.decor.sort((a, b) => a.x - b.x);
}

function addTree(x, w, hp, rng, counts, kind) {
  const scale = rand(0.9, 1.25);
  const pine = (rng ? rng() : Math.random()) < 0.4;
  const trunkH = 60 * scale, trunkW = 16 * scale, canopyR = 48 * scale;
  G.trees.push({
    x, hp, maxHp: hp, world: w, pine, scale, trunkH, trunkW, canopyR, kind: kind || "normal",
    canopyCy: GROUND_Y - trunkH - canopyR * 0.55,
    shakeT: 0, hurtT: 0, flashT: 0, dead: false, topple: 0, fallDir: 1, hitCd: {}, counts,
    a: 1, phase: Math.random() * 6.28, squash: 0,
  });
}

function makeBoss(w, lvl, hp) {
  return {
    x: 900, y: GROUND_Y - 220, r: 92, hp, maxHp: hp, phase: 0, t: 0, dead: false,
    weakOpen: true, weakT: 1.6, flash: 0, invuln: 0, cx: 900, world: w,
    eye: "#ff5a4a", wob: 0, attackT: 4.5,
  };
}
function bossSlam(boss) {
  shake(16); flash("rgba(255,80,60,0.12)", 0.3); vibrate([22, 24]);
  Audio.sfx("stone");
  for (let i = 0; i < 10; i++) { const rx = boss.x + rand(-260, 260); G.particles.push({ x: rx, y: boss.y - 520, vx: rand(-20, 20), vy: rand(200, 380), life: 2, max: 2, r: rand(4, 8), col: "#6a5a4a", g: 400, shape: "square", rot: rand(0, 6.28), vrot: rand(-4, 4) }); }
  ringFX(boss.x, GROUND_Y - 4, 120, "#ffb060", 6);
  toast("💥 The boss slams the ground!");
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
  if (G.giantShots > 0) { G.ball.r *= 1.7; G.ball.dmgMult = 1.6; G.giantShots--; }
  G.aim.active = false; G.canAim = true;
  cam.follow = false;
}
G.canAimAllowed = () => G.state === "play" && !G.ended && G.shotsLeft > 0;

function fireBall(dirx, diry, power) {
  const b = G.ball; if (!b) return;
  const speed = power * 1700 * launchPowerFactor(save.power) * b.data.spd;
  // Launch from the fork/pouch anchor (matches the trajectory preview) so a
  // downward pull doesn't start the ball below ground and kill its velocity.
  b.x = SLING_X; b.y = GROUND_Y - 18;
  b.trail.length = 0;
  b.vx = dirx * speed; b.vy = diry * speed;
  b.held = false; b.launched = true;
  G.canAim = false; G.aim.active = false;
  G.shotsUsed++; G.shotsLeft = Math.max(0, G.shotsLeft - 1);
  statAdd("shots", 1);
  cam.follow = true;
  hideHint();
  Audio.sfx("launch");
  refreshShots();
}

// physics step for the ball
function stepBall(dt) {
  const b = G.ball;
  if (!b || b.held || b.dead) return;
  b.air += dt;
  b.vy += GRAVITY * dt;
  if (G.wind) b.vx += G.wind * dt;
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
  // balloons
  for (const bl of G.balloons) if (!bl.popped) {
    if (dist2(b.x, b.y, bl.x, bl.y) < (b.r + bl.r) * (b.r + bl.r)) popBalloon(bl);
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
  let dmg = b.data.dmg * damageFactor(save.power) * sf * (b.dmgMult || 1);
  let crit = Math.random() < (b.data.effect === "crit" ? 0.35 : 0.06);
  if (crit) dmg *= 2;
  // Armored trees shrug off light hits — reward heavy/explosive balls & crits.
  if (t.kind === "armor" && !crit && b.data.effect !== "heavy" && b.data.effect !== "explode") { dmg *= 0.6; if (Math.random() < 0.4) sparkClang(at); }
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
  t.hp -= dmg; t.shakeT = 0.2; t.hurtT = 1.6; t.flashT = 0.12; t.squash = 1;
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
  shake(5); G.hitstopT = Math.max(G.hitstopT, 0.03);
  statAdd("trees", 1);
  if (t.counts) G.treesLeft = Math.max(0, G.treesLeft - 1);

  // combo & coins
  G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.comboT = 2.6;
  statMax("bestcombo", G.combo);
  showCombo();
  const mult = 1 + Math.min(G.combo, 30) * 0.1 + worldIndex(G.level) * 0.05;
  let reward = Math.round((5 + G.level * 0.6) * mult * (chain ? 1.5 : 1) * (G.coinMult || 1) * prestigeMult());
  G.score += Math.round(10 * mult) + (chain ? 6 : 0);
  if (t.kind === "gold") {
    reward = Math.round(reward * 10); G.score += 120;
    if (Math.random() < 0.5) { addGems(1); G.gemsEarned++; }
    for (let i = 0; i < 22; i++) { const a = rand(0, 6.28), s = rand(60, 260); G.particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.5, 1), max: 1, r: rand(2, 5), col: "#ffcf4a", g: 400, glow: true }); }
    ringFX(cx, cy, t.canopyR * 2.4, "#ffcf4a", 6); toast("💰 Golden Tree!  +" + fmt(reward) + " 🪙"); Audio.sfx("gem");
  }
  G.coinsEarned += reward; addCoins(reward);
  coinPop(cx, cy, reward);
  vibrate(t.kind === "tnt" ? 26 : 12);

  // TNT: devastating chain explosion (can set off other TNT for cascades)
  if (t.kind === "tnt") {
    explosionFX(cx, cy, 190, "#ff5a2c"); areaDamage(cx, cy, 205, t.maxHp * 1.4 + 70);
    Audio.sfx("explosion"); shake(18); G.hitstopT = Math.max(G.hitstopT, 0.08); ringFX(cx, cy, 230, "#ffd66a", 8);
  }

  // chain reaction
  if (t.counts || chain) {
    const radius = t.canopyR * 2 + 50;
    for (const o of G.trees) { if (o === t || o.dead) continue; if (dist2(t.x, t.canopyCy, o.x, o.canopyCy) < radius * radius) applyTreeDamage(o, t.maxHp * 0.6 + 20, false, { x: t.x, y: t.canopyCy }, true); }
  }
  if (G.treesLeft <= 0 && G.boss == null) { triggerSlowmo(0.55); winLevel(); }
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
  dmg *= 2.1 * mult;
  if (hitWeak) explosionFX(at.x, at.y, 40, "#ffe14d");
  boss.hp = Math.max(0, boss.hp - dmg); boss.flash = 0.12; boss.wob = (at.x < boss.x ? 1 : -1) * 14;
  if (save.settings.damageNums) popup(at.x, at.y - 20, Math.round(dmg), hitWeak ? "#ffe14d" : "#fff", hitWeak ? 24 : 18);
  Audio.sfx("bossHit"); shake(6); vibrate(hitWeak ? 18 : 9);
  refreshBossBar();
  // phases
  const ratio = boss.hp / boss.maxHp, np = ratio <= 0.33 ? 2 : ratio <= 0.66 ? 1 : 0;
  if (np > boss.phase) { boss.phase = np; boss.invuln = 0.7; boss.eye = ["#ff5a4a","#ff7a2a","#ff2a6a"][np]; shake(14); toast("The boss enrages!"); }
  if (boss.hp <= 0) killBoss(boss);
}
function killBoss(boss) {
  boss.dead = true; statAdd("bosses", 1); triggerSlowmo(0.8);
  Audio.sfx("bossDie"); shake(22); flash("#fff", 0.5); vibrate([40, 30, 80]);
  for (let i = 0; i < 40; i++) G.particles.push({ x: boss.x + rand(-60, 60), y: boss.y + rand(-60, 60), vx: rand(-300, 300), vy: rand(-400, 100), life: rand(0.6, 1.2), max: 1.2, r: rand(3, 8), col: boss.world.leaf, g: 500 });
  setTimeout(() => { if (G.state === "play") winLevel(); }, 900);
}
function stepBoss(boss, dt) {
  boss.t += dt;
  const sp = 1 + boss.phase * 0.28;
  boss.x = boss.cx + Math.sin(boss.t * 0.36 * sp) * 92;
  boss.y = GROUND_Y - 220 + Math.sin(boss.t * 0.8 * sp) * 16;
  boss.wob *= 0.9;
  boss.weakT -= dt; if (boss.weakT <= 0) { boss.weakOpen = !boss.weakOpen; boss.weakT = boss.weakOpen ? [2.4,2.0,1.6][boss.phase] : [0.8,0.75,0.65][boss.phase]; }
  if (boss.flash > 0) boss.flash -= dt;
  if (boss.invuln > 0) boss.invuln -= dt;
  boss.attackT -= dt;
  if (boss.attackT <= 0) { bossSlam(boss); boss.attackT = [5.5, 4.5, 3.5][boss.phase]; }
}

// ------------------------------------------------------------------ chest ---
function openChest(c) {
  c.opened = true;
  const cx = c.x, cy = c.y - 24, kind = c.kind || "coins";
  for (let i = 0; i < 16; i++) G.particles.push({ x: cx, y: cy, vx: rand(-160, 160), vy: rand(-320, -60), life: rand(0.5, 1), max: 1, r: rand(2, 5), col: "#ffcf4a", g: 500, glow: true });
  Audio.sfx("purchase"); shake(6); vibrate(14); ringFX(cx, cy, 64, "#ffcf4a", 4);
  if (kind === "coins") { const coins = randi(120, 320); addCoins(coins); G.coinsEarned += coins; coinPop(cx, cy - 6, coins); toast(`Chest!  +${fmt(coins)} 🪙`); }
  else if (kind === "gems") { const g = randi(1, 3); addGems(g); G.gemsEarned += g; popup(cx, cy - 30, `+${g} 💎`, "#ff8ab0", 24); toast(`Chest!  +${g} 💎`); Audio.sfx("gem"); }
  else if (kind === "shots") { G.shots += 2; G.shotsLeft += 2; refreshShots(); bigCallout("+2 SHOTS!"); toast("Power-up: +2 shots!"); }
  else if (kind === "double") { G.coinMult = 2; bigCallout("2× COINS!"); toast("Power-up: double coins this level!"); }
  else if (kind === "giant") { G.giantShots += 1; bigCallout("GIANT BALL!"); toast("Power-up: giant ball next shot!"); }
}
function popBalloon(bl) {
  bl.popped = true; bl.a = 1;
  const coins = randi(30, 70) + G.level * 2; addCoins(coins); G.coinsEarned += coins; G.score += 40;
  coinPop(bl.x, bl.y, coins);
  for (let i = 0; i < 14; i++) { const a = rand(0, 6.28); G.particles.push({ x: bl.x, y: bl.y, vx: Math.cos(a) * rand(80, 220), vy: Math.sin(a) * rand(80, 220), life: 0.5, max: 0.5, r: rand(2, 4), col: bl.col, g: 300, glow: true }); }
  ringFX(bl.x, bl.y, 52, bl.col, 4); Audio.sfx("coin"); vibrate(9);
}

// ------------------------------------------------------------------ FX ------
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function ringFX(x, y, maxR, col, width) { G.rings.push({ x, y, r: maxR * 0.12, maxR, t: 0, life: 0.5, col, width: width || 4 }); }
function vibrate(ms) { if (save.settings.haptics !== false && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
function sparkClang(at) { for (let i = 0; i < 6; i++) { const a = rand(-1.2, 1.2) - 1.57; G.particles.push({ x: at.x, y: at.y, vx: Math.cos(a) * rand(120, 260), vy: Math.sin(a) * rand(120, 260), life: 0.3, max: 0.3, r: rand(1.5, 3), col: "#ffe9a0", g: 400, glow: true }); } Audio.sfx("bossHit"); vibrate(8); }

function impactFX(x, y, spd, color) {
  const n = clamp(4 + spd / 100, 5, 16) | 0;
  for (let i = 0; i < n; i++) { const a = rand(0, 6.28), s = rand(30, spd * 0.5); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rand(0.25, 0.55), max: 0.55, r: rand(1.5, 3.5), col: color, g: 500, glow: true }); }
  ringFX(x, y, clamp(spd * 0.08, 16, 54), color, 3);
  if (spd > 380) { Audio.sfx("impactHard"); shake(clamp(spd / 120, 3, 9)); vibrate(7); } else Audio.sfx("impact");
}
function spawnDust(x, y, n) { for (let i = 0; i < n; i++) G.particles.push({ x: x + rand(-12, 12), y, vx: rand(-70, 70), vy: rand(-90, -20), life: rand(0.4, 0.8), max: 0.8, r: rand(5, 11), col: "#cbb890", g: 90, shape: "smoke", rot: rand(0, 6.28), vrot: rand(-2, 2) }); }
function treeBreakFX(x, y, t) {
  const w = t.world;
  for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), s = rand(60, 340); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: rand(0.6, 1.3), max: 1.3, r: rand(3, 7), col: i % 2 ? w.leaf : w.leaf2, g: 420, shape: "leaf", rot: rand(0, 6.28), vrot: rand(-6, 6), drag: 1.4 }); }
  for (let i = 0; i < 8; i++) G.particles.push({ x, y: y + t.canopyR * 0.6, vx: rand(-160, 160), vy: rand(-260, -40), life: rand(0.5, 0.9), max: 0.9, r: rand(2, 4), col: shade(w.trunk, -0.05), g: 700, shape: "square", rot: rand(0, 6.28), vrot: rand(-8, 8) });
  spawnDust(x, GROUND_Y, 8);
  ringFX(x, y, t.canopyR * 1.6, w.leaf, 5);
}
function explosionFX(x, y, radius, color) {
  for (let i = 0; i < 22; i++) { const a = rand(0, 6.28), s = rand(radius * 0.6, radius * 3); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, life: rand(0.25, 0.5), max: 0.5, r: rand(4, 9), col: i % 3 ? "#ffd66a" : "#fff2b0", g: 120, glow: true }); }
  for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), s = rand(radius * 0.3, radius * 1.6); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8 - 30, life: rand(0.4, 0.85), max: 0.85, r: rand(7, 14), col: "#55555e", g: 40, shape: "smoke", rot: rand(0, 6.28), vrot: rand(-2, 2) }); }
  ringFX(x, y, radius * 1.5, "#ffd66a", 7);
  ringFX(x, y, radius * 2.1, color, 3);
  G.hitstopT = Math.max(G.hitstopT, 0.05);
}
function spawnCoinFly(wx, wy, amount) {
  if (G.coinFX.length > 55) return;
  const s = w2s(wx, wy);
  const n = clamp(1 + (amount / 8 | 0), 1, 5);
  for (let i = 0; i < n; i++) G.coinFX.push({ x: s.x + rand(-14, 14), y: s.y + rand(-14, 14), vx: rand(-120, 120), vy: rand(-320, -140), t: 0, delay: i * 0.04, spin: rand(0, 6.28) });
  Audio.sfx("coin");
}
function spawnLeaf() {
  const w = G.world, half = (cssW / 2) / (S * cam.zoom);
  G.leaves.push({ x: cam.x + rand(-half, half), y: cam.y - rand(140, 380), vx: rand(-20, 20), vy: rand(12, 34), rot: rand(0, 6.28), vrot: rand(-1.2, 1.2), sway: rand(0, 6.28), life: rand(4, 8), col: Math.random() < 0.5 ? w.leaf : w.leaf2, s: rand(0.55, 1.1) });
}

function stepParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.vy += p.g * dt;
    if (p.drag) { p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vrot) p.rot += p.vrot * dt;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) { G.bolts[i].t -= dt; if (G.bolts[i].t <= 0) G.bolts.splice(i, 1); }
  for (let i = G.rings.length - 1; i >= 0; i--) { const r = G.rings[i]; r.t += dt; r.r = lerp(r.maxR * 0.12, r.maxR, easeOut(r.t / r.life)); if (r.t >= r.life) G.rings.splice(i, 1); }
  stepCoinFX(dt);
  if (G.state === "play" && !G.ended && Math.random() < dt * 1.1 && G.leaves.length < 22) spawnLeaf();
  for (let i = G.leaves.length - 1; i >= 0; i--) { const l = G.leaves[i]; l.sway += dt * 2; l.x += (l.vx + Math.sin(l.sway) * 22) * dt; l.y += l.vy * dt; l.rot += l.vrot * dt; l.life -= dt; if (l.y > GROUND_Y - 3 || l.life <= 0) G.leaves.splice(i, 1); }
}
function stepCoinFX(dt) {
  const tgt = coinTarget();
  for (let i = G.coinFX.length - 1; i >= 0; i--) {
    const c = G.coinFX[i];
    if (c.delay > 0) { c.delay -= dt; continue; }
    c.t += dt; c.spin += dt * 12;
    if (c.t < 0.26) { c.vy += 1100 * dt; c.x += c.vx * dt; c.y += c.vy * dt; }
    else { const dx = tgt.x - c.x, dy = tgt.y - c.y, d = Math.hypot(dx, dy) || 1, sp = 700 + c.t * 1800; c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; if (d < 30) { G.coinFX.splice(i, 1); pulseCoin(); } }
  }
}
function coinTarget() { if (coinChipEl) { const r = coinChipEl.getBoundingClientRect(); if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } return { x: cssW - 80, y: 36 }; }

// DOM popups
function popup(wx, wy, text, color, size) {
  const s = w2s(wx, wy);
  const e = el("div", { class: "popup" + (size >= 24 ? " crit" : ""), style: `left:${s.x}px;top:${s.y}px;color:${color};font-size:${size}px` }, "" + text);
  fxLayer.append(e); setTimeout(() => e.remove(), 1100);
}
function coinPop(wx, wy, amount) {
  spawnCoinFly(wx, wy, amount);
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
  const big = comboEl.querySelector(".big"), mel = comboEl.querySelector(".mult");
  big.textContent = `COMBO ×${G.combo}`;
  mel.textContent = `${mult.toFixed(1)}× coins`;
  const heat = clamp((G.combo - 2) / 18, 0, 1);
  big.style.color = lerpColor("#ffcf4a", "#ff5a4a", heat);
  comboEl.style.opacity = "1"; comboEl.style.transform = `translateX(-50%) scale(${1.15 + heat * 0.35})`;
  setTimeout(() => { if (comboEl) comboEl.style.transform = "translateX(-50%) scale(1)"; }, 100);
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
  showHint();
  if (lvl === 1 && !save.tutorialSeen) { save.tutorialSeen = true; persist(); setTimeout(showTutorial, 260); }
}
function showTutorial() {
  const step = (n, icon, txt) => el("div", { class: "tut-step" }, el("div", { class: "tn" }, n), el("div", { class: "ti" }, icon), el("div", { class: "tx" }, txt));
  modal(el("div", { class: "modal" },
    el("h2", {}, "How to Sling 🎯"),
    el("div", { class: "tut-steps" },
      step("1", "👇", "Press & hold on the ball in the slingshot."),
      step("2", "↙️", "Drag DOWN & BACK — the dotted line previews the arc."),
      step("3", "🚀", "Release to fling forward. Farther pull = more power."),
      step("4", "🌲", "Smash every tree before you run out of shots!")),
    el("div", { class: "sub", style: "margin-top:6px" }, "Tip: chain trees fast to build a combo for bonus coins."),
    el("button", { class: "btn-primary btn-block", style: "margin-top:12px", onclick: () => { closeModal(); Audio.sfx("click"); } }, "Let's go! ▶")));
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
  if (b.kills >= 2) {
    const label = b.kills >= 6 ? "UNREAL! 🔥" : b.kills >= 5 ? "INCREDIBLE!" : b.kills >= 4 ? "AMAZING!" : b.kills >= 3 ? "GREAT SHOT!" : "DOUBLE!";
    const bonus = b.kills * 6 * (1 + worldIndex(G.level));
    addCoins(bonus); G.coinsEarned += bonus;
    bigCallout(label, "+" + fmt(bonus) + " 🪙");
    Audio.sfx("gem"); vibrate(20);
    if (b.kills >= 3) flash("rgba(255,220,120,0.12)", 0.3);
  }
  G.ball = null; cam.follow = false;
  turnEnded();
}
function bigCallout(title, sub) {
  const e = el("div", { class: "bigcallout" }, el("div", { class: "bc-title" }, title), sub ? el("div", { class: "bc-sub" }, sub) : null);
  fxLayer.append(e); setTimeout(() => e.remove(), 1300);
}
function winLevel() {
  if (G.ended) return; G.ended = true; G.state = "over";
  Audio.stopMusic(); Audio.sfx("win"); flash("#fff", 0.4); vibrate([20, 40, 20]);
  let stars = 1; if (G.shotsUsed <= Math.ceil(G.treesTotal * 0.6)) stars = 3; else if (G.shotsUsed <= G.treesTotal) stars = 2;
  if (G.boss) stars = Math.max(stars, 2);
  G.score += G.shotsLeft * 50 + stars * 100;
  const bonus = Math.round(30 + G.level * 6); addCoins(bonus); G.coinsEarned += bonus;
  if (G.boss) { const g = 2 + worldIndex(G.level); addGems(g); G.gemsEarned += g; }
  save.stars[G.level] = Math.max(save.stars[G.level] || 0, stars);
  save.bestScore[G.level] = Math.max(save.bestScore[G.level] || 0, G.score);
  save.stats.levels = (save.stats.levels || 0) + 1;
  if (G.level < MAX_LEVEL) { save.highest = Math.max(save.highest, G.level + 1); statMax("highest", save.highest); }
  if (G.level >= MAX_LEVEL) {
    save.highest = MAX_LEVEL; statMax("highest", MAX_LEVEL);
    if (!save.champion) { save.champion = true; const cg = 25; addGems(cg); G.gemsEarned += cg; toast(`👑 Champion! Forest cleared  +${cg} 💎`); }
  }
  checkStarMilestones();
  persist();
  setTimeout(() => showVictory(stars), 700);
}
function totalStars() { let s = 0; for (const k in save.stars) s += save.stars[k]; return s; }
function checkStarMilestones() {
  const ts = totalStars();
  const tiers = [{ n: 10, c: 500, g: 0 }, { n: 25, c: 1500, g: 2 }, { n: 50, c: 3000, g: 3 }, { n: 100, c: 6000, g: 5 }, { n: 150, c: 10000, g: 8 }, { n: 200, c: 15000, g: 12 }, { n: 250, c: 22000, g: 18 }, { n: 300, c: 40000, g: 30 }];
  for (const t of tiers) if (ts >= t.n && (save.starMilestone || 0) < t.n) { save.starMilestone = t.n; addCoins(t.c); if (t.g) addGems(t.g); toast(`⭐ ${t.n} Stars reached!  +${fmt(t.c)} 🪙${t.g ? " +" + t.g + " 💎" : ""}`); persist(); }
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
  // Keep the ball visually above the ground while aiming (power still uses the full pull).
  if (G.ball) { G.ball.x = rest.x + dx; G.ball.y = Math.min(rest.y + dy, GROUND_Y - G.ball.r - 2); }
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
  const realDt = dt;
  // hitstop
  if (G.hitstopT > 0) { G.hitstopT -= realDt; dt *= 0.15; }
  // winning-shot slow-mo (cinematic finish; skipped under reduce-motion)
  if (G.slowmoT > 0) { G.slowmoT -= realDt; dt *= 0.4; }
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
    for (const t of G.trees) { if (t.shakeT > 0) t.shakeT -= dt; if (t.hurtT > 0) t.hurtT -= dt; if (t.flashT > 0) t.flashT -= dt; if (t.squash > 0) t.squash = Math.max(0, t.squash - dt * 5); if (t.dead && t.topple > 0) { t.topple += dt; t.a = Math.max(0, 1 - (t.topple - 0.5) * 2); } }
    G.trees = G.trees.filter(t => !(t.dead && t.a <= 0));
    if (G.boss && !G.boss.dead) stepBoss(G.boss, dt);
    for (const c of G.chests) if (c.opened && c.a > 0) { c.a -= dt * 2; c.s += dt; }
    for (let i = G.balloons.length - 1; i >= 0; i--) { const bl = G.balloons[i]; if (bl.popped) { bl.a -= dt * 3; if (bl.a <= 0) G.balloons.splice(i, 1); } else { bl.y += bl.vy * dt; if (bl.y < -160) G.balloons.splice(i, 1); } }
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
  cloudT += 0.016;
  const w = G.world;
  drawSky(w);
  drawSun(w);
  drawClouds(w);
  drawHills(0.14, lerpColor(w.hill, w.sky[1], 0.5), 155);   // distant mountains
  drawHills(0.32, shade(w.hill, 0.05), 112);
  drawHills(0.58, shade(w.hill, -0.12), 80);

  // world transform
  ctx.save();
  ctx.translate(cssW / 2 + cam.shx, cssH / 2 + cam.shy);
  ctx.scale(S * cam.zoom, S * cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  drawGround(w);
  drawDecor(w);
  for (const c of G.chests) drawChest(c);
  for (const t of G.trees) drawTreeShadow(t);
  for (const t of G.trees) drawTree(t);
  if (G.boss && (!G.boss.dead || G.boss.hp > 0)) drawBoss(G.boss);
  drawBalloons();
  drawParticles();
  drawRings();
  drawBolts();
  drawSlingshot();
  drawTrajectory();
  drawBall();
  drawLeaves();

  ctx.restore();

  drawCoinFX();
  drawVignette();
  drawWindIndicator();
  requestAnimationFrame(loop);
}
function drawBalloons() {
  for (const bl of G.balloons) {
    ctx.save(); ctx.globalAlpha = bl.a; ctx.translate(bl.x + Math.sin(bl.phase + cloudT) * 6, bl.y);
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, bl.r); ctx.quadraticCurveTo(5, bl.r + 14, 0, bl.r + 26); ctx.stroke();
    const g = ctx.createRadialGradient(-bl.r * 0.3, -bl.r * 0.4, bl.r * 0.1, 0, 0, bl.r * 1.1); g.addColorStop(0, shade(bl.col, 0.32)); g.addColorStop(0.6, bl.col); g.addColorStop(1, shade(bl.col, -0.2));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, bl.r * 0.9, bl.r * 1.05, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = shade(bl.col, -0.15); ctx.beginPath(); ctx.moveTo(-3, bl.r); ctx.lineTo(3, bl.r); ctx.lineTo(0, bl.r + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-bl.r * 0.3, -bl.r * 0.35, bl.r * 0.2, bl.r * 0.3, -0.4, 0, 6.28); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function drawWindIndicator() {
  if (!G.wind || G.state !== "play") return;
  const cx = cssW / 2, y = Math.max(78, cssH * 0.13), dir = Math.sign(G.wind), strength = clamp(Math.abs(G.wind) / 360, 0.3, 1);
  ctx.save(); ctx.globalAlpha = 0.9; ctx.textAlign = "center"; ctx.font = "bold 12px system-ui,sans-serif"; ctx.fillStyle = "#cfe3ff";
  ctx.fillText("💨 WIND", cx, y - 13);
  ctx.strokeStyle = "#8fd0ff"; ctx.fillStyle = "#8fd0ff"; ctx.lineWidth = 3; ctx.lineCap = "round";
  const len = 28 + strength * 42; ctx.beginPath(); ctx.moveTo(cx - dir * len / 2, y); ctx.lineTo(cx + dir * len / 2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + dir * len / 2, y); ctx.lineTo(cx + dir * (len / 2 - 11), y - 7); ctx.lineTo(cx + dir * (len / 2 - 11), y + 7); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawSky(w) {
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, shade(w.sky[0], w.night ? 0.0 : -0.07));
  g.addColorStop(0.55, w.sky[0]);
  g.addColorStop(1, w.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
  if (w.night) {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 70; i++) {
      const sx = (i * 127.3) % cssW, sy = (i * 71.7) % (cssH * 0.62);
      ctx.globalAlpha = (0.35 + 0.55 * (0.5 + 0.5 * Math.sin(cloudT * 2.5 + i))) * 0.85;
      const s = i % 7 ? 1.5 : 2.5; ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
function drawSun(w) {
  const cx = cssW * 0.77, cy = cssH * 0.19, R = 54 * S;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const col = w.night ? "255,240,215" : "255,238,180";
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 5);
  g.addColorStop(0, `rgba(${col},0.85)`); g.addColorStop(0.2, `rgba(${col},0.4)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 5, 0, 6.28); ctx.fill();
  ctx.fillStyle = `rgba(255,252,238,${w.night ? 0.85 : 1})`;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, 6.28); ctx.fill();
  ctx.restore();
}
function drawClouds(w) {
  ctx.save(); ctx.fillStyle = "#ffffff"; ctx.globalAlpha = w.night ? 0.12 : 0.85;
  const span = cssW + 500;
  for (let i = 0; i < 5; i++) {
    let cx = (i * 360 + cloudT * 5 - cam.x * 0.05) % span; if (cx < 0) cx += span; cx -= 220;
    const cy = cssH * (0.09 + (i % 3) * 0.075);
    softCloud(cx, cy, (32 + (i % 3) * 12) * S);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function softCloud(x, y, r) {
  const puffs = [[0, 0, 1], [r * 0.85, r * 0.18, 0.78], [-r * 0.85, r * 0.22, 0.7], [r * 0.42, -r * 0.32, 0.66], [-r * 0.42, -r * 0.26, 0.62]];
  for (const [dx, dy, s] of puffs) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r * s, 0, 6.28); ctx.fill(); }
}
function drawHills(factor, color, amp) {
  const baseY = w2s(0, GROUND_Y).y;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-60, cssH + 5);
  const off = cam.x * factor * S;
  for (let x = -60; x <= cssW + 60; x += 24) {
    const wx = x + off;
    const y = baseY - (amp * (0.5 + 0.5 * Math.sin(wx * 0.0016)) + amp * 0.35 * Math.sin(wx * 0.0065 + 1.3));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cssW + 60, cssH + 5); ctx.closePath(); ctx.fill();
}
function drawGround(w) {
  const gy = GROUND_Y, W0 = -400, W1 = G.fieldW + 800;
  const g = ctx.createLinearGradient(0, gy, 0, gy + 320);
  g.addColorStop(0, shade(w.ground, 0.08)); g.addColorStop(0.1, w.ground); g.addColorStop(1, w.groundD);
  ctx.fillStyle = g; ctx.fillRect(W0, gy, W1, 520);
  ctx.fillStyle = shade(w.ground, 0.18); ctx.fillRect(W0, gy, W1, 5);
  ctx.fillStyle = "rgba(0,0,0,0.10)"; ctx.fillRect(W0, gy + 5, W1, 10);
}
function drawTreeShadow(t) {
  if (t.dead) return;
  ctx.save(); ctx.globalAlpha = 0.16 * t.a; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(t.x, GROUND_Y + 4, t.canopyR * 1.05, 9, 0, 0, 6.28); ctx.fill();
  ctx.restore();
}
function drawDecor(w) {
  for (const d of G.decor) {
    const x = d.x;
    if (d.type === "grass") {
      ctx.strokeStyle = d.col; ctx.lineWidth = 2; const s = d.s, sway = Math.sin(cloudT * 2 + d.phase) * 3;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 4, GROUND_Y); ctx.quadraticCurveTo(x + k * 4 + sway, GROUND_Y - 11 * s, x + k * 4 + sway * 1.6, GROUND_Y - 19 * s); ctx.stroke(); }
    } else if (d.type === "bush") {
      const s = d.s * 15; ctx.fillStyle = d.col; circle(x, GROUND_Y - s * 0.5, s); circle(x - s * 0.7, GROUND_Y - s * 0.3, s * 0.7); circle(x + s * 0.7, GROUND_Y - s * 0.3, s * 0.7);
      ctx.fillStyle = d.col2; circle(x - s * 0.2, GROUND_Y - s * 0.85, s * 0.5);
    } else if (d.type === "rock") {
      const s = d.s * 10; ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(x, GROUND_Y - s * 0.35, s, s * 0.7, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = shade(d.col, 0.12); ctx.beginPath(); ctx.ellipse(x - s * 0.3, GROUND_Y - s * 0.7, s * 0.4, s * 0.3, 0, 0, 6.28); ctx.fill();
    } else {
      const s = d.s, sway = Math.sin(cloudT * 2 + d.phase) * 2; ctx.strokeStyle = "#3f8f3a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + sway, GROUND_Y - 15 * s); ctx.stroke();
      ctx.fillStyle = d.col; circle(x + sway, GROUND_Y - 17 * s, 4.5 * s); ctx.fillStyle = "#ffe98a"; circle(x + sway, GROUND_Y - 17 * s, 1.8 * s);
    }
  }
}
function drawLeaves() {
  for (const l of G.leaves) { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.globalAlpha = clamp(l.life, 0, 1) * 0.9; ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * l.s, 2.8 * l.s, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
  ctx.globalAlpha = 1;
}
function drawRings() {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const r of G.rings) { const a = clamp(1 - r.t / r.life, 0, 1); ctx.globalAlpha = a * 0.85; ctx.strokeStyle = r.col; ctx.lineWidth = r.width * (0.4 + a); ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.28); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawCoinFX() {
  for (const c of G.coinFX) {
    if (c.delay > 0) continue;
    const cw = 6 * Math.abs(Math.cos(c.spin)) + 2.5;
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,207,74,0.35)"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#e0a81f"; ctx.beginPath(); ctx.ellipse(0, 0, cw, 8.5, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = "#ffcf4a"; ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.8, 7, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = "#fff2c0"; ctx.beginPath(); ctx.ellipse(-cw * 0.15, -2, cw * 0.35, 3, 0, 0, 6.28); ctx.fill();
    ctx.restore();
  }
}
function drawVignette() {
  const g = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.36, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
  if (G.combo >= 5) {
    const a = clamp((G.combo - 4) / 24, 0, 0.45);
    const g2 = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.28, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
    g2.addColorStop(0, "rgba(255,180,60,0)"); g2.addColorStop(1, `rgba(255,150,40,${a})`);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g2; ctx.fillRect(0, 0, cssW, cssH); ctx.restore();
  }
}
function drawTree(t) {
  ctx.save();
  ctx.translate(t.x, GROUND_Y);
  let rot = Math.sin((cloudT + t.phase) * 1.4) * 0.02;
  if (t.shakeT > 0) rot += Math.sin(cloudT * 42) * 0.07 * (t.shakeT / 0.2);
  if (t.dead) rot = (t.topple > 0 ? clamp(t.topple * 2.6, 0, 1.5) : 0) * t.fallDir;
  ctx.rotate(rot);
  ctx.globalAlpha = t.a;
  const w = t.world, r = t.canopyR, cy = -t.trunkH - r * 0.55, sq = t.squash || 0;
  // trunk (gradient + bark line)
  const tg = ctx.createLinearGradient(-t.trunkW / 2, 0, t.trunkW / 2, 0);
  tg.addColorStop(0, shade(w.trunk, -0.16)); tg.addColorStop(0.4, w.trunk); tg.addColorStop(1, shade(w.trunk, -0.22));
  ctx.fillStyle = tg; roundRect(-t.trunkW / 2, -t.trunkH, t.trunkW, t.trunkH + 4, 3);
  ctx.strokeStyle = shade(w.trunk, -0.28); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-t.trunkW * 0.08, -t.trunkH * 0.85); ctx.lineTo(-t.trunkW * 0.08, -5); ctx.stroke();
  // canopy (with squash bounce) — colours vary by special kind
  let leaf = w.leaf, leaf2 = w.leaf2;
  if (t.kind === "gold") { leaf = "#ffd24d"; leaf2 = "#e0a81f"; }
  else if (t.kind === "tnt") { leaf = "#d0432a"; leaf2 = "#8a1f12"; }
  else if (t.kind === "armor") { leaf = "#98a2ae"; leaf2 = "#5e6772"; }
  const roundCanopy = !t.pine || t.kind !== "normal";
  ctx.save(); ctx.translate(0, cy); ctx.scale(1 + sq * 0.12, 1 - sq * 0.14); ctx.translate(0, -cy);
  if (!roundCanopy) {
    for (let i = 0; i < 3; i++) {
      const by = -t.trunkH + 6 - i * r * 0.85, half = r * (1 - i * 0.22), top = by - r * 1.3;
      const pg = ctx.createLinearGradient(0, top, 0, by); pg.addColorStop(0, shade(leaf, 0.16)); pg.addColorStop(1, i % 2 ? leaf2 : leaf);
      ctx.fillStyle = pg; tri(-half, by, half, by, 0, top);
    }
  } else {
    ctx.fillStyle = leaf2; circle(-r * 0.58, cy + r * 0.24, r * 0.72); circle(r * 0.58, cy + r * 0.24, r * 0.72); circle(0, cy + r * 0.38, r * 0.68);
    const rg = ctx.createRadialGradient(-r * 0.3, cy - r * 0.34, r * 0.12, 0, cy, r * 1.25);
    rg.addColorStop(0, shade(leaf, 0.22)); rg.addColorStop(0.6, leaf); rg.addColorStop(1, shade(leaf, -0.1));
    ctx.fillStyle = rg; circle(0, cy, r);
    ctx.fillStyle = "rgba(255,255,255,0.10)"; circle(-r * 0.28, cy - r * 0.42, r * 0.26);
  }
  if (t.kind === "armor") {
    ctx.fillStyle = "rgba(28,34,42,0.6)";
    for (const [ox, oy] of [[-0.45, -0.1], [0.45, -0.1], [0, 0.36], [-0.26, 0.5], [0.26, 0.5]]) circle(ox * r, cy + oy * r, r * 0.08);
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, cy, r * 0.8, -2.3, -1.0); ctx.stroke();
  } else if (t.kind === "gold") {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.4 + 0.2 * Math.sin(cloudT * 6 + t.phase);
    const gg = ctx.createRadialGradient(0, cy, r * 0.3, 0, cy, r * 1.5); gg.addColorStop(0, "#ffe98a"); gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg; circle(0, cy, r * 1.5); ctx.restore(); ctx.fillStyle = "#fff6c8"; circle(-r * 0.2, cy - r * 0.3, r * 0.12);
  } else if (t.kind === "tnt") {
    const ty2 = cy - r; ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, ty2); ctx.quadraticCurveTo(8, ty2 - 14, 3, ty2 - 22); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const spk = 0.7 + 0.3 * Math.sin(cloudT * 30 + t.phase);
    ctx.fillStyle = "#ffd66a"; circle(3, ty2 - 22, 4 * spk + 2); ctx.fillStyle = "#fff"; circle(3, ty2 - 22, 2 * spk); ctx.restore();
  }
  if (t.flashT > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = clamp(t.flashT / 0.12, 0, 1) * 0.55; ctx.fillStyle = "#fff"; circle(0, roundCanopy ? cy : cy - r * 0.2, r * 1.02); ctx.restore(); }
  ctx.restore();
  // health bar
  if (t.hurtT > 0 && t.hp < t.maxHp && !t.dead) {
    const ratio = clamp(t.hp / t.maxHp, 0, 1), bw = Math.max(t.canopyR * 1.7, 44), by = cy - r - 18, a = clamp(t.hurtT, 0, 1);
    ctx.globalAlpha = a * t.a; ctx.fillStyle = "rgba(0,0,0,.45)"; roundRect(-bw / 2 - 2, by - 2, bw + 4, 11, 4);
    ctx.fillStyle = ratio > 0.5 ? "#67d982" : ratio > 0.25 ? "#ffcf4a" : "#ff6a6a"; roundRect(-bw / 2, by, bw * ratio, 7, 3);
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
  if (!c.opened) {
    const icon = { coins: "🪙", gems: "💎", shots: "＋", double: "×2", giant: "●" }[c.kind || "coins"];
    const iy = GROUND_Y - 62 + Math.sin(cloudT * 3 + c.x * 0.1) * 4;
    ctx.save(); ctx.globalAlpha = 0.95 * c.a; ctx.fillStyle = "rgba(10,16,14,0.55)"; circle(c.x, iy, 15);
    ctx.font = "bold 20px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(icon, c.x, iy + 1);
    ctx.restore();
  }
}
function drawBoss(boss) {
  const r = boss.r, w = boss.world, alpha = boss.dead ? clamp(boss.hp, 0, 1) : 1;
  ctx.save(); ctx.globalAlpha = alpha * 0.2; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(boss.x, GROUND_Y + 2, r * 0.9, 14, 0, 0, 6.28); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(boss.x + boss.wob, boss.y); ctx.globalAlpha = alpha;
  const hg = ctx.createLinearGradient(0, -r * 1.2, 0, -r * 0.5); hg.addColorStop(0, "#fff0b0"); hg.addColorStop(1, "#e0a81f");
  ctx.fillStyle = hg; tri(-r * 0.7, -r * 0.5, -r * 0.4, -r * 1.18, -r * 0.22, -r * 0.55); tri(r * 0.7, -r * 0.5, r * 0.4, -r * 1.18, r * 0.22, -r * 0.55);
  const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.15); bg.addColorStop(0, shade(w.boss, 0.14)); bg.addColorStop(0.7, w.boss); bg.addColorStop(1, shade(w.boss, -0.22));
  ctx.fillStyle = bg; circle(0, 0, r);
  ctx.fillStyle = shade(w.boss, 0.14); circle(0, r * 0.2, r * 0.68);
  for (const sx of [-1, 1]) { ctx.fillStyle = "#fff"; circle(sx * r * 0.4, -r * 0.3, r * 0.2); ctx.fillStyle = boss.eye; circle(sx * r * 0.4, -r * 0.3, r * 0.1); ctx.fillStyle = "rgba(255,255,255,0.85)"; circle(sx * r * 0.4 - r * 0.05, -r * 0.34, r * 0.04); }
  ctx.strokeStyle = "#160a0a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -r * 0.02, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  const wy = r * 0.35;
  if (boss.weakOpen) {
    const pulse = 0.85 + 0.15 * Math.sin(boss.t * 8);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(0, wy, 2, 0, wy, r * 0.5 * pulse); gg.addColorStop(0, "#fff2b0"); gg.addColorStop(0.5, "#ffd24d"); gg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gg; circle(0, wy, r * 0.5 * pulse); ctx.restore();
    ctx.fillStyle = "#ffd24d"; circle(0, wy, r * 0.2); ctx.fillStyle = "#fff2b0"; circle(0, wy, r * 0.1);
  } else {
    ctx.strokeStyle = "rgba(120,180,255,.85)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, wy, r * 0.34, 0, 6.28); ctx.stroke();
    const sg = ctx.createRadialGradient(-r * 0.1, wy - r * 0.1, 2, 0, wy, r * 0.28); sg.addColorStop(0, "rgba(150,190,255,0.85)"); sg.addColorStop(1, "rgba(70,100,150,0.7)"); ctx.fillStyle = sg; circle(0, wy, r * 0.24);
  }
  if (boss.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = boss.flash / 0.12; ctx.fillStyle = "#fff"; circle(0, 0, r); ctx.restore(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBall() {
  const b = G.ball; if (!b) return;
  const r = b.r;
  // glowing trail (additive)
  if (b.trail.length > 1 && !b.held) {
    const tr = trailById(save.trail);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = b.trail.length - 1; i >= 1; i--) { const p = b.trail[i], f = 1 - i / b.trail.length; ctx.globalAlpha = f * 0.55; ctx.fillStyle = tr.col(f, b.data.color); circle(p.x, p.y, r * f * 0.95); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(b.x, b.y);
  const spd = Math.hypot(b.vx, b.vy);
  if (spd > 60 && !b.held) { const ang = Math.atan2(b.vy, b.vx), st = clamp(spd / 2600, 0, 0.35); ctx.rotate(ang); ctx.scale(1 + st, 1 - st * 0.7); ctx.rotate(-ang); }
  // aura for special balls
  if (b.data.effect !== "none" && b.data.effect !== "heavy") {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(cloudT * 10);
    const gg = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2); gg.addColorStop(0, b.data.accent); gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg; circle(0, 0, r * 2.2); ctx.restore();
  }
  const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.15);
  bg.addColorStop(0, shade(b.data.color, 0.38)); bg.addColorStop(0.55, b.data.color); bg.addColorStop(1, shade(b.data.color, -0.26));
  ctx.fillStyle = bg; circle(0, 0, r);
  ctx.fillStyle = "rgba(255,255,255,0.75)"; circle(-r * 0.32, -r * 0.34, r * 0.22);
  ctx.fillStyle = "rgba(255,255,255,0.32)"; circle(r * 0.24, r * 0.28, r * 0.12);
  ctx.restore();
}
function drawSlingshot() {
  const bx = SLING_X, by = GROUND_Y;
  const lx = bx - 33, rx = bx + 33, ty = by - 120, fork = by - 66;
  const showBand = G.ball && (G.aim.active || G.canAim);
  const px = G.ball ? G.ball.x : bx, py = G.ball ? G.ball.y : by - 18;
  const sk = skinById(save.skin);
  ctx.lineCap = "round";
  if (showBand) { ctx.strokeStyle = shade(sk.band, -0.22); ctx.lineWidth = 7; line(rx, ty, px, py); }
  const limb = (x1, y1, x2, y2) => {
    ctx.strokeStyle = shade(sk.wood2, -0.28); ctx.lineWidth = 17; line(x1, y1, x2, y2);
    const g = ctx.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, sk.wood); g.addColorStop(1, sk.wood2);
    ctx.strokeStyle = g; ctx.lineWidth = 12; line(x1, y1, x2, y2);
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; line(x1, y1, x2, y2);
  };
  limb(bx, by + 4, bx, fork); limb(bx, fork, lx, ty); limb(bx, fork, rx, ty);
  ctx.fillStyle = shade(sk.wood2, -0.12); circle(lx, ty, 7.5); circle(rx, ty, 7.5);
  ctx.fillStyle = "rgba(255,220,180,0.25)"; circle(lx - 1.5, ty - 1.5, 2.5); circle(rx - 1.5, ty - 1.5, 2.5);
  if (G.aim.active && G.ball) {
    const ratio = clamp(Math.hypot(px - bx, py - (by - 18)) / 150, 0, 1), gc = lerpColor("#8fe86a", "#ff5a4a", ratio);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gg = ctx.createRadialGradient(px, py, 2, px, py, 24 + ratio * 24); gg.addColorStop(0, gc); gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg; ctx.globalAlpha = 0.5 + ratio * 0.4; circle(px, py, 24 + ratio * 24); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (showBand) {
    ctx.strokeStyle = sk.band; ctx.lineWidth = 7; line(lx, ty, px, py);
    ctx.fillStyle = "#5a3a24"; ctx.beginPath(); ctx.ellipse(px, py, G.ball.r + 5, G.ball.r + 6, 0, 0, 6.28); ctx.fill();
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
  const guide = save.settings.aimGuide !== false;
  const dt = 1 / 60, steps = Math.floor(lerp(16, 50, ratio)), col = lerpColor("#9fe86a", "#ff6a5a", ratio);
  const total = steps * 3, maxI = guide ? total : Math.min(total, 21);  // aim-off = short stub only
  let ex = x, ey = y, stopped = false;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < maxI; i++) {
    x += vx * dt; y += vy * dt; vy += GRAVITY * dt; if (G.wind) vx += G.wind * dt; ex = x; ey = y;
    let hitTree = false;
    for (const t of G.trees) { if (!t.dead && Math.hypot(x - t.x, y - t.canopyCy) < t.canopyR) { hitTree = true; break; } }
    if (y > GROUND_Y || hitTree) { stopped = true; break; }
    if (i % 3 === 0) { const f = i / total; ctx.globalAlpha = clamp(1 - f, 0.12, 0.85); ctx.fillStyle = col; circle(x, y, lerp(5.5, 1.8, f)); }
  }
  // landing ring only when the full arc is shown and actually reaches an impact
  if (guide && stopped) {
    const pulse = 1 + 0.15 * Math.sin(cloudT * 8);
    ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ex, Math.min(ey, GROUND_Y - 2), 9 * pulse, 0, 6.28); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawParticles() {
  for (const p of G.particles) {
    if (p.glow) continue;
    const a = clamp(p.life / p.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.col;
    if (p.shape === "square") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.restore(); }
    else if (p.shape === "leaf") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.6, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
    else if (p.shape === "smoke") { ctx.globalAlpha = a * 0.5; circle(p.x, p.y, p.r * (1.4 - a * 0.4)); }
    else circle(p.x, p.y, p.r);
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const p of G.particles) { if (!p.glow) continue; const a = clamp(p.life / p.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.col; circle(p.x, p.y, p.r * 1.5); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBolts() {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (const b of G.bolts) {
    const a = clamp(b.t / 0.25, 0, 1), pts = [[b.ax, b.ay]], n = 5;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(b.ax, b.bx, t) + rand(-14, 14), lerp(b.ay, b.by, t) + rand(-14, 14)]); }
    pts.push([b.bx, b.by]);
    ctx.globalAlpha = a * 0.4; ctx.strokeStyle = "#fff7a0"; ctx.lineWidth = 8; strokePts(pts);
    ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; strokePts(pts);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function strokePts(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }

// draw helpers
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); }
function tri(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(x, y, w, h, rr) { rr = Math.min(rr, Math.abs(w) / 2, Math.abs(h) / 2); ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); ctx.fill(); }
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
let hud, comboEl, bossBarEl, shotsEl, ballsEl, hudInfoEl, coinChipEl, coinValEl, hintEl, gemValEl;

function showHint() { if (hintEl) hintEl.style.display = (save.stats.shots || 0) < 6 ? "flex" : "none"; }
function hideHint() { if (hintEl) hintEl.style.display = "none"; }

function pulseCoin() {
  if (!coinChipEl) return;
  coinValEl.textContent = fmt(save.coins);
  coinChipEl.style.transform = "scale(1.2)";
  setTimeout(() => { if (coinChipEl) coinChipEl.style.transform = "scale(1)"; }, 110);
}

function buildHUD() {
  hud = el("div", { id: "hud", class: "hidden" });
  const top = el("div", { class: "hud-top" });
  hudInfoEl = el("div", { class: "hud-info" });
  shotsEl = el("div", { class: "shots" });
  coinValEl = el("span", {}, fmt(save.coins));
  coinChipEl = el("div", { class: "chip coin hud-coin", style: "pointer-events:auto" }, el("span", { class: "ic" }, "🪙"), coinValEl);
  gemValEl = el("span", {}, fmt(save.gems || 0));
  const gemChip = el("div", { class: "chip gem", style: "pointer-events:auto" }, el("span", { class: "ic" }, "💎"), gemValEl);
  const pause = el("button", { class: "iconbtn", onclick: togglePause, style: "pointer-events:auto" }, "⏸");
  top.append(hudInfoEl, el("div", { class: "spacer" }), shotsEl, el("div", { class: "spacer" }), coinChipEl, gemChip, pause);
  ballsEl = el("div", { class: "hud-balls" });
  bossBarEl = el("div", { class: "bossbar hidden" }, el("div", { class: "bn" }, "BOSS"), el("div", { class: "bar" }, el("span")));
  hud.append(top, ballsEl, bossBarEl);
  uiLayer.append(hud);
  comboEl = el("div", { id: "combo" }, el("div", { class: "big" }), el("div", { class: "mult" }));
  fxLayer.append(comboEl);
  hintEl = el("div", { id: "hint" }, el("span", { class: "hint-hand" }, "👇"), el("span", {}, "Pull the sling DOWN & BACK, then release to fling forward"));
  hintEl.style.display = "none";
  fxLayer.append(hintEl);
}
function refreshHUD() {
  if (!hudInfoEl) return;
  hudInfoEl.innerHTML = `<div class="lv">${G.boss ? "💀 Boss" : "Level " + G.level}</div><div class="wx">${G.world.name}</div>`;
  if (coinValEl) coinValEl.textContent = fmt(save.coins);
  if (gemValEl) gemValEl.textContent = fmt(save.gems || 0);
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
function currencyChips() { return el("div", { class: "chips" }, chip("🪙", save.coins, "coin"), chip("💎", save.gems || 0, "gem")); }

function screenMenu() {
  Audio.startMusic(WORLDS[worldIndex(save.highest)]);
  const s = el("div", { class: "screen", id: "screen-menu" });
  const pr = save.prestige || 0;
  s.append(
    el("div", { class: "logo" }, "FOREST SLING"),
    el("div", { class: "tagline" }, "Sling · Smash · Upgrade · Conquer"),
    el("div", { class: "progress-pill" }, `Level ${save.highest}/100  ·  Slingshot Lv ${save.power}  ·  🪙 ${fmt(save.coins)}`),
    pr > 0 ? el("div", { class: "prestige-pill" }, `🌟 Prestige ${pr}  ·  +${Math.round((prestigeMult() - 1) * 100)}% coins`) : null,
    el("div", { class: "menu-buttons" },
      el("button", { class: "btn-primary btn-lg", onclick: () => { click(); showScreen(screenLevels()); } }, "▶  PLAY"),
      el("button", { class: "btn-gold", onclick: () => { click(); showScreen(screenHowTo()); } }, "❓  How to Play"),
      canPrestige() ? el("button", { class: "btn-gold", onclick: () => { click(); confirmPrestige(() => toMenu()); } }, "🌟  Prestige — Ascend") : null,
      el("div", { class: "menu-grid" },
        el("button", { onclick: () => { click(); showScreen(screenShop()); } }, "🛒 Shop"),
        el("button", { onclick: () => { click(); showScreen(screenAchievements()); } }, "🏆 Achievements"),
        el("button", { onclick: () => { click(); showScreen(screenSettings()); } }, "⚙ Settings"),
        el("button", { onclick: () => { click(); showScreen(screenCredits()); } }, "📜 Credits"),
      ),
    ),
    el("div", { class: "footer-note" }, "No ads · No pay-to-win · Just fun progression"),
  );
  checkDaily();
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
    [["balls", "Balls"], ["power", "Slingshot"], ["cosmetics", "Cosmetics"]].forEach(([id, name]) => tabs.append(el("div", { class: "tab" + (tab === id ? " active" : ""), onclick: () => { tab = id; click(); rebuild(); } }, name)));
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
    } else if (tab === "cosmetics") {
      list.append(el("div", { class: "section-title" }, "Ball Trails"));
      for (const tr of TRAILS) {
        const owned = save.ownedCosmetics.includes(tr.id), eq = save.trail === tr.id;
        const action = eq ? el("button", { disabled: true }, "Equipped")
          : owned ? el("button", { class: "btn-ghost", onclick: () => { equipCosmetic(tr); click(); rebuild(); } }, "Equip")
          : el("button", { class: canAfford(tr.cost, tr.cur) ? "btn-gold" : "btn-ghost", onclick: () => buyCosmetic(tr, rebuild) }, tr.cost + " " + (tr.cur === "gems" ? "💎" : "🪙"));
        list.append(cosmeticCard(tr, "trail", action));
      }
      list.append(el("div", { class: "section-title" }, "Slingshot Skins"));
      for (const sk of SKINS) {
        const owned = save.ownedCosmetics.includes(sk.id), eq = save.skin === sk.id;
        const action = eq ? el("button", { disabled: true }, "Equipped")
          : owned ? el("button", { class: "btn-ghost", onclick: () => { equipCosmetic(sk); click(); rebuild(); } }, "Equip")
          : el("button", { class: canAfford(sk.cost, sk.cur) ? "btn-gold" : "btn-ghost", onclick: () => buyCosmetic(sk, rebuild) }, sk.cost + " " + (sk.cur === "gems" ? "💎" : "🪙"));
        list.append(cosmeticCard(sk, "skin", action));
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
function canAfford(cost, cur) { return cur === "gems" ? (save.gems || 0) >= cost : save.coins >= cost; }
function spendCur(cost, cur) { if (cur === "gems") save.gems -= cost; else save.coins -= cost; persist(); refreshHUD(); }
function equipCosmetic(item) { if (item.col) save.trail = item.id; else save.skin = item.id; persist(); }
function buyCosmetic(item, cb) {
  if (save.ownedCosmetics.includes(item.id)) { equipCosmetic(item); cb && cb(); return; }
  if (!canAfford(item.cost, item.cur)) { toast("Not enough " + (item.cur === "gems" ? "gems" : "coins")); Audio.sfx("click"); return; }
  spendCur(item.cost, item.cur); save.ownedCosmetics.push(item.id); equipCosmetic(item); persist();
  Audio.sfx("purchase"); toast("Unlocked " + item.name + "!"); cb && cb();
}
function cosmeticCard(item, type, action) {
  const sw = el("div", { class: "swatch" });
  if (type === "trail") {
    if (item.id === "rainbow") sw.style.background = "linear-gradient(90deg,#ff4d4d,#ffd24d,#5fd06a,#41a6ff,#c264ff)";
    else if (item.id === "none") sw.style.background = "linear-gradient(90deg,#aaa,#eee,#aaa)";
    else sw.style.background = `linear-gradient(90deg, ${item.col(0)}, ${item.col(0.5)}, ${item.col(1)})`;
  } else sw.style.background = `linear-gradient(135deg, ${item.wood}, ${item.band})`;
  return el("div", { class: "card" }, sw,
    el("div", { class: "info" }, el("div", { class: "name" }, item.name), el("div", { class: "rarity", style: `color:${RARITY[item.rar]}` }, item.rar), el("div", { class: "desc" }, "Cosmetic only — looks great, no gameplay effect.")),
    action);
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
    let cur = a.metric === "trees" ? save.stats.trees : a.metric === "highest" ? save.highest : a.metric === "bosses" ? save.stats.bosses : a.metric === "bestcombo" ? save.stats.bestcombo : a.metric === "balls" ? save.ownedBalls.length : a.metric === "prestige" ? (save.prestige || 0) : save.power;
    const done = save.achs.includes(a.id);
    list.append(el("div", { class: "card", style: done ? "border-bottom-color:var(--accent)" : "" },
      el("div", { class: "swatch", style: `background:${done ? "#2a3a2a" : "#222"};display:flex;align-items:center;justify-content:center;font-size:26px` }, a.icon),
      el("div", { class: "info" }, el("div", { class: "name" }, a.name + (done ? " ✓" : "")),
        el("div", { class: "desc" }, `${fmt(Math.min(cur, a.target))} / ${fmt(a.target)}`),
        el("div", { class: "bar", style: "margin-top:6px" }, el("span", { style: `width:${clamp(cur / a.target, 0, 1) * 100}%;background:${done ? "var(--accent)" : "var(--blue)"}` }))),
      el("div", { class: "v", style: "color:var(--accent);font-weight:700;white-space:nowrap;text-align:right" }, `+${fmt(a.reward)} 🪙`, a.gems ? el("div", { style: "color:#ff8ab0;font-size:13px" }, `+${a.gems} 💎`) : null)));
  }
  s.append(header("Achievements", toMenu), list);
  return s;
}

function screenSettings() {
  const s = el("div", { class: "screen" });
  const list = el("div", { class: "list" });
  list.append(el("div", { class: "section-title" }, "Audio"));
  list.append(toggleRow("Mute All", save.settings.muteAll === true, v => { save.settings.muteAll = v; Audio.applyVolumes(); persist(); }));
  list.append(sliderRow("Music Volume", save.settings.music, v => { save.settings.music = v; Audio.applyVolumes(); persist(); }));
  list.append(sliderRow("Sound FX Volume", save.settings.sfx, v => { save.settings.sfx = v; Audio.applyVolumes(); persist(); }));
  list.append(el("div", { class: "section-title" }, "Accessibility"));
  list.append(toggleRow("Aim Guide (trajectory preview)", save.settings.aimGuide !== false, v => { save.settings.aimGuide = v; persist(); }));
  list.append(toggleRow("Reduce Motion", save.settings.reduceMotion === true, v => { save.settings.reduceMotion = v; persist(); }));
  list.append(toggleRow("High Contrast UI", save.settings.highContrast === true, v => { save.settings.highContrast = v; applyAccessibility(); persist(); }));
  list.append(el("div", { class: "section-title" }, "Game Feel"));
  list.append(toggleRow("Screen Shake", save.settings.shake, v => { save.settings.shake = v; persist(); }));
  list.append(toggleRow("Damage Numbers", save.settings.damageNums, v => { save.settings.damageNums = v; persist(); }));
  list.append(toggleRow("Vibration (mobile)", save.settings.haptics !== false, v => { save.settings.haptics = v; persist(); }));
  list.append(el("button", { class: "btn-danger", style: "max-width:820px;margin:14px auto 0;width:100%", onclick: confirmReset }, "⚠ Reset All Progress"));
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

function screenHowTo() {
  const s = el("div", { class: "screen" });
  const howCard = (icon, title, desc) => el("div", { class: "card" },
    el("div", { class: "swatch", style: "background:#232c3e;display:flex;align-items:center;justify-content:center;font-size:28px" }, icon),
    el("div", { class: "info" }, el("div", { class: "name" }, title), el("div", { class: "desc", style: "font-size:14px;line-height:1.55" }, desc)));
  s.append(header("How to Play", toMenu),
    el("div", { class: "list" },
      howCard("🎯", "Aim & Fire", "Press and DRAG BACK from the slingshot — pull down and away from the trees, like a real slingshot — then release. The dotted arc previews exactly where your ball flies. The further you pull, the more power."),
      howCard("🌲", "Clear every tree", "Destroy all the trees to win the level. Knock a falling tree into its neighbours to trigger chain-reaction combos!"),
      howCard("💥", "Special trees", "Watch for 💣 TNT trees (huge chain explosions!), 🛡 armored trees (need a heavy Stone/Iron ball, a Bomb, or a lucky crit), and ✨ golden trees worth 10× coins — don't let them get away!"),
      howCard("🔥", "Build combos", "Smash trees quickly in a row to raise your combo multiplier — the higher the combo, the more coins you earn."),
      howCard("🛒", "Upgrade your gear", "Spend coins in the Shop to upgrade your Slingshot (more power & damage) and unlock new Balls with special effects: fire, bombs, chain lightning and critical-hit diamond."),
      howCard("💀", "Beat the bosses", "Every 10th level is a boss. Hit its glowing weak point while it's OPEN for triple damage — but any solid hit still chips it down. Keep firing and watch its health bar!"),
      howCard("🖱️", "Controls", "Mouse: click, drag back, release. Touch: drag & release with a finger. Esc or the ⏸ button pauses. Switch balls with the icons at the bottom-left during a level."),
      el("button", { class: "btn-primary btn-lg", style: "max-width:820px;margin:6px auto 0;width:100%", onclick: () => { click(); showScreen(screenLevels()); } }, "▶  Got it — Play!"),
    ));
  return s;
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

function canPrestige() { return (save.highest >= MAX_LEVEL) || save.champion; }
function doPrestige() {
  save.prestige = (save.prestige || 0) + 1;
  save.highest = 1;                 // replay the forest — tougher, +30% coins per tier
  save.champion = false;            // re-earn the crown each ascension
  persist(); checkAchievements(); refreshHUD();
  Audio.sfx("achievement"); flash("#ffd86b", 0.5); vibrate([20, 40, 20, 40, 40]);
  toast(`🌟 Prestige ${save.prestige}!  +${Math.round((prestigeMult() - 1) * 100)}% coins forever`);
}
function confirmPrestige(after) {
  const nextMult = 1 + ((save.prestige || 0) + 1) * 0.3;
  modal(el("div", { class: "modal" },
    el("h2", {}, "🌟 Prestige?"),
    el("div", { class: "sub" }, `Restart from Level 1 with tougher forests — but earn a permanent coin bonus. You keep all coins, gems, balls, cosmetics, upgrades, stars & achievements.`),
    el("div", { class: "reward-row", style: "margin-top:8px" }, el("span", {}, "Coin bonus"), el("span", { class: "v", style: "color:var(--gold)" }, `+${Math.round((nextMult - 1) * 100)}% (was +${Math.round((prestigeMult() - 1) * 100)}%)`)),
    el("div", { class: "reward-row" }, el("span", {}, "Prestige level"), el("span", { class: "v", style: "color:#ff8ab0" }, `${save.prestige || 0} › ${(save.prestige || 0) + 1} 🌟`)),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn-gold", onclick: () => { closeModal(); doPrestige(); if (after) after(); } }, "🌟 Ascend"),
      el("button", { class: "btn-ghost", onclick: () => { closeModal(); } }, "Cancel"))));
}

// ---- daily login streak ----
let dailyChecked = false;
function dayStamp(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function checkDaily() {
  if (dailyChecked) return; dailyChecked = true;
  const now = new Date();
  const today = dayStamp(now);
  if (save.lastLogin === today) return;
  const y = new Date(now.getTime()); y.setDate(y.getDate() - 1);
  const cont = save.lastLogin === dayStamp(y);
  save.streak = cont ? (save.streak || 0) + 1 : 1;
  save.lastLogin = today;
  const day = save.streak;
  const coins = 200 + Math.min(day, 7) * 150 + save.highest * 8;
  const gems = (day % 7 === 0) ? 12 : (day % 3 === 0 ? 3 : 0);
  addCoins(coins); if (gems) addGems(gems);
  persist();
  setTimeout(() => showDailyReward(day, coins, gems), 450);
}
function showDailyReward(day, coins, gems) {
  const wk = ((day - 1) % 7) + 1;
  const cal = el("div", { class: "daily-cal" });
  for (let i = 1; i <= 7; i++) {
    cal.append(el("div", { class: "daily-day" + (i < wk ? " past" : i === wk ? " today" : "") },
      el("div", { class: "dn" }, "D" + i),
      el("div", { class: "di" }, i % 7 === 0 ? "💎" : "🪙")));
  }
  modal(el("div", { class: "modal" },
    el("h2", {}, "🎁 Daily Reward"),
    el("div", { class: "sub" }, `Day ${day} streak — welcome back!`),
    cal,
    el("div", { class: "reward-row", style: "margin-top:10px" }, el("span", {}, "🪙 Coins"), el("span", { class: "v" }, "+" + fmt(coins))),
    gems ? el("div", { class: "reward-row" }, el("span", {}, "💎 Gems"), el("span", { class: "v", style: "color:#ff8ab0" }, "+" + gems)) : null,
    el("button", { class: "btn-primary btn-block", style: "margin-top:12px", onclick: () => { closeModal(); Audio.sfx("coin"); } }, "Collect")));
  Audio.sfx("achievement");
}

function showVictory(stars) {
  const isFinal = G.level >= MAX_LEVEL;
  const m = el("div", { class: "modal" });
  m.append(el("h2", {}, isFinal ? "FOREST CONQUERED! 👑" : "Level Cleared!"));
  m.append(el("div", { class: "stars-big" }, "★".repeat(stars).padEnd(3, "☆").split("").map((c, i) => el("span", { style: `color:${i < stars ? "#ffcf4a" : "#444"}` }, c))));
  m.append(el("div", { class: "reward-row" }, el("span", {}, "🪙 Coins earned"), el("span", { class: "v" }, "+" + fmt(G.coinsEarned))));
  if (G.gemsEarned > 0) m.append(el("div", { class: "reward-row" }, el("span", {}, "💎 Gems earned"), el("span", { class: "v", style: "color:#ff8ab0" }, "+" + fmt(G.gemsEarned))));
  const best = save.bestScore[G.level] || 0, isBest = G.score >= best;
  m.append(el("div", { class: "reward-row" }, el("span", {}, "🏆 Score"), el("span", { class: "v" }, fmt(G.score) + (isBest ? "  ✨ BEST!" : "  (best " + fmt(best) + ")"))));
  m.append(el("div", { class: "sub" }, `Shots used: ${G.shotsUsed}  ·  Best combo: x${G.bestCombo}`));
  const row = el("div", { class: "row" });
  if (!isFinal) row.append(el("button", { class: "btn-primary", onclick: () => { closeModal(); startLevel(G.level + 1); } }, "Next ›"));
  row.append(el("button", { class: "btn-ghost", onclick: () => { closeModal(); startLevel(G.level); } }, "↻ Replay"));
  row.append(el("button", { class: "btn-ghost", onclick: () => { closeModal(); quitToMenu(); } }, "⏏ Menu"));
  m.append(row);
  if (!isFinal) m.append(el("button", { class: "btn-gold btn-block", style: "margin-top:10px", onclick: () => { closeModal(); quitToMenu(); showScreen(screenShop()); } }, "🛒 Visit Shop"));
  else {
    m.append(el("div", { class: "sub", style: "margin-top:10px;color:var(--green)" }, "You beat all 100 levels! Ascend to loop the forest — tougher trees, permanent coin bonus."));
    m.append(el("button", { class: "btn-gold btn-block", style: "margin-top:10px", onclick: () => { closeModal(); confirmPrestige(() => quitToMenu()); } }, "🌟 Prestige — Ascend"));
  }
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
function applyAccessibility() {
  document.body.classList.toggle("high-contrast", save.settings.highContrast === true);
}
function init() {
  loadSave();
  applyAccessibility();
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
  w2s, s2w, cam, GRAVITY, SLING_X, GROUND_Y,
  step(n, dt) { for (let i = 0; i < n; i++) update(dt || 1 / 120); },
};

})();
