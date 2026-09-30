import { useMemo } from 'react';
import type { Node } from 'reactflow';
import { useTreeStore } from '../../../store/useTreeStore';
import type { Id, Person, Relationship, Union, UnionChild } from '../../../types';
import { sansConjointsCaches } from '../conjointsAuClic';
import { estVirtuel, normaliserFoyers, type Couple, type Topologie } from './normaliser';
export interface VueFoyers {
    people: Person[];
    unions: Couple[];
    relationships: Relationship[];
    unionChildren: UnionChild[];
    topologie: Topologie;
}
export function vueDesFoyers(d: {
    people: Person[];
    unions: Union[];
    relationships: Relationship[];
    unionChildren: UnionChild[];
}, choisi: Id | null): VueFoyers {
    const topologie = normaliserFoyers(d.people, d.unions, d.relationships, d.unionChildren);
    const vue = sansConjointsCaches(d, choisi);
    const montres = new Set(vue.people.map((p) => p.id));
    const unionsMontrees = new Set(vue.unions.map((u) => u.id));
    const unions = topologie.couples.filter((c) => (estVirtuel(c) ? montres.has(c.partenaire1Id) && montres.has(c.partenaire2Id) : unionsMontrees.has(c.id)));
    const foyers = new Set(unions.map((c) => c.id));
    return {
        people: vue.people,
        unions,
        relationships: vue.relationships,
        unionChildren: topologie.rattachements.filter((r) => foyers.has(r.unionId) && montres.has(r.enfantId)),
        topologie,
    };
}
export function useArbreFoyers(choisi: Id | null) {
    const tree = useTreeStore();
    const vue = useMemo(() => vueDesFoyers({ people: tree.people, unions: tree.unions, relationships: tree.relationships, unionChildren: tree.unionChildren }, choisi), [tree.people, tree.unions, tree.relationships, tree.unionChildren, choisi]);
    return { ...tree, ...vue, totalPersonnes: tree.people.length };
}
export const LIBELLE_COPARENTS = 'Parents · sans union';
export function avecPastillesCoparents(nodes: Node[]): Node[] {
    return nodes.map((n) => (n.type === 'pastille' && n.id.startsWith('u--') ? { ...n, data: { ...n.data, libelle: LIBELLE_COPARENTS } } : n));
}
