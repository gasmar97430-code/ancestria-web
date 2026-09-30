// ---- RECENTRAGE DES FOYERS (placement horizontal) ----
//
// Mesure du 26/09 sur sa base (arbre entier, 95 personnes) : les parents d'une
// personne a 3 402 px d'elle (19 cartes), 61 filiations sur 131 a plus
// de 3 cartes d'ecart, des trous de 3 000 a 4 000 px dans les rangees.
//
// Cause : dagre range bien l'ORDRE des foyers (peu de croisements) mais son
// placement horizontal (Brandes-Kopf) n'aligne chaque bloc que sur UN voisin.
// Le foyer Annelie - Louis - Marie-Marthe a deux couples de parents : il suit
// ceux de Marie-Marthe et laisse ceux de Louis au loin.
//
// Methode : on GARDE l'ordre de dagre dans chaque rangee (donc pas un
// croisement de plus) et on recalcule seulement les abscisses. Chaque foyer
// est tire vers la position qui met ses cartes a l'aplomb de celles
// auxquelles elles sont reliees — sous la carte de l'enfant, pas au milieu du
// foyer —, en balayant les rangees de haut en bas puis de bas en haut. Dans
// une rangee, « au plus pres des positions voulues sans se chevaucher et sans
// changer l'ordre » est une regression isotone avec ecart minimal : resolue
// exactement par l'algorithme PAVA (pool adjacent violators).

export interface Lien {
    /** foyer parent, foyer enfant */
    parent: number;
    enfant: number;
    /** abscisse d'ancrage DANS le foyer parent (milieu du couple) et dans le foyer enfant (centre de la carte) */
    ancreParent: number;
    ancreEnfant: number;
}

/**
 * Au plus pres des positions voulues `d` (poids `w`), dans l'ordre donne, avec
 * gauche[i] >= gauche[i-1] + largeur[i-1] + ecart. Solution exacte (PAVA).
 */
export function placerRangee(d: number[], w: number[], largeur: number[], ecart: number): number[] {
    const n = d.length;
    const decal: number[] = [];
    let s = 0;
    for (let i = 0; i < n; i++) {
        decal.push(s);
        s += largeur[i] + ecart;
    }
    // y_i = gauche_i - decal_i doit etre croissant : regression isotone de t_i = d_i - decal_i.
    const blocs: { somme: number; poids: number; debut: number; fin: number }[] = [];
    for (let i = 0; i < n; i++) {
        blocs.push({ somme: (d[i] - decal[i]) * w[i], poids: w[i], debut: i, fin: i });
        while (blocs.length > 1) {
            const b = blocs[blocs.length - 1];
            const a = blocs[blocs.length - 2];
            if (a.somme / a.poids <= b.somme / b.poids) break;
            blocs.splice(blocs.length - 2, 2, { somme: a.somme + b.somme, poids: a.poids + b.poids, debut: a.debut, fin: b.fin });
        }
    }
    const gauche = new Array<number>(n);
    for (const b of blocs) for (let i = b.debut; i <= b.fin; i++) gauche[i] = b.somme / b.poids + decal[i];
    return gauche;
}

/**
 * @param rangees  indices des foyers de chaque generation, dans l'ordre gauche -> droite de dagre
 * @param largeur  largeur de chaque foyer
 * @param gauche   abscisse de depart (celle de dagre) de chaque foyer
 */
