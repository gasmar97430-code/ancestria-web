// Modifier une fiche de défunt en ligne (13/10/2026) : seuls les champs rangeables ; jamais les notes (repère pc:N),
// jamais remettre « vivant ». Valeurs INVENTÉES.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../prise/supabase', () => ({ supabase: {} }));
import { champsPublics } from './modifierFiche';

describe('champsPublics', () => {
    it('nom, prénom, genre, dates, lieux → colonnes de la base', () => {
        expect(champsPublics({ prenom: ' Octave ', nom: 'ESSAIVILLE', genre: 'M', dateNaissance: '1850-01-01', lieuNaissance: 'Essaiport', dateDeces: '1921-05-02', lieuDeces: '' }))
            .toEqual({ ok: true, champs: { prenom: 'Octave', nom: 'ESSAIVILLE', genre: 'homme', naissance: '1850-01-01', naissance_precision: 'annee',
                lieu_naissance: 'Essaiport', deces: '1921-05-02', deces_precision: 'jour', lieu_deces: null } });
    });
    it('« décédé » coché : reste un défunt (vivant = faux)', () => {
        expect(champsPublics({ decede: true })).toEqual({ ok: true, champs: { vivant: false } });
    });
    it('remettre « vivant » ou « on ne sait pas » : refusé, au PC', () => {
        for (const v of [false, null]) {
            const r = champsPublics({ decede: v });
            expect(r.ok).toBe(false);
            expect(r.ok ? '' : r.message).toMatch(/PC/);
        }
    });
    it('les notes : refusées (elles relient la fiche au PC)', () => {
        expect(champsPublics({ notes: 'texte' }).ok).toBe(false);
    });
    it('prénom vide ou date illisible : refusé', () => {
        expect(champsPublics({ prenom: ' ' }).ok).toBe(false);
        expect(champsPublics({ dateDeces: 'hier' }).ok).toBe(false);
    });
});
