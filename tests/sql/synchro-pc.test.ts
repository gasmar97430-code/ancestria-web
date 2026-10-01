// Synchronisation de l'arbre du PC vers le site (01/10) : le script fabriqué par scripts/synchro-pc.mjs,
// joué sur le vrai schéma. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro, estPublique, sqlSynchro, uuidDe } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const PC = {
    individus: [
        { id: 1, prenom: 'Essaijean', nom: 'ESSAIVILLE', genre: 'M', date_naissance: ms('1850-01-01'), date_deces: ms('1920-03-03'), decede: 1, lieu_naissance: 'Saint-Essai', lieu_deces: null, notes: 'note privée du PC' },
        { id: 2, prenom: 'Essaimarie', nom: 'Essaiville', genre: 'F', date_naissance: ms('1855-01-01'), date_deces: null, decede: null, lieu_naissance: null, lieu_deces: null, notes: null },
        { id: 3, prenom: 'Essaipaul', nom: 'Essaiville', genre: 'M', date_naissance: ms('1880-06-01'), date_deces: ms('1950-01-01'), decede: null, lieu_naissance: null, lieu_deces: null, notes: null },
        { id: 4, prenom: 'Essaiéa', nom: 'Essaiville', genre: 'F', date_naissance: ms('1990-05-05'), date_deces: null, decede: 0, lieu_naissance: null, lieu_deces: null, notes: null }, // vivante
        { id: 5, prenom: 'Essaitom', nom: 'Essaiville', genre: 'M', date_naissance: null, date_deces: null, decede: null, lieu_naissance: null, lieu_deces: null, notes: null }, // statut non dit, sans date
        { id: 6, prenom: '?', nom: '?', genre: 'Unknown', date_naissance: null, date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null, notes: null }, // fiche « ? »
        { id: 7, prenom: 'Essaiabsurde', nom: 'Essaiville', genre: 'M', date_naissance: ms('1900-01-01'), date_deces: ms('1960-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null, notes: null }, // « parent » de Paul né après lui
    ],
    unions: [
        { id: 10, partenaire_1_id: 1, partenaire_2_id: 2, type_union: 'Marriage', statut: 'Active', date_debut: ms('1875-01-01'), date_fin: null },
        { id: 11, partenaire_1_id: 3, partenaire_2_id: 4, type_union: 'Informal', statut: 'Divorced', date_debut: null, date_fin: null }, // avec une vivante : ne part pas
    ],
    parentes: [
        { parent_id: 1, enfant_id: 3, type_lien: 'Biological' },
        { parent_id: 2, enfant_id: 3, type_lien: 'Biological' },
        { parent_id: 3, enfant_id: 4, type_lien: 'Biological' }, // vers la vivante : ne part pas
        { parent_id: 7, enfant_id: 3, type_lien: 'Biological' }, // 3e parent biologique, né après : refusé par la base
    ],
};

let db: Base;
let arbre: string;
let jeton: string;
const releve = async (sql: string) => {
    await admin(db);
    await db.exec(sql);
    return Object.fromEntries((await toutes<{ quoi: string; detail: string }>(db, 'select quoi, detail from synchro_releve')).map((l) => [l.quoi + (l.quoi.includes('refus') && l.quoi !== 'refus' ? ':' + l.detail.slice(0, 8) : ''), l.detail]));
};

beforeAll(async () => {
    db = await nouvelleBase();
    const proprio = await creerCompte(db, 'proprio@exemple.re');
    await utilisateur(db, proprio);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio])).id;
    await db.query(`insert into individus (arbre_id, prenom, nom, vivant) values ($1, 'Saisieenligne', 'Essaiville', false)`, [arbre]);
    await anonyme(db);
    jeton = (await une<{ j: string }>(db, 'select jeton_porte_publique() as j')).j;
});

describe('synchronisation PC → site', () => {
    it('règle des personnes publiques : décédé, date de décès, ou statut non dit et née il y a 100 ans ou plus', () => {
        const pub = PC.individus.filter((p) => estPublique(p, 2026)).map((p) => p.id);
        expect(pub).toEqual([1, 2, 3, 7]); // ni la vivante (4), ni le statut inconnu sans date (5), ni la fiche « ? » (6)
    });

    it('première synchronisation : décédés et liens entre eux en ligne, aucune vivante, le refus listé sans tout arrêter', async () => {
        const d = donneesSynchro(PC, 2026);
        expect(d.unions.length).toBe(1);
        expect(d.filiations.length).toBe(3);
        const r = await releve(sqlSynchro(d));
        expect(r.personnes).toBe('4');
        expect(r.couples).toBe('1');
        expect(r.liens).toBe('2');
        expect(r.refus).toBe('1');
        await anonyme(db);
        const pub = (await une<{ r: { individus: { prenom: string; notes: unknown; lieu_naissance: unknown }[]; filiations: unknown[]; unions: unknown[] } }>(db, 'select arbre_public($1) as r', [jeton])).r;
        expect(pub.individus.map((i) => i.prenom).sort()).toEqual(['Essaiabsurde', 'Essaijean', 'Essaimarie', 'Essaipaul', 'Saisieenligne']);
        expect(pub.individus.every((i) => i.notes === null && i.lieu_naissance === null)).toBe(true);
        expect(pub.unions.length).toBe(1);
        expect(pub.filiations.length).toBe(2);
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from individus where prenom = 'Essaiéa'`)).n).toBe(0);
        expect((await une<{ n: string }>(db, `select notes as n from individus where id = $1`, [uuidDe('individu', 1)])).n).toBe('pc:1'); // pas la note du PC
    });

    it('rejouée telle quelle : même résultat, rien en double', async () => {
        const r = await releve(sqlSynchro(donneesSynchro(PC, 2026)));
        expect(r.personnes).toBe('4');
        expect(r.retirées).toBe('0');
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus where arbre_id = $1', [arbre])).n).toBe(5);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where arbre_id = $1', [arbre])).n).toBe(2);
    });

    it('une fiche retirée du PC quitte le site ; une correction du PC arrive ; ce qui a été saisi en ligne reste', async () => {
        const pc2 = { ...PC, individus: PC.individus.filter((p) => p.id !== 7).map((p) => (p.id === 2 ? { ...p, prenom: 'Essaimarielle' } : p)) };
        const r = await releve(sqlSynchro(donneesSynchro(pc2, 2026)));
        expect(r.retirées).toBe('1');
        expect(r.refus).toBe('0');
        await admin(db);
        const noms = (await toutes<{ prenom: string }>(db, 'select prenom from individus where arbre_id = $1 order by prenom', [arbre])).map((x) => x.prenom);
        expect(noms).toEqual(['Essaijean', 'Essaimarielle', 'Essaipaul', 'Saisieenligne']);
    });

    it('le script ne contient ni la vivante, ni les notes du PC', () => {
        const sql = sqlSynchro(donneesSynchro(PC, 2026));
        expect(sql).not.toContain('Essaiéa');
        expect(sql).not.toContain('note privée');
    });
});
