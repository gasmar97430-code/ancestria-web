// FICHES PRIVÉES DE L'AUTEUR (12/10/2026) — ses mots : « si je vais leur faire une visite j'aurai tout de suite le
// moyen de discuter avec eux et du même coup remplir les fiches ». Ces essais prouvent : l'auteur connecté lit et
// remplit les vraies données de SES vivants ; un visiteur, un inscrit, un autre compte n'en lisent RIEN ;
// arbre_public reste « Fiche protégée » ; ce qu'il remplit revient au PC ; l'envoi du PC n'est pas une correction ;
// une fiche qui n'est plus protégée sort de la table. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';
// @ts-expect-error module JavaScript sans types
import { donneesSynchro } from '../../scripts/synchro-pc.mjs';

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
// 1 et 2 : défunts (nommés) ; 3 : enfant VIVANT (protégé) ; 4 : petit-enfant au statut non dit, sans date (protégé)
const PC = {
    individus: [
        { id: 1, prenom: 'Essaijean', nom: 'Essaiville', genre: 'M', date_naissance: ms('1850-01-01'), date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 2, prenom: 'Essaimarie', nom: 'Essaiville', genre: 'F', date_naissance: ms('1855-01-01'), date_deces: null, decede: 1, lieu_naissance: null, lieu_deces: null },
        { id: 3, prenom: 'Essaivivant', nom: 'Essaiville', genre: 'M', date_naissance: ms('1960-03-04'), date_deces: null, decede: 0, lieu_naissance: 'Essaiport', lieu_deces: null },
        { id: 4, prenom: 'Essaipetit', nom: 'Essaiville', genre: 'F', date_naissance: null, date_deces: null, decede: null, lieu_naissance: null, lieu_deces: null },
    ],
    unions: [{ id: 1, partenaire_1_id: 1, partenaire_2_id: 2, type_union: 'Marriage', statut: 'Widowed', date_debut: null, date_fin: null }],
    parentes: [{ parent_id: 1, enfant_id: 3, type_lien: 'Biological' }, { parent_id: 3, enfant_id: 4, type_lien: 'Biological' }],
};
type Ind = { id: string; pc?: number; protegee?: boolean };
const donnees = donneesSynchro(PC, 2026) as { individus: Ind[] };
// ce que le PC enverra en plus : les vraies données de chaque fiche protégée (sans notes)
const prives = (liste: Ind[]) => ({
    prives: liste.filter((i) => i.protegee).map((i) => {
        const p = PC.individus.find((x) => x.id === i.pc)!;
        return { id: i.id, pc: p.id, prenom: p.prenom, nom: p.nom, genre: p.genre === 'M' ? 'homme' : p.genre === 'F' ? 'femme' : 'inconnu',
            naissance: p.date_naissance === null ? null : new Date(p.date_naissance).toISOString().slice(0, 10), naissance_precision: 'jour',
            lieu_naissance: p.lieu_naissance };
    }),
});

let db: Base;
let proprio: string;
let autre: string;
let arbre: string;
let vivant: string;

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    autre = await creerCompte(db, 'autre@exemple.re');
    await utilisateur(db, proprio);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Essai', $1) returning id`, [proprio])).id;
    await une(db, 'select envoi_pc($1::jsonb, false) as r', [JSON.stringify(donnees)]);
    vivant = (await une<{ id: string }>(db, `select id from individus where notes = 'pc:3'`)).id;
});

