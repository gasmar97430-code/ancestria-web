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
        { id: 9, prenom: 'Essaiconjointe', nom: 'Essaiville', genre: 'F', date_naissance: ms('1985-01-01'), date_deces: null, decede: 0, lieu_naissance: 'Essaiport', lieu_deces: null, notes: null }, // vivante, conjointe de Paul
        { id: 8, prenom: 'Essaiancetre', nom: 'Essaiville', genre: 'M', date_naissance: null, date_deces: null, decede: null, lieu_naissance: null, lieu_deces: null, notes: null }, // statut non dit, ancêtre d'une personne née il y a 100 ans et plus : garde son nom
        { id: 7, prenom: 'Essaiabsurde', nom: 'Essaiville', genre: 'M', date_naissance: ms('1900-01-01'), date_deces: ms('1960-01-01'), decede: 1, lieu_naissance: null, lieu_deces: null, notes: null }, // « parent » de Paul né après lui
    ],
    unions: [
        { id: 10, partenaire_1_id: 1, partenaire_2_id: 2, type_union: 'Marriage', statut: 'Active', date_debut: ms('1875-01-01'), date_fin: null },
        { id: 11, partenaire_1_id: 3, partenaire_2_id: 9, type_union: 'Informal', statut: 'Divorced', date_debut: null, date_fin: null }, // avec une vivante : part, elle en fiche protégée
    ],
    parentes: [
        { parent_id: 1, enfant_id: 3, type_lien: 'Biological' },
        { parent_id: 2, enfant_id: 3, type_lien: 'Biological' },
        { parent_id: 3, enfant_id: 4, type_lien: 'Biological' }, // vers la vivante : part (la chaîne reste continue)
        { parent_id: 7, enfant_id: 3, type_lien: 'Biological' }, // 3e parent biologique, né après : refusé par la base
        { parent_id: 8, enfant_id: 2, type_lien: 'Biological' },
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
    jeton = (await une<{ r: { jeton: string } }>(db, `select inscrire_visiteur(null, 'Essainom', 'Essaiprenom', 'essai@exemple.re', 'v1') as r`)).r.jeton; // le lien de la porte ne sort que de l'inscription (01/10)
});

