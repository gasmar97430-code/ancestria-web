// Ancestria service worker — app shell en cache, données Supabase jamais mises en cache.
// Chemins RELATIFS à l'emplacement de ce fichier : l'appli marche à la racine d'un domaine comme sous un
// sous-dossier (GitHub Pages /ancestria-web/).
const VERSION = 'ancestria-v6';
const BASE = new URL('./', self.location).href;
const SHELL = ['./', 'index.html', 'app.css', 'config.js', 'manifest.json',
  'src/app.js', 'src/auth-mode.js', 'src/mode.js', 'src/supabase.js', 'src/auth.js', 'src/pwa.js', 'src/tree-store.js', 'src/tree-view.js',
  'icons/ancestria-192.png', 'icons/ancestria-512.png', 'img/arbre-de-vie.webp'].map((p) => new URL(p, BASE).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// ---- BASCULE DEPUIS L'ANCIEN SITE (13/10/2026) ----
// Ses mots : « quand tu refais une nouvelle u i ça ne devrait plus apparaitre » (le bandeau « Une nouvelle version
// d'Ancestria est prête »). L'ancien site laisse des caches « ancestria-appli-… » et son écran ouvert attend un toucher.
// Si ces caches existent, c'est la bascule : les pages ouvertes sont rechargées tout de suite → la nouvelle appli,
// sans bandeau. Les mises à jour ordinaires de la nouvelle appli ne rechargent rien (une saisie en cours reste).
// 14/10 : les caches sont communs à toute l'adresse github.io. À l'adresse d'ESSAI (/essai-pwa/), l'ancien site vit
// à côté : on n'efface que NOS anciennes versions (« ancestria-v… »), jamais les siennes, et rien n'est rechargé.
const ESSAI = new URL(self.registration.scope).pathname.includes('/essai-pwa/');
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    let bascule = false;
    try {
      const keys = await caches.keys();
      bascule = !ESSAI && keys.some((k) => k.startsWith('ancestria-appli-'));
      const anciens = (k) => k !== VERSION && (/^ancestria-v\d+$/.test(k) || (bascule && /^ancestria-(appli-|donnees$)/.test(k)));
      await Promise.all(keys.filter(anciens).map((k) => caches.delete(k)));
    } catch (err) { /* repli : on continue comme avant */ }
    await self.clients.claim();
    if (!bascule) return;
    try {
      for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) c.navigate(c.url).catch(() => {});
    } catch (err) { /* repli : l'ancienne page reste jusqu'à sa prochaine ouverture */ }
  })());
});
// ---- FIN BASCULE DEPUIS L'ANCIEN SITE ----

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
