/* LanguageBase Service Worker: App offline verfügbar machen.
   Bei Änderungen an Dateien VERSION hochzählen, damit Geräte die neue Fassung laden. */
const VERSION = "lb-1.1.0";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/core.js", "js/install.js", "js/app.js",
  "data/en.js", "data/fr.js", "data/es.js", "data/it.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "lb-fonts").map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Schriften: aus dem Cache, im Hintergrund auffrischen
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("lb-fonts").then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // App-Dateien: Netz zuerst (immer aktuell), offline aus dem Cache
  e.respondWith(
    fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("index.html")))
  );
});
