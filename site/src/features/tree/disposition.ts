import dagre from 'dagre';
import type { Node } from 'reactflow';
import type { Id, Person, Relationship, Union } from '../../types';
import { recentrerGraphe } from './recentrage';
import { centrePastilleDe } from './pastille';
import { comparerConjoints } from './ordreConjoints';
export const LARGEUR_CARTE = 176;
export const HAUTEUR_CARTE = 84;
export const LARGEUR_PASTILLE = 170;
export const HAUTEUR_PASTILLE = 26;
export const ECART_CONJOINTS = 24;
export const DESCENTE_PASTILLE = 22;
const HAUTEUR_FOYER = HAUTEUR_CARTE + DESCENTE_PASTILLE + HAUTEUR_PASTILLE;
export function foyers(people: Person[], unions: Union[]): Id[][] {
    const connus = new Set(people.map((p) => p.id));
    const voisins = new Map<Id, Set<Id>>();
    for (const p of people)
        voisins.set(p.id, new Set());
    for (const u of unions) {
        if (!connus.has(u.partenaire1Id) || !connus.has(u.partenaire2Id))
            continue;
        voisins.get(u.partenaire1Id)!.add(u.partenaire2Id);
        voisins.get(u.partenaire2Id)!.add(u.partenaire1Id);
    }
    const genre = new Map(people.map((p) => [p.id, p.genre]));
    const vus = new Set<Id>();
    const resultat: Id[][] = [];
    for (const p of people) {
        if (vus.has(p.id))
            continue;
        const composante: Id[] = [];
        const pile = [p.id];
        vus.add(p.id);
        while (pile.length) {
            const id = pile.pop()!;
            composante.push(id);
            for (const v of voisins.get(id)!)
                if (!vus.has(v)) {
                    vus.add(v);
                    pile.push(v);
                }
        }
        resultat.push(ordonner(composante, voisins, genre));
    }
    return resultat;
}
function ordonner(membres: Id[], voisins: Map<Id, Set<Id>>, genre: Map<Id, string>): Id[] {
    if (membres.length <= 1)
        return membres;
    if (membres.length === 2) {
        const [a, b] = membres;
        return genre.get(b) === 'M' && genre.get(a) !== 'M' ? [b, a] : [a, b];
    }
    const degre = (id: Id) => [...voisins.get(id)!].filter((v) => membres.includes(v)).length;
    const bouts = membres.filter((id) => degre(id) === 1).sort(comparerConjoints);
    const depart = bouts[0] ?? [...membres].sort(comparerConjoints)[0];
    const ordre: Id[] = [depart];
    const pris = new Set<Id>([depart]);
    let courant = depart;
    for (;;) {
        const suivant = [...voisins.get(courant)!].filter((v) => !pris.has(v)).sort(comparerConjoints)[0];
        if (suivant === undefined)
            break;
        ordre.push(suivant);
        pris.add(suivant);
        courant = suivant;
    }
    for (const id of [...membres].sort(comparerConjoints))
        if (!pris.has(id))
            ordre.push(id);
    return ordre;
}
export function disposer(nodes: Node[], people: Person[], unions: Union[], relationships: Relationship[]): Node[] {
    const groupes = foyers(people, unions);
    const foyerDe = new Map<Id, number>();
    groupes.forEach((g, i) => g.forEach((id) => foyerDe.set(id, i)));
    const largeur = (g: Id[]) => g.length * LARGEUR_CARTE + (g.length - 1) * ECART_CONJOINTS;
    const graphe = new dagre.graphlib.Graph();
    graphe.setDefaultEdgeLabel(() => ({}));
    graphe.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 64 });
    groupes.forEach((g, i) => graphe.setNode(`f-${i}`, { width: largeur(g), height: HAUTEUR_FOYER }));
    const vus = new Set<string>();
    for (const r of relationships) {
        const fp = foyerDe.get(r.parentId);
        const fe = foyerDe.get(r.enfantId);
        if (fp === undefined || fe === undefined || fp === fe)
            continue;
        const cle = `${fp}>${fe}`;
        if (vus.has(cle))
            continue;
        vus.add(cle);
        graphe.setEdge(`f-${fp}`, `f-${fe}`);
    }
    dagre.layout(graphe);
    recentrerGraphe(graphe, groupes, relationships, LARGEUR_CARTE, ECART_CONJOINTS, 36);
    const coin = new Map<Id, {
        x: number;
        y: number;
    }>();
    groupes.forEach((g, i) => {
        const { x, y } = graphe.node(`f-${i}`);
        const gauche = x - largeur(g) / 2;
        const haut = y - HAUTEUR_FOYER / 2;
        g.forEach((id, k) => coin.set(id, { x: gauche + k * (LARGEUR_CARTE + ECART_CONJOINTS), y: haut }));
    });
    const unionParNoeud = new Map(unions.map((u) => [`u-${u.id}`, u]));
    return nodes.map((n) => {
        if (n.id.startsWith('p-')) {
            const c = coin.get(Number(n.id.slice(2)));
            return c ? { ...n, position: { ...c } } : n;
        }
        const u = unionParNoeud.get(n.id);
        const a = u && coin.get(u.partenaire1Id);
        const b = u && coin.get(u.partenaire2Id);
        if (!a || !b)
            return n;
        const milieu = centrePastilleDe(u, a, b, unions, LARGEUR_CARTE, ECART_CONJOINTS);
        return {
            ...n,
            position: { x: milieu - LARGEUR_PASTILLE / 2, y: Math.max(a.y, b.y) + HAUTEUR_CARTE + DESCENTE_PASTILLE },
        };
    });
}