describe('fiches privées de l’auteur', () => {
    it('l’envoi du PC pose les 2 fiches protégées, sans créer de correction', async () => {
        await utilisateur(db, proprio);
        const r = (await une<{ r: { ok: boolean; ecrites: number; refus: unknown[] } }>(db, 'select envoi_pc_prives($1::jsonb) as r', [JSON.stringify(prives(donnees.individus))])).r;
        expect(r).toMatchObject({ ok: true, ecrites: 2, refus: [] });
        expect((await une<{ r: unknown }>(db, 'select corrections_a_rapatrier() as r')).r).toEqual([]);
    });

    it('renvoyer la même chose n’écrit rien (pas de répétition)', async () => {
        await utilisateur(db, proprio);
        const r = (await une<{ r: { ecrites: number } }>(db, 'select envoi_pc_prives($1::jsonb) as r', [JSON.stringify(prives(donnees.individus))])).r;
        expect(r.ecrites).toBe(0);
    });

    it('l’AUTEUR connecté lit les vrais noms', async () => {
        await utilisateur(db, proprio);
        const l = await toutes<{ pc: number; prenom: string; lieu_naissance: string | null }>(db, 'select pc, prenom, lieu_naissance from fiches_privees order by pc');
        expect(l).toEqual([{ pc: 3, prenom: 'Essaivivant', lieu_naissance: 'Essaiport' }, { pc: 4, prenom: 'Essaipetit', lieu_naissance: null }]);
    });

    it('un AUTRE compte, un visiteur : rien (ni lecture, ni écriture, ni envoi)', async () => {
        await utilisateur(db, autre);
        expect(await toutes(db, 'select * from fiches_privees')).toEqual([]);
        await db.query(`update fiches_privees set prenom = 'Intrus'`);
        expect((await une<{ r: { ok: boolean; raison: string } }>(db, 'select envoi_pc_prives($1::jsonb) as r', [JSON.stringify({ prives: [] })])).r)
            .toEqual({ ok: false, raison: 'pas_proprietaire' });
        await anonyme(db, '198.51.100.90');
        await expect(db.query('select * from fiches_privees')).rejects.toThrow(/permission denied/);
        await expect(db.query(`select envoi_pc_prives('{"prives":[]}'::jsonb)`)).rejects.toThrow(/permission denied/);
        await admin(db);
        expect((await une<{ p: string }>(db, `select prenom as p from fiches_privees where pc = 3`)).p).toBe('Essaivivant');
    });

    it('le public (arbre_public) voit toujours « Fiche protégée » : aucun vrai nom', async () => {
        await utilisateur(db, proprio);
        const jeton = (await une<{ r: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Partage fictif')) as r`, [arbre])).r.jeton;
        await anonyme(db, '198.51.100.91');
        const pub = (await une<{ r: unknown }>(db, 'select arbre_public($1) as r', [jeton])).r;
        const texte = JSON.stringify(pub);
        expect(texte).not.toContain('Essaivivant');
        expect(texte).not.toContain('Essaipetit');
        expect(texte).not.toContain('Essaiport');
        expect(texte).toContain('Fiche protégée');
    });

    it('ce qu’il remplit en ligne revient au PC (seuls les champs changés) et laisse une trace SANS nom', async () => {
        await utilisateur(db, proprio);
        await db.query(`update fiches_privees set naissance = '1961-07-08', lieu_naissance = 'Essaibourg' where individu_id = $1`, [vivant]);
        const a = (await une<{ r: { pc: number; champs: unknown }[] }>(db, 'select corrections_a_rapatrier() as r')).r;
        expect(a.map((x) => [x.pc, x.champs])).toEqual([[3, { naissance: '1961-07-08', lieu_naissance: 'Essaibourg' }]]);
        await admin(db);
        const t = await une<{ apres: unknown }>(db, `select apres from journal_audit where table_visee = 'fiches_privees' order by le desc limit 1`);
        expect(JSON.stringify(t.apres)).not.toContain('Essaibourg');
        expect(t.apres).toMatchObject({ protegee: true });
        // la fiche publique, elle, n'a pas bougé
        expect(await une(db, 'select prenom, naissance, lieu_naissance from individus where id = $1', [vivant]))
            .toEqual({ prenom: 'Fiche protégée', naissance: null, lieu_naissance: null });
    });

    it('une fiche qui n’est plus protégée (décès coché au PC) sort de la table', async () => {
        const PC2 = { ...PC, individus: PC.individus.map((p) => (p.id === 4 ? { ...p, decede: 1 } : p)) };
        const d2 = donneesSynchro(PC2, 2026) as { individus: Ind[] };
        await utilisateur(db, proprio);
        await une(db, 'select envoi_pc($1::jsonb, false) as r', [JSON.stringify(d2)]);
        const r = (await une<{ r: { retirees: number } }>(db, 'select envoi_pc_prives($1::jsonb) as r', [JSON.stringify({
            prives: prives(d2.individus).prives })])).r;
        expect(r.retirees).toBe(1);
        expect((await toutes<{ pc: number }>(db, 'select pc from fiches_privees')).map((x) => x.pc)).toEqual([3]);
    });

    it('une fiche NON protégée en ligne est refusée (jamais de vrai nom pour un défunt déjà public ici)', async () => {
        await utilisateur(db, proprio);
        const jean = donnees.individus.find((i) => i.pc === 1)!;
        const r = (await une<{ r: { ecrites: number; refus: string[] } }>(db, 'select envoi_pc_prives($1::jsonb) as r', [JSON.stringify({
            prives: [...prives(donnees.individus).prives.filter((x) => x.pc === 3), { id: jean.id, pc: 1, prenom: 'Essaijean', nom: 'Essaiville' }] })])).r;
        expect(r.refus).toHaveLength(1);
        expect(r.refus[0]).toMatch(/pc:1/);
    });
});
