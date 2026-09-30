import type { Id } from '../../types';
export type Rang = {
    individuId: Id;
    unionId: Id;
    rang: number;
};
type UnionMin = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
const SANS_RANG = 1000;
let rangDuConjoint = new Map<Id, number>();
export function rangsDesConjoints(rangs: Rang[], unions: UnionMin[]): Map<Id, number> {
    const parId = new Map(unions.map((u) => [u.id, u]));
    const m = new Map<Id, number>();
    for (const r of rangs) {
        const u = parId.get(r.unionId);
        if (!u)
            continue;
        const conjoint = u.partenaire1Id === r.individuId ? u.partenaire2Id : u.partenaire1Id;
        m.set(conjoint, Math.min(m.get(conjoint) ?? SANS_RANG, r.rang));
    }
    return m;
}
export function fixerRangsConjoints(m: Map<Id, number>): void {
    rangDuConjoint = m;
}
export function comparerConjoints(x: Id, y: Id): number {
    return (rangDuConjoint.get(x) ?? SANS_RANG) - (rangDuConjoint.get(y) ?? SANS_RANG) || x - y;
}
