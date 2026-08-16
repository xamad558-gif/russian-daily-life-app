const CACHE_NAME = "russian-daily-life-v8-3-visual-guide-v21";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/storage.js",
  "./js/units.js",
  "./js/audio.js",
  "./js/learning.js",
  "./js/controller.js",
  "./js/quiz.js",
  "./js/progress.js",
  "./js/filters.js",
  "./js/cards.js",
  "./js/detail.js",
  "./js/i18n.js",
  "./js/ui.js",
  "./app.js",
  "./data/units.json",
  "./data/image_quality_report.json",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/favicon-16.png",
  "./assets/images/words/house.jpg",
];
async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  try {
    const response = await fetch("./data/units.json", { cache: "no-store" });
    if (!response.ok) return;
    const registry = await response.json();
    const unitPaths = (registry.units || [])
      .map(unit => unit.dataPath)
      .filter(path => typeof path === "string" && path.length > 0)
      .map(path => `./${path.replace(/^\.\//, "")}`);
    await Promise.all(unitPaths.map(async unitPath => {
      try {
        const unitResponse = await fetch(unitPath, { cache: "no-store" });
        if (unitResponse.ok) await cache.put(unitPath, unitResponse.clone());
      } catch {
        // A missing optional unit must not prevent the app shell from installing.
      }
    }));
  } catch {
    // The registry itself remains cached, so a later request can retry unit caching.
  }
}
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(precacheAppShell()); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");
  const isUnitFile = url.pathname.includes("/data/units/") && url.pathname.endsWith(".json");
  const isFreshCritical = url.pathname.endsWith("/data/units.json") || url.pathname.endsWith("/app.js") || url.pathname.endsWith("/index.html");
  if (isFreshCritical) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || (url.pathname.endsWith("/data/units.json") ? caches.match("./data/units.json") : isNavigation ? caches.match("./index.html") : Response.error()))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return (isUnitFile ? caches.match(event.request, { ignoreSearch: true }) : Promise.resolve(undefined)).then(unitCached => unitCached || fetch(event.request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())));
      return response;
    }).catch(() => isNavigation ? caches.match("./index.html") : Response.error()));
  }));
});
