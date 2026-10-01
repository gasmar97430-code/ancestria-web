// L'arbre public d'un lien partagé (30/09) : les visiteurs voient les DÉCÉDÉS et les liens entre eux,
// jamais les vivants, les fiches « à trouver », les notes, les lieux ; dates réduites à l'année. Famille INVENTÉE.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, une, utilisateur, type Base } from './harnais';

let db: Base;
let proprio: string;
let arbre: string;
const id: Record<string, string> = {};

async function personne(cle: string, prenom: string, vivant: boolean, naissance: string | null, deces: string | null = null) {
    const r = await une<{ id: string }>(db, `insert into individus (arbre_id, prenom, nom, vivant, naissance, deces, lieu_naissance, notes)
        values ($1, $2, 'Essaiville', $3, $4, $5, 'Saint-Essai', 'note privée') returning id`, [arbre, prenom, vivant, naissance, deces]);
    id[cle] = r.id;
}

beforeAll(async () => {
    db = await nouvelleBase();
    proprio = await creerCompte(db, 'proprio@exemple.re');
    await utilisateur(db, proprio);
    arbre = (await une<{ id: string }>(db, `insert into arbres (nom, proprietaire) values ('Famille Essaiville', $1) returning id`, [proprio])).id;
    await admin(db);
    await db.query("update limites_offres set max_invitations_ouvertes = null where offre = 'gratuit'"); // plusieurs liens pour les essais
    await utilisateur(db, proprio);
    await personne('jean', 'Essaijean', false, '1850-04-12', '1920-03-03');
    await personne('marie', 'Essaimarie', false, '1855-01-01', '1930-01-01');
    await personne('paul', 'Essaipaul', false, '1880-06-01', '1950-01-01');
    await personne('lea', 'Essaiéa', true, '1990-05-05'); // vivante
    await personne('tom', 'Essaitom', true, '1945-02-02'); // vivant (81 ans)
    await personne('trouver', 'Parent à trouver', false, null);
    await db.query(`insert into unions (arbre_id, partenaire_a, partenaire_b, debut) values ($1, $2, $3, '1875-01-01'), ($1, $4, $5, null)`, [arbre, id.jean, id.marie, id.paul, id.lea]);
    await db.query(`insert into filiations (arbre_id, parent_id, enfant_id) values ($1, $2, $4), ($1, $3, $4), ($1, $4, $5), ($1, $6, $5)`,
        [arbre, id.jean, id.marie, id.paul, id.tom, id.trouver]);
});

async function lien(pin: string | null = null) {
    await utilisateur(db, proprio);
    return (await une<{ i: { jeton: string } }>(db, `select to_jsonb(creer_invitation($1, 'Lien', $2, 365)) as i`, [arbre, pin])).i.jeton;
}

describe('arbre public d’un lien partagé', () => {
    it('un visiteur voit les décédés, les vivants en cases protégées (règle de l’art, 01/10) et tous les liens', async () => {
        const jeton = await lien();
        await anonyme(db);
        const r = (await une<{ r: Record<string, unknown> }>(db, 'select arbre_public($1) as r', [jeton])).r as {
            ok: boolean; arbre_nom: string; individus: Record<string, unknown>[]; unions: Record<string, unknown>[]; filiations: Record<string, unknown>[];
        };
        expect(r.ok).toBe(true);
        expect(r.arbre_nom).toBe('Famille Essaiville');
        expect(r.individus.map((i) => i.prenom)).toEqual(['Essaijean', 'Essaimarie', 'Essaipaul', 'Fiche protégée', 'Fiche protégée']); // jamais la fiche « à trouver »
        const protegees = r.individus.filter((i) => i.vivant === true);
        expect(protegees.map((i) => i.id).sort()).toEqual([id.lea, id.tom].sort());
        expect(protegees.every((i) => i.nom === '' && i.genre === 'inconnu' && i.naissance === null && i.deces === null && i.lieu_naissance === null && i.notes === null)).toBe(true);
        const texte = JSON.stringify(r);
        for (const secret of ['Essaiéa', 'Essaitom', '1990', '1945', 'Saint-Essai', 'note privée']) expect(texte).not.toContain(secret);
        const jean = r.individus[0];
        expect([jean.naissance, jean.deces, jean.naissance_precision]).toEqual(['1850-01-01', '1920-01-01', 'annee']); // l'année seulement
        expect([jean.notes, jean.lieu_naissance, jean.vivant]).toEqual([null, null, false]);
        expect(r.unions).toHaveLength(2); // le couple décédé, et celui avec la vivante (case protégée)
        expect(r.unions[0].debut).toBeNull();
        expect(r.filiations.map((f) => `${f.parent_id}>${f.enfant_id}`).sort()).toEqual([`${id.jean}>${id.paul}`, `${id.marie}>${id.paul}`, `${id.paul}>${id.tom}`].sort()); // pas le lien de la fiche « à trouver »
    });

    it('lien fermé, lien inventé, lien avec PIN : rien n’est montré', async () => {
        const ferme = await lien();
        await utilisateur(db, proprio);
        await db.query('update invitations set ferme = true where jeton = $1', [ferme]);
        const avecPin = await lien('4321');
        await anonyme(db);
        const raison = async (j: string) => ((await une<{ r: { ok: boolean; raison: string } }>(db, 'select arbre_public($1) as r', [j])).r);
        expect(await raison(ferme)).toEqual({ ok: false, raison: 'lien_ferme' });
        expect(await raison('0'.repeat(32))).toEqual({ ok: false, raison: 'lien_invalide' });
        expect((await raison(avecPin)).raison).toBe('pin_requis');
    });

    it('un visiteur ne lit toujours rien directement dans les tables', async () => {
        await anonyme(db);
        for (const t of ['individus', 'unions', 'filiations']) await expect(db.query(`select * from ${t}`), t).rejects.toThrow(/permission denied/);
    });
});
