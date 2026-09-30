import { describe, expect, it } from 'vitest';
import { defautProches, liensPossibles } from './anneesPlausibles';

const tous = ['enfant', 'petit_enfant', 'parent', 'conjoint', 'frere_soeur'] as const;
const garde = (v: string, a: number | null, d: number | null = null) => tous.filter(liensPossibles(v, { naissance_annee: a, deces_annee: d }));

describe('page du QR : liens proposés selon les années', () => {
    it('né en 1990 face à un ancêtre né en 1900 : ni parent, ni conjoint, ni frère (le cas du banc)', () => {
        expect(garde('1990', 1900)).toEqual(['enfant', 'petit_enfant']);
        expect(garde('1990', 1900, 1970)).toEqual(['petit_enfant']);
    });
    it('années inconnues : tout reste proposé', () => {
        expect(garde('', 1900)).toEqual([...tous]);
        expect(garde('1990', null)).toEqual([...tous]);
    });
    it('frère ou sœur : écart de 50 ans au plus ; parent : 10 ans au moins', () => {
        expect(garde('1950', 1940)).toEqual(['enfant', 'conjoint', 'frere_soeur']);
        expect(garde('1900', 1930)).toEqual(['parent', 'conjoint', 'frere_soeur']);
    });
});

describe('page du QR : les proches', () => {
    const p = (relation: string, naissance_annee: string, prenom = 'Essairose') => ({ prenom, relation, naissance_annee });
    it('une « enfant » née en 1962 pour un visiteur né en 1990 est refusée, avec la piste « parent ? »', () => {
        expect(defautProches('1990', [p('enfant', '1962')])).toBe('Proche 1 : un enfant né en 1962 serait né avant vous (1990). Vérifiez l’année ou le lien (parent ?).');
        expect(defautProches('1990', [p('enfant', '1995')])).toMatch(/moins de 10 ans/);
        expect(defautProches('1990', [p('parent', '1995')])).toMatch(/né après vous .*\(enfant \?\)/);
    });
    it('la même en « parent » passe', () => {
        expect(defautProches('1990', [p('parent', '1962')])).toBeNull();
    });
    it('un parent trop jeune est refusé ; un prénom vide est signalé tout de suite', () => {
        expect(defautProches('1990', [p('parent', '1985')])).toMatch(/moins de 10 ans/);
        expect(defautProches('1990', [p('parent', '1960'), p('enfant', '', '  ')])).toMatch(/^Proche 2 : son prénom manque/);
    });
    it('années inconnues : seul le prénom compte', () => {
        expect(defautProches('', [p('enfant', '1962')])).toBeNull();
    });
});
