// RÈGLE DU 30/09/2026 (administrateur) : pour contribuer il faut être inscrit — Nom,
// Prénom, e-mail OU téléphone — ; aucune contribution anonyme ; une contribution
// envoyée est verrouillée et tracée. Ces essais prouvent que c'est la BASE qui
// tient la règle (l'écran peut être contourné), et que l'écran juge comme elle.
// Personnes et contacts INVENTÉS.
import { beforeAll, describe, expect, it } from 'vitest';
import { genreContact, inscriptionComplete } from '../../src/inscription/contact';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';

let db: Base;
let proprietaire: string;
let arbre: string;
let jeton: string;
let defunt: string;

const INSCRIT = { nom: 'Fictif', prenom: 'Ana' };
const CONTENU = { contributeur: { prenom: 'Ana', nom: 'Fictif' }, lien: { relation: 'inconnu' } };
type Rep = { ok: boolean; raison?: string; id?: string };
const envoyer = async (contenu: unknown, contact: string | null) =>
    (await une<{ r: Rep }>(db, `select soumettre_contribution($1, null, $2::jsonb, $3) as r`, [jeton, JSON.stringify(contenu), contact])).r;
const combien = async () => {
    await admin(db);
    return (await une<{ n: number }>(db, 'select count(*)::int as n from contributions')).n;
};

beforeAll(async () => {
    db = await nouvelleBase();
    proprietaire = await creerCompte(db, 'administrateur@exemple.re');
    await utilisateur(db, proprietaire);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Arbre Fictif') returning id`)).id;
    defunt = (await une<{ id: string }>(db, `insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Octave', 'Modèle', false) returning id`, [arbre])).id;
    jeton = (await une<{ r: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Partage fictif')) as r`, [arbre])).r.jeton;
    // 05/10 : une proposition n'entre que si son contact a une inscription ENREGISTRÉE pour l'arbre (sa règle stricte).
    await admin(db);
    for (const c of ['ana@exemple.re', '+262 692 00 00 00', 'autre@exemple.re', '0692000000'])
        await db.query(`insert into inscriptions_acces (arbre_id, nom, prenom, contact, charte) values ($1, 'Fictif', 'Ana', $2, 'v1')`, [arbre, c]);
});

describe('aucune contribution anonyme', () => {
    it('sans inscription complète : refusée, et RIEN n’est écrit', async () => {
        const refus = { ok: false, raison: 'inscription_requise' };
        const avant = await combien();
        await anonyme(db, '198.51.100.40');
        expect(await envoyer(CONTENU, 'ana@exemple.re'), 'pas d’inscrit').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, null), 'pas de contact').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, '   '), 'contact vide').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, 'tel 0692'), 'contact ni e-mail ni téléphone').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, 'ana@exemple'), 'e-mail sans extension').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, '1234567'), 'téléphone trop court').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: '', prenom: 'Ana' } }, 'ana@exemple.re'), 'nom vide').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: '   ', prenom: 'Ana' } }, 'ana@exemple.re'), 'nom d’espaces').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: 'Fictif', prenom: '' } }, 'ana@exemple.re'), 'prénom vide').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: 'Fictif' } }, 'ana@exemple.re'), 'prénom absent').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: 12, prenom: 'Ana' } }, 'ana@exemple.re'), 'nom qui n’est pas un texte').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: 'Ana Fictif' }, 'ana@exemple.re'), 'inscrit qui n’est pas un objet').toEqual(refus);
        expect(await envoyer({ ...CONTENU, inscrit: { nom: 'n'.repeat(81), prenom: 'Ana' } }, 'ana@exemple.re'), 'nom trop long').toEqual(refus);
        expect(await combien()).toBe(avant);
    });

    it('inscrit avec un e-mail, ou avec un téléphone : acceptée, et la trace est gardée', async () => {
        await anonyme(db, '198.51.100.41');
        const a = await envoyer({ ...CONTENU, inscrit: INSCRIT }, '  ana@exemple.re ');
        const b = await envoyer({ ...CONTENU, inscrit: { nom: 'Fictif', prenom: 'Léo' }, lien: { relation: 'enfant', individu_id: defunt } }, '+262 692 00 00 00');
        expect(a.ok && b.ok).toBe(true);
        await admin(db);
        const lignes = await toutes<{ inscrit: unknown; contact: string; origine: string; statut: string }>(db,
            `select contenu -> 'inscrit' as inscrit, contact, origine, statut from contributions where id = any($1::uuid[]) order by cree_le`, [[a.id, b.id]]);
        expect(lignes.map((l) => l.inscrit)).toEqual([INSCRIT, { nom: 'Fictif', prenom: 'Léo' }]);
        expect(lignes.map((l) => l.contact)).toEqual(['ana@exemple.re', '+262 692 00 00 00']);
        expect(lignes.every((l) => /^[0-9a-f]{64}$/.test(l.origine) && l.statut === 'en_attente')).toBe(true);
    });

    it('filet sur la table : même une écriture directe (hors de la fonction) sans inscription est refusée', async () => {
        await admin(db);
        await expect(db.query(`insert into contributions (arbre_id, contenu) values ($1, $2::jsonb)`, [arbre, JSON.stringify(CONTENU)]))
            .rejects.toThrow(/inscription est obligatoire/);
        await expect(db.query(`insert into contributions (arbre_id, contenu, contact) values ($1, $2::jsonb, 'pas un contact')`, [arbre, JSON.stringify({ ...CONTENU, inscrit: INSCRIT })]))
            .rejects.toThrow(/inscription est obligatoire/);
    });
});

