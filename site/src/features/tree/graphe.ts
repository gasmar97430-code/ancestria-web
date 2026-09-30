import { disposer } from './disposition';
import type { Edge, Node } from 'reactflow';
import { tracerFoyers, noeudPersonne as personNodeId } from './foyers/tracer';
import { relationsDePlacement } from './foyers/normaliser';
import { normaliser } from '../../lib/origins';
import type { Id, Patronyme, Person, Relationship, Union, UnionChild } from '../../types';
export const CARTE = { width: 176, height: 84 };
export const PASTILLE_UNION = { width: 170, height: 26 };
export interface Individu extends Person {
    dateNaissance?: string | null;
    lieuNaissance?: string | null;
    dateDeces?: string | null;
    lieuDeces?: string | null;
    notes?: string | null;
}
export interface UnionComplete extends Union {
    dateDebut?: string | null;
    lieuUnion?: string | null;
}
export interface DonneesCarte {
    individu: Individu;
    origine: string;
    choisi: boolean;
    estompe: boolean;
    sources: number;
}
export interface DonneesUnion {
    libelle: string;
    estompe: boolean;
}
const annee = (d?: string | null) => (d ? String(new Date(d).getFullYear()) : null);
export function periode(i: Individu): string | null {
    const n = annee(i.dateNaissance);
    const d = annee(i.dateDeces);
    if (!n && !d)
        return null;
    return `${n ?? ''} – ${d ?? ''}`.trim();
}
const TYPES_UNION: Record<string, string> = {
    Marriage: 'Mariage',
    Civil_Partnership: 'PACS',
    Informal: 'Union libre',
    Other: 'Union',
};
export function libelleUnion(u: UnionComplete): string {
    const morceaux = [annee(u.dateDebut), u.lieuUnion].filter(Boolean);
    return morceaux.length > 0 ? morceaux.join(' · ') : TYPES_UNION[u.typeUnion ?? ''] ?? 'Union';
}
export function origineDuNom(nom: string, index: Map<string, Patronyme>): string {
    return index.get(normaliser(nom))?.origine ?? 'Hors repertoire';
}
export function ascendance(depart: Id, parentsDe: Map<Id, Id[]>): Set<Id> {
    const vus = new Set<Id>([depart]);
    const pile = [depart];
    while (pile.length > 0) {
        const id = pile.pop()!;
        for (const p of parentsDe.get(id) ?? []) {
            if (!vus.has(p)) {
                vus.add(p);
                pile.push(p);
            }
        }
    }
    return vus;
}
export function construireArbre(args: {
    people: Individu[];
    unions: UnionComplete[];
    relationships: Relationship[];
    unionChildren: UnionChild[];
    patronymes: Map<string, Patronyme>;
    choisi: Id | null;
    visibles: (i: Individu) => boolean;
    sources: Map<Id, number>;
}): {
    nodes: Node[];
    edges: Edge[];
    generations: number;
} {
    const { people, unions, relationships, unionChildren, patronymes, choisi, visibles, sources } = args;
    const base = tracerFoyers(people, unions, relationships, unionChildren);
    const parId = new Map(people.map((p) => [personNodeId(p.id), p]));
    const unionParId = new Map(unions.map((u) => [`u-${u.id}`, u]));
    const estompeNoeud = new Map<string, boolean>();
    const nodes: Node[] = base.nodes.map((n) => {
        const individu = parId.get(n.id);
        if (individu) {
            const estompe = !visibles(individu);
            estompeNoeud.set(n.id, estompe);
            const data: DonneesCarte = {
                individu,
                origine: origineDuNom(individu.nom, patronymes),
                choisi: individu.id === choisi,
                estompe,
                sources: sources.get(individu.id) ?? 0,
            };
            return { ...n, type: 'carte', data };
        }
        const u = unionParId.get(n.id);
        const conjoints = u ? [u.partenaire1Id, u.partenaire2Id].map((id) => people.find((p) => p.id === id)) : [];
        const estompe = conjoints.some((p) => !p || !visibles(p));
        estompeNoeud.set(n.id, estompe);
        const data: DonneesUnion = { libelle: u ? libelleUnion(u) : 'Union', estompe };
        return { ...n, type: 'pastille', data };
    });
    const edges: Edge[] = base.edges.map((e) => {
        const estompe = estompeNoeud.get(e.source) || estompeNoeud.get(e.target);
        const pointille = (e.style as {
            strokeDasharray?: string;
        } | undefined)?.strokeDasharray;
        return {
            ...e,
            type: 'default',
            markerEnd: undefined,
            labelStyle: { fill: 'var(--encre-3)', fontSize: 11 },
            labelBgStyle: { fill: 'var(--papier)' },
            style: {
                stroke: 'var(--lien)',
                strokeWidth: 1.4,
                opacity: estompe ? 0.2 : 0.9,
                transition: 'opacity .35s',
                ...(pointille ? { strokeDasharray: pointille } : {}),
            },
        };
    });
    const places = disposer(nodes, people, unions, relationsDePlacement(relationships, unions, unionChildren));
    const rangs = new Set(places.filter((n) => n.type === 'carte').map((n) => Math.round(n.position.y)));
    return { nodes: places, edges, generations: rangs.size };
}
