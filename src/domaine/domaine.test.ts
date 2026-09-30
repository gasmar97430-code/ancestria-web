import { describe, expect, it } from 'vitest';
import { ajouter, dateLisible, dateMax, dateVersSaisie, lireDate } from './dates';
import { controlerFiliation, controlerFrereSoeur, controlerUnion, creeraitUneBoucle, descendants, enfantsPossibles, fratrie, incoherenceDates, parentsPossibles } from './coherence';
import { disposer, CARTE } from './disposition';
import { messageErreur, motifErreur } from './erreurs';
import { lirePosition, lireThematiques, SAISIE_INDIVIDU_VIDE, validerContribution, validerDocument, validerIndividu, validerInvitation, validerUnion, validerEspace } from './validation';
import type { DonneesArbre, Filiation, Individu } from './types';

const LE_28_09_2026 = new Date(2026, 8, 28, 12);

function ind(id: string, extra: Partial<Individu> = {}): Individu {
    return {
        id, arbre_id: 'a', prenom: id, nom: '', genre: 'inconnu', se_nomme: null, naissance: null, naissance_precision: 'jour',
        lieu_naissance: null, naissance_lat: null, naissance_lng: null, deces: null, deces_precision: 'jour', lieu_deces: null,
        vivant: true, profession: null, biographie: null, notes: null, illustre: false, thematiques: [], photo_url: null, cree_le: '', maj_le: '', ...extra,
    };
}
const fil = (parent: string, enfant: string, nature: Filiation['nature'] = 'biologique', id = `${parent}>${enfant}`): Filiation =>
    ({ id, arbre_id: 'a', parent_id: parent, enfant_id: enfant, nature, foyer_id: null });

describe('dates', () => {
    it('lit toutes les façons de taper une date', () => {
        for (const t of ['24/04/1962', '24-04-1962', '24.04.1962', '24 04 1962', '24041962', '1962-04-24', '  24/4/1962 ']) {
            expect(lireDate(t, LE_28_09_2026), t).toEqual({ ok: true, valeur: { date: '1962-04-24', precision: 'jour' } });
        }
        expect(lireDate('1962', LE_28_09_2026)).toEqual({ ok: true, valeur: { date: '1962-01-01', precision: 'annee' } });
        expect(lireDate('', LE_28_09_2026)).toEqual({ ok: true, valeur: null });
    });
    it('refuse les dates impossibles, illisibles ou futures', () => {
        for (const t of ['31/02/1962', '29/02/1900', '00/01/1962', '32/01/1962', '24/13/1962', '240462', 'hier', '1962/04/24', '0999']) {
            expect(lireDate(t, LE_28_09_2026).ok, t).toBe(false);
        }
        expect(lireDate('29/02/2000', LE_28_09_2026).ok).toBe(true); // bissextile
        expect(lireDate('29/09/2026', LE_28_09_2026)).toEqual({ ok: false, erreur: 'Cette date est dans le futur.' });
        expect(lireDate('28/09/2026', LE_28_09_2026).ok).toBe(true);
        expect(lireDate('2027', LE_28_09_2026).ok).toBe(false);
    });
    it('affiche et ré-affiche sans perte', () => {
        expect(dateVersSaisie('1962-04-24', 'jour')).toBe('24/04/1962');
        expect(dateVersSaisie('1962-01-01', 'annee')).toBe('1962');
        expect(dateLisible('1962-04-01', 'jour')).toBe('1er avril 1962');
        expect(dateLisible('1962-01-01', 'annee')).toBe('1962');
        expect(dateMax('1962-01-01', 'annee')).toBe('1962-12-31');
        expect(ajouter('2000-02-29', 10)).toBe('2010-02-28'); // comme PostgreSQL
        expect(ajouter('1930-01-15', 0, 30)).toBe('1930-02-14');
    });
});

