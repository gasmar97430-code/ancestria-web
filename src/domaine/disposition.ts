// ---- DISPOSITION DE L'ARBRE ----
// Calcule la place de chaque carte (dagre, générations de haut en bas).
//
// Familles de toutes formes : les enfants qui ont EXACTEMENT les mêmes
// parents, liés de la même façon, partagent un point de jonction — un
// couple, un foyer de trois parents, deux mères. Un enfant au parent unique
// est relié directement. Chaque trait porte la nature du lien (biologique
// en plein, les autres en pointillés avec leur nom). Les couples sont
// dessinés par-dessus, sans peser sur les générations.

import dagre from 'dagre';
import type { DonneesArbre, Id, Individu, NatureFiliation, NatureUnion, StatutUnion } from './types';

export const CARTE = { largeur: 184, hauteur: 76 } as const;
export const JONCTION = { largeur: 14, hauteur: 14 } as const;

export interface NoeudDispose {
    id: string;
    type: 'individu' | 'jonction';
    x: number; // coin haut gauche
    y: number;
    individu?: Individu;
}

export interface TraitDispose {
    id: string;
    source: string;
    cible: string;
    genre: 'filiation' | 'vers-jonction' | 'depuis-jonction' | 'couple';
    nature?: NatureFiliation;
    union?: { nature: NatureUnion; statut: StatutUnion };
}

export interface Disposition {
    noeuds: NoeudDispose[];
    traits: TraitDispose[];
    largeur: number;
    hauteur: number;
}

export const idNoeud = (i: Id) => `i-${i}`;

export function disposer(d: DonneesArbre): Disposition {
    const g = new dagre.graphlib.Graph({ multigraph: true, compound: true });
    g.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 70, edgesep: 12, marginx: 24, marginy: 24 });
    g.setDefaultEdgeLabel(() => ({}));

    const connus = new Set(d.individus.map((i) => i.id));
    for (const i of d.individus) g.setNode(idNoeud(i.id), { width: CARTE.largeur, height: CARTE.hauteur });

    // Conjoints côte à côte : chaque groupe de personnes reliées par des couples
    // (A–B, B–C…) devient un groupe dagre, que la disposition garde contigu.
    const chef = new Map<Id, Id>();
    const racine = (x: Id): Id => {
        let r = x;
        while (chef.get(r) !== r) r = chef.get(r)!;
        chef.set(x, r);
        return r;
    };
    for (const u of d.unions) {
        if (!connus.has(u.partenaire_a) || !connus.has(u.partenaire_b)) continue;
        for (const p of [u.partenaire_a, u.partenaire_b]) if (!chef.has(p)) chef.set(p, p);
        chef.set(racine(u.partenaire_a), racine(u.partenaire_b));
    }
    const groupes = new Map<Id, string>();
    for (const p of chef.keys()) {
        const r = racine(p);
        if (!groupes.has(r)) {
            groupes.set(r, `c-${groupes.size}`);
            g.setNode(groupes.get(r)!, {});
        }
        g.setParent(idNoeud(p), groupes.get(r)!);
    }

    // Parents de chaque enfant (liens vers des personnes absentes ignorés).
    const parentsDe = new Map<Id, { parent: Id; nature: NatureFiliation }[]>();
    for (const f of d.filiations) {
        if (!connus.has(f.parent_id) || !connus.has(f.enfant_id)) continue;
        const l = parentsDe.get(f.enfant_id) ?? [];
        l.push({ parent: f.parent_id, nature: f.nature });
        parentsDe.set(f.enfant_id, l);
    }

    const traits: TraitDispose[] = [];
    const jonctions = new Map<string, string>();
    for (const [enfant, parents] of parentsDe) {
        if (parents.length === 1) {
            const p = parents[0];
            const id = `f-${p.parent}-${enfant}`;
            g.setEdge(idNoeud(p.parent), idNoeud(enfant), { minlen: 1 }, id);
            traits.push({ id, source: idNoeud(p.parent), cible: idNoeud(enfant), genre: 'filiation', nature: p.nature });
            continue;
        }
        const cle = parents.map((p) => `${p.parent}:${p.nature}`).sort().join('|');
        let j = jonctions.get(cle);
        if (!j) {
            j = `j-${jonctions.size}`;
            jonctions.set(cle, j);
            g.setNode(j, { width: JONCTION.largeur, height: JONCTION.hauteur });
            for (const p of parents) {
                const id = `vj-${p.parent}-${j}`;
                g.setEdge(idNoeud(p.parent), j, { minlen: 1 }, id);
                traits.push({ id, source: idNoeud(p.parent), cible: j, genre: 'vers-jonction', nature: p.nature });
            }
        }
        const id = `dj-${j}-${enfant}`;
        g.setEdge(j, idNoeud(enfant), { minlen: 1 }, id);
        traits.push({ id, source: j, cible: idNoeud(enfant), genre: 'depuis-jonction' });
    }

    dagre.layout(g);

    const noeuds: NoeudDispose[] = [];
    const parId = new Map(d.individus.map((i) => [i.id, i]));
    for (const n of g.nodes()) {
        const p = g.node(n);
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (n.startsWith('i-')) {
            noeuds.push({ id: n, type: 'individu', x: p.x - CARTE.largeur / 2, y: p.y - CARTE.hauteur / 2, individu: parId.get(n.slice(2)) });
        } else if (n.startsWith('j-')) {
            noeuds.push({ id: n, type: 'jonction', x: p.x - JONCTION.largeur / 2, y: p.y - JONCTION.hauteur / 2 });
        }
    }

    for (const u of d.unions) {
        if (!connus.has(u.partenaire_a) || !connus.has(u.partenaire_b)) continue;
        traits.push({ id: `u-${u.id}`, source: idNoeud(u.partenaire_a), cible: idNoeud(u.partenaire_b), genre: 'couple', union: { nature: u.nature, statut: u.statut } });
    }

    const graphe = g.graph();
    return { noeuds, traits, largeur: graphe.width ?? 0, hauteur: graphe.height ?? 0 };
}

// ---- FIN DISPOSITION DE L'ARBRE ----
