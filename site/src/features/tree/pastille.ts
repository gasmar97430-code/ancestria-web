export interface Coin {
    x: number;
    y: number;
}
export function centrePastille(a: Coin, b: Coin, unionsA: number, unionsB: number, largeurCarte: number, ecart: number): number {
    const milieu = (a.x + b.x) / 2 + largeurCarte / 2;
    const pas = largeurCarte + ecart;
    if (Math.abs(a.x - b.x) <= pas + 0.5 || unionsA === unionsB)
        return milieu;
    const [epouse, autre] = unionsA < unionsB ? [a, b] : [b, a];
    return autre.x < epouse.x ? epouse.x - ecart / 2 : epouse.x + largeurCarte + ecart / 2;
}
export function centrePastilleDe(u: {
    partenaire1Id: number;
    partenaire2Id: number;
}, a: Coin, b: Coin, unions: {
    partenaire1Id: number;
    partenaire2Id: number;
}[], largeurCarte: number, ecart: number): number {
    const nb = (id: number) => unions.filter((x) => x.partenaire1Id === id || x.partenaire2Id === id).length;
    return centrePastille(a, b, nb(u.partenaire1Id), nb(u.partenaire2Id), largeurCarte, ecart);
}
