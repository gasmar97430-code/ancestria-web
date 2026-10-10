// L'ENVOI EN UN CLIC (10/10, ses mots : « quand j'envoie ça doit aller directement », « sans répétition »).
// Son cas : 417 « lignes refusées » à chaque envoi (liens déjà en ligne : le déclencheur se comptait
// lui-même), et un enfant changé de père au PC (Benoit : Clotaire → Louis Théodore) bloqué par l'ancien
// lien. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const p = (id: number, prenom: string, genre: string, naissance: string) =>
    ({ id, prenom, nom: 'Essaiclic', genre, date_naissance: ms(naissance), date_deces: ms('1990-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null });
const PC = {
    individus: [p(1, 'Essaimere', 'F', '1900-01-01'), p(2, 'Essaimari', 'M', '1898-01-01'), p(3, 'Essaipassage', 'M', '1897-01-01'), p(4, 'Essaifils', 'M', '1925-01-01'), p(5, 'Essaifille', 'F', '1927-01-01')],
    unions: [{ id: 10, partenaire_1_id: 1, partenaire_2_id: 2, type_union: 'Marriage', statut: 'Active', date_debut: null, date_fin: null }],
    parentes: [{ parent_id: 1, enfant_id: 4, type_lien: 'Biological' }, { parent_id: 2, enfant_id: 4, type_lien: 'Biological' },
        { parent_id: 1, enfant_id: 5, type_lien: 'Biological' }, { parent_id: 2, enfant_id: 5, type_lien: 'Biological' }],
};

let db: Base;
let proprio: string;
const envoyer = async (donnees: unknown) => {
    await utilisateur(db, proprio);
    return (await une<{ r: Record<string, unknown> }>(db, 'select envoi_pc($1::jsonb, true) as r', [JSON.stringify(donnees)])).r;
};

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    await utilisateur(db, proprio);
    await une(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio]);
});

describe('envoi en un clic', () => {
    it('premier envoi puis renvoi identique : AUCUN refus (avant : un refus par lien déjà en ligne)', async () => {
        expect(await envoyer(donneesSynchro(PC, 2026))).toMatchObject({ ok: true, ajoutees: 5, liens_ajoutes: 4, refus: [] });
        expect(await envoyer(donneesSynchro(PC, 2026))).toMatchObject({ ok: true, ajoutees: 0, modifiees: 0, liens_ajoutes: 0, refus: [], en_ligne: { personnes: 5, liens: 4 } });
    });

    it('le fils change de père au PC : l’ancien lien part, le nouveau entre, sans refus ; la fille ne bouge pas', async () => {
        const change = { ...PC, parentes: PC.parentes.map((l) => (l.enfant_id === 4 && l.parent_id === 2 ? { ...l, parent_id: 3 } : l)) };
        expect(await envoyer(donneesSynchro(change, 2026))).toMatchObject({ ok: true, liens_ajoutes: 1, refus: [], en_ligne: { liens: 4 } });
        await admin(db);
        const peres = await db.query<{ prenom: string }>(`select pa.prenom from filiations f join individus pa on pa.id = f.parent_id join individus e on e.id = f.enfant_id
            where e.notes = 'pc:4' order by pa.prenom`);
        expect(peres.rows.map((x) => x.prenom)).toEqual(['Essaimere', 'Essaipassage']);
        const fille = await db.query(`select 1 from filiations f join individus e on e.id = f.enfant_id where e.notes = 'pc:5'`);
        expect(fille.rows.length).toBe(2);
    });

    it('une fiche supprimée au PC est retirée du site au même clic ; ce qui a été saisi en ligne reste', async () => {
        await admin(db);
        const arbre = (await une<{ id: string }>(db, 'select id from arbres limit 1')).id;
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Saisieenligne', 'Essaiclic', false)`, [arbre]);
        const sans5 = { ...PC, individus: PC.individus.filter((x) => x.id !== 5), parentes: PC.parentes.filter((l) => l.enfant_id !== 5) };
        expect(await envoyer(donneesSynchro(sans5, 2026))).toMatchObject({ ok: true, a_retirer: [5], retirees: 1, refus: [], en_ligne: { personnes: 5 } });
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from individus where prenom = 'Saisieenligne'`)).n).toBe(1);
    });
});
