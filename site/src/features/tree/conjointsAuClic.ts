import { useMemo } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import type { Id } from '../../types';
import { garderFondateurs } from './fondateursGardes';
interface Donnees<P extends {
    id: Id;
}, U extends {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
}, R extends {
    parentId: Id;
    enfantId: Id;
}, C extends {
    unionId: Id;
    enfantId: Id;
}> {
    people: P[];
    unions: U[];
    relationships: R[];
    unionChildren: C[];
}
export function conjointsCaches(choisi: Id | null, unions: {
    partenaire1Id: Id;
    partenaire2Id: Id;
}[], relationships: {
    parentId: Id;
    enfantId: Id;
}[], unionChildren: {
    unionId: Id;
    enfantId: Id;
}[], unionsParId: Map<Id, {
    partenaire1Id: Id;
    partenaire2Id: Id;
}>): Set<Id> {
    const parents = new Map<Id, Set<Id>>();
    const enfants = new Map<Id, Set<Id>>();
    const lien = (p: Id, e: Id) => {
        (parents.get(e) ?? parents.set(e, new Set()).get(e)!).add(p);
        (enfants.get(p) ?? enfants.set(p, new Set()).get(p)!).add(e);
    };
    relationships.forEach((r) => lien(r.parentId, r.enfantId));
    unionChildren.forEach((c) => {
        const u = unionsParId.get(c.unionId);
        if (u) {
            lien(u.partenaire1Id, c.enfantId);
            lien(u.partenaire2Id, c.enfantId);
        }
    });
    if (choisi === null) {
        const caches = new Set<Id>();
        for (const u of unions) {
            const [a, b] = [u.partenaire1Id, u.partenaire2Id];
            const aP = parents.has(a), bP = parents.has(b);
            if (aP && !bP)
                caches.add(b);
            if (bP && !aP)
                caches.add(a);
        }
        return garderFondateurs(caches, unions, parents);
    }
    const sang = new Set<Id>([choisi]);
    const pile = [choisi];
    while (pile.length)
        for (const p of parents.get(pile.pop()!) ?? [])
            if (!sang.has(p)) {
                sang.add(p);
                pile.push(p);
            }
    const aDescendre = [...sang];
    while (aDescendre.length)
        for (const e of enfants.get(aDescendre.pop()!) ?? [])
            if (!sang.has(e)) {
                sang.add(e);
                aDescendre.push(e);
            }
    const caches = new Set<Id>();
    const conjoints = new Map<Id, Id[]>();
    for (const u of unions) {
        (conjoints.get(u.partenaire1Id) ?? conjoints.set(u.partenaire1Id, []).get(u.partenaire1Id)!).push(u.partenaire2Id);
        (conjoints.get(u.partenaire2Id) ?? conjoints.set(u.partenaire2Id, []).get(u.partenaire2Id)!).push(u.partenaire1Id);
    }
    for (const [s, ses] of conjoints) {
        if (sang.has(s))
            continue;
        if (ses.includes(choisi))
            continue;
        if (ses.some((p) => sang.has(p)))
            caches.add(s);
    }
    return caches;
}
export function sansConjointsCaches<P extends {
    id: Id;
}, U extends {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
}, R extends {
    parentId: Id;
    enfantId: Id;
}, C extends {
    unionId: Id;
    enfantId: Id;
}>(d: Donnees<P, U, R, C>, choisi: Id | null): Donnees<P, U, R, C> {
    const parId = new Map(d.unions.map((u) => [u.id, u]));
    const caches = conjointsCaches(choisi, d.unions, d.relationships, d.unionChildren, parId);
    if (caches.size === 0)
        return d;
    const unions = d.unions.filter((u) => !caches.has(u.partenaire1Id) && !caches.has(u.partenaire2Id));
    const gardees = new Set(unions.map((u) => u.id));
    return {
        people: d.people.filter((p) => !caches.has(p.id)),
        unions,
        relationships: d.relationships.filter((r) => !caches.has(r.parentId) && !caches.has(r.enfantId)),
        unionChildren: d.unionChildren.filter((c) => gardees.has(c.unionId) && !caches.has(c.enfantId)),
    };
}
export function useArbreAuClic(choisi: Id | null) {
    const tree = useTreeStore();
    const vue = useMemo(() => sansConjointsCaches({ people: tree.people, unions: tree.unions, relationships: tree.relationships, unionChildren: tree.unionChildren }, choisi), [tree.people, tree.unions, tree.relationships, tree.unionChildren, choisi]);
    return { ...tree, ...vue, totalPersonnes: tree.people.length };
}