describe('cohérence (boucles, ligne directe, dates)', () => {
    const base = (): DonneesArbre => ({
        individus: ['a', 'b', 'c', 'd', 'x', 'y'].map((i) => ind(i)),
        unions: [], foyers: [], foyerParents: [],
        filiations: [fil('a', 'b'), fil('a', 'c'), fil('b', 'd'), fil('c', 'd')],
    });
    it('boucles directes, lointaines, et par modification', () => {
        const d = base();
        expect(creeraitUneBoucle(d.filiations, 'd', 'a')).toBe(true);
        expect(creeraitUneBoucle(d.filiations, 'b', 'a')).toBe(true);
        expect(creeraitUneBoucle(d.filiations, 'a', 'a')).toBe(true);
        expect(creeraitUneBoucle(d.filiations, 'x', 'a')).toBe(false);
        // modifier le lien b>d en d>... : sans compter le lien lui-même
        expect(creeraitUneBoucle(d.filiations, 'd', 'b', 'b>d')).toBe(false);
        expect(creeraitUneBoucle(d.filiations, 'd', 'b')).toBe(true);
    });
    it('termine sur une donnée abîmée (boucle déjà présente)', () => {
        const liens = [fil('p', 'q'), fil('q', 'p'), fil('q', 'r')];
        expect([...descendants(liens, 'p')].sort()).toEqual(['p', 'q', 'r']);
    });
    it('supporte 20 000 générations sans débordement de pile', () => {
        const liens = Array.from({ length: 20000 }, (_, i) => fil(`g${i}`, `g${i + 1}`));
        expect(creeraitUneBoucle(liens, 'g20000', 'g0')).toBe(true);
        expect(creeraitUneBoucle(liens, 'g0', 'autre')).toBe(false);
    });
    it('2 biologiques au plus ; autres natures libres ; doublon refusé', () => {
        const d = base();
        d.filiations.push(fil('x', 'd', 'beau_parent'));
        expect(controlerFiliation(d, { parent: 'y', enfant: 'd', nature: 'biologique' })).toMatch(/deux parents biologiques/);
        expect(controlerFiliation(d, { parent: 'y', enfant: 'd', nature: 'intention' })).toBeNull();
        expect(controlerFiliation(d, { parent: 'a', enfant: 'b', nature: 'adoptive' })).toBe('Ce lien existe déjà.');
    });
    it('ligne directe dans les deux sens', () => {
        const d = base();
        expect(controlerUnion(d, 'a', 'd', null)).toMatch(/ascendant et son descendant/);
        expect(controlerUnion(d, 'b', 'c', null)).toBeNull(); // frère et sœur : pas la ligne directe (règle métier : autre question)
        d.unions.push({ id: 'u', arbre_id: 'a', partenaire_a: 'x', partenaire_b: 'y', nature: 'mariage', statut: 'en_cours', debut: null, fin: null });
        d.filiations.push(fil('x', 'a'));
        expect(controlerFiliation(d, { parent: 'd', enfant: 'y', nature: 'adoptive' })).toMatch(/ascendant et son descendant/);
    });
    it('dates : né après, moins de 10 ans, posthume, précision année', () => {
        const p = ind('P', { naissance: '1950-01-01', naissance_precision: 'annee' });
        expect(incoherenceDates(p, ind('E', { naissance: '1949-06-01' }), 'adoptive')).toMatch(/né\(e\) après/);
        expect(incoherenceDates(p, ind('E', { naissance: '1960-12-31' }), 'biologique')).toBeNull();
        expect(incoherenceDates(p, ind('E', { naissance: '1959-01-01', naissance_precision: 'annee' }), 'biologique')).toMatch(/moins de 10 ans/);
        expect(incoherenceDates(p, ind('E', { naissance: '1959-01-01', naissance_precision: 'annee' }), 'sociale')).toBeNull();
        const mort = ind('M', { naissance: '1900-01-01', deces: '1930-01-15' });
        expect(incoherenceDates(mort, ind('E', { naissance: '1930-09-15' }), 'biologique')).toBeNull();
        expect(incoherenceDates(mort, ind('E', { naissance: '1931-01-16' }), 'biologique')).toMatch(/plus d’un an après/);
        expect(incoherenceDates(mort, ind('E', { naissance: '1930-02-15' }), 'gestation')).toMatch(/après la mort/);
    });
    it('frère / sœur : mêmes règles que la base ; fratrie avec demi-frères', () => {
        const d = base(); // a → b, a → c, b → d, c → d
        expect(controlerFrereSoeur(d, 'x', ind('y'))).toBeNull(); // aucun parent : un parent « à trouver » sera posé
        expect(controlerFrereSoeur(d, 'b', ind('x'))).toBeNull(); // x reçoit le parent de b
        expect(controlerFrereSoeur(d, 'b', ind('c'))).toMatch(/déjà un parent en commun/);
        d.filiations.push(fil('y', 'x'));
        expect(controlerFrereSoeur(d, 'b', ind('x'))).toMatch(/Chacun a déjà ses parents/);
        expect(controlerFrereSoeur(d, 'b', ind('b'))).toMatch(/propre frère/);
        expect(controlerFrereSoeur(d, 'b', ind('a'))).toMatch(/boucle|propre parent/); // a est le parent de b : refusé (la base dit « boucle »)
        const vieux = ind('vieux', { naissance: '1900-01-01' });
        const dd = { ...base(), individus: [...base().individus.filter((i) => i.id !== 'a'), ind('a', { naissance: '1950-01-01' })] };
        expect(controlerFrereSoeur(dd, 'b', vieux)).toMatch(/né\(e\) après/); // son parent serait né après lui
        // demi : parent commun choisi, faux, ou inconnu ; adoptif
        const g = base();
        expect(controlerFrereSoeur(g, 'b', ind('x'), 'demi', 'a')).toBeNull();
        expect(controlerFrereSoeur(g, 'b', ind('x'), 'demi', 'y')).toMatch(/aucun des deux/);
        expect(controlerFrereSoeur(g, 'b', ind('c'), 'demi', 'a')).toMatch(/déjà ce parent en commun/);
        g.filiations.push(fil('y', 'x'));
        expect(controlerFrereSoeur(g, 'b', ind('x'), 'demi')).toBeNull(); // parents connus différents + un parent commun inconnu
        expect(controlerFrereSoeur(g, 'b', ind('x'), 'germain')).toMatch(/choisissez « demi-frère/);
        g.filiations.push(fil('c', 'b'));
        expect(controlerFrereSoeur(g, 'b', ind('x'), 'demi')).toMatch(/deux parents biologiques/); // b a déjà 2 parents biologiques
        expect(controlerFrereSoeur(base(), 'b', ind('x'), 'adoptif')).toBeNull();
        const f = base();
        f.filiations.push(fil('x', 'c'));
        expect(fratrie(f, 'b').map((x) => [x.individu.id, x.demi])).toEqual([['c', true]]);
        expect(fratrie(base(), 'b').map((x) => [x.individu.id, x.demi])).toEqual([['c', false]]);
        expect(fratrie(base(), 'a')).toEqual([]);
    });
    it('les listes de choix n\'offrent jamais un lien impossible', () => {
        const d = base();
        expect(parentsPossibles(d, 'b').map((i) => i.id).sort()).toEqual(['c', 'x', 'y']); // ni b, ni d (descendant), ni a (déjà parent)
        expect(enfantsPossibles(d, 'd').map((i) => i.id).sort()).toEqual(['x', 'y']);
    });
});

