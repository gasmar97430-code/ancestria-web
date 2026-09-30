// Loi 3 : sur le site comme au bureau, une origine « documentée » a sa source, nom par nom.
// Ces essais lisent les VRAIES données copiées du bureau (répertoire + sources).
import { describe, expect, it } from 'vitest';
import repertoire from '../copie-serveur/patronymes.json';
import releve from '../copie-serveur/sources-origines.json';
import { cleNom, sourcesDesOrigines } from './sources-origines';

type Fiche = { nom: string; origine: string; certitude?: string };
const fiches = (repertoire as { patronymes: Fiche[] }).patronymes;
const documentes = fiches.filter((p) => p.certitude === 'Documentee').map((p) => cleNom(p.nom));
const toutes = sourcesDesOrigines().items;

describe('sources des origines (prise du site)', () => {
    it('sert toutes les lignes du relevé, rangées par nom', () => {
        expect(toutes.length).toBe((releve as { sources: unknown[] }).sources.length);
        expect(toutes.length).toBeGreaterThan(0);
        const noms = toutes.map((s) => s.nom);
        expect(noms).toEqual([...noms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    });

    it('chaque nom « Documentee » du répertoire a au moins une source', () => {
        const sansSource = documentes.filter((n) => sourcesDesOrigines(n).total === 0);
        expect(sansSource).toEqual([]);
    });

    it('aucune source pour un nom qui n’est pas « Documentee »', () => {
        const avecSource = new Set(toutes.map((s) => cleNom(s.nom)));
        const enTrop = [...avecSource].filter((n) => !documentes.includes(n));
        expect(enTrop).toEqual([]);
        expect(avecSource.size).toBe(documentes.length);
    });

    it('chaque ligne dit ce qu’elle établit, cite quelques mots, et nomme sa source', () => {
        for (const s of toutes) {
            expect(s.etablit.trim(), s.nom).not.toBe('');
            expect(s.titre.trim(), s.nom).not.toBe('');
            expect(s.editeur.trim(), s.nom).not.toBe('');
            expect(s.releve.trim(), s.nom).not.toBe('');
            const mots = s.passage.split(/\s+/).filter((m) => /\p{L}/u.test(m)).length;
            expect(mots, s.nom).toBeGreaterThan(0);
            expect(mots, s.nom).toBeLessThanOrEqual(15);
            expect(['archives', 'universite', 'etude', 'association', 'encyclopedie', 'dictionnaire'], s.nom).toContain(s.nature);
            if (s.adresse !== null) expect(s.adresse, s.nom).toMatch(/^https?:\/\//);
        }
    });

    it('cherche un nom sans tenir compte de la casse ni des accents', () => {
        const un = toutes[0];
        const attendu = toutes.filter((s) => cleNom(s.nom) === cleNom(un.nom));
        expect(sourcesDesOrigines(un.nom.toLowerCase()).items).toEqual(attendu);
        expect(sourcesDesOrigines(`  ${un.nom}  `).items).toEqual(attendu);
    });

    it('un nom sans source ne reçoit rien ; sans nom, tout est rendu', () => {
        const sans = fiches.find((p) => p.certitude !== 'Documentee');
        expect(sans).toBeDefined();
        expect(sourcesDesOrigines(sans!.nom)).toEqual({ total: 0, items: [] });
        expect(sourcesDesOrigines('Nom-Qui-N-Existe-Pas')).toEqual({ total: 0, items: [] });
        expect(sourcesDesOrigines('').total).toBe(toutes.length);
        expect(sourcesDesOrigines(undefined).total).toBe(toutes.length);
    });
});
