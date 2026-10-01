// Import GEDCOM (sa demande du 30/09) sur le VRAI schéma (PGlite préparé comme Supabase),
// avec le fichier tel que l'Ancestria de bureau l'écrit (export 5.5.1). Famille INVENTÉE.
import { describe, expect, it } from 'vitest';
import { admin, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';
import { lireFichier } from '../../src/import-gedcom/versWeb';
import { importer, versErreurEcriture, type Ecrivain } from '../../src/import-gedcom/importer';

const GED = [
    '0 HEAD', '1 SOUR ANCESTRIA', '2 NAME Ancestria', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8',
    '0 @I1@ INDI', '1 NAME Essaijean /Essaiville/', '2 GIVN Essaijean', '2 SURN Essaiville', '1 SEX M',
    '1 BIRT', '2 DATE 1850', '2 PLAC Saint-Essai', '1 DEAT', '2 DATE 3 MAR 1920', '1 FAMS @F1@', '1 FAMS @F3@',
    '0 @I2@ INDI', '1 NAME Essaimarie /Essaiville/', '1 SEX F', '1 BIRT', '2 DATE 12 APR 1855', '1 DEAT Y', '1 FAMS @F1@', '1 FAMS @F2@',
    '0 @I3@ INDI', '1 NAME Essaipaul /Essaiville/', '1 SEX M', '1 BIRT', '2 DATE 1876', '1 FAMC @F1@', '2 PEDI birth', '1 FAMS @F4@',
    '0 @I4@ INDI', '1 NAME Essailouise /Essaiville/', '1 SEX F', '1 BIRT', '2 DATE ABT 1878', '1 FAMC @F1@', '2 PEDI adopted',
    '1 OCCU Couturière', '1 NOTE Une note', '2 CONT sur deux lignes',
    '0 @I5@ INDI', '1 NAME Essaiclaire /Essaiville/', '1 SEX F', '1 BIRT', '2 DATE 1860', '1 FAMC @F4@', '2 PEDI birth',
    '0 @I6@ INDI', '1 NAME Rosalie //', '1 SEX F', '1 FAMC @F2@', '2 PEDI birth',
    '0 @I7@ INDI', '1 NAME Essaitom /Essaiville/', '1 SEX M', '1 BIRT', '2 DATE 1990', '1 FAMC @F3@', '2 PEDI birth',
    '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I3@', '1 CHIL @I4@', '1 MARR', '2 DATE 1875',
    '0 @F2@ FAM', '1 WIFE @I2@', '1 CHIL @I6@', '1 CHIL @I99@',
    '0 @F3@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I7@',
    '0 @F4@ FAM', '1 HUSB @I3@', '1 CHIL @I5@',
    '0 @U1@ SUBM', '1 NAME Ancestria', '0 TRLR',
].join('\r\n');

function ecrivainPglite(db: Base): Ecrivain {
    return {
        async inserer(table, lignes) {
            const cols = Object.keys(lignes[0]);
            const liste = cols.map((c) => `"${c}"`).join(', ');
            try {
                await db.query(`insert into public.${table} (${liste}) select ${liste} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`, [JSON.stringify(lignes)]);
                return null;
            } catch (e) {
                return versErreurEcriture(e as { message?: string; code?: string; hint?: string });
            }
        },
    };
}

async function preparer() {
    const db = await nouvelleBase();
    const moi = await creerCompte(db, 'essai@exemple.test');
    await utilisateur(db, moi);
    const a = await une<{ id: string }>(db, `insert into public.arbres (nom, proprietaire) values ('Famille Essaiville', $1) returning id`, [moi]);
    return { db, moi, arbre: a.id };
}

describe('import GEDCOM (fichier du bureau → arbre en ligne)', () => {
    it('lit le fichier : personnes, couple unique, liens, renvoi perdu, notes, dates, vivants', () => {
        const plan = lireFichier(new TextEncoder().encode(GED));
        expect(plan.individus.map((i) => i.prenom)).toEqual(['Essaijean', 'Essaimarie', 'Essaipaul', 'Essailouise', 'Essaiclaire', 'Rosalie', 'Essaitom']);
        const [jean, marie, paul, louise, , rosalie, tom] = plan.individus;
        expect([jean.naissance, jean.naissance_precision, jean.deces, jean.deces_precision, jean.vivant]).toEqual(['1850-01-01', 'annee', '1920-03-03', 'jour', false]);
        expect([marie.naissance, marie.naissance_precision, marie.vivant]).toEqual(['1855-04-12', 'jour', false]); // DEAT Y
        expect(louise.naissance).toBeNull(); // « vers 1878 » : pas sûre → en notes
        expect(louise.notes).toContain('vers 1878');
        expect(louise.notes).toContain('Couturière');
        expect(louise.notes).toContain('Une note\nsur deux lignes');
        expect([rosalie.nom, tom.vivant, paul.vivant]).toEqual(['', true, false]); // « // » = nom inconnu ; né en 1990 = vivant ; né en 1876 = non
        expect(plan.unions).toHaveLength(1); // F1 et F3 = le même couple
        expect(plan.unions[0]).toMatchObject({ nature: 'mariage', statut: 'en_cours', debut: '1875-01-01' });
        expect(plan.filiations.map((f) => f.libelle)).toEqual([
            'Essaijean Essaiville → Essaipaul Essaiville', 'Essaimarie Essaiville → Essaipaul Essaiville',
            'Essaijean Essaiville → Essailouise Essaiville', 'Essaimarie Essaiville → Essailouise Essaiville',
            'Essaimarie Essaiville → Rosalie', 'Essaijean Essaiville → Essaitom Essaiville', 'Essaimarie Essaiville → Essaitom Essaiville',
            'Essaipaul Essaiville → Essaiclaire Essaiville',
        ]);
        expect(plan.filiations.filter((f) => f.nature === 'adoptive').map((f) => f.libelle)).toHaveLength(2);
        expect(plan.renvoisPerdus).toBe(1); // CHIL @I99@
    });

    it('écrit dans le vrai schéma ; la base refuse seulement le lien aux dates absurdes, et le dit', async () => {
        const { db, arbre } = await preparer();
        const plan = lireFichier(new TextEncoder().encode(GED));
        const etapes: number[] = [];
        const r = await importer(arbre, plan, ecrivainPglite(db), (f) => etapes.push(f));
        expect(r.arrete).toBeNull();
        expect([r.personnes, r.couples, r.liens]).toEqual([7, 1, 6]);
        // Les deux liens impossibles de la famille inventée, refusés par les règles de la base, avec leur phrase :
        expect(r.refus.map((x) => [x.quoi, x.libelle])).toEqual([
            ['lien', 'Essaijean Essaiville → Essaitom Essaiville'], // né en 1990, père mort en 1920
            ['lien', 'Essaipaul Essaiville → Essaiclaire Essaiville'], // née en 1860, père né en 1876
        ]);
        expect(r.refus[0].motif).toMatch(/après la mort/);
        expect(r.refus[1].motif).toMatch(/ne peut pas en être le parent/);
        expect(etapes.at(-1)).toBe(16);
        // Ce que le site relira : l'ordre du fichier est gardé.
        const lues = await toutes<{ prenom: string }>(db, `select prenom from public.individus where arbre_id = $1 order by cree_le, id`, [arbre]);
        expect(lues.map((l) => l.prenom)).toEqual(['Essaijean', 'Essaimarie', 'Essaipaul', 'Essailouise', 'Essaiclaire', 'Rosalie', 'Essaitom']);
        const adopt = await toutes<{ nature: string }>(db, `select nature from public.filiations where arbre_id = $1 and nature = 'adoptive'`, [arbre]);
        expect(adopt).toHaveLength(2);
    });

    it('limite de l’offre atteinte : l’import s’arrête et le dit (rien d’inventé)', async () => {
        const { db, moi, arbre } = await preparer();
        await admin(db);
        await db.exec(`update public.limites_offres set max_individus = 3 where offre = 'gratuit'`);
        await utilisateur(db, moi);
        const r = await importer(arbre, lireFichier(new TextEncoder().encode(GED)), ecrivainPglite(db));
        expect(r.personnes).toBe(3);
        expect(r.arrete).toMatch(/Limite atteinte : 3 individus/); // le mécanisme reste (licences), sans offre payante (loi 4)
        expect([r.couples, r.liens]).toEqual([0, 0]);
    });

    it('un autre compte ne peut pas importer dans mon arbre', async () => {
        const { db, arbre } = await preparer();
        const autre = await creerCompte(db, 'autre@exemple.test');
        await utilisateur(db, autre);
        const r = await importer(arbre, lireFichier(new TextEncoder().encode(GED)), ecrivainPglite(db));
        expect(r.personnes).toBe(0);
        expect(r.arrete).toMatch(/pas le droit/);
        expect(r.refus).toEqual([]);
    });
});