describe('disposition', () => {
    it('générations de haut en bas ; jonction partagée par la fratrie ; couples dessinés', () => {
        const d: DonneesArbre = {
            individus: ['m1', 'm2', 'e1', 'e2', 'seul', 'e3'].map((i) => ind(i)),
            unions: [{ id: 'u1', arbre_id: 'a', partenaire_a: 'm1', partenaire_b: 'm2', nature: 'mariage', statut: 'en_cours', debut: null, fin: null }],
            foyers: [], foyerParents: [],
            filiations: [fil('m1', 'e1', 'adoptive'), fil('m2', 'e1', 'adoptive'), fil('m1', 'e2', 'adoptive'), fil('m2', 'e2', 'adoptive'), fil('seul', 'e3')],
        };
        const r = disposer(d);
        const y = (id: string) => r.noeuds.find((n) => n.id === `i-${id}`)!.y;
        expect(y('e1')).toBeGreaterThan(y('m1'));
        expect(y('e3')).toBeGreaterThan(y('seul'));
        expect(r.noeuds.filter((n) => n.type === 'jonction')).toHaveLength(1); // e1 et e2 partagent la même jonction
        expect(r.traits.filter((t) => t.genre === 'couple')).toHaveLength(1);
        expect(r.traits.filter((t) => t.genre === 'filiation')).toHaveLength(1);
        // aucune carte ne se chevauche
        const cartes = r.noeuds.filter((n) => n.type === 'individu');
        for (const a of cartes) for (const b of cartes) {
            if (a === b) continue;
            const chevauche = a.x < b.x + CARTE.largeur && b.x < a.x + CARTE.largeur && a.y < b.y + CARTE.hauteur && b.y < a.y + CARTE.hauteur;
            expect(chevauche, `${a.id} / ${b.id}`).toBe(false);
        }
    });
    it('3 parents : une seule jonction, 3 traits vers elle ; liens vers des absents ignorés', () => {
        const d: DonneesArbre = {
            individus: ['p1', 'p2', 'p3', 'e'].map((i) => ind(i)), unions: [], foyers: [], foyerParents: [],
            filiations: [fil('p1', 'e'), fil('p2', 'e'), fil('p3', 'e', 'intention'), fil('absent', 'e')],
        };
        const r = disposer(d);
        expect(r.traits.filter((t) => t.genre === 'vers-jonction')).toHaveLength(3);
        expect(r.noeuds.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    });
    it('conjoints côte à côte : aucune carte ne s\'intercale entre deux conjoints (famille recomposée à 3 parents)', () => {
        // la famille inventée du banc d'images, où Louis s'intercalait entre Anne et Marc
        const ids = ['auguste', 'marie', 'paul', 'jeanne', 'rose', 'louis', 'anne', 'marc', 'sophie', 'theo', 'claire', 'ines', 'lou', 'inconnu', 'emile'];
        const u = (a: string, b: string) => ({ id: `${a}+${b}`, arbre_id: 'a', partenaire_a: a, partenaire_b: b, nature: 'mariage' as const, statut: 'en_cours' as const, debut: null, fin: null });
        const d: DonneesArbre = {
            individus: ids.map((i) => ind(i)), foyers: [], foyerParents: [],
            unions: [u('auguste', 'marie'), u('paul', 'rose'), u('anne', 'marc'), u('claire', 'ines')],
            filiations: [fil('auguste', 'paul'), fil('marie', 'paul'), fil('auguste', 'jeanne'), fil('marie', 'jeanne'), fil('paul', 'louis'), fil('rose', 'louis'),
                fil('paul', 'anne'), fil('rose', 'anne'), fil('anne', 'theo'), fil('marc', 'theo'), fil('sophie', 'theo', 'intention'), fil('inconnu', 'emile'),
                fil('jeanne', 'emile'), fil('claire', 'lou', 'adoptive'), fil('ines', 'lou', 'adoptive')],
        };
        // L'appli reçoit les lignes triées par identifiant (donc dans un ordre quelconque) :
        // on essaie 60 ordres tirés au hasard (graine fixe, rejouable).
        let graine = 12345;
        const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
        const melanger = <T,>(t: T[]) => t.map((x) => [hasard(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
        for (let essai = 0; essai < 60; essai++) {
            const dm: DonneesArbre = { ...d, individus: melanger(d.individus), unions: melanger(d.unions), filiations: melanger(d.filiations) };
            const r = disposer(dm);
            const pos = new Map(r.noeuds.filter((n) => n.type === 'individu').map((n) => [n.id.slice(2), n]));
            for (const x of d.unions) {
                const a = pos.get(x.partenaire_a)!;
                const b = pos.get(x.partenaire_b)!;
                expect(a.y, `essai ${essai} : ${x.id} même génération`).toBe(b.y);
                const [g, dr] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];
                const entre = [...pos.entries()].filter(([id, n]) => id !== x.partenaire_a && id !== x.partenaire_b && n.y === a.y && n.x > g && n.x < dr).map(([id]) => id);
                expect(entre, `essai ${essai} : entre ${x.id}`).toEqual([]);
            }
            const cartes = r.noeuds.filter((n) => n.type === 'individu');
            for (const a of cartes) for (const b of cartes) {
                if (a !== b) expect(a.x < b.x + CARTE.largeur && b.x < a.x + CARTE.largeur && a.y < b.y + CARTE.hauteur && b.y < a.y + CARTE.hauteur, `essai ${essai} : ${a.id}/${b.id}`).toBe(false);
            }
        }
    });
    it('arbre vide et individus sans lien : pas d\'erreur', () => {
        expect(disposer({ individus: [], unions: [], foyers: [], foyerParents: [], filiations: [] }).noeuds).toEqual([]);
        expect(disposer({ individus: [ind('a'), ind('b')], unions: [], foyers: [], foyerParents: [], filiations: [] }).noeuds).toHaveLength(2);
    });
});

describe('validation des formulaires', () => {
    it('individu : prénom seul suffit ; décès → décédé ; position et thématiques lues', () => {
        const r = validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: '  Anatole ', deces: '1990', position_naissance: '-21.0096, 55.2707', thematiques: 'Marine, engagisme, marine' });
        expect(r.ok && r.donnees).toMatchObject({ prenom: 'Anatole', nom: '', vivant: false, deces: '1990-01-01', deces_precision: 'annee', naissance_lat: -21.0096, naissance_lng: 55.2707, thematiques: ['marine', 'engagisme'] });
    });
    it('individu : chaque erreur sur son champ', () => {
        const r = validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: ' ', naissance: '31/02/1950', position_naissance: '200, 10', nom: 'x'.repeat(81) });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(['naissance', 'nom', 'position_naissance', 'prenom']); // toutes les erreurs en une fois
        const r2 = validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', naissance: '31/02/1950', position_naissance: '200, 10', deces: '1940', thematiques: 'x'.repeat(41) });
        expect(r2.ok).toBe(false);
        if (!r2.ok) expect(Object.keys(r2.erreurs).sort()).toEqual(['naissance', 'position_naissance', 'thematiques']);
        const r3 = validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', naissance: '1950', deces: '1949' });
        expect(!r3.ok && r3.erreurs.deces).toBe('Le décès est avant la naissance.');
        expect(validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', naissance: '1950', deces: '1950' }).ok).toBe(true);
    });
    it('photo : lien https seulement, vide = pas de photo', () => {
        expect(validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', photo_url: ' https://exemple.re/a.jpg ' })).toMatchObject({ ok: true, donnees: { photo_url: 'https://exemple.re/a.jpg' } });
        expect(validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', photo_url: '' })).toMatchObject({ ok: true, donnees: { photo_url: null } });
        for (const u of ['http://exemple.re/a.jpg', 'javascript:alert(1)', 'https://a b.jpg']) {
            const r = validerIndividu({ ...SAISIE_INDIVIDU_VIDE, prenom: 'A', photo_url: u });
            expect(!r.ok && r.erreurs.photo_url, u).toMatch(/https/);
        }
    });
    it('position : formats acceptés et refusés', () => {
        expect(lirePosition('-21.0096 55.2707')).toEqual({ ok: true, valeur: [-21.0096, 55.2707] });
        expect(lirePosition('-21.0096;55.2707')).toEqual({ ok: true, valeur: [-21.0096, 55.2707] });
        expect(lirePosition('-21,0096, 55,2707').ok).toBe(false);
        expect(lirePosition('91, 0').ok).toBe(false);
        expect(lirePosition('').ok).toBe(true);
        expect(lireThematiques(' A ;b,, a ')).toEqual(['a', 'b']);
    });
    it('union, partage, document, espace', () => {
        expect(validerUnion({ nature: 'pacs', statut: 'en_cours', debut: '2001', fin: '' }).ok).toBe(true);
        const u = validerUnion({ nature: 'pacs', statut: 'en_cours', debut: '2001', fin: '2000' });
        expect(!u.ok && u.erreurs.fin).toBe('La fin est avant le début.');
        expect(validerUnion({ nature: 'magie', statut: 'en_cours', debut: '', fin: '' }).ok).toBe(false);
        expect(validerInvitation({ libelle: 'Facebook', pin: '', jours: '90' })).toEqual({ ok: true, donnees: { libelle: 'Facebook', pin: null, jours: 90 } });
        expect(validerInvitation({ libelle: 'Facebook', pin: '12a4', jours: '90' }).ok).toBe(false);
        expect(validerInvitation({ libelle: 'Facebook', pin: '1234', jours: '400' }).ok).toBe(false);
        const doc = validerDocument({ titre: 'Registre', type: 'registre', date_document: '1850', periode: '', lieu: '', position: '', url: 'javascript:alert(1)', cote: '', source: '', droits: '', description: '', public: true });
        expect(!doc.ok && doc.erreurs.url).toMatch(/https/);
        expect(validerEspace({ slug: 'Saint-Paul', territoire: '', description: '', centre: '', public_patrimoine: true })).toMatchObject({ ok: true, donnees: { slug: 'saint-paul' } });
        const esp = validerEspace({ slug: '', territoire: '', description: '', centre: '', public_patrimoine: true });
        expect(!esp.ok && esp.erreurs.slug).toMatch(/adresse/i);
    });
    it('proposition publique : consentement obligatoire, personne visée obligatoire sauf « je ne sais pas »', () => {
        const base = { prenom: 'Ana', nom: '', genre: 'femme', naissance_annee: '1985', relation: 'enfant', individu_id: '', texte_lien: '', proches: [], message: '', contact: '', consentement: true };
        const r1 = validerContribution(base, 2026);
        expect(!r1.ok && r1.erreurs.individu_id).toMatch(/Choisissez/);
        const r2 = validerContribution({ ...base, individu_id: '8f14e45f-ceea-467a-9575-7d4a2c1e0b3a' }, 2026);
        expect(r2.ok && r2.donnees.contenu).toEqual({
            contributeur: { prenom: 'Ana', nom: '', genre: 'femme', naissance_annee: 1985, vivant: true },
            lien: { relation: 'enfant', individu_id: '8f14e45f-ceea-467a-9575-7d4a2c1e0b3a', texte: '' }, proches: [], message: '',
        });
        const r3 = validerContribution({ ...base, relation: 'inconnu', consentement: false }, 2026);
        expect(!r3.ok && r3.erreurs.consentement).toMatch(/Cochez/);
        expect(validerContribution({ ...base, relation: 'inconnu', naissance_annee: '2030' }, 2026).ok).toBe(false);
        const r4 = validerContribution({ ...base, relation: 'inconnu', proches: Array.from({ length: 21 }, () => ({ prenom: 'x', nom: '', relation: 'enfant', naissance_annee: '', vivant: true })) }, 2026);
        expect(!r4.ok && r4.erreurs.proches).toMatch(/20 proches/);
    });
});

describe('erreurs en français', () => {
    it('traduit chaque sorte d\'erreur', () => {
        expect(messageErreur({ code: '42501', message: 'new row violates row-level security policy for table "individus"' })).toBe('Vous n’avez pas le droit de faire cela dans cet arbre.');
        expect(messageErreur({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe('Cet élément existe déjà.');
        expect(messageErreur({ code: '23514', message: 'Lien impossible : boucle', hint: 'BOUCLE' })).toBe('Lien impossible : boucle');
        expect(messageErreur({ code: '23514', message: 'new row for relation "individus" violates check constraint' })).toBe('Une valeur est hors des limites permises.');
        expect(messageErreur(new TypeError('Failed to fetch'))).toMatch(/Pas de connexion/);
        expect(messageErreur({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/session a expiré/);
        expect(messageErreur({ message: 'duplicate key value' })).toMatch(/^Une erreur est survenue/); // anglais technique : jamais montré brut
        expect(messageErreur({ message: 'Proposition introuvable.' })).toBe('Proposition introuvable.'); // nos phrases passent telles quelles
        expect(messageErreur(null)).toBe('Erreur inconnue.');
        expect(motifErreur({ hint: 'OFFRE_LIMITE_INDIVIDUS' })).toBe('OFFRE_LIMITE_INDIVIDUS');
        expect(motifErreur({ hint: 'texte libre' })).toBeNull();
    });
});