describe('synchronisation PC → site', () => {
    it('règle des personnes publiques : décédé, date de décès, ou statut non dit et née il y a 100 ans ou plus', () => {
        const pub = PC.individus.filter((p) => estPublique(p, 2026)).map((p) => p.id);
        expect(pub).toEqual([1, 2, 3, 7]); // ni la vivante (4), ni le statut inconnu sans date (5), ni la fiche « ? » (6)
    });

    it('première synchronisation : décédés et liens entre eux en ligne, aucune vivante, le refus listé sans tout arrêter', async () => {
        const d = donneesSynchro(PC, 2026);
        expect(d.unions.length).toBe(2); // + le couple avec la vivante (fiche protégée)
        expect(d.filiations.length).toBe(5); // + le lien vers la vivante, + l'ancêtre
        const r = await releve(sqlSynchro(d));
        expect(r.personnes).toBe('7');
        expect(r.couples).toBe('2');
        expect(r.liens).toBe('4');
        expect(r.refus).toBe('1');
        await anonyme(db);
        const pub = (await une<{ r: { individus: { prenom: string; notes: unknown; lieu_naissance: unknown }[]; filiations: unknown[]; unions: unknown[] } }>(db, 'select arbre_public($1) as r', [jeton])).r;
        expect(pub.individus.map((i) => i.prenom).sort()).toEqual(['Essaiabsurde', 'Essaiancetre', 'Essaijean', 'Essaimarie', 'Essaipaul', 'Fiche protégée', 'Fiche protégée', 'Saisieenligne']);
        expect(pub.individus.every((i) => i.notes === null && i.lieu_naissance === null)).toBe(true);
        expect(pub.unions.length).toBe(2);
        expect(pub.filiations.length).toBe(4);
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from individus where prenom = 'Essaiéa'`)).n).toBe(0);
        expect((await une<{ n: string }>(db, `select notes as n from individus where id = $1`, [uuidDe('individu', 1)])).n).toBe('pc:1'); // pas la note du PC
    });

    it('rejouée telle quelle : même résultat, rien en double', async () => {
        const r = await releve(sqlSynchro(donneesSynchro(PC, 2026)));
        expect(r.personnes).toBe('7');
        expect(r.retirées).toBe('0');
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus where arbre_id = $1', [arbre])).n).toBe(8);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where arbre_id = $1', [arbre])).n).toBe(4);
    });

    it('une fiche retirée du PC quitte le site ; une correction du PC arrive ; ce qui a été saisi en ligne reste', async () => {
        const pc2 = { ...PC, individus: PC.individus.filter((p) => p.id !== 7).map((p) => (p.id === 2 ? { ...p, prenom: 'Essaimarielle' } : p)) };
        const r = await releve(sqlSynchro(donneesSynchro(pc2, 2026)));
        expect(r.retirées).toBe('1');
        expect(r.refus).toBe('0');
        await admin(db);
        const noms = (await toutes<{ prenom: string }>(db, 'select prenom from individus where arbre_id = $1 order by prenom', [arbre])).map((x) => x.prenom);
        expect(noms).toEqual(['Essaiancetre', 'Essaijean', 'Essaimarielle', 'Essaipaul', 'Fiche protégée', 'Fiche protégée', 'Saisieenligne']);
    });

    it('le script ne contient ni la vivante, ni les notes du PC', () => {
        const sql = sqlSynchro(donneesSynchro(PC, 2026));
        expect(sql).not.toContain('Essaiéa');
        expect(sql).not.toContain('Essaiconjointe');
        expect(sql).not.toContain('Essaiport'); // le lieu d'une vivante
        expect(sql).not.toContain('1985-01-01'); // la date d'une vivante
        expect(sql).not.toContain('note privée');
    });

    it('règle de l’art : la vivante reste une case de l’arbre, SANS nom, date, lieu ni genre ; la fiche isolée au statut non dit ne part pas', async () => {
        const d = donneesSynchro(PC, 2026);
        const viv = d.individus.find((p: { pc: number }) => p.pc === 4);
        expect(viv).toEqual({ id: uuidDe('individu', 4), pc: 4, protegee: true, prenom: 'Fiche protégée', nom: '', genre: 'inconnu',
            naissance: null, naissance_precision: 'annee', lieu_naissance: null, deces: null, deces_precision: 'annee', lieu_deces: null });
        expect(d.individus.some((p: { pc: number }) => p.pc === 5)).toBe(false); // aucun lien : rien à relier
        await admin(db);
        const ligne = await une<Record<string, unknown>>(db, 'select prenom, nom, genre, naissance, lieu_naissance, vivant from individus where id = $1', [uuidDe('individu', 4)]);
        expect(ligne).toEqual({ prenom: 'Fiche protégée', nom: '', genre: 'inconnu', naissance: null, lieu_naissance: null, vivant: true });
    });

    it('un vivant saisi EN LIGNE avec son nom : le visiteur ne lit jamais ce nom (case protégée)', async () => {
        await admin(db);
        await db.query(`insert into individus (arbre_id, prenom, nom, vivant, naissance) values ($1, 'Essaivivantenligne', 'Essaiville', true, '2001-02-03')`, [arbre]);
        await anonyme(db);
        const pub = (await une<{ r: { individus: Record<string, unknown>[] } }>(db, 'select arbre_public($1) as r', [jeton])).r;
        const texte = JSON.stringify(pub);
        expect(texte).not.toContain('Essaivivantenligne');
        expect(texte).not.toContain('2001');
        expect(pub.individus.filter((i) => i.vivant === true).every((i) => i.prenom === 'Fiche protégée' && i.nom === '' && i.naissance === null && i.genre === 'inconnu')).toBe(true);
    });
});
