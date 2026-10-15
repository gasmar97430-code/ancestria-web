// ---- PETITE PAGE D'INSCRIPTION SUR LE TÉLÉPHONE (15/10/2026) ----
// Ses mots : « une fois que je clique sur la bulle Enfant, une petite page pour inscrire toutes les informations et
// ajouter une petite photo d'identité ; il ne faut pas que la petite page d'information couvre l'UI sur un téléphone,
// ça devient pourri si tu caches le visuel de l'appli ».
// Sur le téléphone, la fiche d'inscription (renderEditor d'app.js, non modifié) devient une PETITE page posée en bas :
//   · 40 % de l'écran au plus, ses champs défilent à l'intérieur ; l'arbre reste visible au-dessus ;
//   · en tête : la petite photo d'identité (toucher = prendre / choisir une photo) et le nom ;
//   · tous les champs restent (prénom, nom, naissance, décès, lieu, origine, acte, notes) ; on ne montre pas les clés
//     techniques (identifiant, « Liens familiaux (clés UUID) ») : les liens de l'enfant sont déjà faits par la bulle ;
//   · l'arbre se recentre pour que la carte de la personne inscrite soit dans la partie visible, au-dessus de la page.
// Le PC n'est pas touché. Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = la fiche d'avant.
const HAUTEUR = 0.40; // part de l'écran

const style = document.createElement('style');
style.textContent = `
[data-mode="mobile"] #panel.is-editing { max-height: ${HAUTEUR * 100}vh; max-height: ${HAUTEUR * 100}dvh; left: 8px; right: 8px; bottom: calc(env(safe-area-inset-bottom) + 76px); }
[data-mode="mobile"] #panel.is-editing .panel-body { gap: 8px; padding: 10px 12px 12px; overflow-y: auto; overscroll-behavior: contain; }
[data-mode="mobile"] #panel.is-editing .ed-head { gap: 10px; position: sticky; top: -10px; z-index: 1; margin: -10px -12px 0; padding: 8px 44px 8px 12px; background: var(--ivory); border-bottom: 1px solid var(--line); }
[data-mode="mobile"] #panel.is-editing .ed-photo { width: 48px; height: 48px; font-size: 16px; }
[data-mode="mobile"] #panel.is-editing .ed-photo .hint { font-size: 11px; padding: 0 0 2px; }
[data-mode="mobile"] #panel.is-editing .ed-head h2 { font-size: 19px; }
[data-mode="mobile"] #panel.is-editing .ed-head code,
[data-mode="mobile"] #panel.is-editing .ed-section,
[data-mode="mobile"] #panel.is-editing .panel-body > p.muted { display: none !important; }
[data-mode="mobile"] #panel.is-editing .ed-grid { gap: 6px 8px; }
[data-mode="mobile"] #panel.is-editing .field { gap: 2px; font-size: 11px; }
[data-mode="mobile"] #panel.is-editing .input { min-height: 36px; padding: 4px 10px; font-size: 16px; }
[data-mode="mobile"] #panel.is-editing textarea.input { min-height: 56px; }
[data-mode="mobile"] #panel.is-editing .row-actions { position: sticky; bottom: -12px; z-index: 1; margin: 0 -12px -12px; padding: 8px 12px; background: var(--ivory); border-top: 1px solid var(--line); }
[data-mode="mobile"] #panel.is-editing .panel-close { top: 8px; right: 8px; z-index: 2; }`;
document.head.appendChild(style);

// Recentrer l'arbre au-dessus de la petite page : la carte de la personne inscrite au milieu de la partie visible.
function recentrer() {
  try {
    const V = window.AncestriaVue, panel = document.getElementById('panel');
    if (!V || !panel || document.documentElement.dataset.mode !== 'mobile' || !panel.classList.contains('is-editing')) return;
    const b = V.boite(V.choisi());
    if (!b) return;
    const page = panel.getBoundingClientRect();
    const haut = 180, bas = innerHeight - 93; // la zone de l'arbre sur le téléphone (insets() d'app.js)
    const voulu = (haut + Math.min(page.top, bas)) / 2; // milieu de ce qui reste visible au-dessus de la page
    const s = V.echelle();
    V.centrer(b.x + b.w / 2, b.y + b.h / 2 + ((haut + bas) / 2 - voulu) / s, s);
  } catch (err) { /* repli : l'arbre reste où il est */ }
}

try {
  const panel = document.getElementById('panel');
  let etait = false;
  if (panel) new MutationObserver(() => {
    const est = panel.classList.contains('is-editing');
    if (est && !etait) requestAnimationFrame(() => requestAnimationFrame(recentrer));
    // Page refermée (Terminé, croix) : l'arbre revient au milieu de sa zone, la personne inscrite au centre.
    if (!est && etait) requestAnimationFrame(() => {
      try { const V = window.AncestriaVue; const b = V.boite(V.choisi()); if (b) V.centrer(b.x + b.w / 2, b.y + b.h / 2, V.echelle()); } catch (err) { /* l'arbre reste où il est */ }
    });
    etait = est;
  }).observe(panel, { attributes: true, attributeFilter: ['class'] });
} catch (err) { /* repli : la fiche d'avant */ }
// ---- FIN PETITE PAGE D'INSCRIPTION SUR LE TÉLÉPHONE ----
