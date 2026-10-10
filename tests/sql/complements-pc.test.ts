// COUPLES « DE PASSAGE » ET ORDRE DE NAISSANCE VENUS DU PC (10/10, sa demande « maintenant corrige en ligne ») :
// envoi_pc_complements, appelée par l'appli après envoi_pc. Réservée au propriétaire ; l'état du PC remplace l'état
// en ligne ; lisible par les membres de l'arbre. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro, uuidDe } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const PC = {
    individus: [
        { id: 1, prenom: 'Essaimere', nom: 'Essaiville', genre: 'F', date_naissance: ms('1850-01-01'), date_deces: ms('1920-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 2, prenom: 'Essaimari', nom: 'Essainom', genre: 'M', date_naissance: ms('1848-01-01'), date_deces: ms('1910-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 3, prenom: 'Essaipassant', nom: 'Essaipas', genre: 'M', date_naissance: ms('1849-01-01'), date_deces: ms('1915-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 4, prenom: 'Essaiaine', nom: 'Essainom', genre: 'M', date_naissance: ms('1875-01-01'), date_deces: ms('1950-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 5, prenom: 'Essaicadet', nom: 'Essainom', genre: 'M', date_naissance: ms('1878-01-01'), date_deces: ms('1955-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null },
    ],
    unions: [
        { id: 10, partenaire_1_id: 2, partenaire_2_id: 1, type_union: 'Other', statut: 'Active', date_debut: null, date_fin: null },
        { id: 11, partenaire_1_id: 3, partenaire_2_id: 1, type_union: 'Informal', statut: 'Active', date_debut: null, date_fin: null },
    ],
    parentes: [
        { parent_id: 3, enfant_id: 4, type_lien: 'Biological' }, { parent_id: 1, enfant_id: 4, type_lien: 'Biological' },
        { parent_id: 2, enfant_id: 5, type_lien: 'Biological' }, { parent_id: 1, enfant_id: 5, type_lien: 'Biological' },
    ],
};
const COMPLEMENTS = { passages: [uuidDe('union', 11)], rangs: [{ individu: uuidDe('individu', 4), rang: 1 }, { individu: uuidDe('individu', 5), rang: 2 }] };

let db: Base;
let proprio: string;
let autre: string;
const appeler = async (qui: string, donnees: unknown) => {
    await utilisateur(db, qui);
    return (await une<{ r: Record<string, unknown> }>(db, 'select envoi_pc_complements($1::jsonb) as r', [JSON.stringify(donnees)])).r;
};

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    autre = await creerCompte(db, 'autre@exemple.re');
    await utilisateur(db, proprio);
    await une(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio]);
    await une(db, 'select envoi_pc($1::jsonb, false) as r', [JSON.stringify(donneesSynchro(PC, 2026))]);
});

describe('couples « de passage » et ordre de naissance venus du PC', () => {
    it('réservé au propriétaire : anonyme refusé, autre compte refusé, rien n’est écrit', async () => {
        await anonyme(db);
        await expect(db.query('select envoi_pc_complements($1::jsonb)', [JSON.stringify(COMPLEMENTS)])).rejects.toThrow();
        expect(await appeler(autre, COMPLEMENTS)).toEqual({ ok: false, raison: 'pas_proprietaire' });
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int n from relations_passage')).n).toBe(0);
    });

    it('le propriétaire envoie : 1 couple de passage, 2 rangs', async () => {
        expect(await appeler(proprio, COMPLEMENTS)).toEqual({ ok: true, passages: 1, rangs: 2, sautes: 0 });
        await admin(db);
        expect(await toutes(db, 'select union_id from relations_passage')).toEqual([{ union_id: uuidDe('union', 11) }]);
        expect(await toutes(db, 'select individu_id, rang from rangs_naissance order by rang')).toEqual([
            { individu_id: uuidDe('individu', 4), rang: 1 }, { individu_id: uuidDe('individu', 5), rang: 2 }]);
    });

    it('le propriétaire les lit (comme les unions) ; un autre compte non', async () => {
        await utilisateur(db, proprio);
        expect((await toutes(db, 'select * from relations_passage')).length).toBe(1);
        expect((await toutes(db, 'select * from rangs_naissance')).length).toBe(2);
        await utilisateur(db, autre);
        expect((await toutes(db, 'select * from relations_passage')).length).toBe(0);
        expect((await toutes(db, 'select * from rangs_naissance')).length).toBe(0);
    });

    it('personne n’écrit directement dans ces tables', async () => {
        await utilisateur(db, proprio);
        await expect(db.query('insert into rangs_naissance (arbre_id, individu_id, rang) select arbre_id, id, 3 from individus limit 1')).rejects.toThrow();
    });

    it('l’état du PC remplace l’état en ligne ; une union inconnue est sautée', async () => {
        expect(await appeler(proprio, { passages: ['00000000-0000-0000-0000-000000000000'], rangs: [{ individu: uuidDe('individu', 5), rang: 1 }] }))
            .toEqual({ ok: true, passages: 0, rangs: 1, sautes: 1 });
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int n from relations_passage')).n).toBe(0);
        expect(await toutes(db, 'select rang from rangs_naissance')).toEqual([{ rang: 1 }]);
    });
});
