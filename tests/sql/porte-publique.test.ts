// La porte publique du site (01/10) : le lien permanent « Porte du site » de l'arbre qui a le plus de fiches.
// Familles INVENTÉES.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';

let db: Base;
let petit: string;
let grand: string;
let proprio: string;

beforeAll(async () => {
    db = await nouvelleBase();
    await anonyme(db);
});

const jeton = async () => (await une<{ j: string | null }>(db, 'select jeton_porte_publique() as j')).j;

describe('porte publique du site', () => {
    it('sans aucun arbre : rien', async () => {
        await anonyme(db);
        expect(await jeton()).toBeNull();
    });

    it('le lien est celui de l’arbre qui a le plus de fiches, créé une seule fois, pour 365 jours', async () => {
        proprio = await creerCompte(db, 'proprio@exemple.re');
        await utilisateur(db, proprio);
        petit = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai petit', $1) returning id`, [proprio])).id;
        grand = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai grand', $1) returning id`, [proprio])).id;
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Essaiun', 'Essaiville', false)`, [petit]);
        for (const p of ['Essaia', 'Essaib', 'Essaic']) await db.query(`insert into individus (arbre_id, prenom, nom, vivant, deces) values ($1, $2, 'Essaiville', false, '1950-01-01')`, [grand, p]);
        await anonyme(db);
        const j1 = await jeton();
        const j2 = await jeton();
        expect(j1).toMatch(/^[0-9a-f]{32}$/);
        expect(j2).toBe(j1);
        await admin(db);
        const inv = await une<{ arbre_id: string; n: number; infini: boolean }>(db,
            `select arbre_id, (select count(*)::int from invitations where libelle = 'Porte du site') as n, expire_le > now() + interval '364 days' and expire_le <= now() + interval '365 days' as infini from invitations where jeton = $1`, [j1]);
        expect(inv).toEqual({ arbre_id: grand, n: 1, infini: true });
    });

    it('un visiteur lit l’arbre public par ce lien (décédés)', async () => {
        await anonyme(db);
        const r = (await une<{ r: { ok: boolean; individus?: unknown[] } }>(db, 'select arbre_public($1) as r', [await jeton()])).r;
        expect(r.ok).toBe(true);
    });

    it('lien fermé par lui : la porte en rouvre un neuf', async () => {
        await anonyme(db);
        const j1 = await jeton();
        await admin(db);
        await db.query(`update invitations set ferme = true where jeton = $1`, [j1]);
        await anonyme(db);
        const j2 = await jeton();
        expect(j2).toMatch(/^[0-9a-f]{32}$/);
        expect(j2).not.toBe(j1);
    });
});

describe('inscription à la porte (loi 2)', () => {
    const inscrire = async (nom: string, prenom: string, contact: string, charte: string | null = 'v1') =>
        (await une<{ r: { ok: boolean; raison?: string } }>(db, 'select inscrire_visiteur($1, $2, $3, $4, $5) as r', [await jeton(), nom, prenom, contact, charte])).r;

    it('inscription complète : gardée, sur l’arbre de la porte', async () => {
        await anonyme(db, '192.0.2.50');
        expect(await inscrire('Essainom', 'Essaiprenom', 'essai@exemple.re')).toMatchObject({ ok: true });
        await admin(db);
        const l = await une<{ n: number; arbre_id: string }>(db, `select count(*)::int as n, min(arbre_id::text) as arbre_id from inscriptions_acces`);
        expect(l).toEqual({ n: 1, arbre_id: grand });
    });

    it('incomplète : refusée (nom, prénom, contact, Charte)', async () => {
        await anonyme(db, '192.0.2.51');
        expect((await inscrire('', 'Essai', 'essai@exemple.re')).raison).toBe('inscription_requise');
        expect((await inscrire('Essai', ' ', 'essai@exemple.re')).raison).toBe('inscription_requise');
        expect((await inscrire('Essai', 'Essai', 'pas-un-contact')).raison).toBe('inscription_requise');
        expect((await inscrire('Essai', 'Essai', 'essai@exemple.re', null)).raison).toBe('inscription_requise');
    });

    it('lien inventé : refusé', async () => {
        await anonyme(db);
        const r = (await une<{ r: { ok: boolean; raison?: string } }>(db, 'select inscrire_visiteur($1, $2, $3, $4, $5) as r', ['0'.repeat(32), 'Essai', 'Essai', 'essai@exemple.re', 'v1'])).r;
        expect(r.ok).toBe(false);
    });

    it('un visiteur ne lit pas les inscrits ; lui (propriétaire) les lit', async () => {
        await anonyme(db);
        await expect(db.query('select * from inscriptions_acces')).rejects.toThrow();
        await utilisateur(db, proprio);
        expect((await db.query('select nom from inscriptions_acces')).rows.length).toBeGreaterThan(0);
    });

    it('plus de 10 inscriptions en une heure depuis la même adresse : refusé', async () => {
        await anonyme(db, '192.0.2.99');
        for (let i = 0; i < 10; i++) expect((await inscrire('Essai', `Essai${i}`, `e${i}@exemple.re`)).ok).toBe(true);
        expect((await inscrire('Essai', 'Essai11', 'e11@exemple.re')).raison).toBe('trop_d_envois');
    });
});
