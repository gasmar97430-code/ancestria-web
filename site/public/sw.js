// ---- ANCESTRIA EN MODE TÉLÉPHONE (sa demande du 03/10/2026) ----
// « Ancestria pourrait fonctionner comme une petite appli version Google Play Store … si je ne dois rien
// payer » → le site s'installe sur l'écran d'accueil du téléphone (Chrome : « Installer l'application »).
// Ce service ne garde RIEN en mémoire : chaque page et chaque donnée viennent toujours du réseau, comme
// dans le navigateur (jamais un arbre périmé, jamais une donnée personnelle stockée sur le téléphone).
// Il existe seulement pour que les téléphones reconnaissent le site comme une appli installable.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
    // rien : la requête suit son chemin normal (réseau)
});
// ---- FIN ----
