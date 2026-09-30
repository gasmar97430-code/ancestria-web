// ---- DISPOSITION DE L'ARBRE PAR FOYERS ----
//
// Demande du 26/09 : « corrige » — avec 65 individus, dagre ecartait les
// conjoints (Ludovic loin de Benoite, Marie-Marthe loin de Louis) parce qu'il
// placait chaque personne comme une boite independante.
//
// Convention des arbres genealogiques : un couple est UN bloc, conjoints cote
// a cote, pastille d'union entre eux et dessous. On fait donc placer par dagre
// des FOYERS : tous les conjoints relies par des unions (Annelie – Louis –
// Marie-Marthe forment un seul foyer, Louis au milieu) ; une personne sans
// union est un foyer d'une carte. dagre ne range plus que ces blocs, de
// generation en generation ; les cartes et pastilles sont posees dedans.
//
// Ne decide d'aucun lien : buildGraph reste seul juge de qui est relie a qui.

import dagre from 'dagre';
import type { Node } from 'reactflow';
import type { Id, Person, Relationship, Union } from '../../types';
import { recentrerGraphe } from './recentrage';
import { centrePastilleDe } from './pastille';
import { comparerConjoints } from './ordreConjoints'; // ordreConjoints.ts : rang des unions dit par lui, sinon numero de fiche comme avant

export const LARGEUR_CARTE = 176;
export const HAUTEUR_CARTE = 84;
export const LARGEUR_PASTILLE = 170;
export const HAUTEUR_PASTILLE = 26;
/** Ecart entre deux conjoints : juste assez pour que la pastille chevauche le joint. */
export const ECART_CONJOINTS = 24;
/** Descente de la carte a la pastille d'union. */
export const DESCENTE_PASTILLE = 22;

const HAUTEUR_FOYER = HAUTEUR_CARTE + DESCENTE_PASTILLE + HAUTEUR_PASTILLE;

/** Regroupe les personnes liees par des unions ; ordonne chaque foyer. */
export function foyers(people: Person[], unions: Union[]): Id[][] {
    const connus = new Set(people.map((p) => p.id));
    const voisins = new Map<Id, Set<Id>>();
    for (const p of people) voisins.set(p.id, new Set());
    for (const u of unions) {
        if (!connus.has(u.partenaire1Id) || !connus.has(u.partenaire2Id)) continue;
        voisins.get(u.partenaire1Id)!.add(u.partenaire2Id);
        voisins.get(u.partenaire2Id)!.add(u.partenaire1Id);
    }

    const genre = new Map(people.map((p) => [p.id, p.genre]));
    const vus = new Set<Id>();
    const resultat: Id[][] = [];

    for (const p of people) {
        if (vus.has(p.id)) continue;
        // Composante : tous les conjoints de conjoints.
        const composante: Id[] = [];
        const pile = [p.id];
        vus.add(p.id);
        while (pile.length) {
            const id = pile.pop()!;
            composante.push(id);
            for (const v of voisins.get(id)!) if (!vus.has(v)) { vus.add(v); pile.push(v); }
        }
        resultat.push(ordonner(composante, voisins, genre));
    }
    return resultat;
}

/**
 * Ordre dans le foyer : on suit la chaine des unions d'un bout a l'autre, pour
 * que chaque couple soit adjacent (Annelie, Louis, Marie-Marthe). Un couple
 * simple : l'homme a gauche, la femme a droite, comme sur les arbres usuels.
 */
function ordonner(membres: Id[], voisins: Map<Id, Set<Id>>, genre: Map<Id, string>): Id[] {
    if (membres.length <= 1) return membres;
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
        if (suivant === undefined) break;
        ordre.push(suivant);
        pris.add(suivant);
        courant = suivant;
    }
    // Structure non lineaire (rare) : le reste a la suite, rien n'est perdu.
    for (const id of [...membres].sort(comparerConjoints)) if (!pris.has(id)) ordre.push(id);
    return ordre;
}

/** Pose chaque carte et chaque pastille ; rend les noeuds avec leur position. */
export function disposer(nodes: Node[], people: Person[], unions: Union[], relationships: Relationship[]): Node[] {
    const groupes = foyers(people, unions);
    const foyerDe = new Map<Id, number>();
    groupes.forEach((g, i) => g.forEach((id) => foyerDe.set(id, i)));
    const largeur = (g: Id[]) => g.length * LARGEUR_CARTE + (g.length - 1) * ECART_CONJOINTS;

    const graphe = new dagre.graphlib.Graph();
    graphe.setDefaultEdgeLabel(() => ({}));
    graphe.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 64 });
    groupes.forEach((g, i) => graphe.setNode(`f-${i}`, { width: largeur(g), height: HAUTEUR_FOYER }));

    // Une filiation relie le foyer des parents au foyer de l'enfant.
    const vus = new Set<string>();
    for (const r of relationships) {
        const fp = foyerDe.get(r.parentId);
        const fe = foyerDe.get(r.enfantId);
        if (fp === undefined || fe === undefined || fp === fe) continue;
        const cle = `${fp}>${fe}`;
        if (vus.has(cle)) continue;
        vus.add(cle);
        graphe.setEdge(`f-${fp}`, `f-${fe}`);
    }
    dagre.layout(graphe);
    recentrerGraphe(graphe, groupes, relationships, LARGEUR_CARTE, ECART_CONJOINTS, 36); // recentrage.ts

    // Coin haut-gauche de chaque carte.
    const coin = new Map<Id, { x: number; y: number }>();
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
        if (!a || !b) return n;
        // Pastille centree entre les deux conjoints, sous leurs cartes.
        const milieu = centrePastilleDe(u, a, b, unions, LARGEUR_CARTE, ECART_CONJOINTS); // pastille.ts : contre l'epouse si non voisins
        return {
            ...n,
            position: { x: milieu - LARGEUR_PASTILLE / 2, y: Math.max(a.y, b.y) + HAUTEUR_CARTE + DESCENTE_PASTILLE },
        };
    });
}

// ---- FIN DISPOSITION PAR FOYERS ----
