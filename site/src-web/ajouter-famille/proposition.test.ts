import { describe, expect, it } from 'vitest';
import { anneeValide, validerFamille, type SaisieFamille } from './proposition';

const base: SaisieFamille = { famille: 'ESSAIMONT', prenom: 'Léa', nom: 'Essaimont', annee: '', proches: [], message: '' };

describe('proposition d’une famille', () => {
    it('forme attendue par soumettre_contribution / accepter_contribution', () => {
        const r = validerFamille({ ...base, annee: '1978', message: '  Venus de Saint-Paul  ', proches: [{ relation: 'parent', prenom: ' Paul ', nom: 'Essaimont', annee: '1950', decede: true }] }, 2026);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.contenu).toEqual({
            famille: 'ESSAIMONT',
            contributeur: { prenom: 'Léa', nom: 'Essaimont', genre: 'inconnu', naissance_annee: '1978', vivant: true },
            lien: { relation: 'inconnu', individu_id: null, texte: 'Nouvelle famille proposée : ESSAIMONT' },
            proches: [{ prenom: 'Paul', nom: 'Essaimont', genre: 'inconnu', naissance_annee: '1950', vivant: false, relation: 'parent' }],
            message: 'Venus de Saint-Paul',
        });
    });
    it('prénom obligatoire, pour soi et pour chaque proche', () => {
        const r = validerFamille({ ...base, prenom: ' ', proches: [{ relation: 'enfant', prenom: '', nom: '', annee: '', decede: false }] });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(Object.keys(r.erreurs).sort()).toEqual(['prenom', 'proche-0-prenom']);
    });
    it('année : 4 chiffres entre 1000 et cette année, ou vide', () => {
        expect(anneeValide('', 2026)).toBe(true);
        expect(anneeValide('1850', 2026)).toBe(true);
        expect(anneeValide('2027', 2026)).toBe(false);
        expect(anneeValide('999', 2026)).toBe(false);
        expect(anneeValide('18a0', 2026)).toBe(false);
    });
    it('pas plus de 20 proches, pas de message au-delà de 2000 signes, nom de famille obligatoire', () => {
        const proche = { relation: 'parent' as const, prenom: 'X', nom: '', annee: '', decede: true };
        const r = validerFamille({ ...base, famille: '', message: 'a'.repeat(2001), proches: Array(21).fill(proche) });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.erreurs.proches).toBeTruthy();
        expect(r.erreurs.message).toBeTruthy();
        expect(r.erreurs.famille).toBeTruthy();
    });
});
