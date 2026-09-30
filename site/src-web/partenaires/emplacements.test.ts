// Emplacements de bannières : ce qui entre, ce qui n'entre pas. Annonceurs INVENTÉS.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANNONCES } from './annonces';
import { annoncesPour, EMPLACEMENTS, enCampagne, formatPour, FORMATS, refus, type Annonce } from './emplacements';

const bonne = (plus: Partial<Annonce> = {}): Annonce => ({
    id: 'essai-livres',
    emplacement: 'pied',
    annonceur: 'Librairie Essai',
    theme: 'livres',
    lien: 'https://exemple.test/suivi?partenaire=ancestria',
    texte: 'Des livres sur les familles et leurs histoires',
    images: { '728x90': 'essai-728x90.webp', '320x100': 'essai-320x100.webp' },
    remuneration: { mode: 'commission', detail: '5 % sur chaque commande' },
    ...plus,
});

describe('refus : les règles d\'entrée', () => {
    it('une annonce complète entre', () => {
        expect(refus(bonne())).toEqual([]);
        expect(refus(bonne({ emplacement: 'cote', images: { '300x250': 'essai-300x250.webp' } }))).toEqual([]);
    });
    it('réservé à ce qui rapporte : sans rémunération déclarée, refus', () => {
        expect(refus(bonne({ remuneration: undefined as never })).join()).toMatch(/rémunération/);
        expect(refus(bonne({ remuneration: { mode: 'commission', detail: '  ' } })).join()).toMatch(/rémunération/);
        expect(refus(bonne({ remuneration: { mode: 'echange' as never, detail: 'un lien en retour' } })).join()).toMatch(/rémunération/);
    });
    it('l\'annonceur doit être nommé, le lien en https, l\'image décrite', () => {
        expect(refus(bonne({ annonceur: ' ' })).join()).toMatch(/annonceur/);
        expect(refus(bonne({ lien: 'http://exemple.test' })).join()).toMatch(/https/);
        expect(refus(bonne({ lien: 'javascript:alert(1)' })).join()).toMatch(/https/);
        expect(refus(bonne({ texte: '' })).join()).toMatch(/texte/);
    });
    it('thème hors de la liste fermée : refus', () => {
        expect(refus(bonne({ theme: 'politique' as never })).join()).toMatch(/thème hors liste/);
    });
    it('interdits, même sous un thème admis : tests ADN, jeux d\'argent, crédit, politique, adultes, alcool', () => {
        for (const [texte, motif] of [
            ['Découvrez vos origines avec un test ADN', /tests ADN/],
            ['Kit DNA en promotion', /tests ADN/],
            ['Casino en ligne, bonus de bienvenue', /jeux d'argent/],
            ['Crédit rapide sans justificatif', /crédit/],
            ['Votez pour notre candidat', /politique/],
            ['Élections municipales : notre programme', /politique/],
            ['Étude génétique de vos ancêtres', /tests ADN/],
            ['Rhum arrangé livré chez vous', /tabac et alcool/],
        ] as const) expect(refus(bonne({ texte })).join(), texte).toMatch(motif);
        expect(refus(bonne({ lien: 'https://exemple.test/dna-kit' })).join()).toMatch(/tests ADN/);
    });
    it('un mot qui en contient un autre ne déclenche rien (« partition », « divin », « candidature »)', () => {
        expect(refus(bonne({ texte: 'Partitions et chants divins : déposez votre candidature au chœur' }))).toEqual([]);
    });
    it('le format doit être celui de l\'emplacement ; l\'image, un fichier de public/partenaires', () => {
        expect(refus(bonne({ images: { '300x250': 'essai.webp' } })).join()).toMatch(/n'entre pas dans « Bandeau du pied »/);
        expect(refus(bonne({ images: {} })).join()).toMatch(/aucune image/);
        expect(refus(bonne({ images: { '728x90': 'https://regie.test/pixel.gif' } })).join()).toMatch(/simple nom de fichier/);
        expect(refus(bonne({ images: { '728x90': '../secret.png' } })).join()).toMatch(/simple nom de fichier/);
    });
    it('dates de campagne lisibles et dans l\'ordre', () => {
        expect(refus(bonne({ du: '01/10/2026' })).join()).toMatch(/date illisible/);
        expect(refus(bonne({ du: '2026-12-01', au: '2026-10-01' })).join()).toMatch(/finit avant/);
        expect(refus(bonne({ du: '2026-10-01', au: '2026-12-31' }))).toEqual([]);
    });
});

describe('campagne, format, emplacement', () => {
    it('enCampagne : bornes comprises, sans borne = toujours', () => {
        const a = bonne({ du: '2026-10-01', au: '2026-10-31' });
        expect([enCampagne(a, '2026-09-30'), enCampagne(a, '2026-10-01'), enCampagne(a, '2026-10-31'), enCampagne(a, '2026-11-01')]).toEqual([false, true, true, false]);
        expect(enCampagne(bonne(), '2030-01-01')).toBe(true);
    });
    it('formatPour : le plus grand format fourni qui tient', () => {
        expect(formatPour(bonne(), 1400)).toBe('728x90');
        expect(formatPour(bonne(), 400)).toBe('320x100');
        expect(formatPour(bonne(), 300)).toBeNull();
        expect(formatPour(bonne({ images: { '728x90': 'a.webp' } }), 400)).toBeNull();
    });
    it('annoncesPour : le pied partout ; la colonne seulement Accueil et Sources, et seulement sur grand écran', () => {
        const toutes = [bonne(), bonne({ id: 'essai-cote', emplacement: 'cote', images: { '300x600': 'c.webp', '300x250': 'r.webp' } })];
        for (const ecran of ['accueil', 'arbre', 'traque', 'sources'] as const) expect(annoncesPour(toutes, 'pied', ecran, 1440, '2026-10-01').map((x) => x.format), ecran).toEqual(['728x90']);
        expect(annoncesPour(toutes, 'pied', 'accueil', 390, '2026-10-01').map((x) => x.format)).toEqual(['320x100']);
        expect(annoncesPour(toutes, 'cote', 'accueil', 1920, '2026-10-01').map((x) => x.format)).toEqual(['300x600']);
        expect(annoncesPour(toutes, 'cote', 'sources', 1920, '2026-10-01')).toHaveLength(1);
        expect(annoncesPour(toutes, 'cote', 'arbre', 1920, '2026-10-01')).toEqual([]);
        expect(annoncesPour(toutes, 'cote', 'traque', 1920, '2026-10-01')).toEqual([]);
        expect(annoncesPour(toutes, 'cote', 'accueil', 1440, '2026-10-01')).toEqual([]);
    });
    it('une annonce refusée ou hors campagne ne paraît jamais', () => {
        expect(annoncesPour([bonne({ texte: 'Test ADN' })], 'pied', 'accueil', 1440, '2026-10-01')).toEqual([]);
        expect(annoncesPour([bonne({ du: '2027-01-01' })], 'pied', 'accueil', 1440, '2026-10-01')).toEqual([]);
        expect(annoncesPour([], 'pied', 'accueil', 1440, '2026-10-01')).toEqual([]);
    });
    it('chaque emplacement ne cite que des formats connus', () => {
        for (const e of Object.values(EMPLACEMENTS)) for (const f of e.formats) expect(FORMATS[f]).toBeDefined();
    });
});

describe('annonces.ts : ce qui partirait en ligne', () => {
    it('chaque annonce en cours respecte toutes les règles', () => {
        for (const a of ANNONCES) expect(refus(a), a.id).toEqual([]);
    });
    it('chaque image annoncée existe dans public/partenaires', () => {
        for (const a of ANNONCES) for (const fichier of Object.values(a.images)) expect(existsSync(join(__dirname, '..', '..', 'public', 'partenaires', fichier!)), `${a.id} : ${fichier}`).toBe(true);
    });
    it('les identifiants sont uniques', () => {
        expect(new Set(ANNONCES.map((a) => a.id)).size).toBe(ANNONCES.length);
    });
});
