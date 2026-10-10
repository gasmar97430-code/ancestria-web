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
        const parentsDe = new Map<Id, Id[]>();
        for (const l of relationships) {
            if (l.typeLien && l.typeLien !== 'Biological')
                continue;
            parentsDe.set(l.enfantId, [...(parentsDe.get(l.enfantId) ?? []), l.parentId]);
        }
        const fratries = new Map<string, Id[]>();
        for (const [enfant, ps] of parentsDe) {
            const mere = ps.find((p) => genreDe.get(p) === 'F');
            const cle = mere !== undefined ? `m${mere}` : `p${[...new Set(ps)].sort((x, y) => x - y).join(',')}`;
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
            const rangsDits = enfants.filter((e) => rangDe.has(e)).map((e) => rangDe.get(e)!);
            if (new Set(rangsDits).size !== rangsDits.length)
                continue;
            const cle = rangsDits.length > 0 ? (e: Id) => rangDe.get(e) : (e: Id) => naissanceDe.get(e);
            const parRangee = new Map<number, {
                foyer: number;
                cle: number | undefined;
            }[]>();
            for (const e of enfants) {
                const f = foyerDe.get(e);
                if (f === undefined || deja.has(f) || !place.has(f))
                    continue;
                const [k] = place.get(f)!;
                const l = parRangee.get(k) ?? [];
                const c = cle(e);
                const deja2 = l.find((x) => x.foyer === f);
                if (deja2) {
                    if (c !== undefined && (deja2.cle === undefined || c < deja2.cle))
                        deja2.cle = c;
                    continue;
                }
                l.push({ foyer: f, cle: c });
                parRangee.set(k, l);
            }
            for (const [k, l] of parRangee) {
                if (l.length < 2 || !l.some((x) => x.cle !== undefined))
                    continue;
                const places = l.map((x) => place.get(x.foyer)![1]).sort((a, b) => a - b);
                const libres = l.filter((x) => x.cle === undefined).sort((a, b) => place.get(a.foyer)![1] - place.get(b.foyer)![1]);
                const ordre: (number | null)[] = new Array(l.length).fill(null);
                const ranges = l.filter((x) => x.cle !== undefined).sort((a, b) => a.cle! - b.cle! || a.foyer - b.foyer);
                if (rangsDits.length > 0) {
                    ranges.forEach((x, j) => (ordre[j] = x.foyer));
                }
                else {
                    ranges.forEach((x, j) => (ordre[j] = x.foyer));
                }
                let j = 0;
                for (let i = 0; i < ordre.length; i++)
                    if (ordre[i] === null)
                        ordre[i] = libres[j++].foyer;
                ordre.forEach((f, i) => {
                    r[k][places[i]] = f!;
                    place.set(f!, [k, places[i]]);
                    deja.add(f!);
                });
            }
        }
        return r;
    }
    catch {
        return rangees;
    }
}
