// LOI 6 (06/10/2026) : le journal d'audit. Une ligne par écriture d'un compte ou du serveur
// (qui, quoi, quelle fiche, avant, après, quand, pourquoi) ; on ne peut qu'y ajouter ; seul le
// propriétaire le lit ; aucune donnée personnelle de trop (contact, contenu, vivants).
// Personnes et contacts INVENTÉS.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';

let db: Base;
let proprietaire: string;
let autre: string;
let arbre: string;
let jeton: string;

type Ligne = { acteur: string; action: string; table_visee: string; fiche: string | null; qui: string | null;
    avant: Record<string, unknown> | null; apres: Record<string, unknown> | null; pourquoi: string | null };
const journal = async (table?: string) => {
    await admin(db);
    return toutes<Ligne>(db, `select * from journal_audit where ($1::text is null or table_visee = $1) order by id`, [table ?? null]);
};

beforeAll(async () => {
    db = await nouvelleBase();
    proprietaire = await creerCompte(db, 'administrateur@exemple.re');
    autre = await creerCompte(db, 'autre@exemple.re');
    await utilisateur(db, proprietaire);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Arbre Fictif') returning id`)).id;
    jeton = (await une<{ r: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Partage fictif')) as r`, [arbre])).r.jeton;
});

describe('chaque geste de l’administrateur est écrit', () => {
    it('ajout, modification, suppression d’une fiche : qui, quoi, avant, après', async () => {
        await utilisateur(db, proprietaire);
        const id = (await une<{ id: string }>(db, `insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Octave', 'MODÈLE', false) returning id`, [arbre])).id;
        await db.query(`update individus set prenom = 'Octavien' where id = $1`, [id]);
        await db.query(`update individus set prenom = 'Octavien' where id = $1`, [id]); // à l'identique : rien de plus
        await db.query(`delete from individus where id = $1`, [id]);
        const l = (await journal('individus')).filter((x) => x.fiche === id);
        expect(l.map((x) => x.action)).toEqual(['ajout', 'modification', 'suppression']);
        expect(l.every((x) => x.qui === proprietaire && x.acteur === 'proprietaire')).toBe(true);
        expect(l[0].avant).toBeNull();
        expect(l[0].apres?.prenom).toBe('Octave');
        expect([l[1].avant?.prenom, l[1].apres?.prenom]).toEqual(['Octave', 'Octavien']);
        expect(l[2].avant?.prenom).toBe('Octavien');
        expect(l[2].apres).toBeNull();
    });

    it('une personne VIVANTE n’y laisse ni nom, ni prénom, ni dates, ni lieux', async () => {
        await utilisateur(db, proprietaire);
        const id = (await une<{ id: string }>(db,
            `insert into individus (arbre_id, prenom, nom, vivant, naissance, lieu_naissance) values ($1, 'Lina', 'VIVANTE', true, '1990-05-04', 'Saint-Fictif') returning id`, [arbre])).id;
        const [l] = (await journal('individus')).filter((x) => x.fiche === id);
        const texte = JSON.stringify(l);
        for (const mot of ['Lina', 'VIVANTE', '1990', 'Saint-Fictif']) expect(texte, mot).not.toContain(mot);
        expect(l.apres?.protegee).toBe(true);
    });

    it('accepter / refuser une proposition : la décision et sa raison, jamais le contact ni le contenu', async () => {
        await admin(db);
        await db.query(`insert into inscriptions_acces (arbre_id, nom, prenom, contact, charte) values ($1, 'Fictif', 'Ana', 'ana@exemple.re', 'v1')`, [arbre]);
        await anonyme(db, '198.51.100.7');
        const contenu = { contributeur: { prenom: 'Ana', nom: 'Fictif' }, inscrit: { nom: 'Fictif', prenom: 'Ana' }, lien: { relation: 'inconnu' } };
        const env = async () => (await une<{ r: { id: string } }>(db, `select soumettre_contribution($1, null, $2::jsonb, 'ana@exemple.re') as r`, [jeton, JSON.stringify(contenu)])).r.id;
        const c1 = await env();
        const c2 = await env();
        expect((await journal('contributions')).length, 'le dépôt du visiteur n’y est pas').toBe(0);
        await utilisateur(db, proprietaire);
        await db.query(`select refuser_contribution($1, 'Doublon fictif')`, [c1]);
        await db.query(`select set_config('ancestria.pourquoi', 'Essai de la raison donnée', false)`);
        await db.query(`select refuser_contribution($1, null)`, [c2]);
        await db.query(`select set_config('ancestria.pourquoi', '', false)`);
        const l = await journal('contributions');
        expect(l.map((x) => [x.action, x.apres?.statut, x.pourquoi])).toEqual([
            ['modification', 'refusee', 'Proposition refusée'],
            ['modification', 'refusee', 'Essai de la raison donnée'],
        ]);
        expect(l[0].apres?.motif).toBe('Doublon fictif');
        const texte = JSON.stringify(l);
        for (const mot of ['ana@exemple.re', 'contributeur', 'Ana']) expect(texte, mot).not.toContain(mot);
    });

    it('un jeton de partage ne s’y lit jamais', async () => {
        const l = await journal('invitations');
        expect(l.length).toBeGreaterThan(0);
        expect(JSON.stringify(l)).not.toContain(jeton);
    });

    it('le serveur (l’IA, plus tard) est nommé comme tel', async () => {
        await admin(db);
        await db.exec(`set role service_role; select set_config('ancestria.acteur', 'ia', false); select set_config('ancestria.pourquoi', 'Essai IA', false)`);
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Félix', 'PROPOSÉ', false)`, [arbre]);
        await db.exec(`select set_config('ancestria.acteur', '', false); select set_config('ancestria.pourquoi', '', false)`);
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Félicie', 'SERVEUR', false)`, [arbre]);
        const l = (await journal('individus')).slice(-2);
        expect(l.map((x) => [x.acteur, x.pourquoi, x.qui])).toEqual([['ia', 'Essai IA', null], ['serveur', null, null]]);
    });
});

describe('le journal ne se modifie pas et ne s’efface pas', () => {
    for (const [qui, sql] of [
        ['le propriétaire', 'update journal_audit set pourquoi = $1'],
        ['le propriétaire', 'delete from journal_audit where pourquoi is distinct from $1'],
        ['le propriétaire', 'insert into journal_audit (acteur, action, table_visee, pourquoi) values (\'faux\', \'ajout\', \'individus\', $1)'],
    ] as const) {
        it(`${qui} : ${sql.split(' ')[0]} refusé`, async () => {
            await utilisateur(db, proprietaire);
            await expect(db.query(sql, ['x'])).rejects.toThrow();
        });
    }
    for (const sql of ['update journal_audit set pourquoi = \'x\'', 'delete from journal_audit', 'truncate journal_audit']) {
        it(`même le propriétaire de la base : ${sql.split(' ')[0]} refusé`, async () => {
            await admin(db);
            const avant = (await journal()).length;
            await expect(db.exec(sql)).rejects.toThrow(/ne se modifie pas/);
            expect((await journal()).length).toBe(avant);
        });
    }
});

describe('lecture : le propriétaire seulement', () => {
    it('propriétaire : tout son arbre ; autre compte : rien ; visiteur : rien', async () => {
        const total = (await journal()).filter((x) => x.table_visee !== 'arbres' || true).length;
        await utilisateur(db, proprietaire);
        const n = (await une<{ n: number }>(db, 'select count(*)::int as n from journal_audit')).n;
        expect(n).toBe(total);
        await utilisateur(db, autre);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from journal_audit')).n).toBe(0);
        await anonyme(db);
        await expect(db.query('select count(*) from journal_audit')).rejects.toThrow();
    });

    it('effacer l’arbre n’efface pas sa trace', async () => {
        await utilisateur(db, proprietaire);
        const a2 = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Arbre éphémère') returning id`)).id;
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Jules', 'PASSAGER', false)`, [a2]);
        await db.query(`delete from arbres where id = $1`, [a2]);
        await admin(db);
        const l = await toutes<Ligne>(db, `select * from journal_audit where arbre_id = $1 order by id`, [a2]);
        expect(l.filter((x) => x.action === 'suppression').map((x) => x.table_visee).sort()).toEqual(['arbres', 'individus', 'membres']);
    });
});
