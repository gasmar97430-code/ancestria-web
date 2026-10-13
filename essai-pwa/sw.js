// Ancestria service worker — app shell en cache, données Supabase jamais mises en cache.
// Chemins RELATIFS à l'emplacement de ce fichier : l'appli marche à la racine d'un domaine comme sous un
// sous-dossier (GitHub Pages /ancestria-web/).
const VERSION = 'ancestria-v3';
const BASE = new URL('./', self.location).href;
const SHELL = ['./', 'index.html', 'app.css', 'config.js', 'manifest.json',
  'src/app.js', 'src/mode.js', 'src/supabase.js', 'src/auth.js', 'src/pwa.js', 'src/tree-store.js', 'src/tree-view.js',
  'icons/ancestria-192.png', 'icons/ancestria-512.png', 'img/arbre-de-vie.webp'].map((p) => new URL(p, BASE).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Supabase (auth, REST, RPC, storage) et toute écriture : toujours réseau.
  if (req.method !== 'GET' || url.hostname.endsWith('.supabase.co')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(new URL('index.html', BASE).href)));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
