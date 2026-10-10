import type { Id } from '../../types';
let rangDe = new Map<Id, number>();
let naissanceDe = new Map<Id, number>();
export function fixerRangsNaissance(m: Map<Id, number>): void {
    rangDe = m;
}
export function fixerDatesNaissance(m: Map<Id, number>): void {
    naissanceDe = m;
}
export const rangsNaissanceConnus = () => rangDe;
export const datesNaissanceConnues = () => naissanceDe;
export function rangerFratries(rangees: number[][], groupes: Id[][], relationships: {
    parentId: Id;
    enfantId: Id;
}[]): number[][] {
    if (rangDe.size === 0 && naissanceDe.size === 0)
        return rangees;
    const foyerDe = new Map<Id, number>();
    groupes.forEach((g, i) => g.forEach((id) => foyerDe.set(id, i)));
    const parents = new Map<Id, Set<Id>>();
    for (const r of relationships)
        parents.set(r.enfantId, new Set([...(parents.get(r.enfantId) ?? []), r.parentId]));
    const fratries = new Map<string, Id[]>();
    for (const [enfant, ps] of parents) {
        const cle = [...ps].sort((a, b) => a - b).join(',');
        fratries.set(cle, [...(fratries.get(cle) ?? []), enfant]);
    }
    const r = rangees.map((x) => [...x]);
    const place = new Map<number, [
        number,
        number
    ]>();
    r.forEach((rangee, k) => rangee.forEach((f, i) => place.set(f, [k, i])));
    const deja = new Set<number>();
    for (const enfants of fratries.values()) {
        const parRang = enfants.filter((e) => rangDe.has(e) && foyerDe.has(e));
        const parDate = enfants.filter((e) => naissanceDe.has(e) && foyerDe.has(e));
        const cleDe = parRang.length >= 2 ? (e: Id) => rangDe.get(e)! : (e: Id) => naissanceDe.get(e)!;
        const ranges = parRang.length >= 2 ? parRang : parRang.length === 0 ? parDate : [];
        if (enfants.length < 2 || ranges.length < 2)
            continue;
        const parRangee = new Map<number, {
            foyer: number;
            rang: number;
        }[]>();
        for (const e of ranges) {
            const f = foyerDe.get(e)!;
            if (deja.has(f) || !place.has(f))
                continue;
            const [k] = place.get(f)!;
            const l = parRangee.get(k) ?? [];
            if (l.some((x) => x.foyer === f))
                continue;
            l.push({ foyer: f, rang: cleDe(e) });
            parRangee.set(k, l);
        }
        for (const [k, l] of parRangee) {
            if (l.length < 2)
                continue;
            const places = l.map((x) => place.get(x.foyer)![1]).sort((a, b) => a - b);
            const tries = [...l].sort((a, b) => a.rang - b.rang || a.foyer - b.foyer);
            tries.forEach((x, j) => {
                r[k][places[j]] = x.foyer;
                place.set(x.foyer, [k, places[j]]);
                deja.add(x.foyer);
            });
        }
    }
    return r;
}