describe('une contribution envoyée est verrouillée', () => {
    it('le public ne peut ni la modifier ni la retirer, ni toucher une fiche de l’arbre', async () => {
        await anonyme(db, '198.51.100.42');
        await expect(db.query(`update contributions set contact = 'autre@exemple.re'`)).rejects.toThrow(/permission denied/);
        await expect(db.query('delete from contributions')).rejects.toThrow(/permission denied/);
        await expect(db.query(`update individus set prenom = 'Faux' where id = $1`, [defunt])).rejects.toThrow(/permission denied/);
        await expect(db.query('delete from individus where id = $1', [defunt])).rejects.toThrow(/permission denied/);
        await expect(db.query(`insert into individus (arbre_id, prenom) values ($1, 'Intrus')`, [arbre])).rejects.toThrow(/permission denied/);
    });

    it('le contenu, le contact, l’origine et la date ne changent plus — pour personne', async () => {
        await utilisateur(db, proprietaire);
        // l'administrateur lui-même n'a pas le droit d'écrire ces colonnes…
        await expect(db.query(`update contributions set contenu = '{}'::jsonb`)).rejects.toThrow(/permission denied/);
        await expect(db.query(`update contributions set contact = 'autre@exemple.re'`)).rejects.toThrow(/permission denied/);
        // … et même un rôle qui a tous les droits est arrêté par le verrou de la table
        await admin(db);
        const c = await une<{ id: string }>(db, `select id from contributions where statut = 'en_attente' order by cree_le limit 1`);
        await expect(db.query(`update contributions set contenu = jsonb_set(contenu, '{contributeur,prenom}', '"Faux"') where id = $1`, [c.id])).rejects.toThrow(/verrouillée/);
        await expect(db.query(`update contributions set contact = 'autre@exemple.re' where id = $1`, [c.id])).rejects.toThrow(/verrouillée/);
        await expect(db.query(`update contributions set origine = 'x' where id = $1`, [c.id])).rejects.toThrow(/verrouillée/);
        await expect(db.query(`update contributions set cree_le = now() - interval '1 year' where id = $1`, [c.id])).rejects.toThrow(/verrouillée/);
        expect(await une(db, `select contenu -> 'contributeur' ->> 'prenom' as prenom, contact from contributions where id = $1`, [c.id])).toEqual({ prenom: 'Ana', contact: 'ana@exemple.re' });
    });

    it('la décision s’écrit une seule fois ; une contribution VALIDÉE ne se retire plus (trace), une refusée oui', async () => {
        await admin(db);
        const [a, b] = await toutes<{ id: string }>(db, `select id from contributions where statut = 'en_attente' order by cree_le`);
        await utilisateur(db, proprietaire);
        await db.query('select accepter_contribution($1)', [b.id]); // Léo, enfant d'Octave
        await db.query(`select refuser_contribution($1, 'essai')`, [a.id]);
        await expect(db.query(`update contributions set statut = 'en_attente' where id = $1`, [b.id])).rejects.toThrow(/déjà été traitée/);
        await expect(db.query(`update contributions set statut = 'acceptee' where id = $1`, [a.id])).rejects.toThrow(/déjà été traitée/);
        expect((await db.query('delete from contributions where id = $1', [b.id])).affectedRows, 'validée : reste').toBe(0);
        expect((await db.query('delete from contributions where id = $1', [a.id])).affectedRows, 'refusée : se retire').toBe(1);
        await admin(db);
        expect(await une(db, `select statut, contenu -> 'inscrit' ->> 'prenom' as inscrit, contact from contributions where id = $1`, [b.id]))
            .toEqual({ statut: 'acceptee', inscrit: 'Léo', contact: '+262 692 00 00 00' });
    });

    it('supprimer le partage ne casse rien : la contribution garde sa trace (le lien seul passe à vide)', async () => {
        await utilisateur(db, proprietaire);
        expect((await db.query('delete from invitations where jeton = $1', [jeton])).affectedRows).toBe(1);
        await admin(db);
        const l = await toutes<{ invitation_id: string | null; contact: string }>(db, 'select invitation_id, contact from contributions');
        expect(l).toEqual([{ invitation_id: null, contact: '+262 692 00 00 00' }]);
    });
});

