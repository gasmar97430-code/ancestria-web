// ---- ORDRE DES CONJOINTS DANS UN FOYER ----
//
// Sa demande du 27/09 (18:32) : l'ordre des unions doit « affiner la liste de
// l'arbre » — les épouses rangées autour du mari dans l'ordre de SES unions
// (1re à gauche, puis 2e, 3e… à droite), et inversement pour une femme
// remariée. Le rang est DIT par lui (backend api/rangs-unions.ts), jamais deviné.
//
// disposition.ts (ordonner) triait les conjoints par numéro de fiche ; il trie
// maintenant avec comparerConjoints. SANS rang connu, comparerConjoints rend
// exactement l'ancien ordre (numéro de fiche) : l'arbre ne bouge pas tant
// qu'aucun rang n'est dit.

import type { Id } from '../../types';

export type Rang = { individuId: Id; unionId: Id; rang: number };
type UnionMin = { id: Id; partenaire1Id: Id; partenaire2Id: Id };

const SANS_RANG = 1000;
let rangDuConjoint = new Map<Id, number>();

/** Pour chaque conjoint : son rang parmi les unions de l'autre (la 2e épouse de Louis → 2). */
export function rangsDesConjoints(rangs: Rang[], unions: UnionMin[]): Map<Id, number> {
    const parId = new Map(unions.map((u) => [u.id, u]));
    const m = new Map<Id, number>();
    for (const r of rangs) {
        const u = parId.get(r.unionId);
        if (!u) continue;
        const conjoint = u.partenaire1Id === r.individuId ? u.partenaire2Id : u.partenaire1Id;
        m.set(conjoint, Math.min(m.get(conjoint) ?? SANS_RANG, r.rang));
    }
    return m;
}

export function fixerRangsConjoints(m: Map<Id, number>): void {
    rangDuConjoint = m;
}

/** Tri des conjoints d'un foyer : rang dit d'abord, puis numéro de fiche (l'ordre d'avant). */
export function comparerConjoints(x: Id, y: Id): number {
    return (rangDuConjoint.get(x) ?? SANS_RANG) - (rangDuConjoint.get(y) ?? SANS_RANG) || x - y;
}

// ---- FIN ORDRE DES CONJOINTS DANS UN FOYER ----
