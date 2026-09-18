/* Key Template — network-first so home-screen app matches live site */
const CACHE = "key-template-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigations: network first (then cache fallback)
  const isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("index.html");

  if (isHTML || url.pathname.endsWith("/sw.js") || url.pathname.endsWith("sw.js")) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Other assets: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
