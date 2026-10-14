// ---- TÉLÉPHONE : LA FICHE NE CACHE PLUS L'ARBRE (15/10/2026) ----
// Ses mots : « voilà ce qui bloque : c'est une fenêtre d'information qui ne doit pas rester figée » (sa capture : la
// fiche de Charles Théodore GASTELLIER ouverte en grand, l'arborescence cachée derrière).
// Sur le téléphone, la fiche s'ouvre maintenant RÉDUITE : une bande en bas avec le portrait, le nom et « Voir la
// fiche ▴ » ; l'arbre reste visible et se manipule. Un toucher sur la bande → la fiche entière ; « Réduire ▾ » →
// de nouveau la bande ; la croix ferme. Glisser la fiche vers le bas la réduit aussi. Le PC ne change pas.
// Puis : « devrait se fermer pour avoir la vue sur l'arborescence » → après une recherche, AUCUNE fiche (l'arbre seul) ;
// un toucher sur une carte → la bande ; un toucher sur le fond de l'arbre → la fiche se ferme.
// Ligne d'appel : index.html. La retirer = la fiche d'avant.
(() => {
  try {
    const panel = document.getElementById('panel');
    if (!panel) return;
    const mobile = () => document.documentElement.dataset.mode === 'mobile';
    let dernier = null;          // la personne dont la fiche est montrée
    let ouverte = false;         // la fiche entière (true) ou la bande (false)
    let cachee = false;          // après une recherche ou un toucher sur le fond : pas de fiche, l'arbre seul

    const appliquer = () => {
      const editing = panel.classList.contains('is-editing');
      const reduite = mobile() && !editing && !ouverte;
      panel.classList.toggle('fiche-reduite', reduite);
      panel.classList.toggle('fiche-cachee', mobile() && !editing && cachee);
      let b = panel.querySelector('.fiche-bascule');
      if (!mobile() || editing) { b?.remove(); return; }
      if (!b) {
        b = document.createElement('button');
        b.type = 'button'; b.className = 'fiche-bascule';
        const corps = panel.querySelector('.panel-body');
        (corps || panel).prepend(b);
      }
      b.textContent = reduite ? 'Voir la fiche ▴' : 'Réduire ▾';
    };

    // Chaque nouveau rendu de la fiche (app.js réécrit son contenu) : bande pour une nouvelle personne.
    new MutationObserver(() => {
      const titre = panel.querySelector('.p-title')?.textContent || '';
      if (panel.hidden) { dernier = null; ouverte = false; return; }
      if (titre !== dernier) { dernier = titre; ouverte = false; }
      const ed = panel.classList.contains('is-editing');
      if (!panel.querySelector('.fiche-bascule') || panel.classList.contains('fiche-reduite') !== (mobile() && !ouverte && !ed) || panel.classList.contains('fiche-cachee') !== (mobile() && !ed && cachee)) appliquer();
    }).observe(panel, { childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });

    panel.addEventListener('click', (e) => {
      if (!mobile() || panel.classList.contains('is-editing')) return;
      if (e.target.closest('[data-act="close"]')) return;
      if (e.target.closest('.fiche-bascule')) { ouverte = !ouverte; appliquer(); return; }
      if (panel.classList.contains('fiche-reduite')) { e.preventDefault(); e.stopPropagation(); ouverte = true; appliquer(); }
    }, true);

    // D'où vient le choix : la recherche → l'arbre seul ; une carte → la bande ; le fond de l'arbre → fermée.
    let x0 = 0, y00 = 0;
    document.addEventListener('pointerdown', (e) => { x0 = e.clientX; y00 = e.clientY; }, true);
    document.addEventListener('click', (e) => {
      if (!mobile() || !(e.target instanceof Element)) return;
      if (e.target.closest('#search-results [data-goto]')) {
        cachee = true; ouverte = false;
        // toute l'arborescence trouvée à l'écran (sinon le zoom sur une seule carte la cachait)
        setTimeout(() => document.querySelector('[data-zoom="fit"]')?.click(), 80);
        return;
      }
      if (e.target.closest('#nodes .node')) { cachee = false; ouverte = false; appliquer(); return; }
      const bouge = Math.hypot(e.clientX - x0, e.clientY - y00) > 8; // glisser l'arbre n'est pas un toucher
      if (!bouge && e.target.closest('#viewport') && !e.target.closest('#panel')) { cachee = true; appliquer(); }
    }, true);

    // Glisser vers le bas sur la fiche entière → la bande.
    let y0 = null;
    panel.addEventListener('touchstart', (e) => { y0 = e.touches[0]?.clientY ?? null; }, { passive: true });
    panel.addEventListener('touchend', (e) => {
      const y1 = e.changedTouches[0]?.clientY;
      const corps = panel.querySelector('.panel-body');
      if (mobile() && ouverte && y0 !== null && y1 - y0 > 60 && (!corps || corps.scrollTop <= 0)) { ouverte = false; appliquer(); }
      y0 = null;
    }, { passive: true });
  } catch (err) { /* repli : la fiche d'avant */ }
})();
// ---- FIN TÉLÉPHONE : LA FICHE NE CACHE PLUS L'ARBRE ----
