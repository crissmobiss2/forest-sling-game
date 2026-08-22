/* Forest Sling service worker — offline app-shell cache.
   Bump CACHE (and the ?v= asset queries) together on each release. */
const CACHE = "forest-sling-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./game.js?v=15",
  "./style.css?v=15",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let cross-origin (e.g. fonts) hit network normally

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    // Network-first for the page so new releases (new ?v= assets) show up immediately
    // when online; fall back to the cached shell when offline.
    e.respondWith(
      fetch(req)
        .then((res) => { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return res; })
        .catch(() => caches.match(req).then((h) => h || caches.match("./index.html")))
    );
    return;
  }
  // Cache-first for versioned static assets (js/css/png/manifest): fast and offline-ready.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((res) => {
          if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    )
  );
});
