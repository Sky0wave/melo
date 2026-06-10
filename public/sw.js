const CACHE_NAME = "melo-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", (e) => {
  // Let the browser handle external APIs/YouTube/Google Auth normally
  if (e.request.url.includes("/api/") || e.request.url.includes("accounts.google.com") || e.request.url.includes("youtube.com")) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
