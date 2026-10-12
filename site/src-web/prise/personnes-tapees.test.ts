import { describe, expect, it } from 'vitest';
import { trouverPersonnes, type PersonneArbre } from './personnes-tapees';

// Personnes INVENTÉES.
const gens: PersonneArbre[] = [
    { id: 1, prenom: 'Céus Émile', nom: 'HOARAU', dateNaissance: '1890-01-01', dateDeces: '1960-01-01', lieuNaissance: 'Saint-Paul' },
    { id: 2, prenom: 'Emile', nom: 'HOARAU' },
    { id: 3, prenom: 'Fiche protégée', nom: '' },
    { id: 4, prenom: 'Marie', nom: 'PAYET' },
];

describe('personnes tapées à l’Accueil du site', () => {
    it('« hoarau emile ceus » trouve Céus Émile HOARAU (accents, ordre et majuscules ignorés)', () => {
        const r = trouverPersonnes('hoarau emile ceus', gens);
        expect(r.map((x) => x.id)).toEqual([1]);
        expect(r[0]).toEqual({ id: 1, prenom: 'Céus Émile', nom: 'HOARAU', naissance: 1890, deces: 1960, lieu: 'Saint-Paul' });
    });
    it('« hoarau emile » trouve les deux, « hoarau céus » un seul', () => {
        expect(trouverPersonnes('hoarau emile', gens).map((x) => x.id).sort()).toEqual([1, 2]);
        expect(trouverPersonnes('hoarau céus', gens).map((x) => x.id)).toEqual([1]);
    });
    it('jamais une Fiche protégée (loi 6), rien pour une saisie trop courte', () => {
        expect(trouverPersonnes('fiche protegee', gens)).toEqual([]);
        expect(trouverPersonnes('h', gens)).toEqual([]);
    });
});
