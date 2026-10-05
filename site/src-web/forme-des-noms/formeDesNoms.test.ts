import { describe, expect, it } from 'vitest';
import { corpsMisEnForme, formeDuNom, formeDuPrenom, propositionMiseEnForme } from './formeDesNoms';

describe('forme des noms du site (06/10)', () => {
    it('nom en majuscules, prénom « Marie-Thérèse », « ? » inchangé', () => {
        expect(formeDuNom(' ferrère ')).toBe('FERRÈRE');
        expect(formeDuPrenom('marie-thérèse')).toBe('Marie-Thérèse');
        expect(formeDuPrenom('JEAN  MARIUS')).toBe('Jean Marius');
        expect(formeDuNom('?')).toBe('?');
    });
    it('la prise : seulement les fiches créées ou modifiées', () => {
        expect(corpsMisEnForme('POST', '/people', { nom: 'payet', prenom: 'marie' })).toEqual({ nom: 'PAYET', prenom: 'Marie' });
        expect(corpsMisEnForme('PATCH', '/api/people/12', { prenom: 'henry fred' })).toEqual({ prenom: 'Henry Fred' });
        expect(corpsMisEnForme('GET', '/people', { nom: 'payet' })).toEqual({ nom: 'payet' });
        expect(corpsMisEnForme('POST', '/unions', { nom: 'payet' })).toEqual({ nom: 'payet' });
    });
    it('la proposition d\'un visiteur', () => {
        const p = propositionMiseEnForme({ famille: 'grondin', contributeur: { nom: 'grondin', prenom: 'louis' }, proches: [{ nom: 'payet', prenom: 'anne-marie' }] });
        expect(p).toEqual({ famille: 'GRONDIN', contributeur: { nom: 'GRONDIN', prenom: 'Louis' }, proches: [{ nom: 'PAYET', prenom: 'Anne-Marie' }] });
    });
});
