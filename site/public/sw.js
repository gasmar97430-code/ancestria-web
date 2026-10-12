// ---- ANCESTRIA SUR LE TÉLÉPHONE : HORS CONNEXION ET MISES À JOUR (refait le 12/10/2026) ----
// 03/10 : ce service ne gardait rien (il servait seulement à rendre le site installable).
// 12/10, SA NOUVELLE RÈGLE (texte collé + « pas le jeu mais ancestria ») : après une première ouverture en ligne,
// Ancestria s'ouvre et marche HORS CONNEXION, et un bouton « Mettre Ancestria à jour » apparaît quand une nouvelle
// version est publiée (la progression est sauvegardée avant le rechargement : src-web/hors-connexion/).
//
// Ce qui est gardé sur le téléphone :
//   - l'appli elle-même (liste écrite à la construction dans precache.js : page, programme, style, polices, image) ;
//   - les arbres déjà ouverts (réponses de arbre_public, où la base a DÉJÀ masqué les vivants — loi 6), pour les
//     revoir hors connexion. Seulement pour un visiteur ou un inscrit : jamais quand LUI est connecté
//     (administrateur) — ses données ne sont jamais gardées sur un téléphone.
// Jamais gardé : un envoi (inscription, proposition, mot de passe, désinscription) : il part au réseau ou échoue.
//
// Une nouvelle version s'installe à côté et ATTEND : la page montre le bouton ; au toucher → message 'maj' →
// la nouvelle version prend la main → la page se recharge. Toute première fois : prend la main tout de suite.
// Sans precache.js (construction sans le greffon) : rien n'est gardé, tout vient du réseau, comme avant.
try { importScripts('precache.js'); } catch (e) { /* repli : comme avant, tout du réseau */ }
const VERSION = self.__ANCESTRIA_VERSION || null;
const FICHIERS = self.__ANCESTRIA_FICHIERS || [];
const APPLI = 'ancestria-appli-' + VERSION;
const DONNEES = 'ancestria-donnees';
const LECTURES = ['arbre_public'];

async function prevenir(message) {
    try { for (const c of await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })) c.postMessage(message); } catch (e) { /* rien */ }
}

self.addEventListener('install', (e) => {
    if (!VERSION) { self.skipWaiting(); return; }
    e.waitUntil((async () => {
        const premiere = !(await caches.keys()).some((k) => k.startsWith('ancestria-appli-'));
        const c = await caches.open(APPLI);
        await c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })));
        if (premiere) self.skipWaiting();   // rien à remplacer : prend la main tout de suite
    })());
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        for (const k of await caches.keys()) if (k.startsWith('ancestria-appli-') && k !== APPLI) await caches.delete(k);
        await self.clients.claim();
        if (VERSION) await prevenir({ type: 'ancestria-prete', version: VERSION });
    })());
});

self.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'maj') self.skipWaiting();
    if (d.type === 'etat' && e.source) {
        caches.has(APPLI).then((pret) => e.source.postMessage({ type: 'ancestria-etat', version: VERSION, prete: !!VERSION && pret })).catch(() => {});
    }
});

async function empreinte(texte) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
    return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Lecture de la base : réseau d'abord ; hors connexion, la dernière réponse gardée.
async function lectureBase(req, fn) {
    const corps = await req.clone().text();
    const cle = new Request('https://garde.ancestria.local/rpc/' + fn + '/' + (await empreinte(corps)));
    try {
        const r = await fetch(req);
        if (r.ok) { const c = await caches.open(DONNEES); await c.put(cle, r.clone()); }
        return r;
    } catch (err) {
        const garde = await (await caches.open(DONNEES)).match(cle);
        if (garde) return garde;
        throw err;
    }
}

// L'appli : ce qui est gardé d'abord (la version installée), sinon le réseau.
async function appli(req) {
    const c = await caches.open(APPLI);
    if (req.mode === 'navigate') {
        const page = await c.match('./');
        if (page) return page;
        return fetch(req);
    }
    const garde = await c.match(req, { ignoreSearch: false });
    if (garde) return garde;
    return fetch(req);
}

self.addEventListener('fetch', (e) => {
    if (!VERSION) return;   // repli : tout du réseau
    const req = e.request;
    let url;
    try { url = new URL(req.url); } catch (err) { return; }
    const m = url.pathname.match(/\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (/supabase\.co$/.test(url.hostname) && req.method === 'POST' && m && LECTURES.includes(m[1])) {
        const cle = req.headers.get('apikey');
        const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        if (cle && auth === cle) e.respondWith(lectureBase(req, m[1]));   // visiteur / inscrit seulement
        return;
    }
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;
    const portee = new URL(self.registration.scope);
    if (!url.pathname.startsWith(portee.pathname)) return;
    if (url.pathname.startsWith(portee.pathname + 'essai/')) return;   // l'adresse d'essai a son propre service
    e.respondWith(appli(req));
});
// ---- FIN ANCESTRIA SUR LE TÉLÉPHONE ----
