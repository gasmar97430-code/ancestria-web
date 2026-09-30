// Scénarios du schéma, joués sur un vrai PostgreSQL préparé comme Supabase.
// Chaque règle : un essai qui prouve qu'elle BLOQUE, et le cas légitime
// voisin qui prouve qu'elle LAISSE PASSER.
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anonyme, creerCompte, nouvelleBase, toutes, une, utilisateur, type Base } from './harnais';

let db: Base;
let proprietaire: string;
let editeur: string;
let lecteur: string;
let etranger: string;
let arbre: string;

async function individu(prenom: string, extra: Record<string, unknown> = {}, dansArbre = arbre): Promise<string> {
    const cols = ['arbre_id', 'prenom', ...Object.keys(extra)];
    const vals = [dansArbre, prenom, ...Object.values(extra)];
    const r = await une<{ id: string }>(db, `insert into individus (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) returning id`, vals);
    return r.id;
}
async function lien(parent: string, enfant: string, nature = 'biologique', dansArbre = arbre): Promise<string> {
    const r = await une<{ id: string }>(db, 'insert into filiations (arbre_id, parent_id, enfant_id, nature) values ($1,$2,$3,$4) returning id', [dansArbre, parent, enfant, nature]);
    return r.id;
}
async function union(a: string, b: string, extra: Record<string, unknown> = {}): Promise<string> {
    const cols = ['arbre_id', 'partenaire_a', 'partenaire_b', ...Object.keys(extra)];
    const vals = [arbre, a, b, ...Object.values(extra)];
    const r = await une<{ id: string }>(db, `insert into unions (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) returning id`, vals);
    return r.id;
}
async function nouvelArbre(nom: string): Promise<string> {
    return (await une<{ id: string }>(db, 'insert into arbres (nom) values ($1) returning id', [nom])).id;
}
async function licence(qui: string, offre: 'gratuit' | 'famille' | 'institution', finDans = '30 days'): Promise<void> {
    await admin(db);
    await db.exec('set role service_role');
    await db.query(`insert into abonnements (utilisateur, offre, statut, fin_periode) values ($1, $2, 'actif', now() + $3::interval)
                    on conflict (utilisateur) do update set offre = excluded.offre, statut = excluded.statut, fin_periode = excluded.fin_periode`, [qui, offre, finDans]);
    await admin(db);
}

beforeAll(async () => {
    db = await nouvelleBase();
    proprietaire = await creerCompte(db, 'proprietaire@exemple.re');
    editeur = await creerCompte(db, 'editeur@exemple.re');
    lecteur = await creerCompte(db, 'lecteur@exemple.re');
    etranger = await creerCompte(db, 'etranger@exemple.re');
    await utilisateur(db, proprietaire);
    arbre = await nouvelArbre('Famille Fictive');
    // Rôles posés directement (la gestion des membres par e-mail est retirée le 30/09) : les règles d'écriture restent éprouvées.
    await admin(db);
    await db.query(`insert into membres (arbre_id, utilisateur, role) values ($1, $2, 'editeur'), ($1, $3, 'lecteur')`, [arbre, editeur, lecteur]);
});

// ---------------------------------------------------------------------
describe('arbres et membres', () => {
    it('le créateur devient propriétaire ; la gestion des membres par e-mail n\'existe plus (30/09)', async () => {
        await admin(db);
        expect((await une<{ role: string }>(db, 'select role from membres where arbre_id = $1 and utilisateur = $2', [arbre, proprietaire])).role).toBe('proprietaire');
        const f = await toutes<{ proname: string }>(db, `select proname from pg_proc where proname in ('ajouter_membre', 'membres_de', 'retirer_membre')`);
        expect(f).toEqual([]);
    });
    it('un visiteur ne peut pas se donner un rôle dans l\'arbre', async () => {
        await utilisateur(db, etranger);
        await expect(db.query(`insert into membres (arbre_id, utilisateur, role) values ($1, $2, 'editeur')`, [arbre, etranger])).rejects.toThrow();
    });
    it('le propriétaire ne se change pas ; l\'arbre d\'un autre ne se renomme pas', async () => {
        await utilisateur(db, proprietaire);
        await expect(db.query('update arbres set proprietaire = $1 where id = $2', [editeur, arbre])).rejects.toThrow();
        await utilisateur(db, editeur);
        const r = await db.query(`update arbres set nom = 'Piraté' where id = $1`, [arbre]);
        expect(r.affectedRows).toBe(0);
    });
});

