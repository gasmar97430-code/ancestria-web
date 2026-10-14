// Ancestria service worker — app shell en cache, données Supabase jamais mises en cache.
// Chemins RELATIFS à l'emplacement de ce fichier : l'appli marche à la racine d'un domaine comme sous un
// sous-dossier (GitHub Pages /ancestria-web/).
const VERSION = 'ancestria-v23';
const BASE = new URL('./', self.location).href;
const SHELL = ['./', 'index.html', 'app.css', 'config.js', 'manifest.json',
  'src/app.js', 'src/auth-mode.js', 'src/inscription-envoyee.js', 'src/installer-fluide.js', 'src/mise-a-jour.js', 'src/fiche-mobile.js', 'src/famille-visible.js', 'src/admin-table.js', 'src/mode.js', 'src/supabase.js', 'src/auth.js', 'src/pwa.js', 'src/tree-store.js', 'src/tree-view.js',
  'icons/ancestria-192.png', 'icons/ancestria-512.png', 'img/arbre-de-vie.webp'].map((p) => new URL(p, BASE).href);

self.addEventListener('install', (e) => {
  // 14/10 : cache: 'reload' = fichiers frais, jamais ceux que le navigateur gardait (GitHub les garde 10 min) :
  // sinon une nouvelle version s'installait avec l'ancienne feuille de style (mesuré en ligne, v6).
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
      // 15/10 : une page encore ouverte sur une version d'AVANT (cache « ancestria-vN » plus ancien) est rechargée tout
      // de suite elle aussi : jamais d'ancienne version à l'écran (ses mots : « des versions qui ne doivent plus y être »).
      if (keys.some((k) => /^ancestria-v\d+$/.test(k) && k !== VERSION)) bascule = true;
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

// ---- TOUJOURS LA DERNIÈRE VERSION (15/10/2026) ----
// Ses mots : « arrête de me dire à chaque fois que c'est l'ancienne version … tu dois résoudre le problème ».
// Avant : les fichiers gardés passaient d'abord (cache d'abord) → l'ancienne version s'affichait jusqu'à l'ouverture
// suivante. Maintenant : le RÉSEAU d'abord, revalidé (no-cache : GitHub garde 10 min sinon), la copie gardée n'est
// rendue que SANS Internet. Avec Internet, on voit toujours la dernière version publiée.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Supabase (auth, REST, RPC, storage) et toute écriture : toujours réseau, jamais gardé.
  if (req.method !== 'GET' || url.hostname.endsWith('.supabase.co')) return;
  if (url.origin !== location.origin) return; // polices, icônes d'ailleurs : le navigateur s'en occupe
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) { const copie = res.clone(); caches.open(VERSION).then((c) => c.put(req, copie)).catch(() => {}); }
      return res;
    } catch (err) {
      const garde = await caches.match(req) || (req.mode === 'navigate' ? await caches.match(new URL('index.html', BASE).href) : null);
      if (garde) return garde;
      throw err;
    }
  })());
});
// ---- FIN TOUJOURS LA DERNIÈRE VERSION ----