export function recentrer(rangees: number[][], largeur: number[], gauche: number[], liens: Lien[], ecart: number, tours = 10): number[] {
    const x = [...gauche];
    const versParents = new Map<number, Lien[]>();
    const versEnfants = new Map<number, Lien[]>();
    for (const l of liens) {
        versParents.set(l.enfant, [...(versParents.get(l.enfant) ?? []), l]);
        versEnfants.set(l.parent, [...(versEnfants.get(l.parent) ?? []), l]);
    }
    // Position voulue d'un foyer d'apres ses liens (vers le haut, le bas, ou les deux).
    const voulu = (f: number, haut: boolean, bas: boolean): [number, number] => {
        let somme = 0;
        let n = 0;
        if (haut) for (const l of versParents.get(f) ?? []) { somme += x[l.parent] + l.ancreParent - l.ancreEnfant; n++; }
        if (bas) for (const l of versEnfants.get(f) ?? []) { somme += x[l.enfant] + l.ancreEnfant - l.ancreParent; n++; }
        // Sans lien dans ce sens : il reste ou il est, sans resister beaucoup aux voisins.
        return n ? [somme / n, n] : [x[f], 0.25];
    };
    const passe = (rangee: number[], haut: boolean, bas: boolean) => {
        const v = rangee.map((f) => voulu(f, haut, bas));
        const res = placerRangee(v.map((p) => p[0]), v.map((p) => p[1]), rangee.map((f) => largeur[f]), ecart);
        rangee.forEach((f, i) => (x[f] = res[i]));
    };
    for (let t = 0; t < tours; t++) {
        for (let r = 1; r < rangees.length; r++) passe(rangees[r], true, false);
        for (let r = rangees.length - 2; r >= 0; r--) passe(rangees[r], false, true);
    }
    // Dernier tour : chaque rangee equilibre ses parents et ses enfants.
    for (let r = 0; r < rangees.length; r++) passe(rangees[r], true, true);
    return x;
}

/**
 * Croisements de cordons entre rangees voisines, pour un ordre donne. Deux
 * cordons se croisent si leurs extremites haute et basse sont dans l'ordre
 * inverse (a l'interieur d'un foyer, on compare les ancres).
 */
export function croisements(rangees: number[][], liens: Lien[]): number {
    const { indice, parEntreRangees } = preparer(rangees, liens);
    let total = 0;
    for (const ls of parEntreRangees.values()) total += croisementsEntre(ls, indice);
    return total;
}

/** Position de chaque foyer dans sa rangee, et cordons groupes par paire de rangees (r, r+1). */
function preparer(rangees: number[][], liens: Lien[]) {
    const rangDe = new Map<number, number>();
    const indice = new Map<number, number>();
    rangees.forEach((r, ri) => r.forEach((f, i) => { rangDe.set(f, ri); indice.set(f, i); }));
    const parEntreRangees = new Map<number, Lien[]>();
    for (const l of liens) {
        const rp = rangDe.get(l.parent);
        if (rp === undefined || rangDe.get(l.enfant) !== rp + 1) continue; // cordons de plus d'une generation : non comptes
        parEntreRangees.set(rp, [...(parEntreRangees.get(rp) ?? []), l]);
    }
    return { rangDe, indice, parEntreRangees };
}

/**
 * Croisements entre deux rangees en O(n log n) : les cordons tries par leur
 * bout haut, on compte les inversions STRICTES de leur bout bas (tri fusion).
 * Deux cordons partant du meme point ne se croisent pas.
 */
function croisementsEntre(ls: Lien[], indice: Map<number, number>): number {
    const cle = (f: number, a: number) => indice.get(f)! * 1e6 + a;
    const tries = ls
        .map((l) => [cle(l.parent, l.ancreParent), cle(l.enfant, l.ancreEnfant)] as [number, number])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // Cordons de meme bout haut : ordonnes par bout bas, aucune inversion comptee entre eux.
    const bas = tries.map((t) => t[1]);
    const fusion = (a: number[]): [number[], number] => {
        if (a.length < 2) return [a, 0];
        const m = a.length >> 1;
        const [g, cg] = fusion(a.slice(0, m));
        const [d, cd] = fusion(a.slice(m));
        const res: number[] = [];
        let c = cg + cd, i = 0, j = 0;
        while (i < g.length && j < d.length) {
            if (d[j] < g[i]) { c += g.length - i; res.push(d[j++]); } else res.push(g[i++]);
        }
        return [res.concat(g.slice(i), d.slice(j)), c];
    };
    return fusion(bas)[1];
}

/**
 * Passe « transpose » (Sugiyama) : echange deux foyers voisins d'une rangee
 * tant que cela DIMINUE les croisements. Jamais pire que l'ordre de dagre.
 */
