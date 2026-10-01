// La porte publique du site (01/10) : le lien permanent « Porte du site » de l'arbre qui a le plus de fiches.
// Refait le 01/10 (audit, point 2) : le lien ne sort QUE d'une inscription valide (inscrire_visiteur) ;
// un anonyme ne peut plus le demander seul, ni faire créer une invitation sans s'inscrire.
// Familles INVENTÉES.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';

type Reponse = { ok: boolean; raison?: string; jeton?: string };

let db: Base;
let petit: string;
let grand: string;
let proprio: string;

beforeAll(async () => {
    db = await nouvelleBase();
    await anonyme(db);
});

const inscrire = async (jeton: string | null, nom: string, prenom: string, contact: string, charte: string | null = 'v1') =>
    (await une<{ r: Reponse }>(db, 'select inscrire_visiteur($1, $2, $3, $4, $5) as r', [jeton, nom, prenom, contact, charte])).r;

const portes = async () => {
    await admin(db);
    return (await une<{ n: number }>(db, `select count(*)::int as n from invitations where libelle = 'Porte du site'`)).n;
};

describe('le lien de la porte ne sort que d’une inscription', () => {
    it('un anonyme ne peut pas demander le lien seul (ni l’ancienne fonction, ni la nouvelle)', async () => {
        await admin(db);
        const r = await db.query<{ proname: string }>(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('jeton_porte_publique', 'porte_du_site') and has_function_privilege('anon', p.oid, 'execute')`);
        expect(r.rows).toEqual([]);
    });

    it('sans aucun arbre : rien', async () => {
        await anonyme(db, '192.0.2.40');
        expect((await inscrire(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re')).raison).toBe('aucun_arbre');
    });

    it('inscription incomplète sans lien : refusée, et aucune invitation créée', async () => {
        proprio = await creerCompte(db, 'proprio@exemple.re');
        await utilisateur(db, proprio);
        petit = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai petit', $1) returning id`, [proprio])).id;
        grand = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai grand', $1) returning id`, [proprio])).id;
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Essaiun', 'Essaiville', false)`, [petit]);
        for (const p of ['Essaia', 'Essaib', 'Essaic']) await db.query(`insert into individus (arbre_id, prenom, nom, vivant, deces) values ($1, $2, 'Essaiville', false, '1950-01-01')`, [grand, p]);
        await anonyme(db, '192.0.2.41');
        const r = await inscrire(null, '', 'Essai', 'essai@exemple.re');
        expect(r).toEqual({ ok: false, raison: 'inscription_requise' });
        expect(await portes()).toBe(0);
    });

    it('inscription complète sans lien : le lien de l’arbre qui a le plus de fiches, créé une seule fois, pour 365 jours', async () => {
        await anonyme(db, '192.0.2.42');
        const r1 = await inscrire(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re');
        const r2 = await inscrire(null, 'Essainom', 'Essaiautre', 'autre@exemple.re');
        expect(r1.ok).toBe(true);
        expect(r1.jeton).toMatch(/^[0-9a-f]{32}$/);
        expect(r2.jeton).toBe(r1.jeton);
        await admin(db);
        const inv = await une<{ arbre_id: string; n: number; infini: boolean }>(db,
            `select arbre_id, (select count(*)::int from invitations where libelle = 'Porte du site') as n, expire_le > now() + interval '364 days' and expire_le <= now() + interval '365 days' as infini from invitations where jeton = $1`, [r1.jeton]);
        expect(inv).toEqual({ arbre_id: grand, n: 1, infini: true });
        const l = await une<{ n: number; arbre_id: string }>(db, `select count(*)::int as n, min(arbre_id::text) as arbre_id from inscriptions_acces`);
        expect(l).toEqual({ n: 2, arbre_id: grand });
    });

    it('l’inscrit lit l’arbre public par le lien reçu (décédés)', async () => {
        await anonyme(db, '192.0.2.43');
        const { jeton } = await inscrire(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re');
        const r = (await une<{ r: { ok: boolean; individus?: unknown[] } }>(db, 'select arbre_public($1) as r', [jeton])).r;
        expect(r.ok).toBe(true);
        expect(r.individus?.length).toBe(3);
    });

    it('lien fermé par lui : une incomplète n’en ouvre pas, la suivante complète en ouvre un neuf', async () => {
        await anonyme(db, '192.0.2.44');
        const { jeton: j1 } = await inscrire(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re');
        await admin(db);
        await db.query(`update invitations set ferme = true where jeton = $1`, [j1]);
        await anonyme(db, '192.0.2.44');
        expect((await inscrire(null, 'Essai', 'Essai', 'pas-un-contact')).raison).toBe('inscription_requise');
        expect(await portes()).toBe(1);
        await anonyme(db, '192.0.2.44');
        const { jeton: j2 } = await inscrire(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re');
        expect(j2).toMatch(/^[0-9a-f]{32}$/);
        expect(j2).not.toBe(j1);
    });
});

describe('inscription par un lien partagé reçu (loi 2)', () => {
    let partage: string;

    it('inscription complète : gardée, sur l’arbre du lien, le même lien rendu', async () => {
        await utilisateur(db, proprio);
        partage = (await une<{ i: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Essai partage')) as i`, [petit])).i.jeton;
        await anonyme(db, '192.0.2.50');
        expect(await inscrire(partage, 'Essainom', 'Essaiprenom', 'essai@exemple.re')).toEqual({ ok: true, id: expect.any(String), jeton: partage });
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from inscriptions_acces where arbre_id = $1`, [petit])).n).toBe(1);
    });

    it('incomplète : refusée (nom, prénom, contact, Charte)', async () => {
        await anonyme(db, '192.0.2.51');
        expect((await inscrire(partage, '', 'Essai', 'essai@exemple.re')).raison).toBe('inscription_requise');
        expect((await inscrire(partage, 'Essai', ' ', 'essai@exemple.re')).raison).toBe('inscription_requise');
        expect((await inscrire(partage, 'Essai', 'Essai', 'pas-un-contact')).raison).toBe('inscription_requise');
        expect((await inscrire(partage, 'Essai', 'Essai', 'essai@exemple.re', null)).raison).toBe('inscription_requise');
    });

    it('lien inventé : refusé', async () => {
        await anonyme(db, '192.0.2.52');
        expect((await inscrire('0'.repeat(32), 'Essai', 'Essai', 'essai@exemple.re')).ok).toBe(false);
    });

    it('un visiteur ne lit pas les inscrits ; lui (propriétaire) les lit', async () => {
        await anonyme(db);
        await expect(db.query('select * from inscriptions_acces')).rejects.toThrow();
        await utilisateur(db, proprio);
        expect((await db.query('select nom from inscriptions_acces')).rows.length).toBeGreaterThan(0);
    });

    it('plus de 10 inscriptions en une heure depuis la même adresse : refusé', async () => {
        await anonyme(db, '192.0.2.99');
        for (let i = 0; i < 10; i++) expect((await inscrire(null, 'Essai', `Essai${i}`, `e${i}@exemple.re`)).ok).toBe(true);
        expect((await inscrire(null, 'Essai', 'Essai11', 'e11@exemple.re')).raison).toBe('trop_d_envois');
    });
});
