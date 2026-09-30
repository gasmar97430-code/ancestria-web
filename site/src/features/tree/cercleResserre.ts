import type { Id } from '../../types';
import type { Liens } from './focus';
const parcours = (depart: Id, suivants: Map<Id, Set<Id>>): Set<Id> => {
    const vus = new Set<Id>([depart]);
    const pile = [depart];
    while (pile.length)
        for (const s of suivants.get(pile.pop()!) ?? [])
            if (!vus.has(s)) {
                vus.add(s);
                pile.push(s);
            }
    return vus;
};
export function cercleResserre(pivot: Id, l: Liens): Set<Id> {
    const cercle = new Set<Id>(parcours(pivot, l.parentsDe));
    const descendants = parcours(pivot, l.enfantsDe);
    descendants.forEach((id) => cercle.add(id));
    for (const d of descendants)
        (l.conjointsDe.get(d) ?? new Set()).forEach((c) => cercle.add(c));
    return cercle;
}
