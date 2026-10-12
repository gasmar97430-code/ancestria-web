// DÉSINSCRIPTION AVEC MOT DE PASSE (12/10/2026 : « un désabonnement … on efface rien … mot de passe »).
// Personnes et contacts INVENTÉS. Preuves : mot de passe chiffré et posé une seule fois ; désinscription seulement avec
// nom + prénom + contact + mot de passe exacts ; l'arbre et les propositions envoyées ne bougent pas.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';

let db: Base;
let arbre: string;
let idAna: string;
type Rep = { ok: boolean; raison?: string; inscriptions_effacees?: number };
const appel = async (sql: string, p: unknown[]) => { await anonyme(db, '198.51.100.77'); return (await une<{ r: Rep }>(db, sql, p)).r; };
const desinscrire = (nom: string, prenom: string, contact: string, mot: string | null) => appel('select desinscrire($1, $2, $3, $4) as r', [nom, prenom, contact, mot]);
const poser = (id: string, contact: string, mot: string) => appel('select poser_mot_de_passe($1, $2, $3) as r', [id, contact, mot]);
const compte = async (sql: string, p: unknown[] = []) => { await admin(db); return (await une<{ n: number }>(db, sql, p)).n; };

beforeAll(async () => {
    db = await nouvelleBase();
    const proprio = await creerCompte(db, 'proprio@exemple.re');
    await utilisateur(db, proprio);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Arbre Fictif') returning id`)).id;
    await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Octave', 'Modèle', false)`, [arbre]);
    await admin(db);
    idAna = (await une<{ id: string }>(db, `insert into inscriptions_acces (arbre_id, nom, prenom, contact, charte) values ($1, 'Fictif', 'Ana', 'ana@exemple.re', 'v1') returning id`, [arbre])).id;
    await db.query(`insert into inscriptions_acces (arbre_id, nom, prenom, contact, charte) values ($1, 'Ancien', 'Léo', 'leo@exemple.re', 'v1')`, [arbre]);
    await db.query(`insert into contributions (arbre_id, contenu, contact) values ($1, '{"inscrit":{"nom":"Fictif","prenom":"Ana"},"famille":"MODELE"}'::jsonb, 'ana@exemple.re')`, [arbre]);
});

describe('mot de passe et désinscription', () => {
    it('mot de passe : trop court refusé ; posé chiffré ; une seule fois ; pas avec un autre contact', async () => {
        expect(await poser(idAna, 'ana@exemple.re', '123')).toEqual({ ok: false, raison: 'mot_de_passe_invalide' });
        expect(await poser(idAna, 'autre@exemple.re', 'Soleil974')).toEqual({ ok: false, raison: 'inconnu' });
        expect(await poser(idAna, 'ana@exemple.re', 'Soleil974')).toEqual({ ok: true });
        expect(await poser(idAna, 'ana@exemple.re', 'Autre974')).toEqual({ ok: false, raison: 'inconnu' });
        await admin(db);
        const m = await une<{ m: string }>(db, 'select mot_de_passe as m from inscriptions_acces where id = $1', [idAna]);
        expect(m.m).not.toContain('Soleil974');
        expect(m.m.startsWith('$2')).toBe(true);
    });
    it('identité fausse ou incomplète : refusée, rien effacé (le mot de passe n’est PAS demandé : sa précision)', async () => {
        expect(await desinscrire('Fictif', 'Ana', 'pas-moi@exemple.re', null)).toEqual({ ok: false, raison: 'inconnu' });
        expect(await desinscrire('Autre', 'Ana', 'ana@exemple.re', null)).toEqual({ ok: false, raison: 'inconnu' });
        expect(await desinscrire('', 'Ana', 'ana@exemple.re', null)).toEqual({ ok: false, raison: 'identite_incomplete' });
        expect(await compte('select count(*)::int as n from inscriptions_acces')).toBe(2);
    });
    it('la bonne personne (sans mot de passe) : son inscription part ; l’arbre et ses propositions restent', async () => {
        const arbreAvant = await compte('select count(*)::int as n from individus');
        expect(await desinscrire(' fictif ', 'ANA', ' ana@exemple.re ', null)).toEqual({ ok: true, inscriptions_effacees: 1 });
        expect(await compte(`select count(*)::int as n from inscriptions_acces where contact = 'ana@exemple.re'`)).toBe(0);
        expect(await compte('select count(*)::int as n from individus')).toBe(arbreAvant);
        expect(await compte(`select count(*)::int as n from contributions where contact = 'ana@exemple.re'`)).toBe(1);
    });
    it('inscription d’avant le 12/10 (sans mot de passe) : nom + prénom + contact suffisent', async () => {
        expect(await desinscrire('Ancien', 'Léo', 'leo@exemple.re', null)).toEqual({ ok: true, inscriptions_effacees: 1 });
    });
});
