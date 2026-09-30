// PARITÉ : le contrôle de l'écran (src/domaine/coherence.ts) et celui de la
// base (déclencheurs PostgreSQL) doivent rendre le MÊME verdict, pour chaque
// lien, couple ou date corrigée proposé sur des arbres tirés au hasard.
// Graines fixes : un échec se rejoue à l'identique.
import { describe, expect, it } from 'vitest';
import { controlerFiliation, controlerFrereSoeur, controlerNouvellesDates, controlerUnion, type LienFratrie } from '../../src/domaine/coherence';
import { NATURES_FILIATION, type DonneesArbre, type Filiation, type Individu, type NatureFiliation, type Precision, type Union } from '../../src/domaine/types';
import { admin, creerCompte, nouvelleBase, toutes, une, utilisateur } from './harnais';

function hasard(graine: number) {
    let a = graine >>> 0;
    const suivant = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        entier: (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1)),
        choix: <T,>(t: readonly T[]) => t[Math.floor(suivant() * t.length)],
        vrai: (p: number) => suivant() < p,
    };
}

const deux = (n: number) => String(n).padStart(2, '0');

describe('parité écran / base sur des arbres tirés au hasard', () => {
    for (const graine of [1, 7, 42, 1848, 2026]) {
        it(`graine ${graine} : mêmes verdicts pour ~420 propositions`, async () => {
            const h = hasard(graine);
            const db = await nouvelleBase();
            const moi = await creerCompte(db, `p${graine}@exemple.re`);
            await utilisateur(db, moi);
            const arbre = (await une<{ id: string }>(db, `insert into arbres (nom) values ('Parité') returning id`)).id;

            const d: DonneesArbre = { individus: [], unions: [], foyers: [], foyerParents: [], filiations: [] };
            const dateAuHasard = (): { date: string | null; precision: Precision } => {
                if (h.vrai(0.25)) return { date: null, precision: 'jour' };
                const precision: Precision = h.vrai(0.3) ? 'annee' : 'jour';
                const a = h.entier(1800, 2010);
                return { date: precision === 'annee' ? `${a}-01-01` : `${a}-${deux(h.entier(1, 12))}-${deux(h.entier(1, 28))}`, precision };
            };

            for (let i = 0; i < 40; i++) {
                const n = dateAuHasard();
                let deces: { date: string | null; precision: Precision } = { date: null, precision: 'jour' };
                if (n.date && h.vrai(0.5)) {
                    const a = Number(n.date.slice(0, 4)) + h.entier(0, 90);
                    if (a <= 2025) deces = h.vrai(0.3) ? { date: `${a}-01-01`, precision: 'annee' } : { date: `${a}-${deux(h.entier(1, 12))}-${deux(h.entier(1, 28))}`, precision: 'jour' };
                    if (deces.date && deces.precision === 'jour' && deces.date < n.date) deces = { date: null, precision: 'jour' };
                }
                const r = await une<Individu>(db, `insert into individus (arbre_id, prenom, nom, naissance, naissance_precision, deces, deces_precision)
                    values ($1, $2, 'Hasard', $3, $4, $5, $6)
                    returning id, arbre_id, prenom, nom, genre, se_nomme, to_char(naissance, 'YYYY-MM-DD') as naissance, naissance_precision,
                              to_char(deces, 'YYYY-MM-DD') as deces, deces_precision, vivant`,
                    [arbre, `P${i}`, n.date, n.precision, deces.date, deces.precision]);
                d.individus.push(r);
            }

            const relire = async () => {
                d.individus = await toutes<Individu>(db, `select id, arbre_id, prenom, nom, genre, se_nomme, to_char(naissance, 'YYYY-MM-DD') as naissance, naissance_precision,
                    to_char(deces, 'YYYY-MM-DD') as deces, deces_precision, vivant from individus where arbre_id = $1 order by cree_le, id`, [arbre]);
                d.filiations = await toutes<Filiation>(db, 'select * from filiations where arbre_id = $1', [arbre]);
            };
            const fratries = { total: 0, acceptees: 0 };
            let accords = 0;
            let refusesDesDeux = 0;
            for (let essai = 0; essai < 420; essai++) {
                const x = h.choix(d.individus);
                const y = h.choix(d.individus);
                const genre = h.entier(1, 10);
                let ecran: string | null;
                let base: string | null = null;
                if (genre >= 9) {
                    // FRÈRE / SŒUR : germain, demi (parent commun juste, faux, ou inconnu), adoptif
                    const lien: LienFratrie = h.choix(['germain', 'demi', 'adoptif'] as const);
                    const parentsXY = d.filiations.filter((f) => f.enfant_id === x.id || f.enfant_id === y.id).map((f) => f.parent_id);
                    const commun = lien === 'demi' && h.vrai(0.6) ? (h.vrai(0.8) && parentsXY.length ? h.choix(parentsXY) : h.choix(d.individus).id) : null;
                    ecran = controlerFrereSoeur(d, x.id, y, lien, commun);
                    fratries.total++;
                    try {
                        await db.query('select ajouter_frere_soeur($1, $2, null, $3, $4, $5)', [arbre, x.id, y.id, lien, commun]);
                        fratries.acceptees++;
                        await relire(); // des parents « à trouver » ont pu être créés
                    } catch (e) {
                        base = (e as Error).message;
                    }
                } else if (genre <= 5) {
                    const nature: NatureFiliation = h.vrai(0.6) ? 'biologique' : h.choix(NATURES_FILIATION);
                    ecran = controlerFiliation(d, { parent: x.id, enfant: y.id, nature });
                    try {
                        const f = await une<Filiation>(db, 'insert into filiations (arbre_id, parent_id, enfant_id, nature) values ($1,$2,$3,$4) returning *', [arbre, x.id, y.id, nature]);
                        d.filiations.push(f);
                    } catch (e) {
                        base = (e as Error).message;
                    }
                } else if (genre <= 7) {
                    const debut = h.vrai(0.5) ? `${h.entier(1820, 2020)}-06-15` : null;
                    ecran = controlerUnion(d, x.id, y.id, debut);
                    try {
                        // dates rendues en texte AAAA-MM-JJ, comme les rend Supabase (PGlite rendrait un objet Date)
                        const u = await une<Union>(db, `insert into unions (arbre_id, partenaire_a, partenaire_b, debut) values ($1,$2,$3,$4)
                            returning id, arbre_id, partenaire_a, partenaire_b, nature, statut, to_char(debut, 'YYYY-MM-DD') as debut, to_char(fin, 'YYYY-MM-DD') as fin`, [arbre, x.id, y.id, debut]);
                        d.unions.push(u);
                    } catch (e) {
                        base = (e as Error).message;
                    }
                } else {
                    const n = dateAuHasard();
                    const nouvelles = { ...x, naissance: n.date, naissance_precision: n.precision };
                    const dateDeces = x.deces ? (x.deces_precision === 'annee' ? `${x.deces.slice(0, 4)}-12-31` : x.deces) : null;
                    // la contrainte « décès après naissance » est une règle de la fiche elle-même : l'écran la vérifie aussi
                    ecran = n.date && dateDeces && n.date > dateDeces ? 'décès avant naissance' : controlerNouvellesDates(d, x.id, nouvelles);
                    try {
                        await db.query('update individus set naissance = $1, naissance_precision = $2 where id = $3', [n.date, n.precision, x.id]);
                        Object.assign(x, { naissance: n.date, naissance_precision: n.precision });
                    } catch (e) {
                        base = (e as Error).message;
                    }
                }
                const verdictEcran = ecran === null ? 'accepté' : 'refusé';
                const verdictBase = base === null ? 'accepté' : 'refusé';
                expect(`${verdictEcran}`, `essai ${essai} : écran « ${ecran} » / base « ${base} »`).toBe(verdictBase);
                accords++;
                if (base) refusesDesDeux++;
            }
            // l'essai n'est probant que s'il a vu des deux sortes de verdicts, en nombre
            expect(accords).toBe(420);
            expect(refusesDesDeux).toBeGreaterThan(60);
            expect(420 - refusesDesDeux).toBeGreaterThan(60);
            // les frères et sœurs aussi, dans les deux sens
            expect(fratries.total).toBeGreaterThan(50);
            expect(fratries.acceptees).toBeGreaterThan(10);
            expect(fratries.total - fratries.acceptees).toBeGreaterThan(10);
            await admin(db);
        });
    }
});
