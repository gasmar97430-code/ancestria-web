// RÈGLE DU 12/10/2026 (lui) : « je n'ai pas besoin de vérifier ça devrait être direct sans chichi ».
// ajouter_noms_direct = soumettre_contribution (tous ses contrôles) + pose aussitôt dans l'arbre. Ces essais prouvent :
// un inscrit pose directement ; un non-inscrit ne pose rien ; un ajout que la base refuse reste en attente (rien perdu) ;
// le visiteur ne garde aucun droit d'administrateur après l'appel ; les vivants restent protégés à la lecture.
// Personnes et contacts INVENTÉS.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';

let db: Base;
let proprietaire: string;
let arbre: string;
let jeton: string;
let defunt: string;

type Rep = { ok: boolean; raison?: string; id?: string; posee?: boolean; individus_crees?: number; a_verifier?: string };
const ajouter = async (contenu: unknown, contact: string | null, uid: string | null = null) =>
    (await une<{ r: Rep }>(db, `select ajouter_noms_direct($1, null, $2::jsonb, $3, $4) as r`, [jeton, JSON.stringify(contenu), contact, uid])).r;

beforeAll(async () => {
    db = await nouvelleBase();
    proprietaire = await creerCompte(db, 'administrateur@exemple.re');
    await utilisateur(db, proprietaire);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Arbre Fictif') returning id`)).id;
    defunt = (await une<{ id: string }>(db, `insert into individus (arbre_id, prenom, nom, vivant, naissance, deces) values ($1, 'Octave', 'Modèle', false, '1850-01-01', '1900-01-01') returning id`, [arbre])).id;
    jeton = (await une<{ r: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Partage fictif')) as r`, [arbre])).r.jeton;
    await admin(db);
    await db.query(`insert into inscriptions_acces (arbre_id, nom, prenom, contact, charte) values ($1, 'Fictif', 'Ana', 'ana@exemple.re', 'v1')`, [arbre]);
});

describe('noms ajoutés : directement dans l’arbre', () => {
    it('un inscrit ajoute un enfant d’Octave : posé tout de suite, proposition acceptée', async () => {
        await anonyme(db, '198.51.100.70');
        const r = await ajouter({ contributeur: { prenom: 'Léo', nom: 'Fictif' }, inscrit: { nom: 'Fictif', prenom: 'Ana' }, lien: { relation: 'enfant', individu_id: defunt } }, 'ana@exemple.re');
        expect(r.ok).toBe(true);
        expect(r.posee).toBe(true);
        expect(r.individus_crees).toBe(1);
        await admin(db);
        expect(await une(db, `select statut from contributions where id = $1`, [r.id])).toEqual({ statut: 'acceptee' });
        expect(await une(db, `select count(*)::int as n from filiations f join individus e on e.id = f.enfant_id where f.parent_id = $1 and e.prenom = 'Léo'`, [defunt])).toEqual({ n: 1 });
    });

    it('après l’appel, le visiteur n’a gardé AUCUN droit (il reste anonyme)', async () => {
        await anonyme(db, '198.51.100.71');
        await ajouter({ contributeur: { prenom: 'Zoé', nom: 'Fictif' }, inscrit: { nom: 'Fictif', prenom: 'Ana' }, lien: { relation: 'inconnu' } }, 'ana@exemple.re');
        expect(await une(db, `select auth.uid() as u`)).toEqual({ u: null });
        await expect(db.query(`insert into individus (arbre_id, prenom) values ($1, 'Intrus')`, [arbre])).rejects.toThrow(/permission denied/);
        await expect(db.query(`select accepter_contribution(gen_random_uuid())`)).rejects.toThrow(/permission denied/);
    });

    it('sans inscription enregistrée : refusé, rien n’est posé', async () => {
        await admin(db);
        const avant = (await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n;
        await anonyme(db, '198.51.100.72');
        const r = await ajouter({ contributeur: { prenom: 'Max', nom: 'Fictif' }, inscrit: { nom: 'Fictif', prenom: 'Max' }, lien: { relation: 'inconnu' } }, 'inconnu@exemple.re');
        expect(r).toEqual({ ok: false, raison: 'inscription_requise' });
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n).toBe(avant);
    });

    it('un ajout que la base refuse (dates impossibles) reste dans les propositions : rien n’est perdu', async () => {
        await anonyme(db, '198.51.100.73');
        const r = await ajouter({ contributeur: { prenom: 'Tardif', nom: 'Fictif', naissance_annee: 1950 }, inscrit: { nom: 'Fictif', prenom: 'Ana' }, lien: { relation: 'enfant', individu_id: defunt } }, 'ana@exemple.re');
        expect(r.ok).toBe(true);
        expect(r.posee).toBe(false);
        expect(r.a_verifier).toBeTruthy();
        await admin(db);
        expect(await une(db, `select statut from contributions where id = $1`, [r.id])).toEqual({ statut: 'en_attente' });
        expect(await une(db, `select count(*)::int as n from individus where prenom = 'Tardif'`)).toEqual({ n: 0 });
    });

    it('le même envoi reçu deux fois n’est posé qu’une fois', async () => {
        await anonyme(db, '198.51.100.74');
        const contenu = { contributeur: { prenom: 'Unique', nom: 'Fictif' }, inscrit: { nom: 'Fictif', prenom: 'Ana' }, lien: { relation: 'inconnu' } };
        const uid = '0b0b0b0b-1111-2222-3333-444444444444';
        const a = await ajouter(contenu, 'ana@exemple.re', uid);
        const b = await ajouter(contenu, 'ana@exemple.re', uid);
        expect(a.posee && b.posee).toBe(true);
        await admin(db);
        expect(await une(db, `select count(*)::int as n from individus where prenom = 'Unique'`)).toEqual({ n: 1 });
    });
});
