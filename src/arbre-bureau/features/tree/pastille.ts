// ---- PLACE DE LA PASTILLE D'UNION ----
//
// « y aurait pas un bug ? » (26/09, image a l'appui) : un homme a une
// epouse a gauche et deux a droite (E1, puis E2). La pastille se posait
// au MILIEU des deux conjoints : pour lui + E2, ce milieu tombait sous
// E1, exactement sur la pastille lui + E1. Mesure sur une copie de sa
// base : 1 chevauchement sur 25 pastilles (u-24 x u-25).
//
// Regle : deux conjoints voisins -> milieu, comme avant (rien ne bouge). Deux
// conjoints NON voisins -> la pastille se pose contre le conjoint qui a le moins
// d'unions (l'epouse), du cote de l'autre (le mari). Deux epouses cote a cote
// donnent alors deux pastilles a un pas de carte (200 px) pour 170 px de large.

export interface Coin { x: number; y: number }

/** Centre horizontal de la pastille du couple (a, b). */
export function centrePastille(a: Coin, b: Coin, unionsA: number, unionsB: number, largeurCarte: number, ecart: number): number {
    const milieu = (a.x + b.x) / 2 + largeurCarte / 2;
    const pas = largeurCarte + ecart;
    if (Math.abs(a.x - b.x) <= pas + 0.5 || unionsA === unionsB) return milieu;
    const [epouse, autre] = unionsA < unionsB ? [a, b] : [b, a];
    return autre.x < epouse.x ? epouse.x - ecart / 2 : epouse.x + largeurCarte + ecart / 2;
}

/** Meme calcul, en comptant les unions de chaque conjoint dans la liste donnee. */
export function centrePastilleDe(
    u: { partenaire1Id: number; partenaire2Id: number },
    a: Coin,
    b: Coin,
    unions: { partenaire1Id: number; partenaire2Id: number }[],
    largeurCarte: number,
    ecart: number,
): number {
    const nb = (id: number) => unions.filter((x) => x.partenaire1Id === id || x.partenaire2Id === id).length;
    return centrePastille(a, b, nb(u.partenaire1Id), nb(u.partenaire2Id), largeurCarte, ecart);
}

// ---- FIN PLACE DE LA PASTILLE D'UNION ----
