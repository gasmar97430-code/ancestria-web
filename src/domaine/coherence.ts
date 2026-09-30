// ---- COHÉRENCE DE L'ARBRE ----
// Le même contrôle que la base (supabase/schema.sql : controler_filiation,
// controler_union, incoherence_dates), fait AVANT l'envoi pour prévenir dès
// la saisie. La base reste le juge : si deux personnes écrivent en même
// temps, c'est elle qui tranche (verrou par arbre).
//
// Boucle : un lien parent → enfant en crée une si et seulement si le parent
// est déjà un descendant de l'enfant. Parcours en largeur avec ensemble des
// déjà vus : termine toujours, même sur une donnée abîmée ; coût linéaire
// en nombre de liens.

import { ajouter, dateMax } from './dates';
import type { DonneesArbre, Filiation, Id, Individu, NatureFiliation } from './types';

type Liens = Pick<Filiation, 'id' | 'parent_id' | 'enfant_id'>[];

function voisins(liens: Liens, sens: 'enfants' | 'parents', sauf?: Id): Map<Id, Id[]> {
    const m = new Map<Id, Id[]>();
    for (const l of liens) {
        if (sauf !== undefined && l.id === sauf) continue;
        const de = sens === 'enfants' ? l.parent_id : l.enfant_id;
        const vers = sens === 'enfants' ? l.enfant_id : l.parent_id;
        const liste = m.get(de);
        if (liste) liste.push(vers);
        else m.set(de, [vers]);
    }
    return m;
}

function parcourir(depart: Id, suivants: Map<Id, Id[]>): Set<Id> {
    const vus = new Set<Id>([depart]);
    const file = [depart];
    for (let i = 0; i < file.length; i++) {
        for (const v of suivants.get(file[i]) ?? []) {
            if (!vus.has(v)) {
                vus.add(v);
                file.push(v);
            }
        }
    }
    return vus;
}

/** Descendants d'un individu, lui compris (sauf : lien à ignorer, celui qu'on modifie). */
export function descendants(liens: Liens, id: Id, sauf?: Id): Set<Id> {
    return parcourir(id, voisins(liens, 'enfants', sauf));
}

/** Ascendants d'un individu, lui compris. */
export function ascendants(liens: Liens, id: Id, sauf?: Id): Set<Id> {
    return parcourir(id, voisins(liens, 'parents', sauf));
}

export function creeraitUneBoucle(liens: Liens, parent: Id, enfant: Id, sauf?: Id): boolean {
    return parent === enfant || descendants(liens, enfant, sauf).has(parent);
}

const nomComplet = (i: Pick<Individu, 'prenom' | 'nom'>) => `${i.prenom} ${i.nom}`.trim();

type DatesIndividu = Pick<Individu, 'prenom' | 'nom' | 'naissance' | 'naissance_precision' | 'deces' | 'deces_precision'>;

/** Absurdité de dates entre un parent et un enfant (null = cohérent). */
export function incoherenceDates(p: DatesIndividu, e: DatesIndividu, nature: NatureFiliation): string | null {
    if (p.naissance && e.naissance) {
        const eMax = dateMax(e.naissance, e.naissance_precision);
        if (p.naissance.slice(0, 10) > eMax) {
            return `${nomComplet(p)} est né(e) après ${nomComplet(e)} : il ou elle ne peut pas en être le parent.`;
        }
        if ((nature === 'biologique' || nature === 'don_gametes' || nature === 'gestation') && eMax < ajouter(p.naissance, 10)) {
            return `${nomComplet(p)} aurait eu moins de 10 ans à la naissance de ${nomComplet(e)}.`;
        }
    }
    if (p.deces && e.naissance) {
        const eNe = e.naissance.slice(0, 10);
        const mort = dateMax(p.deces, p.deces_precision);
        if ((nature === 'biologique' || nature === 'don_gametes') && eNe > ajouter(mort, 1)) {
            return `${nomComplet(e)} serait né(e) plus d’un an après la mort de son parent biologique ${nomComplet(p)}.`;
        }
        if (nature === 'gestation' && eNe > ajouter(mort, 0, 30)) {
            return `${nomComplet(e)} serait né(e) après la mort de la personne qui l’a porté(e).`;
        }
    }
    return null;
}

export interface LienPropose {
    parent: Id;
    enfant: Id;
    nature: NatureFiliation;
    /** En modification : l'id du lien modifié (il ne se compte pas lui-même). */
    idExistant?: Id;
}

