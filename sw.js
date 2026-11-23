/* Schul-Gehirn Service Worker – macht die App offline-fähig */
const V = "schulgehirn-v7";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const EXTRA = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(SHELL);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});
const put = (req, res) => { if (res && (res.ok || res.type === "opaque")) caches.open(V).then(c => c.put(req, res)); };
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.endsWith("googleapis.com") && !u.hostname.startsWith("fonts")) return; // KI-Anfragen nie cachen
  if (u.origin === location.origin && r.mode === "navigate") {
    // Netzwerk zuerst (für Updates), offline aus dem Cache
    e.respondWith(fetch(r).then(res => { put("./index.html", res.clone()); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  if (u.origin === location.origin || /(^|\.)cdnjs\.cloudflare\.com$|^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => { put(r, res.clone()); return res; }).catch(() => m);
      return m || net;
    }));
  }
});
