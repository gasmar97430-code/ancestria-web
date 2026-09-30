import { memo } from 'react';
import type { Id } from '../../types';
import { rangDe, useRangsUnions } from './OrdreUnions';
import './couleurs-conjointes.css';
export const COULEURS_RANG = ['#2563EB', '#15803D', '#7C3AED', '#EA580C', '#DB2777'];
type U = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
type Rang = Parameters<typeof rangDe>[0][number];
export function rangsDesUnions(unions: U[], rangs: Rang[]): Map<Id, number> {
    const parPersonne = new Map<Id, U[]>();
    for (const u of unions)
        for (const p of [u.partenaire1Id, u.partenaire2Id])
            parPersonne.set(p, [...(parPersonne.get(p) ?? []), u]);
    const m = new Map<Id, number>();
    for (const u of unions) {
        const qui = [u.partenaire1Id, u.partenaire2Id].filter((p) => (parPersonne.get(p)?.length ?? 0) >= 2)
            .sort((a, b) => (parPersonne.get(b)!.length - parPersonne.get(a)!.length) || a - b)[0];
        if (qui === undefined)
            continue;
        const dit = rangDe(rangs, qui, u.id);
        if (dit !== null) {
            m.set(u.id, dit);
            continue;
        }
        const ordre = [...parPersonne.get(qui)!].sort((a, b) => (rangDe(rangs, qui, a.id) ?? 1000) - (rangDe(rangs, qui, b.id) ?? 1000) || a.id - b.id);
        m.set(u.id, ordre.findIndex((x) => x.id === u.id) + 1);
    }
    return m;
}
export const couleurDuRang = (rang: number) => COULEURS_RANG[(rang - 1) % COULEURS_RANG.length];
export const CouleursConjointes = memo(({ unions }: {
    unions: U[];
}) => {
    const rangs = useRangsUnions((s) => s.rangs);
    let css = '';
    try {
        const r = rangsDesUnions(unions, rangs);
        css = [...r].map(([id, rang]) => {
            const c = couleurDuRang(rang);
            return `.react-flow__edge[data-testid^="rf__edge-spouse-${id}-"] .react-flow__edge-path,\n`
                + `.react-flow__edge[data-testid^="rf__edge-spouse-${id}-"] .lien-lumineux__coeur { stroke: ${c} !important; }\n`
                + `.react-flow__node[data-id="u-${id}"] > div { border-color: ${c} !important; box-shadow: 0 0 0 1.5px ${c}; }`;
        }).join('\n');
    }
    catch {
        css = '';
    }
    return css ? <style>{css}</style> : null;
});
CouleursConjointes.displayName = 'CouleursConjointes';