/** Tous les contrôles d'un lien parent → enfant, dans l'ordre de la base. */
export function controlerFiliation(d: DonneesArbre, l: LienPropose): string | null {
    if (l.parent === l.enfant) return 'Une personne ne peut pas être son propre parent.';
    const parent = d.individus.find((i) => i.id === l.parent);
    const enfant = d.individus.find((i) => i.id === l.enfant);
    if (!parent || !enfant) return 'Personne introuvable dans cet arbre.';
    if (d.filiations.some((f) => f.parent_id === l.parent && f.enfant_id === l.enfant && f.id !== l.idExistant)) {
        return 'Ce lien existe déjà.';
    }
    if (creeraitUneBoucle(d.filiations, l.parent, l.enfant, l.idExistant)) {
        return 'Lien impossible : ce parent est déjà un descendant de cet enfant (boucle dans l’arbre).';
    }
    const asc = ascendants(d.filiations, l.parent, l.idExistant);
    const desc = descendants(d.filiations, l.enfant, l.idExistant);
    if (d.unions.some((u) => (asc.has(u.partenaire_a) && desc.has(u.partenaire_b)) || (asc.has(u.partenaire_b) && desc.has(u.partenaire_a)))) {
        return 'Lien impossible : il ferait d’un couple de l’arbre un ascendant et son descendant.';
    }
    const dates = incoherenceDates(parent, enfant, l.nature);
    if (dates) return dates;
    if (l.nature === 'biologique') {
        const bio = d.filiations.filter((f) => f.enfant_id === l.enfant && f.nature === 'biologique' && f.id !== l.idExistant).length;
        if (bio >= 2) {
            return 'Cet enfant a déjà deux parents biologiques : choisissez une autre nature de lien (adoptive, sociale, beau-parent, intention…).';
        }
    }
    return null;
}

/** Contrôles d'un couple (même règles que controler_union). */
export function controlerUnion(d: DonneesArbre, a: Id, b: Id, debut: string | null, idExistant?: Id): string | null {
    if (a === b) return 'Une personne ne peut pas former un couple avec elle-même.';
    const pa = d.individus.find((i) => i.id === a);
    const pb = d.individus.find((i) => i.id === b);
    if (!pa || !pb) return 'Personne introuvable dans cet arbre.';
    if (d.unions.some((u) => u.id !== idExistant && ((u.partenaire_a === a && u.partenaire_b === b) || (u.partenaire_a === b && u.partenaire_b === a)))) {
        return 'Ce couple existe déjà.';
    }
    if (descendants(d.filiations, a).has(b) || descendants(d.filiations, b).has(a)) {
        return 'Union impossible entre un ascendant et son descendant.';
    }
    if (debut) {
        if ((pa.naissance && debut < pa.naissance.slice(0, 10)) || (pb.naissance && debut < pb.naissance.slice(0, 10))) {
            return 'Une union ne peut pas commencer avant la naissance d’un des partenaires.';
        }
    }
    return null;
}

/** Contrôle d'une date corrigée APRÈS coup (même règle que recontroler_dates). */
export function controlerNouvellesDates(d: DonneesArbre, id: Id, dates: DatesIndividu): string | null {
    for (const f of d.filiations) {
        if (f.parent_id !== id && f.enfant_id !== id) continue;
        const p = f.parent_id === id ? dates : d.individus.find((i) => i.id === f.parent_id);
        const e = f.enfant_id === id ? dates : d.individus.find((i) => i.id === f.enfant_id);
        if (!p || !e) continue;
        const motif = incoherenceDates(p, e, f.nature);
        if (motif) return motif;
    }
    for (const u of d.unions) {
        if ((u.partenaire_a === id || u.partenaire_b === id) && u.debut && dates.naissance && u.debut < dates.naissance.slice(0, 10)) {
            return `${nomComplet(dates)} serait en union avant sa naissance.`;
        }
    }
    return null;
}

export type LienFratrie = 'germain' | 'demi' | 'adoptif';

/**
 * Frère ou sœur sans connaître les parents — mêmes règles, dans le même ordre,
 * que public.ajouter_frere_soeur :
 *   germain : mêmes parents (repris de celui qui en a ; sinon deux « à trouver ») ;
 *   demi    : un parent commun, choisi ; sinon un seul « à trouver » partagé ;
 *   adoptif : les parents de l'un, en lien « adoptive » pour l'autre.
 */