export function transposer(rangees: number[][], liens: Lien[], tours?: number): number[][] {
    const r = rangees.map((x) => [...x]);
    // Grand arbre (import GEDCOM) : moins de tours, le gros du gain vient des premiers (mesure 26/09).
    const foyers = r.reduce((n, x) => n + x.length, 0);
    tours ??= foyers > 400 ? 3 : 20;
    const { indice, parEntreRangees } = preparer(r, liens);
    // Echanger deux foyers de la rangee k ne change que les croisements (k-1,k) et (k,k+1).
    const local = (k: number) => croisementsEntre(parEntreRangees.get(k - 1) ?? [], indice) + croisementsEntre(parEntreRangees.get(k) ?? [], indice);
    for (let t = 0; t < tours; t++) {
        let mieux = false;
        r.forEach((rangee, k) => {
            let actuel = local(k);
            for (let i = 0; i + 1 < rangee.length; i++) {
                const [a, b] = [rangee[i], rangee[i + 1]];
                rangee[i] = b; rangee[i + 1] = a; indice.set(b, i); indice.set(a, i + 1);
                const c = local(k);
                if (c < actuel) {
                    actuel = c;
                    mieux = true;
                } else {
                    rangee[i] = a; rangee[i + 1] = b; indice.set(a, i); indice.set(b, i + 1);
                }
            }
        });
        if (!mieux) break;
    }
    return r;
}

/** Ce que la disposition par foyers fournit (dagre deja passe). */
interface GrapheDagre {
    node(id: string): { x: number; y: number; width: number };
}

/**
 * Branche le recentrage sur la disposition par foyers : lit les foyers places
 * par dagre, recalcule leurs abscisses, les reecrit dans le graphe.
 */
export function recentrerGraphe(
    graphe: GrapheDagre,
    groupes: number[][],
    relationships: { parentId: number; enfantId: number }[],
    largeurCarte: number,
    ecartConjoints: number,
    ecartFoyers: number,
) {
    const n = groupes.length;
    if (n === 0) return;
    const pas = largeurCarte + ecartConjoints;
    const foyerDe = new Map<number, number>();
    const rangDans = new Map<number, number>();
    groupes.forEach((g, i) => g.forEach((id, k) => { foyerDe.set(id, i); rangDans.set(id, k); }));
    const centreCarte = (id: number) => rangDans.get(id)! * pas + largeurCarte / 2;

    const largeur = groupes.map((_, i) => graphe.node(`f-${i}`).width);
    const gauche = groupes.map((_, i) => graphe.node(`f-${i}`).x - largeur[i] / 2);
    const parY = new Map<number, number[]>();
    groupes.forEach((_, i) => {
        const y = Math.round(graphe.node(`f-${i}`).y);
        parY.set(y, [...(parY.get(y) ?? []), i]);
    });
    const rangees = [...parY.entries()].sort((a, b) => a[0] - b[0]).map(([, fs]) => fs.sort((a, b) => gauche[a] - gauche[b]));

    // Un lien par enfant et par foyer de parents : ancre = milieu de ses parents dans ce foyer.
    const parents = new Map<string, number[]>();
    for (const r of relationships) {
        const fp = foyerDe.get(r.parentId);
        const fe = foyerDe.get(r.enfantId);
        if (fp === undefined || fe === undefined || fp === fe) continue;
        const cle = `${fp}|${fe}|${r.enfantId}`;
        parents.set(cle, [...(parents.get(cle) ?? []), r.parentId]);
    }
    const liens: Lien[] = [...parents.entries()].map(([cle, ps]) => {
        const [fp, fe, enfant] = cle.split('|').map(Number);
        return {
            parent: fp,
            enfant: fe,
            ancreParent: ps.reduce((s, p) => s + centreCarte(p), 0) / ps.length,
            ancreEnfant: centreCarte(enfant),
        };
    });

    const x = recentrer(transposer(rangees, liens), largeur, gauche, liens, ecartFoyers);
    groupes.forEach((_, i) => (graphe.node(`f-${i}`).x = x[i] + largeur[i] / 2));
}

// ---- FIN RECENTRAGE DES FOYERS ----