describe('parité : l’écran (src/inscription/contact.ts) juge comme la base', () => {
    // générateur à graine fixe : un échec se rejoue à l'identique
    function hasard(graine: number) {
        let a = graine >>> 0;
        const suivant = () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return { entier: (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1)), vrai: (p: number) => suivant() < p };
    }
    const LETTRES = ['a', 'b', 'Z', 'q', '0', '1', '5', '9', '@', '@', '.', '.', ' ', ' ', '+', '-', '(', ')', '_', '%', 'é', 'Ç', '\t', '\n', '/', ',', '😀', '́'];
    const BONS = ['ana@exemple.re', 'leo.fictif+arbre@mail.exemple.fr', '0692 00 00 00', '+262 692 00 00 00', '06.92.00.00.00', '(0262) 00-00-00', '12345678', '+123456789012345'];

    it('contact : 4 000 saisies tirées au hasard, mêmes verdicts', async () => {
        const h = hasard(20260930);
        const saisies: string[] = [];
        for (let i = 0; i < 4000; i++) {
            let s: string;
            if (h.vrai(0.55)) {
                // un bon contact, abîmé 0 à 3 fois (retrait, ajout ou échange d'un caractère)
                const c = [...BONS[h.entier(0, BONS.length - 1)]];
                for (let k = h.entier(0, 3); k > 0; k--) {
                    const p = h.entier(0, c.length);
                    const geste = h.entier(0, 2);
                    if (geste === 0 && c.length) c.splice(Math.min(p, c.length - 1), 1);
                    else if (geste === 1) c.splice(p, 0, LETTRES[h.entier(0, LETTRES.length - 1)]);
                    else if (c.length) c[Math.min(p, c.length - 1)] = LETTRES[h.entier(0, LETTRES.length - 1)];
                }
                s = c.join('');
            } else {
                s = Array.from({ length: h.entier(0, 24) }, () => LETTRES[h.entier(0, LETTRES.length - 1)]).join('');
            }
            saisies.push(s);
        }
        saisies.push('x'.repeat(200) + '@a.re', '1'.repeat(15), '1'.repeat(16), ' '.repeat(190) + '0692000000', ' '.repeat(195) + '0692000000');
        await admin(db);
        const base = (await une<{ r: (string | null)[] }>(db, `select array_agg(public.genre_contact(s) order by n) as r from jsonb_array_elements_text($1::jsonb) with ordinality as t(s, n)`, [JSON.stringify(saisies)])).r;
        const compte = { email: 0, telephone: 0, rien: 0 };
        saisies.forEach((s, i) => {
            const ecran = genreContact(s);
            expect(ecran, `saisie ${i} : ${JSON.stringify(s)}`).toBe(base[i]);
            compte[ecran ?? 'rien']++;
        });
        // l'essai n'est probant que s'il a vu les trois verdicts, en nombre
        expect(compte.email).toBeGreaterThan(150);
        expect(compte.telephone).toBeGreaterThan(300);
        expect(compte.rien).toBeGreaterThan(1500);
    });

    it('inscription entière : 1 500 tirages, mêmes verdicts', async () => {
        const h = hasard(974);
        const NOMS: unknown[] = ['Fictif', ' Fictif ', '', '   ', 'é', '😀', 'n'.repeat(80), 'n'.repeat(81), ' ' + 'n'.repeat(80) + ' ', 12, null, true, ['Fictif'], { a: 1 }, 'á'];
        const CONTACTS: (string | null)[] = [...BONS, null, '', ' ', 'tel 0692', 'ana@exemple', '1234567'];
        const cas: { contenu: unknown; contact: string | null }[] = [];
        for (let i = 0; i < 1500; i++) {
            const nom = NOMS[h.entier(0, NOMS.length - 1)];
            const prenom = NOMS[h.entier(0, NOMS.length - 1)];
            const forme = h.entier(0, 9);
            const inscrit = forme === 0 ? undefined : forme === 1 ? 'texte' : forme === 2 ? [nom, prenom] : forme === 3 ? { nom } : { nom, prenom };
            cas.push({ contenu: inscrit === undefined ? { autre: 1 } : { inscrit }, contact: CONTACTS[h.entier(0, CONTACTS.length - 1)] });
        }
        await admin(db);
        const base = (await une<{ r: (string | null)[] }>(db,
            `select array_agg(public.defaut_inscription(e -> 'contenu', e ->> 'contact') order by n) as r from jsonb_array_elements($1::jsonb) with ordinality as t(e, n)`,
            [JSON.stringify(cas)])).r;
        let completes = 0;
        cas.forEach((c, i) => {
            const ecran = inscriptionComplete((c.contenu as { inscrit?: unknown }).inscrit, c.contact);
            expect(ecran, `cas ${i} : ${JSON.stringify(c)}`).toBe(base[i] === null);
            if (ecran) completes++;
        });
        // probant seulement s'il a vu les deux verdicts (≈ 7 % de tirages complets attendus)
        expect(completes).toBeGreaterThan(50);
        expect(1500 - completes).toBeGreaterThan(900);
    });
});

describe('sa règle stricte (05/10) : pas inscrit, rien ne s’ajoute', () => {
    beforeAll(async () => { // un partage neuf : celui du début a été supprimé par l'essai précédent
        await utilisateur(db, proprietaire);
        jeton = (await une<{ r: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Partage fictif 2')) as r`, [arbre])).r.jeton;
    });
    it('une inscription seulement écrite dans l’envoi, sans inscription enregistrée : refusée, rien d’écrit', async () => {
        const avant = await combien();
        await anonyme(db, '198.51.100.45');
        expect(await envoyer({ ...CONTENU, inscrit: INSCRIT }, 'jamais.inscrit@exemple.re')).toEqual({ ok: false, raison: 'inscription_requise' });
        expect(await combien()).toBe(avant);
    });
    it('le même envoi, contact inscrit (majuscules et espaces ignorés) : accepté', async () => {
        await anonyme(db, '198.51.100.46');
        expect((await envoyer({ ...CONTENU, inscrit: INSCRIT }, '  ANA@exemple.re ')).ok).toBe(true);
    });
});
