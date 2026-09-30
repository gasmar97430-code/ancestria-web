export const COTE_VIGNETTE = 96;
export const COTE_PORTRAIT = 320;
export function cadreVignette(largeur: number, hauteur: number) {
    const cote = Math.min(largeur, hauteur);
    const x = Math.round((largeur - cote) / 2);
    const y = hauteur > largeur ? Math.round((hauteur - cote) * 0.2) : 0;
    return { x, y, cote, sortie: Math.max(1, Math.min(COTE_VIGNETTE, cote)) };
}
export function taillePortrait(largeur: number, hauteur: number, max = COTE_PORTRAIT) {
    const k = Math.min(1, max / Math.max(largeur, hauteur));
    return { largeur: Math.max(1, Math.round(largeur * k)), hauteur: Math.max(1, Math.round(hauteur * k)) };
}
