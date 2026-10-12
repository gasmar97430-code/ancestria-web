// ---- TÉLÉPHONE : LE CLAVIER SE RANGE (12/10/2026) ----
//
// Sa capture : « le clavier reste trop en avant ; on a besoin d'écrire mais il ne faut pas que ça prenne toute la
// place ». Sur un écran tactile seulement :
//   - la touche du clavier devient « Rechercher » (enterkeyhint) sur le champ de recherche ;
//   - à l'arrivée, le champ ne s'active plus tout seul (le clavier ne s'ouvre qu'au toucher) ;
//   - Entrée, ou toucher ailleurs que dans un champ (un résultat, la carte, l'arbre, faire défiler) → le clavier se
//     range ; on retouche le champ pour réécrire.
// Rien d'autre ne change. Posé par une ligne d'import dans Porte.tsx.

const tactile = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
const estChamp = (n: EventTarget | null) => n instanceof HTMLElement && !!n.closest('input, textarea, select, [contenteditable="true"]');

export function rangerClavier(): void {
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) a.blur();
}

if (typeof window !== 'undefined' && !(window as { __clavier?: boolean }).__clavier) {
    (window as { __clavier?: boolean }).__clavier = true;
    document.addEventListener('keydown', (e) => {
        if (!tactile() || e.key !== 'Enter') return;
        const t = e.target as HTMLElement | null;
        if (t?.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'password' && !t.closest('form')) rangerClavier();
    }, true);
    let dernierToucher = 0;
    document.addEventListener('touchstart', (e) => { dernierToucher = Date.now(); if (tactile() && !estChamp(e.target)) rangerClavier(); }, { passive: true, capture: true });
    // un champ qui s'active TOUT SEUL (autoFocus de l'Accueil) ouvrait le clavier à l'arrivée : sur téléphone, seul un
    // vrai toucher l'ouvre
    document.addEventListener('focusin', (e) => {
        const t = e.target as HTMLElement | null;
        if (!tactile()) return;
        if (Date.now() - dernierToucher < 1000) {   // vrai toucher : la barre de recherche remonte au-dessus du clavier
            if (t?.matches?.('input[data-champ="accueil"]')) setTimeout(() => t.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350);
            return;
        }
        if (t?.tagName === 'INPUT' && t.matches('input[data-champ="accueil"], input[placeholder^="Nom de famille ou personne"]')) t.blur();
    }, true);
    // la touche « Rechercher » sur les champs de recherche (posée aussi sur ceux qui apparaissent plus tard)
    const poser = () => document.querySelectorAll<HTMLInputElement>('input[data-champ="accueil"], input[placeholder^="Nom de famille ou personne"]').forEach((i) => { if (!i.enterKeyHint) i.enterKeyHint = 'search'; });
    new MutationObserver(poser).observe(document.documentElement, { childList: true, subtree: true });
}

// ---- FIN TÉLÉPHONE : LE CLAVIER SE RANGE ----
