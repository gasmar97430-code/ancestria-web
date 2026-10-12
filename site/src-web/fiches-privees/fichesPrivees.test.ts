// Fiches privées de l'auteur (12/10/2026) : les vraies données ne remplacent « Fiche protégée » que pour les lignes
// reçues (la base ne les rend qu'à l'auteur) ; « Modifier » ne touche que les champs rangeables. Personnes INVENTÉES.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../prise/supabase', () => ({ supabase: {} }));
import { champsPrives, MARQUE_PRIVEE, superposer } from './fichesPrivees';
import type { LigneIndividu } from '../prise/traduction';

const base = (id: string, vivant: boolean, prenom: string): LigneIndividu => ({ id, prenom, nom: vivant ? '' : 'Essaiville', genre: 'inconnu',
    naissance: null, naissance_precision: 'annee', lieu_naissance: null, deces: null, deces_precision: 'annee', lieu_deces: null,
    vivant, notes: 'pc:1', cree_le: '2026-10-01', maj_le: '2026-10-01' });
const individus = [base('a', false, 'Essaijean'), base('b', true, 'Fiche protégée'), base('c', true, 'Fiche protégée')];

describe('superposer', () => {
    it('sans ligne privée (autre compte, inscrit) : rien ne change', () => {
        expect(superposer(individus, [])).toEqual(individus);
    });
    it('l’auteur : la fiche protégée reçue montre la vraie personne, marquée « visible par vous seul »', () => {
        const r = superposer(individus, [{ individu_id: 'b', prenom: 'Essaivivant', nom: 'Essaiville', genre: 'homme', naissance: '1960-03-04', naissance_precision: 'jour', lieu_naissance: 'Essaiport' }]);
        expect(r[1]).toMatchObject({ prenom: 'Essaivivant', nom: 'Essaiville', genre: 'homme', naissance: '1960-03-04', lieu_naissance: 'Essaiport', notes: MARQUE_PRIVEE, vivant: true });
        expect(r[2].prenom).toBe('Fiche protégée');
        expect(r[0]).toEqual(individus[0]);
    });
    it('une ligne privée sur une fiche NON protégée est ignorée', () => {
        const r = superposer(individus, [{ individu_id: 'a', prenom: 'Autre', nom: 'X', genre: 'homme', naissance: null, naissance_precision: 'annee', lieu_naissance: null }]);
        expect(r[0].prenom).toBe('Essaijean');
    });
});

describe('champsPrives (« Modifier »)', () => {
    it('prénom, nom, genre, naissance, lieu → colonnes de la base', () => {
        expect(champsPrives({ prenom: ' Léa ', nom: 'ESSAIVILLE', genre: 'F', dateNaissance: '1990-01-01', lieuNaissance: ' Saint-Essai ' }))
            .toEqual({ ok: true, champs: { prenom: 'Léa', nom: 'ESSAIVILLE', genre: 'femme', naissance: '1990-01-01', naissance_precision: 'annee', lieu_naissance: 'Saint-Essai' } });
        expect(champsPrives({ dateNaissance: '1990-05-06' })).toEqual({ ok: true, champs: { naissance: '1990-05-06', naissance_precision: 'jour' } });
        expect(champsPrives({ dateNaissance: '', lieuNaissance: '' })).toEqual({ ok: true, champs: { naissance: null, naissance_precision: 'jour', lieu_naissance: null } });
    });
    it('décès, statut, notes : refusés avec la marche à suivre (au PC)', () => {
        for (const c of [{ dateDeces: '2020-01-01' }, { decede: true }, { notes: 'x' }]) {
            const r = champsPrives(c);
            expect(r.ok).toBe(false);
            expect(r.ok ? '' : r.message).toMatch(/PC/);
        }
    });
    it('prénom vide ou date illisible : refusé', () => {
        expect(champsPrives({ prenom: '  ' }).ok).toBe(false);
        expect(champsPrives({ dateNaissance: 'demain' }).ok).toBe(false);
    });
});