// ---------------------------------------------------------------------
describe('individus', () => {
    it('prénom et nom nettoyés, décès connu = décédé, thématiques rangées', async () => {
        await utilisateur(db, editeur);
        const id = await individu('  Anatole Émile ', { nom: ' Fictif ', deces: '1990-05-02', thematiques: ['Marine', ' marine ', 'Engagisme'] });
        const p = await une<Record<string, unknown>>(db, 'select prenom, nom, vivant, thematiques from individus where id = $1', [id]);
        expect(p).toEqual({ prenom: 'Anatole Émile', nom: 'Fictif', vivant: false, thematiques: ['engagisme', 'marine'] });
    });
    it('refuse : naissance future, décès avant naissance, prénom vide, genre inconnu, coordonnées à moitié', async () => {
        await utilisateur(db, editeur);
        await expect(individu('Futur', { naissance: '2999-01-01' })).rejects.toThrow(/futur/);
        await expect(individu('Envers', { naissance: '1950-01-01', deces: '1940-01-01' })).rejects.toThrow();
        await expect(individu('   ')).rejects.toThrow();
        await expect(individu('Genre', { genre: 'autre' })).rejects.toThrow();
        await expect(individu('Demi-point', { naissance_lat: -21.1 })).rejects.toThrow();
        await expect(individu('Trop de thèmes', { thematiques: Array.from({ length: 11 }, (_, i) => `t${i}`) })).rejects.toThrow();
    });
    it('laisse passer : décès la même année qu\'une naissance à l\'année seule', async () => {
        await utilisateur(db, editeur);
        await individu('Nouveau-né', { naissance: '1900-01-01', naissance_precision: 'annee', deces: '1900-06-01' });
    });
    it('photo : lien https seulement (ni http, ni javascript:, ni espace), transmise par l\'ajout « tout ou rien »', async () => {
        await utilisateur(db, editeur);
        await individu('Avec photo', { photo_url: 'https://upload.wikimedia.org/exemple.jpg' });
        for (const mauvais of ['http://exemple.re/a.jpg', 'javascript:alert(1)', 'https://a b.jpg', 'data:image/png;base64,AAAA']) {
            await expect(individu('Photo refusée', { photo_url: mauvais }), mauvais).rejects.toThrow();
        }
        const id = (await une<{ id: string }>(db, `select ajouter_individu_lie($1, '{"prenom":"P","photo_url":"https://exemple.re/p.png"}'::jsonb) as id`, [arbre])).id;
        expect(await une(db, 'select photo_url from individus where id = $1', [id])).toEqual({ photo_url: 'https://exemple.re/p.png' });
    });
    it('non binaire et « se nomme » acceptés', async () => {
        await utilisateur(db, editeur);
        const id = await individu('Alex', { genre: 'non_binaire', se_nomme: 'iel' });
        expect(await une(db, 'select genre, se_nomme from individus where id = $1', [id])).toEqual({ genre: 'non_binaire', se_nomme: 'iel' });
    });
    it('un individu ne change pas d\'arbre', async () => {
        await utilisateur(db, proprietaire);
        const autre = await nouvelArbre('Autre');
        const id = await individu('Mobile');
        await expect(db.query('update individus set arbre_id = $1 where id = $2', [autre, id])).rejects.toThrow(/ne change pas d'arbre/);
    });
});

// ---------------------------------------------------------------------
describe('filiations : boucles, familles multi-parentales', () => {
    let a: string, b: string, c: string, d: string;
    beforeAll(async () => {
        await utilisateur(db, editeur);
        a = await individu('Aïeul');
        b = await individu('Fils');
        c = await individu('Fille');
        d = await individu('Petit-enfant');
        await lien(a, b);
        await lien(a, c);
        await lien(b, d);
        await lien(c, d); // losange : deux chemins vers d, ce n'est PAS une boucle
    });
    it('refuse d\'être son propre parent', async () => {
        await expect(lien(a, a)).rejects.toThrow();
    });
    it('refuse la boucle directe', async () => {
        await expect(lien(b, a)).rejects.toThrow(/boucle/);
    });
    it('refuse la boucle lointaine', async () => {
        await expect(lien(d, a)).rejects.toThrow(/boucle/);
    });
    it('refuse la boucle créée par une MISE À JOUR ; accepte une mise à jour sans boucle', async () => {
        const e = await individu('Arrière-petit');
        const id = await lien(d, e);
        await expect(db.query('update filiations set enfant_id = $1 where id = $2', [a, id])).rejects.toThrow(/boucle/);
        await db.query(`update filiations set nature = 'adoptive' where id = $1`, [id]);
    });
    it('3e parent biologique refusé ; parents d\'autres natures sans limite', async () => {
        const enfant = await individu('Enfant de famille recomposée');
        const parents = await Promise.all(['Mère', 'Père', 'Beau-père', 'Mère d\'intention', 'Gestatrice'].map((p) => individu(p)));
        await lien(parents[0], enfant);
        await lien(parents[1], enfant);
        await expect(lien(parents[2], enfant)).rejects.toThrow(/deux parents biologiques/);
        await lien(parents[2], enfant, 'beau_parent');
        await lien(parents[3], enfant, 'intention');
        await lien(parents[4], enfant, 'gestation');
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where enfant_id = $1', [enfant])).n).toBe(5);
    });
    it('un même lien n\'est pas posé deux fois ; nature inconnue refusée', async () => {
        await expect(lien(a, b)).rejects.toThrow();
        await expect(lien(a, await individu('X'), 'magique')).rejects.toThrow();
    });
    it('un lien ne traverse pas deux arbres (clé composite)', async () => {
        await utilisateur(db, proprietaire);
        const autre = await nouvelArbre('Arbre voisin');
        const x = await individu('Voisin', {}, autre);
        await expect(lien(x, a, 'biologique', arbre)).rejects.toThrow();
        await expect(lien(x, a, 'biologique', autre)).rejects.toThrow();
    });
    it('supprimer un individu retire ses liens (cascade)', async () => {
        await utilisateur(db, editeur);
        const p = await individu('Éphémère');
        await lien(p, await individu('Son enfant'));
        await db.query('delete from individus where id = $1', [p]);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where parent_id = $1', [p])).n).toBe(0);
    });
});

// ---------------------------------------------------------------------
describe('dates absurdes (y compris corrigées après coup)', () => {
    it('parent né après l\'enfant : refusé, quelle que soit la nature du lien', async () => {
        await utilisateur(db, editeur);
        const enfant = await individu('Aîné', { naissance: '1950-03-01' });
        const parent = await individu('Cadet', { naissance: '1960-03-01' });
        await expect(lien(parent, enfant)).rejects.toThrow(/né\(e\) après/);
        await expect(lien(parent, enfant, 'adoptive')).rejects.toThrow(/né\(e\) après/);
    });
    it('parent biologique de moins de 10 ans : refusé ; parent adoptif de 9 ans d\'écart : accepté (règle biologique seulement)', async () => {
        await utilisateur(db, editeur);
        const p = await individu('Trop jeune', { naissance: '1950-01-01' });
        const e = await individu('Enfant précoce', { naissance: '1958-06-01' });
        await expect(lien(p, e)).rejects.toThrow(/moins de 10 ans/);
        await lien(p, e, 'sociale');
    });
    it('précision « année » : tranche seulement si c\'est faux même dans le cas le plus favorable', async () => {
        await utilisateur(db, editeur);
        // parent né « en 1950 » (peut-être le 1er janvier), enfant né le 31/12/1960 : 10 ans possibles → accepté
        const p = await individu('Parent 1950', { naissance: '1950-01-01', naissance_precision: 'annee' });
        await lien(p, await individu('Enfant fin 1960', { naissance: '1960-12-31' }));
        // enfant « en 1959 » : au mieux 31/12/1959 → moins de 10 ans → refusé
        await expect(lien(p, await individu('Enfant 1959', { naissance: '1959-01-01', naissance_precision: 'annee' }))).rejects.toThrow(/moins de 10 ans/);
    });
    it('enfant né plus d\'un an après la mort de son parent biologique : refusé ; 8 mois après : accepté', async () => {
        await utilisateur(db, editeur);
        const pere = await individu('Père mort en mer', { naissance: '1900-01-01', deces: '1930-01-15' });
        await lien(pere, await individu('Posthume', { naissance: '1930-09-15' }));
        await expect(lien(pere, await individu('Impossible', { naissance: '1932-06-01' }))).rejects.toThrow(/plus d'un an après la mort/);
        // la même personne peut être parent ADOPTIF… non : il est mort avant. Parent social posthume : accepté (mémoire familiale)
        await lien(pere, await individu('Élevé dans son souvenir', { naissance: '1932-06-01' }), 'sociale');
    });
    it('une date corrigée APRÈS coup qui rendrait un lien absurde est refusée', async () => {
        await utilisateur(db, editeur);
        const p = await individu('Mère', { naissance: '1920-01-01' });
        const e = await individu('Fille', { naissance: '1945-01-01' });
        await lien(p, e);
        await expect(db.query(`update individus set naissance = '1950-01-01' where id = $1`, [p])).rejects.toThrow(/né\(e\) après/);
        await db.query(`update individus set naissance = '1921-05-05' where id = $1`, [p]); // correction plausible : acceptée
    });
    it('union avant la naissance d\'un partenaire : refusée, y compris par correction de date', async () => {
        await utilisateur(db, editeur);
        const x = await individu('Époux', { naissance: '1930-01-01' });
        const y = await individu('Épouse', { naissance: '1932-01-01' });
        await expect(union(x, y, { debut: '1931-06-01' })).rejects.toThrow(/avant la naissance/);
        await union(x, y, { debut: '1955-06-01' });
        await expect(db.query(`update individus set naissance = '1956-01-01' where id = $1`, [y])).rejects.toThrow(/union avant sa naissance/);
    });
});

// ---------------------------------------------------------------------
describe('unions et ligne directe', () => {
    it('un couple enregistré une seule fois, dans un sens ou dans l\'autre ; jamais avec soi-même ; fin avant début refusée', async () => {
        await utilisateur(db, editeur);
        const x = await individu('Firmin');
        const y = await individu('Rosalie');
        await union(x, y, { statut: 'veuvage' });
        await expect(union(y, x)).rejects.toThrow();
        await expect(union(x, x)).rejects.toThrow();
        await expect(union(x, await individu('Autre'), { debut: '1960-01-01', fin: '1950-01-01' })).rejects.toThrow();
    });
    it('couple de même genre accepté', async () => {
        await utilisateur(db, editeur);
        await union(await individu('Nadia', { genre: 'femme' }), await individu('Sarah', { genre: 'femme' }), { nature: 'mariage' });
    });
    it('union entre un ascendant et son descendant refusée (grand-parent et petit-enfant)', async () => {
        await utilisateur(db, editeur);
        const gp = await individu('Grand-parent');
        const p = await individu('Parent');
        const pe = await individu('Petit-enfant');
        await lien(gp, p);
        await lien(p, pe);
        await expect(union(gp, pe)).rejects.toThrow(/ascendant et son descendant/);
        await expect(union(pe, gp)).rejects.toThrow(/ascendant et son descendant/);
    });
    it('et dans l\'autre sens : un lien qui ferait d\'un couple un ascendant et son descendant est refusé', async () => {
        await utilisateur(db, editeur);
        const x = await individu('Conjoint X');
        const y = await individu('Conjoint Y');
        const m = await individu('Intermédiaire');
        await union(x, y);
        await lien(x, m);
        await expect(lien(m, y)).rejects.toThrow(/ascendant et son descendant/);
        // cousins en couple : accepté (pas en ligne directe)
        const aieul = await individu('Aïeul commun');
        const f1 = await individu('Branche 1');
        const f2 = await individu('Branche 2');
        const c1 = await individu('Cousin');
        const c2 = await individu('Cousine');
        await lien(aieul, f1);
        await lien(aieul, f2);
        await lien(f1, c1);
        await lien(f2, c2);
        await union(c1, c2);
    });
});

// ---------------------------------------------------------------------
describe('foyers (unités parentales)', () => {
    it('foyer homoparental : un clic rattache l\'enfant aux DEUX mères, avec la nature choisie', async () => {
        await utilisateur(db, editeur);
        const m1 = await individu('Claire', { genre: 'femme' });
        const m2 = await individu('Inès', { genre: 'femme' });
        const enfant = await individu('Lou');
        const foyer = (await une<{ id: string }>(db, `insert into foyers (arbre_id, libelle, forme) values ($1, 'Claire et Inès', 'homoparental') returning id`, [arbre])).id;
        await db.query('insert into foyer_parents (foyer_id, arbre_id, individu_id, qualite) values ($1,$2,$3,$4), ($1,$2,$5,$6)', [foyer, arbre, m1, 'mère', m2, 'mère']);
        expect((await une<{ n: number }>(db, `select rattacher_au_foyer($1, $2, 'adoptive') as n`, [foyer, enfant])).n).toBe(2);
        const liens = await toutes<{ parent_id: string; nature: string; foyer_id: string }>(db, 'select parent_id, nature, foyer_id from filiations where enfant_id = $1 order by parent_id', [enfant]);
        expect(liens.map((l) => l.parent_id).sort()).toEqual([m1, m2].sort());
        expect(liens.every((l) => l.nature === 'adoptive' && l.foyer_id === foyer)).toBe(true);
    });
    it('foyer pluriparental (3 parents) : chaque lien garde sa propre nature ; 3 biologiques restent impossibles', async () => {
        await utilisateur(db, editeur);
        const ps = await Promise.all(['Parent A', 'Parent B', 'Parent C'].map((p) => individu(p)));
        const enfant = await individu('Enfant du foyer');
        const foyer = (await une<{ id: string }>(db, `insert into foyers (arbre_id, forme) values ($1, 'pluriparental') returning id`, [arbre])).id;
        for (const p of ps) await db.query('insert into foyer_parents (foyer_id, arbre_id, individu_id) values ($1,$2,$3)', [foyer, arbre, p]);
        await expect(db.query(`select rattacher_au_foyer($1, $2, 'biologique')`, [foyer, enfant])).rejects.toThrow(/deux parents biologiques/);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where enfant_id = $1', [enfant])).n).toBe(0); // tout ou rien
        await db.query(`select rattacher_au_foyer($1, $2, 'sociale')`, [foyer, enfant]);
        await db.query(`update filiations set nature = 'biologique' where enfant_id = $1 and parent_id = any($2::uuid[])`, [enfant, [ps[0], ps[1]]]);
        expect(await toutes(db, 'select nature, count(*)::int as n from filiations where enfant_id = $1 group by nature order by nature', [enfant])).toEqual([
            { nature: 'biologique', n: 2 }, { nature: 'sociale', n: 1 },
        ]);
    });
    it('un lien ne peut pas citer un foyer dont le parent ne fait pas partie ; quitter le foyer garde le lien', async () => {
        await utilisateur(db, editeur);
        const p = await individu('Parent hors foyer');
        const q = await individu('Parent du foyer');
        const e = await individu('Enfant');
        const foyer = (await une<{ id: string }>(db, `insert into foyers (arbre_id) values ($1) returning id`, [arbre])).id;
        await db.query('insert into foyer_parents (foyer_id, arbre_id, individu_id) values ($1,$2,$3)', [foyer, arbre, q]);
        await expect(db.query('insert into filiations (arbre_id, parent_id, enfant_id, foyer_id) values ($1,$2,$3,$4)', [arbre, p, e, foyer])).rejects.toThrow();
        await db.query('insert into filiations (arbre_id, parent_id, enfant_id, foyer_id) values ($1,$2,$3,$4)', [arbre, q, e, foyer]);
        await db.query('delete from foyer_parents where foyer_id = $1 and individu_id = $2', [foyer, q]);
        expect(await une(db, 'select foyer_id from filiations where parent_id = $1 and enfant_id = $2', [q, e])).toEqual({ foyer_id: null });
    });
    it('un foyer d\'un autre arbre ne peut pas recevoir d\'individu de cet arbre', async () => {
        await utilisateur(db, proprietaire);
        const autre = await nouvelArbre('Arbre des foyers');
        const foyer = (await une<{ id: string }>(db, `insert into foyers (arbre_id) values ($1) returning id`, [autre])).id;
        const x = await individu('Individu d\'ici');
        await expect(db.query('insert into foyer_parents (foyer_id, arbre_id, individu_id) values ($1,$2,$3)', [foyer, arbre, x])).rejects.toThrow();
        await expect(db.query('insert into foyer_parents (foyer_id, arbre_id, individu_id) values ($1,$2,$3)', [foyer, autre, x])).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------
describe('ajouts en une transaction (tout ou rien)', () => {
    it('ajouter un parent NOUVEAU : la fiche et le lien, ensemble', async () => {
        await utilisateur(db, editeur);
        const enfant = await individu('Enfant', { naissance: '1980-05-05' });
        const id = (await une<{ id: string }>(db, `select ajouter_individu_lie($1, $2::jsonb, 'parent', $3, 'adoptive') as id`, [
            arbre, JSON.stringify({ prenom: ' Rose ', nom: 'Martin', genre: 'femme', naissance: '1950-02-03', thematiques: ['Marine'] }), enfant,
        ])).id;
        expect(await une(db, `select prenom, nom, genre, to_char(naissance, 'YYYY-MM-DD') as naissance, thematiques from individus where id = $1`, [id]))
            .toEqual({ prenom: 'Rose', nom: 'Martin', genre: 'femme', naissance: '1950-02-03', thematiques: ['marine'] });
        expect(await une(db, 'select nature from filiations where parent_id = $1 and enfant_id = $2', [id, enfant])).toEqual({ nature: 'adoptive' });
    });
    it('lien refusé (dates absurdes) : AUCUNE fiche créée', async () => {
        await utilisateur(db, editeur);
        const enfant = await individu('Aîné du siècle', { naissance: '1900-01-01' });
        const avant = (await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n;
        await expect(db.query(`select ajouter_individu_lie($1, $2::jsonb, 'parent', $3)`, [arbre, JSON.stringify({ prenom: 'Trop jeune', naissance: '1950-01-01' }), enfant]))
            .rejects.toThrow(/né\(e\) après/);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n).toBe(avant);
    });
    it('conjoint nouveau avec nature et statut ; relation inconnue refusée ; lecteur refusé', async () => {
        await utilisateur(db, editeur);
        const x = await individu('Époux');
        const id = (await une<{ id: string }>(db, `select ajouter_individu_lie($1, '{"prenom":"Sam"}'::jsonb, 'conjoint', $2, 'biologique', '{"nature":"pacs","statut":"separes"}'::jsonb) as id`, [arbre, x])).id;
        expect(await une(db, 'select nature, statut from unions where partenaire_b = $1', [id])).toEqual({ nature: 'pacs', statut: 'separes' });
        await expect(db.query(`select ajouter_individu_lie($1, '{"prenom":"Z"}'::jsonb, 'cousin', $2)`, [arbre, x])).rejects.toThrow(/Relation inconnue/);
        await expect(db.query(`select ajouter_individu_lie($1, '{"prenom":"Z"}'::jsonb, 'parent', null)`, [arbre])).rejects.toThrow(/Choisissez/);
        await utilisateur(db, lecteur);
        await expect(db.query(`select ajouter_individu_lie($1, '{"prenom":"Z"}'::jsonb)`, [arbre])).rejects.toThrow(/row-level security/);
    });
    it('frères / sœurs GERMAINS sans parents connus : deux parents « à trouver » communs sont posés', async () => {
        await utilisateur(db, editeur);
        const a = await individu('Aimé', { naissance: '1920-01-01' });
        const b = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Berthe","naissance":"1922-03-03"}'::jsonb) as id`, [arbre, a])).id;
        const communs = await toutes<{ prenom: string; vivant: boolean }>(db, `select p.prenom, p.vivant from filiations x join filiations y on y.parent_id = x.parent_id
            join individus p on p.id = x.parent_id where x.enfant_id = $1 and y.enfant_id = $2`, [a, b]);
        expect(communs).toEqual([{ prenom: 'Parent à trouver', vivant: false }, { prenom: 'Parent à trouver', vivant: false }]);
    });
    it('frère / sœur quand l\'un a ses parents : l\'autre reçoit les MÊMES (nature et foyer compris), dans les deux sens', async () => {
        await utilisateur(db, editeur);
        const pere = await individu('Célestin');
        const mere = await individu('Denise');
        const aine = await individu('Aîné');
        await lien(pere, aine);
        await lien(mere, aine, 'adoptive');
        const cadet = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Cadet"}'::jsonb) as id`, [arbre, aine])).id;
        expect(await toutes(db, 'select parent_id, nature from filiations where enfant_id = $1 order by nature', [cadet]))
            .toEqual([{ parent_id: mere, nature: 'adoptive' }, { parent_id: pere, nature: 'biologique' }]);
        // sens inverse : la personne SANS parents est reliée à ceux de l'existant
        const seul = await individu('Sans parents');
        await db.query('select ajouter_frere_soeur($1, $2, null, $3)', [arbre, seul, aine]);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where enfant_id = $1', [seul])).n).toBe(2);
    });
    it('parent « à trouver » retrouvé : compléter sa fiche, OU dire « c\'est en fait X » (ses liens passent sur X, la fiche vide disparaît)', async () => {
        await utilisateur(db, editeur);
        const a = await individu('Frère A');
        const b = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Sœur B"}'::jsonb, null, 'demi') as id`, [arbre, a])).id;
        const inconnu = (await une<{ id: string }>(db, 'select parent_id as id from filiations where enfant_id = $1', [a])).id;
        // 1. compléter la fiche : tous ses enfants en profitent
        await db.query(`update individus set prenom = 'Gaston', nom = 'Retrouvé' where id = $1`, [inconnu]);
        expect(await toutes(db, 'select p.prenom from filiations f join individus p on p.id = f.parent_id where f.enfant_id = any($1::uuid[]) order by f.enfant_id', [[a, b]]))
            .toEqual([{ prenom: 'Gaston' }, { prenom: 'Gaston' }]);
        // 2. « c'est en fait X » : sur une autre fratrie
        const c = await individu('Frère C');
        const d = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Sœur D"}'::jsonb, null, 'demi') as id`, [arbre, c])).id;
        const aTrouver = (await une<{ id: string }>(db, 'select parent_id as id from filiations where enfant_id = $1', [c])).id;
        const reel = await individu('Hortense', { genre: 'femme' });
        expect((await une<{ n: number }>(db, 'select remplacer_parent_a_trouver($1, $2) as n', [aTrouver, reel])).n).toBe(2);
        expect(await toutes(db, 'select enfant_id from filiations where parent_id = $1 order by enfant_id', [reel])).toEqual([c, d].sort().map((x) => ({ enfant_id: x })));
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus where id = $1', [aTrouver])).n).toBe(0);
        await expect(db.query('select remplacer_parent_a_trouver($1, $2)', [reel, a])).rejects.toThrow(/pas un parent « à trouver »/);
    });
    it('« c\'est en fait X » refusé si X est un descendant : RIEN ne bouge', async () => {
        await utilisateur(db, editeur);
        const e = await individu('Enfant E');
        await db.query(`select ajouter_frere_soeur($1, $2, '{"prenom":"Frère F"}'::jsonb, null, 'demi')`, [arbre, e]);
        const aTrouver = (await une<{ id: string }>(db, 'select parent_id as id from filiations where enfant_id = $1', [e])).id;
        const petit = await individu('Petit-enfant de E');
        await lien(e, petit);
        await expect(db.query('select remplacer_parent_a_trouver($1, $2)', [aTrouver, petit])).rejects.toThrow(/boucle/);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where parent_id = $1', [aTrouver])).n).toBe(2);
    });
    it('DEMI-frère / demi-sœur : parent commun CHOISI (connu), ou « à trouver » quand chacun a ses parents', async () => {
        await utilisateur(db, editeur);
        const mere = await individu('Mère connue');
        const pere = await individu('Père connu');
        const a = await individu('Aîné demi');
        await lien(mere, a);
        await lien(pere, a);
        // parent commun choisi : la mère seulement
        const b = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Demi-sœur"}'::jsonb, null, 'demi', $3) as id`, [arbre, a, mere])).id;
        expect(await toutes(db, 'select parent_id from filiations where enfant_id = $1', [b])).toEqual([{ parent_id: mere }]);
        // chacun a ses parents connus, différents, et un parent commun INCONNU : un seul « à trouver » partagé
        const c = await individu('Cousin devenu demi-frère');
        const autreMere = await individu('Autre mère');
        await lien(autreMere, c);
        const x = await individu('Enfant X');
        await lien(await individu('Mère de X'), x);
        await db.query(`select ajouter_frere_soeur($1, $2, null, $3, 'demi')`, [arbre, x, c]);
        const communs = await toutes<{ prenom: string }>(db, `select p.prenom from filiations f1 join filiations f2 on f2.parent_id = f1.parent_id
            join individus p on p.id = f1.parent_id where f1.enfant_id = $1 and f2.enfant_id = $2`, [x, c]);
        expect(communs).toEqual([{ prenom: 'Parent à trouver' }]);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from filiations where enfant_id = $1', [c])).n).toBe(2); // garde sa mère
        // refus : parent choisi qui n'est parent d'aucun des deux ; type inconnu
        await expect(db.query(`select ajouter_frere_soeur($1, $2, '{"prenom":"Z"}'::jsonb, null, 'demi', $3)`, [arbre, a, autreMere])).rejects.toThrow(/aucun des deux/);
        await expect(db.query(`select ajouter_frere_soeur($1, $2, '{"prenom":"Z"}'::jsonb, null, 'cousin')`, [arbre, a])).rejects.toThrow(/Type de lien inconnu/);
    });
    it('frère / sœur PAR ADOPTION : reliés aux parents de l\'autre par un lien adoptif ; sans parents : un « à trouver » commun', async () => {
        await utilisateur(db, editeur);
        const p1 = await individu('Parent adoptant 1');
        const p2 = await individu('Parent adoptant 2');
        const a = await individu('Enfant de la famille');
        await lien(p1, a);
        await lien(p2, a);
        const b = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Adopté"}'::jsonb, null, 'adoptif') as id`, [arbre, a])).id;
        expect(await toutes(db, 'select nature, count(*)::int as n from filiations where enfant_id = $1 group by nature', [b])).toEqual([{ nature: 'adoptive', n: 2 }]);
        const seul = await individu('Seul');
        const c = (await une<{ id: string }>(db, `select ajouter_frere_soeur($1, $2, '{"prenom":"Adopté 2"}'::jsonb, null, 'adoptif') as id`, [arbre, seul])).id;
        expect(await toutes(db, 'select nature from filiations where enfant_id = $1', [c])).toEqual([{ nature: 'adoptive' }]);
        expect(await toutes(db, 'select nature from filiations where enfant_id = $1', [seul])).toEqual([{ nature: 'biologique' }]);
    });
    it('frère / sœur refusé proprement : déjà frères, parents différents, soi-même, boucle — rien de créé', async () => {
        await utilisateur(db, editeur);
        const p1 = await individu('Parent un');
        const p2 = await individu('Parent deux');
        const x = await individu('X');
        const y = await individu('Y');
        const z = await individu('Z');
        await lien(p1, x);
        await lien(p1, y);
        await lien(p2, z);
        await expect(db.query('select ajouter_frere_soeur($1, $2, null, $3)', [arbre, x, y])).rejects.toThrow(/déjà un parent en commun/);
        await expect(db.query('select ajouter_frere_soeur($1, $2, null, $3)', [arbre, x, z])).rejects.toThrow(/Chacun a déjà ses parents/);
        await expect(db.query('select ajouter_frere_soeur($1, $2, null, $2)', [arbre, x])).rejects.toThrow(/propre frère/);
        await expect(db.query(`select ajouter_frere_soeur($1, $2, '{"prenom":"N"}'::jsonb, $3)`, [arbre, x, y])).rejects.toThrow(/OU décrivez/);
        // le parent de X comme « frère » de X : boucle → refus, et aucune fiche nouvelle
        const avant = (await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n;
        await expect(db.query('select ajouter_frere_soeur($1, $2, null, $3)', [arbre, x, p1])).rejects.toThrow(/boucle|propre parent/);
        await expect(db.query(`select ajouter_frere_soeur($1, $2, '{"prenom":"Trop vieux","naissance":"2999-01-01"}'::jsonb)`, [arbre, x])).rejects.toThrow(/futur/);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n).toBe(avant);
    });
    it('créer un foyer avec ses parents ; parent d\'un autre arbre = rien de créé', async () => {
        await utilisateur(db, editeur);
        const m1 = await individu('Awa');
        const m2 = await individu('Léna');
        const f = (await une<{ id: string }>(db, `select creer_foyer($1, 'Awa et Léna', 'homoparental', $2::uuid[], array['mère', 'mère']) as id`, [arbre, [m1, m2]])).id;
        expect(await toutes(db, 'select qualite from foyer_parents where foyer_id = $1', [f])).toEqual([{ qualite: 'mère' }, { qualite: 'mère' }]);
        await expect(db.query(`select creer_foyer($1, 'Vide', 'autre', '{}'::uuid[])`, [arbre])).rejects.toThrow(/au moins un parent/);
        await utilisateur(db, proprietaire);
        const ailleurs = await individu('Ailleurs', {}, await nouvelArbre('Arbre tiers'));
        await utilisateur(db, editeur);
        const avant = (await une<{ n: number }>(db, 'select count(*)::int as n from foyers')).n;
        await expect(db.query(`select creer_foyer($1, 'Mélange', 'autre', $2::uuid[])`, [arbre, [m1, ailleurs]])).rejects.toThrow();
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from foyers')).n).toBe(avant);
    });
});

// ---------------------------------------------------------------------
describe('sécurité par ligne', () => {
    it('un étranger ne voit rien et n\'écrit rien, sur AUCUNE table', async () => {
        await utilisateur(db, etranger);
        for (const t of ['individus', 'unions', 'foyers', 'foyer_parents', 'filiations', 'documents', 'document_individus', 'familles_historiques', 'membres', 'invitations', 'contributions']) {
            expect((await toutes(db, `select ${t === 'invitations' ? 'id' : '*'} from ${t}`)).length, t).toBe(0); // invitations : colonnes ouvertes seulement
        }
        await expect(individu('Intrus')).rejects.toThrow(/row-level security/);
        expect((await db.query('delete from individus where arbre_id = $1', [arbre])).affectedRows).toBe(0);
        expect((await une<{ e: unknown }>(db, 'select etat_offre($1) as e', [arbre])).e).toBeNull();
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus where arbre_id = $1', [arbre])).n).toBeGreaterThan(20);
    });
    it('le lecteur lit mais n\'écrit pas ; ne voit ni partages ni propositions', async () => {
        await utilisateur(db, lecteur);
        expect((await toutes(db, 'select * from individus where arbre_id = $1', [arbre])).length).toBeGreaterThan(20);
        await expect(individu('Tentative')).rejects.toThrow(/row-level security/);
        expect((await db.query(`update individus set prenom = 'X' where arbre_id = $1`, [arbre])).affectedRows).toBe(0);
        await expect(db.query(`select creer_invitation($1, 'x')`, [arbre])).rejects.toThrow(/Seuls le propriétaire et les éditeurs/);
    });
    it('le public (anon) n\'a aucun accès direct aux tables', async () => {
        await anonyme(db);
        for (const t of ['individus', 'arbres', 'contributions', 'documents', 'invitations', 'exports_certifies', 'essais_pin']) {
            await expect(db.query(`select * from ${t}`), t).rejects.toThrow(/permission denied/);
        }
        await expect(db.query(`select creer_invitation($1, 'x')`, [arbre])).rejects.toThrow(/permission denied/);
        await expect(db.query(`select accepter_contribution($1)`, [arbre])).rejects.toThrow(/permission denied/);
    });
});

// ---------------------------------------------------------------------
describe('partage public : invitation, PIN, propositions, modération', () => {
    let jeton: string;
    let vivante: string;
    let defunt: string;
    beforeAll(async () => {
        await utilisateur(db, editeur);
        vivante = await individu('Nina', { nom: 'Exemple' });
        defunt = await individu('Octave', { nom: 'Modèle', vivant: false, naissance: '1901-01-01', naissance_precision: 'annee' });
        await utilisateur(db, proprietaire);
        const inv = await une<{ r: { jeton: string; avec_pin: boolean; pin_hash: string | null } }>(db, `select to_jsonb(creer_invitation($1, 'Facebook Fictive', '2468', 30)) as r`, [arbre]);
        jeton = inv.r.jeton;
        expect(jeton).toMatch(/^[0-9a-f]{32}$/);
        expect(inv.r.avec_pin).toBe(true);
        expect(inv.r.pin_hash).toBeNull();
    });
    it('le haché du PIN n\'est jamais lisible, même par un éditeur', async () => {
        await utilisateur(db, editeur);
        await expect(db.query('select pin_hash from invitations')).rejects.toThrow(/permission denied/);
        expect(await toutes(db, 'select avec_pin from invitations where arbre_id = $1', [arbre])).toEqual([{ avec_pin: true }]);
    });
    it('offre gratuite : un seul partage ouvert ; PIN et durée contrôlés', async () => {
        await utilisateur(db, proprietaire);
        await expect(db.query(`select creer_invitation($1, 'Deuxième')`, [arbre])).rejects.toThrow(/1 partage ouvert/);
        await expect(db.query(`select creer_invitation($1, 'PIN court', '12')`, [arbre])).rejects.toThrow(/4 à 8 chiffres/);
        await expect(db.query(`select creer_invitation($1, 'PIN lettres', 'abcd')`, [arbre])).rejects.toThrow(/4 à 8 chiffres/);
        await expect(db.query(`select creer_invitation($1, 'Durée', null, 0)`, [arbre])).rejects.toThrow(/entre 1 et 365/);
    });
    it('sans PIN : seulement le nom de l\'arbre ; PIN faux refusé ; bon PIN : les défunts seulement', async () => {
        await anonyme(db, '198.51.100.7');
        expect((await une<{ r: unknown }>(db, 'select invitation_publique($1) as r', [jeton])).r).toEqual({ ok: false, raison: 'pin_requis', arbre_nom: 'Famille Fictive', avec_pin: true });
        expect((await une<{ r: { raison: string } }>(db, `select invitation_publique($1, '0000') as r`, [jeton])).r.raison).toBe('pin_faux');
        const bon = await une<{ r: { ok: boolean; individus: { id: string }[] } }>(db, `select invitation_publique($1, '2468') as r`, [jeton]);
        expect(bon.r.ok).toBe(true);
        const ids = bon.r.individus.map((p) => p.id);
        expect(ids).toContain(defunt);
        expect(ids).not.toContain(vivante);
        await admin(db);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus where vivant and id = any($1::uuid[])', [ids])).n).toBe(0);
    });
    it('un lien inventé ou mal formé est refusé proprement (jamais d\'erreur brute)', async () => {
        await anonyme(db);
        for (const j of ['abc', '0'.repeat(32), "' or 1=1 --", '']) {
            expect((await une<{ r: unknown }>(db, `select invitation_publique($1) as r`, [j])).r).toEqual({ ok: false, raison: 'lien_invalide' });
        }
    });
    it('contenu contrôlé par la base', async () => {
        await anonyme(db, '198.51.100.8');
        const envoyer = async (contenu: unknown, contact: string | null = null) =>
            (await une<{ r: { ok: boolean; raison?: string } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb, $3) as r`, [jeton, JSON.stringify(contenu), contact])).r;
        const invalide = { ok: false, raison: 'contenu_invalide' };
        expect(await envoyer({ contributeur: { prenom: '' }, lien: { relation: 'inconnu' } })).toEqual(invalide);
        expect(await envoyer({ contributeur: 'texte', lien: { relation: 'inconnu' } })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' } })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'cousin', individu_id: defunt } })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'enfant', individu_id: 'pas-un-uuid' } })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'inconnu' }, proches: 'pas une liste' })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'inconnu' }, proches: [{ prenom: 'X', relation: 'oncle' }] })).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'inconnu' } }, 'x'.repeat(201))).toEqual(invalide);
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'enfant', individu_id: vivante } })).toEqual({ ok: false, raison: 'individu_inconnu' });
        expect(await envoyer({ contributeur: { prenom: 'Ana' }, lien: { relation: 'enfant', individu_id: '00000000-0000-0000-0000-000000000000' } })).toEqual({ ok: false, raison: 'individu_inconnu' });
        const ok = await envoyer({ contributeur: { prenom: 'Ana', nom: 'Modèle', genre: 'femme', naissance_annee: 1985 }, lien: { relation: 'petit_enfant', individu_id: defunt } });
        expect(ok.ok).toBe(true);
    });
    it('un renvoi du même envoi (réponse perdue en route) n\'entre qu\'une fois', async () => {
        await anonyme(db, '198.51.100.30');
        const contenu = JSON.stringify({ contributeur: { prenom: 'Renvoi' }, lien: { relation: 'inconnu' } });
        const uid = 'a1b2c3d4-0000-4000-8000-00000000abcd';
        const r1 = (await une<{ r: { ok: boolean; id: string } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb, null, $3) as r`, [jeton, contenu, uid])).r;
        const r2 = (await une<{ r: { ok: boolean; id: string; deja_recue: boolean } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb, null, $3) as r`, [jeton, contenu, uid])).r;
        expect(r1.ok && r2.ok).toBe(true);
        expect(r2.id).toBe(r1.id);
        expect(r2.deja_recue).toBe(true);
        expect((await une<{ r: { raison: string } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb, null, 'pas un uid !') as r`, [jeton, contenu])).r.raison).toBe('contenu_invalide');
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from contributions where contenu -> 'contributeur' ->> 'prenom' = 'Renvoi'`)).n).toBe(1);
    });
    it('PIN faux à la chaîne depuis la même adresse : bloqué au 20e essai, même avec le bon PIN ; une autre adresse passe', async () => {
        await anonyme(db, '203.0.113.9');
        let derniere = '';
        for (let i = 0; i < 21; i++) derniere = (await une<{ r: { raison: string } }>(db, `select invitation_publique($1, '1111') as r`, [jeton])).r.raison;
        expect(derniere).toBe('trop_d_essais');
        expect((await une<{ r: { raison: string } }>(db, `select invitation_publique($1, '2468') as r`, [jeton])).r.raison).toBe('trop_d_essais');
        await anonyme(db, '203.0.113.10');
        expect((await une<{ r: { ok: boolean } }>(db, `select invitation_publique($1, '2468') as r`, [jeton])).r.ok).toBe(true);
    });
    it('débit : 30 propositions par heure et par adresse, la 31e refusée', async () => {
        await anonyme(db, '203.0.113.50');
        const contenu = JSON.stringify({ contributeur: { prenom: 'Robot' }, lien: { relation: 'inconnu' } });
        let r: { ok: boolean; raison?: string } = { ok: true };
        for (let i = 0; i < 31; i++) r = (await une<{ r: typeof r }>(db, `select soumettre_contribution($1, '2468', $2::jsonb) as r`, [jeton, contenu])).r;
        expect(r).toEqual({ ok: false, raison: 'trop_d_envois' });
        await admin(db);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from contributions where contenu -> 'contributeur' ->> 'prenom' = 'Robot'`)).n).toBe(30);
    });
    it('rien n\'entre dans l\'arbre sans acceptation ; le lecteur ne voit pas la file et ne peut pas accepter', async () => {
        await admin(db);
        const c = await une<{ id: string }>(db, `select id from contributions where contenu -> 'contributeur' ->> 'prenom' = 'Ana'`);
        expect((await une<{ n: number }>(db, `select count(*)::int as n from individus where prenom = 'Ana'`)).n).toBe(0);
        await utilisateur(db, lecteur);
        expect((await toutes(db, 'select * from contributions')).length).toBe(0);
        await expect(db.query('select accepter_contribution($1)', [c.id])).rejects.toThrow();
    });
    it('l\'éditeur accepte : petit-enfant relié par un parent « à trouver », en une transaction', async () => {
        await admin(db);
        const c = await une<{ id: string }>(db, `select id from contributions where contenu -> 'contributeur' ->> 'prenom' = 'Ana'`);
        await utilisateur(db, editeur);
        const r = await une<{ r: { ok: boolean; individu_id: string; individus_crees: number } }>(db, 'select accepter_contribution($1) as r', [c.id]);
        expect(r.r).toMatchObject({ ok: true, individus_crees: 2 });
        const chemin = await toutes(db, `select p.prenom from filiations f1 join filiations f2 on f2.enfant_id = f1.parent_id
            join individus p on p.id = f1.parent_id where f1.enfant_id = $1 and f2.parent_id = $2`, [r.r.individu_id, defunt]);
        expect(chemin).toEqual([{ prenom: 'Parent à trouver' }]);
        expect(await une(db, `select to_char(naissance, 'YYYY-MM-DD') as naissance, naissance_precision, vivant from individus where id = $1`, [r.r.individu_id]))
            .toEqual({ naissance: '1985-01-01', naissance_precision: 'annee', vivant: true });
        await expect(db.query('select accepter_contribution($1)', [c.id])).rejects.toThrow(/déjà été traitée/);
    });
    it('une proposition qui créerait une absurdité est refusée EN BLOC (rien de créé)', async () => {
        await utilisateur(db, editeur);
        const vieux = await individu('Ancêtre 1700', { vivant: false, naissance: '1700-01-01', deces: '1760-01-01' });
        await anonyme(db, '203.0.113.60');
        const envoi = await une<{ r: { ok: boolean; id: string } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb) as r`, [
            jeton, JSON.stringify({ contributeur: { prenom: 'Zoé', naissance_annee: 1990 }, lien: { relation: 'enfant', individu_id: vieux } }),
        ]);
        await utilisateur(db, editeur);
        const avant = (await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n;
        await expect(db.query('select accepter_contribution($1)', [envoi.r.id])).rejects.toThrow(/plus d'un an après la mort/);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from individus')).n).toBe(avant);
        expect(await une(db, 'select statut from contributions where id = $1', [envoi.r.id])).toEqual({ statut: 'en_attente' });
        await db.query(`select refuser_contribution($1, 'dates impossibles')`, [envoi.r.id]);
    });
    it('frère / sœur : relié aux MÊMES parents, même nature, même foyer ; proches ajoutés', async () => {
        await utilisateur(db, editeur);
        const pere = await individu('Émile', { vivant: false });
        const mereAdoptive = await individu('Rita', { vivant: false });
        const frere = await individu('Lucien', { vivant: false });
        await lien(pere, frere);
        await lien(mereAdoptive, frere, 'adoptive');
        await anonyme(db, '203.0.113.77');
        const envoi = await une<{ r: { ok: boolean; id: string } }>(db, `select soumettre_contribution($1, '2468', $2::jsonb, 'tel 0692') as r`, [
            jeton, JSON.stringify({ contributeur: { prenom: 'Paul' }, lien: { relation: 'frere_soeur', individu_id: frere }, proches: [{ prenom: 'Léa', relation: 'enfant' }, { prenom: 'Nora', relation: 'conjoint' }] }),
        ]);
        expect(envoi.r.ok).toBe(true);
        await utilisateur(db, editeur);
        const r = await une<{ r: { individu_id: string; individus_crees: number } }>(db, 'select accepter_contribution($1) as r', [envoi.r.id]);
        expect(r.r.individus_crees).toBe(3);
        expect(await toutes(db, 'select parent_id, nature from filiations where enfant_id = $1 order by nature', [r.r.individu_id]))
            .toEqual([{ parent_id: mereAdoptive, nature: 'adoptive' }, { parent_id: pere, nature: 'biologique' }]);
        expect((await une<{ n: number }>(db, 'select count(*)::int as n from unions where $1 in (partenaire_a, partenaire_b)', [r.r.individu_id])).n).toBe(1);
    });
    it('refuser garde une trace ; une proposition en attente ne se supprime pas ; partage fermé = plus rien n\'entre', async () => {
        await admin(db);
        const c = await une<{ id: string }>(db, `select id from contributions where statut = 'en_attente' limit 1`);
        await utilisateur(db, editeur);
        expect((await db.query('delete from contributions where id = $1', [c.id])).affectedRows).toBe(0);
        await db.query(`select refuser_contribution($1, 'robot')`, [c.id]);
        expect(await une(db, 'select statut, motif from contributions where id = $1', [c.id])).toEqual({ statut: 'refusee', motif: 'robot' });
        await db.query('update invitations set ferme = true where jeton = $1', [jeton]);
        await anonyme(db, '203.0.113.99');
        expect((await une<{ r: unknown }>(db, `select soumettre_contribution($1, '2468', '{"contributeur":{"prenom":"Tard"},"lien":{"relation":"inconnu"}}'::jsonb) as r`, [jeton])).r)
            .toEqual({ ok: false, raison: 'lien_ferme' });
        await utilisateur(db, proprietaire);
        await db.query(`select creer_invitation($1, 'Nouveau partage')`, [arbre]); // fermé → on peut en ouvrir un autre
    });
    it('rouvrir ou prolonger un partage respecte la même limite (pas de contournement)', async () => {
        await utilisateur(db, proprietaire);
        const ouvert = await toutes<{ id: string }>(db, 'select id from invitations where arbre_id = $1 and not ferme and expire_le > now()', [arbre]);
        expect(ouvert).toHaveLength(1);
        const ferme = await une<{ id: string }>(db, 'select id from invitations where arbre_id = $1 and ferme limit 1', [arbre]);
        await expect(db.query('update invitations set ferme = false where id = $1', [ferme.id])).rejects.toThrow(/1 partage ouvert/);
        await expect(db.query(`update invitations set expire_le = now() + interval '2 years' where id = $1`, [ouvert[0].id])).rejects.toThrow(/365 jours/);
        // fermer l'ouvert, puis rouvrir l'ancien : permis
        await db.query('update invitations set ferme = true where id = $1', [ouvert[0].id]);
        await db.query('update invitations set ferme = false where id = $1', [ferme.id]);
        await db.query('update invitations set ferme = true where id = $1', [ferme.id]);
        await db.query('update invitations set ferme = false where id = $1', [ouvert[0].id]);
    });
    it('un partage expiré se ferme tout seul', async () => {
        await admin(db);
        const j = await une<{ jeton: string }>(db, `insert into invitations (arbre_id, cree_par, expire_le) values ($1, $2, now() - interval '1 minute') returning jeton`, [arbre, proprietaire]);
        await anonyme(db);
        expect((await une<{ r: unknown }>(db, 'select invitation_publique($1) as r', [j.jeton])).r).toEqual({ ok: false, raison: 'lien_ferme' });
    });
});

// ---------------------------------------------------------------------
describe('patrimoine : documents, publication, tourisme de racines', () => {
    let commune: string;
    let maire: string;
    let illustre: string;
    let vivant: string;
    let docPublic: string;
    let docPrive: string;
    beforeAll(async () => {
        maire = await creerCompte(db, 'patrimoine@mairie-saint-paul.re');
        await utilisateur(db, maire);
        commune = await nouvelArbre('Familles de Saint-Paul');
    });
    it('offre gratuite : 50 documents au plus', async () => {
        await utilisateur(db, maire);
        await db.query(`insert into documents (arbre_id, titre) select $1, 'Doc ' || g from generate_series(1, 50) g`, [commune]);
        await expect(db.query(`insert into documents (arbre_id, titre) values ($1, 'Le 51e')`, [commune])).rejects.toThrow(/50 documents/);
        await db.query(`delete from documents where arbre_id = $1`, [commune]);
    });
    it('publication réservée à la licence collectivité, avec une adresse valide', async () => {
        await utilisateur(db, maire);
        await expect(db.query(`update arbres set public_patrimoine = true, slug = 'saint-paul' where id = $1`, [commune])).rejects.toThrow(/licence collectivité/);
        await licence(maire, 'institution');
        await utilisateur(db, maire);
        await expect(db.query(`update arbres set public_patrimoine = true where id = $1`, [commune])).rejects.toThrow(/adresse/);
        await expect(db.query(`update arbres set slug = 'Saint Paul!' where id = $1`, [commune])).rejects.toThrow();
        await db.query(`update arbres set public_patrimoine = true, slug = 'saint-paul', territoire = 'Saint-Paul (La Réunion)', centre_lat = -21.01, centre_lng = 55.27 where id = $1`, [commune]);
    });
    it('documents géolocalisés : coordonnées valides, adresse https seulement', async () => {
        await utilisateur(db, maire);
        await expect(db.query(`insert into documents (arbre_id, titre, url) values ($1, 'Lien', 'javascript:alert(1)')`, [commune])).rejects.toThrow();
        await expect(db.query(`insert into documents (arbre_id, titre, lat, lng) values ($1, 'Hors carte', 95, 10)`, [commune])).rejects.toThrow();
        illustre = await individu('Héloïse', { nom: 'Érembert', vivant: false, naissance: '1850-06-15', illustre: true, lieu_naissance: 'Saint-Denis', naissance_lat: -20.88, naissance_lng: 55.45, thematiques: ['Résistance'], biographie: 'Héroïne de la guerre de 1870.' }, commune);
        vivant = await individu('Vivant', { nom: 'Érembert' }, commune);
        docPublic = (await une<{ id: string }>(db, `insert into documents (arbre_id, titre, type, lat, lng, url, cote, source, public) values ($1, 'Registre des naissances 1850', 'registre', -20.88, 55.45, 'https://archives.example.re/1850', 'E 1850', 'AD974', true) returning id`, [commune])).id;
        docPrive = (await une<{ id: string }>(db, `insert into documents (arbre_id, titre, public) values ($1, 'Note interne', false) returning id`, [commune])).id;
        await db.query('insert into document_individus (document_id, individu_id, arbre_id) values ($1,$2,$3), ($4,$2,$3)', [docPublic, illustre, commune, docPrive]);
        await db.query(`insert into familles_historiques (arbre_id, nom, resume, origine) values ($1, 'Érembert', 'Famille de Saint-Denis', 'Réunion')`, [commune]);
        await expect(db.query(`insert into familles_historiques (arbre_id, nom) values ($1, 'EREMBERT')`, [commune])).rejects.toThrow(); // même famille, autre graphie
    });
    it('le visiteur (anon) voit l\'espace, cherche sans accents, filtre ; jamais un vivant, jamais un document privé', async () => {
        await anonyme(db, '192.0.2.200');
        const esp = (await une<{ r: Record<string, unknown> }>(db, `select patrimoine_public('saint-paul') as r`)).r;
        expect(esp).toMatchObject({ ok: true, nom: 'Familles de Saint-Paul', individus: 1, illustres: 1, documents: 1, thematiques: ['résistance'] });
        const cherche = async (texte: string | null, them: string | null = null, ill = false, fam: string | null = null) =>
            (await une<{ r: { resultats: { id: string }[] } }>(db, 'select patrimoine_recherche($1, $2, $3, $4, $5) as r', ['saint-paul', texte, them, ill, fam])).r.resultats.map((x) => x.id);
        expect(await cherche('EREMBERT héloïse')).toEqual([illustre]);
        expect(await cherche('érembert')).toEqual([illustre]);
        expect(await cherche(null, 'RÉSISTANCE'.toLowerCase())).toEqual([illustre]);
        expect(await cherche(null, null, true)).toEqual([illustre]);
        expect(await cherche(null, null, false, 'ÉREMBERT')).toEqual([illustre]);
        expect(await cherche('%')).toEqual([]); // le joker n'ouvre rien de plus (pas d'injection de motif)
        expect(await cherche('_')).toEqual([]);
        expect(await cherche('!')).toEqual([]); // le caractère d'échappement lui-même
        expect(await cherche('e%t')).toEqual([]); // « e%t » n'est pas « e…t »
        expect(await cherche('rember')).toEqual([illustre]); // la recherche partielle marche toujours
        expect(await cherche(null)).not.toContain(vivant);
        const notice = (await une<{ r: { ok: boolean; documents: { id: string }[]; individu: { biographie: string } } }>(db, 'select patrimoine_individu($1, $2) as r', ['saint-paul', illustre])).r;
        expect(notice.ok).toBe(true);
        expect(notice.individu.biographie).toContain('1870');
        expect(notice.documents.map((d) => d.id)).toEqual([docPublic]);
        expect((await une<{ r: { ok: boolean } }>(db, 'select patrimoine_individu($1, $2) as r', ['saint-paul', vivant])).r.ok).toBe(false);
        const carte = (await une<{ r: { documents: unknown[]; naissances: unknown[] } }>(db, `select patrimoine_carte('saint-paul') as r`)).r;
        expect(carte.documents).toHaveLength(1);
        expect(carte.naissances).toHaveLength(1);
        expect((await une<{ r: unknown }>(db, `select patrimoine_public('arbre-prive') as r`)).r).toEqual({ ok: false, raison: 'introuvable' });
    });
    it('un arbre familial non publié reste invisible par l\'espace patrimonial', async () => {
        await utilisateur(db, proprietaire);
        await expect(db.query(`update arbres set public_patrimoine = true, slug = 'famille-fictive' where id = $1`, [arbre])).rejects.toThrow(/licence collectivité/);
    });
    it('export certifié : réservé à la licence ; l\'empreinte est celle du texte ; vérifiable ; un octet changé = invalide', async () => {
        await utilisateur(db, proprietaire);
        await expect(db.query('select exporter_patrimoine($1)', [arbre])).rejects.toThrow(/licence collectivité/);
        await utilisateur(db, maire);
        const ex = (await une<{ r: { empreinte: string; texte: string; nb_individus: number } }>(db, 'select exporter_patrimoine($1) as r', [commune])).r;
        expect(ex.nb_individus).toBe(1); // le vivant n'est pas exporté
        expect(ex.texte).not.toContain('Vivant');
        expect(createHash('sha256').update(ex.texte, 'utf8').digest('hex')).toBe(ex.empreinte);
        await anonyme(db);
        expect((await une<{ r: { valide: boolean; arbre: string } }>(db, 'select verifier_export($1) as r', [ex.empreinte.toUpperCase()])).r).toMatchObject({ valide: true, arbre: 'Familles de Saint-Paul' });
        const falsifie = createHash('sha256').update(ex.texte.replace('Héloïse', 'Héloïsf'), 'utf8').digest('hex');
        expect((await une<{ r: unknown }>(db, 'select verifier_export($1) as r', [falsifie])).r).toEqual({ valide: false });
    });
    it('licence arrivée à échéance : la publication s\'arrête d\'elle-même', async () => {
        await licence(maire, 'institution', '-1 day');
        await anonyme(db);
        expect((await une<{ r: unknown }>(db, `select patrimoine_public('saint-paul') as r`)).r).toEqual({ ok: false, raison: 'introuvable' });
        await licence(maire, 'institution');
    });
});

// ---------------------------------------------------------------------
describe('tableau « mes arbres » (multi-arbres)', () => {
    it('chaque membre voit SES arbres et leurs chiffres ; le lecteur n\'a pas les chiffres réservés aux éditeurs ; l\'étranger ne voit rien', async () => {
        await utilisateur(db, proprietaire);
        const miens = await toutes<{ nom: string; role: string; individus: number; propositions_en_attente: number | null }>(db, 'select nom, role, individus::int, propositions_en_attente::int from mes_arbres()');
        const fictive = miens.find((a) => a.nom === 'Famille Fictive')!;
        expect(fictive.role).toBe('proprietaire');
        expect(fictive.individus).toBe((await une<{ n: number }>(db, 'select count(*)::int as n from individus where arbre_id = $1', [arbre])).n);
        expect(fictive.propositions_en_attente).not.toBeNull();
        expect(miens.length).toBeGreaterThan(1); // plusieurs arbres
        await utilisateur(db, lecteur);
        expect(await toutes(db, 'select nom, role, propositions_en_attente, partages_ouverts from mes_arbres()'))
            .toEqual([{ nom: 'Famille Fictive', role: 'lecteur', propositions_en_attente: null, partages_ouverts: null }]);
        await utilisateur(db, etranger);
        expect(await toutes(db, 'select * from mes_arbres()')).toEqual([]);
        await anonyme(db);
        await expect(db.query('select * from mes_arbres()')).rejects.toThrow(/permission denied/);
    });
});

describe('offres : gratuit / famille', () => {
    it('500 individus au plus en gratuit ; le client ne s\'offre pas l\'abonnement ; l\'offre Famille lève la limite', async () => {
        await utilisateur(db, proprietaire);
        const grand = await nouvelArbre('Grand arbre');
        await db.query(`insert into individus (arbre_id, prenom) select $1, 'P' || g from generate_series(1, 500) g`, [grand]);
        await expect(individu('Le 501e', {}, grand)).rejects.toThrow(/500 individus/);
        expect((await une<{ e: Record<string, unknown> }>(db, 'select etat_offre($1) as e', [grand])).e).toMatchObject({ offre: 'gratuit', individus: 500, max_individus: 500 });
        await expect(db.query(`insert into abonnements (utilisateur, offre) values ($1, 'famille')`, [proprietaire])).rejects.toThrow(/permission denied/);
        await licence(proprietaire, 'famille');
        await utilisateur(db, proprietaire);
        await individu('Le 501e', {}, grand);
        expect((await une<{ e: { offre: string } }>(db, 'select etat_offre($1) as e', [grand])).e.offre).toBe('famille');
    });
});
