// ---- IMPORT GEDCOM : FICHIER → LIGNES DU SITE ----
//
// Sa demande du 30/09/2026 : « j'ai déjà des arborescences toutes prêtes » —
// son arbre de l'Ancestria de bureau (bouton GEDCOM) doit passer dans le site.
// lecture.ts, dates.ts, interpretation.ts sont COPIÉS tels quels du bureau
// (backend/src/gedcom) ; ici, la seule traduction vers les tables du site :
//   INDI → individus ; FAM à deux parents → unions ; CHIL → filiations
//   (un lien par parent). Rien n'est deviné : ce qui n'a pas de colonne
//   (date approchée, baptême, profession…) est déjà rédigé en notes par
//   interpretation.ts ; ce qui dépasse une colonne va aussi en notes.
// Conventions du bureau reprises : une année seule est rangée au 1er janvier
// (précision « année ») ; « vivant » = ni décès ni DEAT, né il y a moins de
// 100 ans (même règle que l'export du bureau) ; « ? » = inconnu.

import { analyser, decoder, type Encodage } from './lecture';
import { interpreter, type Evenement, type ModeleGedcom } from './interpretation';
import type { Genre, NatureFiliation, NatureUnion, Precision, StatutUnion } from '../domaine/types';

export interface LigneIndividu {
    id: string;
    xref: string;
    prenom: string;
    nom: string;
    genre: Genre;
    naissance: string | null;
    naissance_precision: Precision;
    lieu_naissance: string | null;
    deces: string | null;
    deces_precision: Precision;
    lieu_deces: string | null;
    vivant: boolean;
    notes: string | null;
    cree_le: string;
}

export interface LigneUnion {
    partenaire_a: string;
    partenaire_b: string;
    nature: NatureUnion;
    statut: StatutUnion;
    debut: string | null;
    fin: string | null;
    /** Ordre du fichier (celui de la saisie au bureau) : l'arbre range dans cet ordre. */
    cree_le: string;
    /** Pour le rapport : « Jean Essai & Marie Essai ». */
    libelle: string;
}

export interface LigneFiliation {
    parent_id: string;
    enfant_id: string;
    nature: NatureFiliation;
    cree_le: string;
    libelle: string;
}

export interface PlanImport {
    encodage: Encodage;
    logiciel: string | null;
    version: string | null;
    individus: LigneIndividu[];
    unions: LigneUnion[];
    filiations: LigneFiliation[];
    /** Étiquettes du fichier non reprises (sources, médias…) : annoncées, jamais tues. */
    nonRepris: Record<string, number>;
    lignesIllisibles: number;
    /** Renvois vers une fiche absente du fichier (CHIL @I9@ sans INDI @I9@). */
    renvoisPerdus: number;
}

const LIMITES = { prenom: 80, nom: 80, lieu: 120, notes: 5000 };

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

function date(e: Evenement | null): { valeur: string | null; precision: Precision } {
    const d = e?.date;
    if (!d?.pourBase) return { valeur: null, precision: 'jour' };
    return { valeur: jourIso(d.pourBase), precision: d.exacte ? 'jour' : 'annee' };
}

const inconnu = (s: string) => s.trim() === '?';

/** Nom affichable pour le rapport. */
const nomDe = (p: { prenom: string; nom: string }) => [p.prenom, p.nom].filter((x) => x && !inconnu(x)).join(' ') || '?';

export function lireFichier(octets: Uint8Array): PlanImport {
    const { texte, encodage } = decoder(octets);
    const { racines, illisibles } = analyser(texte);
    return versWeb(interpreter(racines), encodage, illisibles);
}

