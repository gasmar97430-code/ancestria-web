// ---- TÉLÉPHONE : OUVRIR / REPLIER LA FICHE SOUS L'ARBRE (12/10/2026) ----
// Va avec arbre-plein.css (sa demande : « toute la partie basse et toute l'image devrait se voir »).
// Fiche repliée : la toucher l'ouvre. Fiche ouverte : toucher « Replier la fiche ▾ » (la fiche elle-même, pas un de
// ses boutons) la referme. Sous 760 px, ou téléphone basculé (paysage, ≤ 500 px de haut). Posé par une ligne d'import dans Porte.tsx.
if (typeof window !== 'undefined' && !(window as { __ficheRepliable?: boolean }).__ficheRepliable) {
    (window as { __ficheRepliable?: boolean }).__ficheRepliable = true;
    document.addEventListener('click', (e) => {
        try {
            if (!window.matchMedia('(max-width: 760px), (orientation: landscape) and (max-height: 500px)').matches) return;
            const cible = e.target as HTMLElement | null;
            const fiche = cible?.closest?.('aside.w-\\[300px\\]') as HTMLElement | null;
            if (!fiche) return;
            if (!fiche.hasAttribute('data-fiche-ouverte')) {
                fiche.setAttribute('data-fiche-ouverte', '');
                fiche.scrollTop = 0;
            } else if (cible === fiche) {
                fiche.removeAttribute('data-fiche-ouverte');
            }
        } catch { /* repli : la fiche reste comme elle est */ }
    });
}
// ---- FIN TÉLÉPHONE : OUVRIR / REPLIER LA FICHE ----
