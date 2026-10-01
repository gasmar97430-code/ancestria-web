// L'ENVOI DU PC (01/10, sa demande : « juste appuyer sur un bouton d'envoi vers le site ») : l'appli,
// connectée avec SON compte, envoie ses données par envoi_pc. Réservé au propriétaire ; rien n'est retiré
// en ligne sans son accord ; compte rendu chiffré ; vivants en cases protégées. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const PC = {
    individus: [
        { id: 1, prenom: 'Essaijean', nom: 'Essaiville', genre: 'M', date_naissance: ms('1850-01-01'), date_deces: ms('1920-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 2, prenom: 'Essaimarie', nom: 'Essaiville', genre: 'F', date_naissance: ms('1855-01-01'), date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 3, prenom: 'Essaipaul', nom: 'Essaiville', genre: 'M', date_naissance: ms('1880-01-01'), date_deces: ms('1950-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 4, prenom: 'Essaivivante', nom: 'Essaiville', genre: 'F', date_naissance: ms('1990-01-01'), date_deces: null, decede: 0, lieu_naissance: 'Essaiport', lieu_deces: null },
    ],
    unions: [{ id: 10, partenaire_1_id: 1, partenaire_2_id: 2, type_union: 'Marriage', statut: 'Active', date_debut: null, date_fin: null }],
    parentes: [{ parent_id: 1, enfant_id: 3, type_lien: 'Biological' }, { parent_id: 2, enfant_id: 3, type_lien: 'Biological' }, { parent_id: 3, enfant_id: 4, type_lien: 'Biological' }],
};

let db: Base;
let proprio: string;
let autre: string;
const envoyer = async (qui: string, donnees: unknown, retirer = false) => {
    await utilisateur(db, qui);
    return (await une<{ r: Record<string, unknown> }>(db, 'select envoi_pc($1::jsonb, $2) as r', [JSON.stringify(donnees), retirer])).r;
};

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    autre = await creerCompte(db, 'autre@exemple.re');
    await utilisateur(db, proprio);
    await une(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio]);
});

describe('envoi du PC par le bouton de l’appli', () => {
    it('réservé au propriétaire : un anonyme ou un autre compte est refusé, rien n’est écrit', async () => {
        await anonyme(db);
        await expect(db.query('select envoi_pc($1::jsonb, false)', [JSON.stringify(donneesSynchro(PC, 2026))])).rejects.toThrow();
        expect(await envoyer(autre, donneesSynchro(PC, 2026))).toEqual({ ok: false, raison: 'pas_proprietaire' });
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n).toBe(0);
    });

    it('premier envoi : tout est ajouté, la vivante en case protégée, comptes en ligne = comptes envoyés', async () => {
        const r = await envoyer(proprio, donneesSynchro(PC, 2026));
        expect(r).toMatchObject({ ok: true, ajoutees: 4, modifiees: 0, couples_ajoutes: 1, liens_ajoutes: 3, a_retirer: [], retirees: 0, refus: [],
            en_ligne: { personnes: 4, couples: 1, liens: 3 } });
        await admin(db);
        expect(await une(db, `select prenom, nom, naissance, lieu_naissance, vivant from individus where notes = 'pc:4'`)).toEqual({ prenom: 'Fiche protégée', nom: '', naissance: null, lieu_naissance: null, vivant: true });
    });

    it('renvoi sans changement : rien ajouté, rien modifié', async () => {
        expect(await envoyer(proprio, donneesSynchro(PC, 2026))).toMatchObject({ ok: true, ajoutees: 0, modifiees: 0, couples_ajoutes: 0, liens_ajoutes: 0 });
    });

    it('une fiche modifiée et une fiche ajoutée au PC : comptées comme telles', async () => {
        const pc2 = { ...PC, individus: [...PC.individus.map((p) => (p.id === 2 ? { ...p, prenom: 'Essaimarielle' } : p)),
            { id: 5, prenom: 'Essaitom', nom: 'Essaiville', genre: 'M', date_naissance: ms('1882-01-01'), date_deces: ms('1960-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null }],
            parentes: [...PC.parentes, { parent_id: 1, enfant_id: 5, type_lien: 'Biological' }] };
        expect(await envoyer(proprio, donneesSynchro(pc2, 2026))).toMatchObject({ ok: true, ajoutees: 1, modifiees: 1, liens_ajoutes: 1, en_ligne: { personnes: 5, liens: 4 } });
    });

    it('une fiche qui a quitté le PC (fusion) : SIGNALÉE, pas retirée sans son accord ; retirée avec', async () => {
        const sans5 = donneesSynchro(PC, 2026); // la n° 5 n'est plus au PC
        const r1 = await envoyer(proprio, sans5);
        expect(r1).toMatchObject({ ok: true, a_retirer: [5], retirees: 0, en_ligne: { personnes: 5 } });
        const r2 = await envoyer(proprio, sans5, true);
        expect(r2).toMatchObject({ ok: true, a_retirer: [5], retirees: 1, en_ligne: { personnes: 4, liens: 3 } });
    });

    it('ce qui a été saisi EN LIGNE n’est jamais touché par l’envoi', async () => {
        await admin(db);
        const arbre = (await une<{ id: string }>(db, 'select id from arbres limit 1')).id;
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Saisieenligne', 'Essaiville', false)`, [arbre]);
        const r = await envoyer(proprio, donneesSynchro(PC, 2026), true);
        expect(r).toMatchObject({ ok: true, retirees: 0, en_ligne: { personnes: 5 } });
    });
});
