import type { Id } from '../../types';
import { datesNaissanceConnues, rangsNaissanceConnus } from './rangementFratries';
import { useTreeStore } from '../../store/useTreeStore';
export function rangerEnfantsDeLaMere(rangees: number[][], groupes: Id[][], relationships: {
    parentId: Id;
    enfantId: Id;
    typeLien?: string;
}[]): number[][] {
    try {
        const genreDe = new Map(useTreeStore.getState().people.map((p) => [p.id, p.genre] as [
            Id,
            string
        ]));
        const rangDe = rangsNaissanceConnus();
        const naissanceDe = datesNaissanceConnues();
        if (rangDe.size === 0 && naissanceDe.size === 0)
            return rangees;
        const foyerDe = new Map<Id, number>();
        groupes.forEach((g, i) => g.forEach((id) => foyerDe.set(id, i)));
        const enfantsDe = new Map<Id, Id[]>();
        for (const l of relationships) {
            if (l.typeLien && l.typeLien !== 'Biological')
                continue;
            if (genreDe.get(l.parentId) !== 'F')
                continue;
            enfantsDe.set(l.parentId, [...(enfantsDe.get(l.parentId) ?? []), l.enfantId]);
        }
        const r = rangees.map((x) => [...x]);
        const place = new Map<number, [
            number,
            number
        ]>();
        r.forEach((rangee, k) => rangee.forEach((f, i) => place.set(f, [k, i])));
        const deja = new Set<number>();
        for (const enfants of enfantsDe.values()) {
            const parRang = enfants.filter((e) => rangDe.has(e) && foyerDe.has(e));
            const rangsDits = parRang.map((e) => rangDe.get(e)!);
            if (new Set(rangsDits).size !== rangsDits.length)
                continue;
            const parDate = enfants.filter((e) => naissanceDe.has(e) && foyerDe.has(e));
            const ranges = parRang.length >= 2 ? parRang : parRang.length === 0 ? parDate : [];
            const cleDe = parRang.length >= 2 ? (e: Id) => rangDe.get(e)! : (e: Id) => naissanceDe.get(e)!;
            if (ranges.length < 2)
                continue;
            const parRangee = new Map<number, {
                foyer: number;
                cle: number;
            }[]>();
            for (const e of ranges) {
                const f = foyerDe.get(e)!;
                if (deja.has(f) || !place.has(f))
                    continue;
                const [k] = place.get(f)!;
                const l = parRangee.get(k) ?? [];
                if (l.some((x) => x.foyer === f))
                    continue;
                l.push({ foyer: f, cle: cleDe(e) });
                parRangee.set(k, l);
            }
            for (const [k, l] of parRangee) {
                if (l.length < 2)
                    continue;
                const places = l.map((x) => place.get(x.foyer)![1]).sort((a, b) => a - b);
                [...l].sort((a, b) => a.cle - b.cle || a.foyer - b.foyer).forEach((x, j) => {
                    r[k][places[j]] = x.foyer;
                    place.set(x.foyer, [k, places[j]]);
                    deja.add(x.foyer);
                });
            }
        }
        return r;
    }
    catch {
        return rangees;
    }
}
