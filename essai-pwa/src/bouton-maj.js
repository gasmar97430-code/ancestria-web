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
@keyframes bouton-maj-clignote { 0%, 100% { box-shadow: 0 0 0 0 rgba(233,169,79,0); } 50% { box-shadow: 0 0 0 4px rgba(233,169,79,.55); background: #fff3d6; } }`;
document.head.appendChild(style);

let aFaire = false;
export function signaler() { aFaire = true; document.querySelectorAll('.bouton-maj').forEach((b) => b.classList.add('a-faire')); }

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
    if (!sheet || sheet.hidden || sheet.dataset.kind !== 'install' || sheet.querySelector('.bouton-maj')) return;
    const z = document.createElement('div');
    z.className = 'bouton-maj-zone';
    z.innerHTML = `<button type="button" class="bouton-maj${aFaire ? ' a-faire' : ''}"><i class="ph ph-arrows-clockwise"></i>Mettre à jour</button>`;
    sheet.appendChild(z);
  };
  if (sheet) new MutationObserver(poser).observe(sheet, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-kind'] });
  document.addEventListener('click', async (e) => {
    const b = e.target instanceof Element && e.target.closest('.bouton-maj');
    if (!b) return;
    b.disabled = true; b.lastChild.textContent = 'Mise à jour…';
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch (err) { /* hors connexion : on recharge quand même */ }
    location.reload();
  });
} catch (err) { /* repli : la mise à jour automatique seule */ }
// ---- FIN PETIT BOUTON « METTRE À JOUR » ----
