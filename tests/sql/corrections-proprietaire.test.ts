// Ses corrections faites SUR LE SITE (01/10, sa demande : « sur le site j'aurai le droit de corriger si besoin »)
// sont mises de côté pour le PC (le maître) : l'appli les rapatrie, puis les marque. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const PC = {
    individus: [
        { id: 1, prenom: 'Essaijean', nom: 'Essaiville', genre: 'M', date_naissance: ms('1850-01-01'), date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 2, prenom: 'Essaimarie', nom: 'Essaiville', genre: 'F', date_naissance: ms('1855-01-01'), date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null },
    ],
    unions: [], parentes: [],
};
type Correction = { id: string; pc: number; champs: Record<string, unknown> };

let db: Base;
let proprio: string;
let arbre: string;
let jean: string;

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    await utilisateur(db, proprio);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio])).id;
    await une(db, 'select envoi_pc($1::jsonb, false) as r', [JSON.stringify(donneesSynchro(PC, 2026))]);
    jean = (await une<{ id: string }>(db, `select id from individus where notes = 'pc:1'`)).id;
});

describe('corrections du propriétaire faites sur le site', () => {
    it('l’envoi du PC lui-même ne crée aucune correction', async () => {
        await utilisateur(db, proprio);
        expect((await une<{ r: unknown }>(db, 'select corrections_a_rapatrier() as r')).r).toEqual([]);
    });

    it('sa correction en ligne d’une fiche venue du PC est mise de côté, avec les seuls champs changés', async () => {
        await utilisateur(db, proprio);
        await db.query(`update individus set deces = '1921-05-02', deces_precision = 'jour', lieu_deces = 'Essaiport' where id = $1`, [jean]);
        await admin(db);
        const c = await toutes<Correction>(db, 'select pc, champs from corrections_proprietaire order by cree_le');
        expect(c).toEqual([{ pc: 1, champs: { deces: '1921-05-02', lieu_deces: 'Essaiport' } }]);
    });

    it('l’appli la lit (corrections_a_rapatrier), la marque rapatriée ; elle ne revient plus', async () => {
        await utilisateur(db, proprio);
        const a = (await une<{ r: Correction[] }>(db, 'select corrections_a_rapatrier() as r')).r;
        expect(a.map((x) => [x.pc, x.champs])).toEqual([[1, { deces: '1921-05-02', lieu_deces: 'Essaiport' }]]);
        expect((await une<{ n: number }>(db, 'select marquer_rapatriees($1::uuid[]) as n', [a.map((x) => x.id)])).n).toBe(1);
        expect((await une<{ r: Correction[] }>(db, 'select corrections_a_rapatrier() as r')).r).toEqual([]);
    });

    it('une fiche saisie en ligne (sans repère pc:) ne fait pas de correction', async () => {
        await utilisateur(db, proprio);
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Saisieenligne', 'Essaiville', false)`, [arbre]);
        await db.query(`update individus set prenom = 'Saisieenligne2' where prenom = 'Saisieenligne'`);
        expect((await une<{ r: Correction[] }>(db, 'select corrections_a_rapatrier() as r')).r).toEqual([]);
    });

    it('personne d’autre ne lit ni ne marque ses corrections', async () => {
        await anonyme(db);
        await expect(db.query('select corrections_a_rapatrier()')).rejects.toThrow();
        await expect(db.query('select * from corrections_proprietaire')).rejects.toThrow();
        const autre = await creerCompte(db, 'autre@exemple.re');
        await utilisateur(db, autre);
        expect((await une<{ r: unknown }>(db, 'select corrections_a_rapatrier() as r')).r).toEqual([]);
        await admin(db);
    });
});
