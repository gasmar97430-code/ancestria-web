// ---- PETIT BOUTON « METTRE À JOUR » EN BAS D'INSTALLER (15/10/2026) ----
// Ses mots : « un petit bouton de mise à jour tout en bas dans Installer, et s'il y a une mise à jour le bouton
// clignote ». La mise à jour automatique (mise-a-jour.js, ses mots de la nuit) reste telle quelle ; ce bouton en plus :
//   · tout en bas de la carte « Installer » : « Mettre à jour » ;
//   · une nouvelle version est arrivée et la page ne l'a pas encore prise (saisie en cours…) → il CLIGNOTE ;
//   · un toucher → on cherche la dernière version, la page se recharge dessus (le brouillon reste dans le téléphone).
// Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = comme avant.
const style = document.createElement('style');
style.textContent = `
.bouton-maj-zone { display: flex; justify-content: center; margin-top: 10px; }
.bouton-maj { min-height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--ivory); color: var(--ink-2);
  font: 500 12.5px var(--sans); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.bouton-maj.a-faire { border-color: var(--gold); color: var(--gold-deep); animation: bouton-maj-clignote 1.1s ease-in-out infinite; }
/* Appli INSTALLÉE : l'onglet « Installer » est caché (sa demande du 15/10 matin) → à sa place, tout en bas, l'onglet
   « Mise à jour » (ses mots : « mais je ne vois pas de mise à jour »). */
#tabbar [data-maj-onglet] { display: none; }
body.appli-installee #tabbar [data-maj-onglet] { display: flex; }
#tabbar [data-maj-onglet].a-faire, #tabbar [data-nav="settings"].a-faire { color: var(--gold-deep); animation: bouton-maj-clignote 1.1s ease-in-out infinite; border-radius: 12px; }
@keyframes bouton-maj-clignote { 0%, 100% { box-shadow: 0 0 0 0 rgba(233,169,79,0); } 50% { box-shadow: 0 0 0 4px rgba(233,169,79,.55); background: #fff3d6; } }`;
document.head.appendChild(style);

let aFaire = false;
// Ses mots : « puis Paramètres clignote pour la mise à jour » → l'onglet Paramètres clignote aussi.
export function signaler() { aFaire = true; document.querySelectorAll('.bouton-maj, [data-maj-onglet], #tabbar [data-nav="settings"]').forEach((b) => b.classList.add('a-faire')); }

// L'onglet « Mise à jour » de l'appli installée (barre du bas, à la place d'« Installer »).
try {
  const barre = document.getElementById('tabbar');
  if (barre && !barre.querySelector('[data-maj-onglet]')) {
    const o = document.createElement('button');
    o.type = 'button'; o.dataset.majOnglet = '1';
    o.innerHTML = '<i class="ph ph-arrows-clockwise"></i>Mise à jour';
    barre.appendChild(o);
  }
} catch (err) { /* repli : le bouton de la carte Installer */ }

try {
  if ('serviceWorker' in navigator) {
    const avant = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (avant) signaler(); });
    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      if (r.waiting) signaler();
      r.addEventListener('updatefound', () => { if (navigator.serviceWorker.controller) signaler(); });
    }).catch(() => {});
  }
  const sheet = document.getElementById('sheet');
  const poser = () => {
    // Carte « Installer », et aussi « Paramètres » (ses mots : « sinon dans Paramètres »).
    if (!sheet || sheet.hidden || !['install', 'settings'].includes(sheet.dataset.kind) || sheet.querySelector('.bouton-maj')) return;
    const z = document.createElement('div');
    z.className = 'bouton-maj-zone';
    z.innerHTML = `<button type="button" class="bouton-maj${aFaire ? ' a-faire' : ''}"><i class="ph ph-arrows-clockwise"></i>Mettre à jour</button>`;
    sheet.appendChild(z);
  };
  if (sheet) new MutationObserver(poser).observe(sheet, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-kind'] });
  document.addEventListener('click', async (e) => {
    const b = e.target instanceof Element && e.target.closest('.bouton-maj, [data-maj-onglet]');
    if (!b) return;
    b.disabled = true; b.lastChild.textContent = 'Mise à jour…';
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch (err) { /* hors connexion : on recharge quand même */ }
    location.reload();
  });
} catch (err) { /* repli : la mise à jour automatique seule */ }
// ---- FIN PETIT BOUTON « METTRE À JOUR » ----
