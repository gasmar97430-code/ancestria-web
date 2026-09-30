import type { Id } from '../../types';
export function garderFondateurs(caches: Set<Id>, unions: {
    partenaire1Id: Id;
    partenaire2Id: Id;
}[], parents: Map<Id, Set<Id>>): Set<Id> {
    if (caches.size === 0)
        return caches;
    try {
        const sansParents = (x: Id) => !parents.has(x);
        for (const u of unions) {
            if (sansParents(u.partenaire1Id) && sansParents(u.partenaire2Id)) {
                caches.delete(u.partenaire1Id);
                caches.delete(u.partenaire2Id);
            }
        }
    }
    catch {
    }
    return caches;
}
