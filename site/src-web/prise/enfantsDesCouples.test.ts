// Le couple de naissance de chaque enfant, déduit de la paire de ses parents (01/10). Numéros INVENTÉS.
import { describe, expect, it } from 'vitest';
import { enfantsDesCouples } from './enfantsDesCouples';
import { traduire } from './traduction';

const u = (id: number, a: number, b: number) => ({ id, partenaire1Id: a, partenaire2Id: b });
const l = (parentId: number, enfantId: number) => ({ parentId, enfantId });

describe('enfants des couples', () => {
    it('deux parents en couple : l’enfant est rattaché à ce couple (dans les deux sens)', () => {
        expect(enfantsDesCouples([l(1, 3), l(2, 3), l(5, 6), l(4, 6)], [u(10, 1, 2), u(11, 4, 5)])).toEqual([
            { enfantId: 3, unionId: 10 }, { enfantId: 6, unionId: 11 },
        ]);
    });
    it('un seul parent connu, ou des parents qui ne forment pas un couple : aucun rattachement', () => {
        expect(enfantsDesCouples([l(1, 3), l(7, 8), l(9, 8)], [u(10, 1, 2)])).toEqual([]);
    });
    it('remariage : chaque enfant va sous SON couple', () => {
        expect(enfantsDesCouples([l(1, 3), l(2, 3), l(1, 4), l(5, 4)], [u(10, 1, 2), u(11, 1, 5)])).toEqual([
            { enfantId: 3, unionId: 10 }, { enfantId: 4, unionId: 11 },
        ]);
    });
});

describe('traduction : le site passe les rattachements à l’écran du PC', () => {
    it('la liste n’est plus vide quand deux parents forment un couple', () => {
        const ind = (id: string, prenom: string, cree: string) => ({ id, prenom, nom: 'Essaiville', genre: 'inconnu', naissance: null, naissance_precision: 'annee', lieu_naissance: null,
            deces: null, deces_precision: 'annee', lieu_deces: null, vivant: false, notes: null, cree_le: cree, maj_le: cree });
        const r = traduire({
            individus: [ind('a', 'Essaia', '2026-01-01'), ind('b', 'Essaib', '2026-01-02'), ind('c', 'Essaic', '2026-01-03')],
            unions: [{ id: 'u', partenaire_a: 'a', partenaire_b: 'b', nature: 'mariage', statut: 'en_cours', debut: null, fin: null }],
            filiations: [{ id: 'f1', parent_id: 'a', enfant_id: 'c', nature: 'biologique' }, { id: 'f2', parent_id: 'b', enfant_id: 'c', nature: 'biologique' }],
        } as never);
        expect(r.arbre.unionChildren).toEqual([{ enfantId: 3, unionId: 1 }]);
    });
});
