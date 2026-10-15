// ---- FLUIDITÉ PENDANT LE GESTE (15/10/2026) ----
// Ses mots : « ça rame énormément quand je zoome sur un endroit précis » ; « quand j'ouvre l'appli sur le téléphone ce
// doit être extrêmement fluide, pas de lourdeur ».
// Mesuré sur SON arbre (banc-fluidite-1510.mjs, téléphone, processeur ×6) : FERRÈRE 41 images/s au zoom ; sans les
// animations 60. Ses lignes clignotantes sont GARDÉES : elles se mettent seulement en PAUSE pendant que l'arbre bouge
// (doigt, pincement, molette, recentrage), et repartent 250 ms après. On suit le mouvement du calque #layer (son
// attribut style change à chaque déplacement) : rien d'autre n'est touché.
// Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = comme avant.
const REPRISE_MS = 250;

const style = document.createElement('style');
style.textContent = `body.en-geste #links *, body.en-geste #nodes .node, body.en-geste #bulles-enfant * { animation-play-state: paused !important; }`;
document.head.appendChild(style);

try {
  const layer = document.getElementById('layer');
  let minuterie = 0;
  if (layer) new MutationObserver(() => {
    if (!document.body.classList.contains('en-geste')) document.body.classList.add('en-geste');
    clearTimeout(minuterie);
    minuterie = setTimeout(() => document.body.classList.remove('en-geste'), REPRISE_MS);
  }).observe(layer, { attributes: true, attributeFilter: ['style'] });
} catch (err) { /* repli : les animations tournent comme avant */ }
// ---- FIN FLUIDITÉ PENDANT LE GESTE ----