export function versWeb(m: ModeleGedcom, encodage: Encodage, illisibles: number, maintenant = new Date(), nouvelId = () => crypto.randomUUID()): PlanImport {
    const centAns = new Date(maintenant);
    centAns.setUTCFullYear(centAns.getUTCFullYear() - 100);
    const idDe = new Map<string, string>();
    const parId = new Map<string, LigneIndividu>();
    const debut = maintenant.getTime();

    const individus = m.individus.map((p, k): LigneIndividu => {
        const notes = [...p.notes];
        const trop = (quoi: string, v: string, max: number) => {
            if (v.length <= max) return v;
            notes.push(`${quoi} complet : ${v}`);
            return v.slice(0, max);
        };
        const lieu = (quoi: string, v: string | null | undefined) => {
            if (!v) return null;
            if (v.length <= LIMITES.lieu) return v;
            notes.push(`${quoi} : ${v}`);
            return v.slice(0, LIMITES.lieu);
        };
        const n = date(p.naissance);
        const d = date(p.deces);
        const decede = p.decede === true || !!d.valeur;
        const vieux = !!p.naissance?.date.pourBase && p.naissance.date.pourBase <= centAns;
        const prenom = trop('Prénom', p.prenom.trim() || '?', LIMITES.prenom);
        // « ? » en nom = nom inconnu : le site range l'inconnu en nom vide.
        const nom = inconnu(p.nom) ? '' : trop('Nom', p.nom.trim(), LIMITES.nom);
        let texteNotes = notes.filter(Boolean).join('\n');
        if (texteNotes.length > LIMITES.notes) texteNotes = texteNotes.slice(0, LIMITES.notes - 40) + '\n[notes coupées à l’import : trop longues]';
        const ligne: LigneIndividu = {
            id: nouvelId(),
            xref: p.xref,
            prenom,
            nom,
            genre: p.genre === 'M' ? 'homme' : p.genre === 'F' ? 'femme' : 'inconnu',
            naissance: n.valeur,
            naissance_precision: n.precision,
            lieu_naissance: lieu('Lieu de naissance', p.naissance?.lieu),
            deces: d.valeur,
            deces_precision: d.precision,
            lieu_deces: lieu('Lieu de décès', p.deces?.lieu),
            vivant: !decede && !vieux,
            notes: texteNotes || null,
            // L'ordre du fichier (celui des fiches du bureau) sert d'ordre de rangement dans l'arbre.
            cree_le: new Date(debut + k).toISOString(),
        };
        idDe.set(p.xref, ligne.id);
        parId.set(ligne.id, ligne);
        return ligne;
    });

    let renvoisPerdus = 0;
    const id = (x: string | null) => {
        if (!x) return null;
        const v = idDe.get(x);
        if (!v) renvoisPerdus += 1;
        return v ?? null;
    };
    const libelle = (i: string) => nomDe(parId.get(i)!);

    const unions: LigneUnion[] = [];
    const filiations: LigneFiliation[] = [];
    const dejaLie = new Set<string>();
    const couples = new Set<string>();
    for (const f of m.familles) {
        const a = id(f.parent1);
        const b = id(f.parent2);
        // Deux FAM pour le même couple (fratries saisies à part) : un seul couple sur le site.
        const paire = a && b ? [a, b].sort().join('|') : '';
        if (a && b && a !== b && !couples.has(paire)) {
            couples.add(paire);
            const mariage = f.mariage?.date.pourBase ? jourIso(f.mariage.date.pourBase) : null;
            const divorce = f.divorce ? (f.divorce.date.pourBase ? jourIso(f.divorce.date.pourBase) : null) : null;
            unions.push({
                partenaire_a: a,
                partenaire_b: b,
                // MARR = mariage ; sans MARR, la nature du couple n'est pas dite : « autre ».
                nature: f.mariage ? 'mariage' : 'autre',
                statut: f.divorce ? 'divorces' : f.notes.some((t) => /couple séparé/i.test(t)) ? 'separes' : 'en_cours',
                debut: mariage,
                fin: divorce,
                cree_le: new Date(debut + m.individus.length + unions.length).toISOString(),
                libelle: `${libelle(a)} & ${libelle(b)}`,
            });
        }
        for (const c of f.enfants) {
            const e = id(c.xref);
            if (!e) continue;
            for (const p of [a, b]) {
                if (!p || p === e) continue;
                const cle = `${p}>${e}`;
                if (dejaLie.has(cle)) continue;
                dejaLie.add(cle);
                filiations.push({
                    parent_id: p,
                    enfant_id: e,
                    nature: c.lien === 'Adoptive' ? 'adoptive' : c.lien === 'autre' ? 'sociale' : 'biologique',
                    cree_le: new Date(debut + m.individus.length + m.familles.length + filiations.length).toISOString(),
                    libelle: `${libelle(p)} → ${libelle(e)}`,
                });
            }
        }
    }

    return {
        encodage,
        logiciel: m.logiciel,
        version: m.version,
        individus,
        unions,
        filiations,
        nonRepris: m.nonRepris,
        lignesIllisibles: illisibles,
        renvoisPerdus,
    };
}

// ---- FIN IMPORT GEDCOM : FICHIER → LIGNES DU SITE ----