export function controlerFrereSoeur(d: DonneesArbre, id: Id, autre: Individu, lien: LienFratrie = 'germain', parentCommun: Id | null = null): string | null {
    if (id === autre.id) return 'Une personne ne peut pas être son propre frère ou sa propre sœur.';
    const dd: DonneesArbre = d.individus.some((i) => i.id === autre.id) ? d : { ...d, individus: [...d.individus, autre] };
    const pa = d.filiations.filter((f) => f.enfant_id === id);
    const pb = d.filiations.filter((f) => f.enfant_id === autre.id);

    if (lien === 'demi' && parentCommun) {
        const deA = pa.find((f) => f.parent_id === parentCommun);
        const deB = pb.find((f) => f.parent_id === parentCommun);
        if (!deA && !deB) return 'Le parent commun choisi n’est le parent d’aucun des deux.';
        if (deA && deB) return 'Ils ont déjà ce parent en commun.';
        const source = (deA ?? deB)!;
        return controlerFiliation(dd, { parent: parentCommun, enfant: deA ? autre.id : id, nature: source.nature });
    }
    if (pa.some((x) => pb.some((y) => y.parent_id === x.parent_id))) return 'Ils ont déjà un parent en commun : ils sont déjà frère et sœur.';
    if (lien === 'demi') {
        // un parent « à trouver » (lien biologique) pour chacun : pas au-delà de deux parents biologiques
        for (const e of [id, autre.id]) {
            if (d.filiations.filter((f) => f.enfant_id === e && f.nature === 'biologique').length >= 2) {
                return 'Cet enfant a déjà deux parents biologiques : choisissez une autre nature de lien (adoptive, sociale, beau-parent, intention…).';
            }
        }
        return null;
    }
    if (pa.length && pb.length) {
        return 'Chacun a déjà ses parents, différents : choisissez « demi-frère / demi-sœur » (un parent en commun), ou reliez-les par + Parent.';
    }
    if (pa.length || pb.length) {
        const [liens, cible] = pa.length ? [pa, autre.id] : [pb, id];
        for (const f of liens) {
            const motif = controlerFiliation(dd, { parent: f.parent_id, enfant: cible, nature: lien === 'adoptif' ? 'adoptive' : f.nature });
            if (motif) return motif;
        }
    }
    return null; // personne n'a de parents : des parents « à trouver » sont posés, toujours possible
}

/** Frères et sœurs : au moins un parent en commun ; « demi » s'ils n'ont pas tous les mêmes. */
export function fratrie(d: DonneesArbre, id: Id): { individu: Individu; demi: boolean }[] {
    const mes = new Set(d.filiations.filter((f) => f.enfant_id === id).map((f) => f.parent_id));
    if (mes.size === 0) return [];
    const parentsDe = new Map<Id, Set<Id>>();
    for (const f of d.filiations) {
        if (!parentsDe.has(f.enfant_id)) parentsDe.set(f.enfant_id, new Set());
        parentsDe.get(f.enfant_id)!.add(f.parent_id);
    }
    const r: { individu: Individu; demi: boolean }[] = [];
    for (const i of d.individus) {
        if (i.id === id) continue;
        const ses = parentsDe.get(i.id);
        if (!ses || ![...ses].some((p) => mes.has(p))) continue;
        const memes = ses.size === mes.size && [...ses].every((p) => mes.has(p));
        r.push({ individu: i, demi: !memes });
    }
    return r;
}

/** Personnes qu'on peut proposer comme parent de `enfant` sans boucle ni doublon. */
export function parentsPossibles(d: DonneesArbre, enfant: Id): Individu[] {
    const interdits = descendants(d.filiations, enfant);
    const deja = new Set(d.filiations.filter((f) => f.enfant_id === enfant).map((f) => f.parent_id));
    return d.individus.filter((i) => !interdits.has(i.id) && !deja.has(i.id));
}

/** Personnes qu'on peut proposer comme enfant de `parent`. */
export function enfantsPossibles(d: DonneesArbre, parent: Id): Individu[] {
    const interdits = ascendants(d.filiations, parent);
    const deja = new Set(d.filiations.filter((f) => f.parent_id === parent).map((f) => f.enfant_id));
    return d.individus.filter((i) => !interdits.has(i.id) && !deja.has(i.id));
}

// ---- FIN COHÉRENCE DE L'ARBRE ----
