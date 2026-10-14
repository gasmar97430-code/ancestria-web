// ---- LA FICHE NE CACHE JAMAIS L'ARBRE (15/10/2026, bloc refait) ----
// Ses mots du 15/10 : « une fenêtre d'information qui ne doit pas rester figée » ; « devrait se fermer pour avoir la vue
// sur l'arborescence » ; « la fiche de la personne doit s'ouvrir que pour l'inscription des noms de chaque nom de
// famille, mais une fois terminé ça se ferme automatiquement » ; « quand je ferme la boîte d'information toute
// l'arborescence disparaît ».
// Règle :
//   · la fiche ne sert qu'à INSCRIRE des noms (Modifier / Ajouter un membre) : elle s'ouvre quand on touche une carte
//     sur le PC (là où l'administrateur inscrit), jamais toute seule après une recherche, jamais sur le téléphone ;
//   · « Terminé » (fin de l'inscription) → elle se ferme d'elle-même ;
//   · la croix ou un toucher sur le fond de l'arbre → elle se ferme ;
//   · fermer la fiche ne touche PAS à l'arbre : avant, la croix « oubliait » la personne choisie (app.js : S.sel = null)
//     et l'arborescence se vidait. Ici la croix cache seulement la fiche.
// Ligne d'appel : index.html. La retirer = la fiche d'avant.
(() => {
  try {
    const panel = document.getElementById('panel');
    if (!panel) return;
    const mobile = () => document.documentElement.dataset.mode === 'mobile';
    let cachee = true; // pas de fiche tant qu'on n'a pas touché une carte (PC)

    const appliquer = () => {
      const editing = panel.classList.contains('is-editing');
      const doit = !editing && (cachee || mobile());
      if (panel.classList.contains('fiche-cachee') !== doit) panel.classList.toggle('fiche-cachee', doit);
    };
    new MutationObserver(appliquer).observe(panel, { childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });

    let x0 = 0, y0 = 0;
    document.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; }, true);
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      // La croix de la fiche : cacher la fiche, garder l'arbre (on empêche app.js de vider la personne choisie).
      if (e.target.closest('#panel [data-act="close"]')) { e.preventDefault(); e.stopPropagation(); cachee = true; appliquer(); return; }
      // « Terminé » / croix de l'édition : l'inscription est finie → la fiche se ferme d'elle-même.
      if (e.target.closest('#panel [data-act="view"]')) { cachee = true; setTimeout(appliquer, 0); return; }
      if (e.target.closest('#search-results [data-goto]')) {
        cachee = true; appliquer();
        setTimeout(() => document.querySelector('[data-zoom="fit"]')?.click(), 80); // toute l'arborescence à l'écran
        return;
      }
      if (e.target.closest('#nodes .node')) { cachee = false; setTimeout(appliquer, 0); return; }
      const bouge = Math.hypot(e.clientX - x0, e.clientY - y0) > 8; // glisser l'arbre n'est pas un toucher
      if (!bouge && e.target.closest('#viewport') && !e.target.closest('#panel')) { cachee = true; appliquer(); }
    }, true);
    appliquer();
  } catch (err) { /* repli : la fiche d'avant */ }
})();
// ---- FIN LA FICHE NE CACHE JAMAIS L'ARBRE ----
