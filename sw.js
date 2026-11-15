// REDHUE service worker. Hæv CACHE ved hver udgivelse (sammen med VERSION i index.html).
const CACHE = "redhue-beta-5";
const FONTS = "redhue-fonts"; // beholdes på tværs af versioner
const ASSETS = ["/", "/index.html", "/manifest.json", "/privatliv.html", "/salg.html", "/avatar.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"];

// Ny version installeres i baggrunden og venter, til brugeren trykker "Genstart".
// Første installation tages i brug med det samme (der er ingen gammel version at vente på).
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Skrifttyper fra Google: gem dem, første gang der er net, så appen ser ens ud offline
  if (e.request.method === "GET" && (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com")) {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }
      catch { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.endsWith("/sw.js")) return;
  // Sider: netværk først (så rettelser kommer frem), cache hvis offline
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("/index.html"))));
    return;
  }
  // Øvrige filer: svar fra cache med det samme, og hent en frisk kopi i baggrunden
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const fresh = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    if (hit) { e.waitUntil(fresh); return hit; }
    return fresh;
  }));
});
