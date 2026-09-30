// ---- ÉCRITURES ----
// Chaque geste de l'interface passe par une fonction d'ici. Les ajouts qui
// touchent deux tables passent par une fonction de la base « tout ou rien »
// (ajouter_individu_lie, creer_foyer, rattacher_au_foyer).

import { supabase } from '../lib/supabase';
import { ecrire } from './arbre';
import type { Id, NatureFiliation } from '../domaine/types';
import type { LienFratrie } from '../domaine/coherence';
import type { IndividuPourBase, UnionPourBase } from '../domaine/validation';

export async function creerArbre(nom: string): Promise<Id> {
    const r = await ecrire(supabase.from('arbres').insert({ nom: nom.trim() }).select('id').single());
    return (r as { id: Id }).id;
}

export const renommerArbre = (id: Id, nom: string) => ecrire(supabase.from('arbres').update({ nom: nom.trim() }).eq('id', id));
export const supprimerArbre = (id: Id) => ecrire(supabase.from('arbres').delete().eq('id', id));

export type Relation = 'parent' | 'enfant' | 'conjoint' | 'aucun';

export async function ajouterIndividu(arbre: Id, individu: IndividuPourBase, relation: Relation = 'aucun', autre: Id | null = null, nature: NatureFiliation = 'biologique', union: UnionPourBase | null = null): Promise<Id> {
    const r = await ecrire(supabase.rpc('ajouter_individu_lie', {
        p_arbre: arbre, p: individu, p_relation: relation, p_autre: autre, p_nature: nature, p_union: union,
    }));
    return r as Id;
}

/** Frère ou sœur, existant (autre) ou nouveau (individu) — fonction de la base, tout ou rien. */
export async function ajouterFrereSoeur(arbre: Id, depuis: Id, nouveau: IndividuPourBase | null, existant: Id | null, lien: LienFratrie, parentCommun: Id | null): Promise<Id> {
    return (await ecrire(supabase.rpc('ajouter_frere_soeur', {
        p_arbre: arbre, p_individu: depuis, p: nouveau, p_existant: existant, p_lien: lien, p_parent_commun: parentCommun,
    }))) as Id;
}

/** Le parent « à trouver » est en fait `reel`, déjà dans l'arbre : ses liens passent sur lui (tout ou rien). */
export async function remplacerParentATrouver(aTrouver: Id, reel: Id): Promise<number> {
    return (await ecrire(supabase.rpc('remplacer_parent_a_trouver', { p_a_trouver: aTrouver, p_reel: reel }))) as number;
}

export const modifierIndividu = (id: Id, individu: IndividuPourBase) => ecrire(supabase.from('individus').update(individu).eq('id', id));
export const supprimerIndividu = (id: Id) => ecrire(supabase.from('individus').delete().eq('id', id));

export const lier = (arbre: Id, parent: Id, enfant: Id, nature: NatureFiliation) =>
    ecrire(supabase.from('filiations').insert({ arbre_id: arbre, parent_id: parent, enfant_id: enfant, nature }));
export const changerNature = (id: Id, nature: NatureFiliation) => ecrire(supabase.from('filiations').update({ nature }).eq('id', id));
export const delier = (id: Id) => ecrire(supabase.from('filiations').delete().eq('id', id));

export const unir = (arbre: Id, a: Id, b: Id, u: UnionPourBase) =>
    ecrire(supabase.from('unions').insert({ arbre_id: arbre, partenaire_a: a, partenaire_b: b, ...u }));
export const modifierUnion = (id: Id, u: UnionPourBase) => ecrire(supabase.from('unions').update(u).eq('id', id));
export const supprimerUnion = (id: Id) => ecrire(supabase.from('unions').delete().eq('id', id));

export async function creerFoyer(arbre: Id, libelle: string, forme: string, parents: Id[], qualites: string[]): Promise<Id> {
    const r = await ecrire(supabase.rpc('creer_foyer', { p_arbre: arbre, p_libelle: libelle, p_forme: forme, p_parents: parents, p_qualites: qualites }));
    return r as Id;
}
export const modifierFoyer = (id: Id, champs: { libelle: string; forme: string; notes: string | null }) => ecrire(supabase.from('foyers').update(champs).eq('id', id));
export const supprimerFoyer = (id: Id) => ecrire(supabase.from('foyers').delete().eq('id', id));
export const ajouterAuFoyer = (foyer: Id, arbre: Id, individu: Id, qualite: string | null) =>
    ecrire(supabase.from('foyer_parents').insert({ foyer_id: foyer, arbre_id: arbre, individu_id: individu, qualite }));
export const retirerDuFoyer = (foyer: Id, individu: Id) => ecrire(supabase.from('foyer_parents').delete().eq('foyer_id', foyer).eq('individu_id', individu));
export async function rattacherAuFoyer(foyer: Id, enfant: Id, nature: NatureFiliation): Promise<number> {
    return (await ecrire(supabase.rpc('rattacher_au_foyer', { p_foyer: foyer, p_enfant: enfant, p_nature: nature }))) as number;
}

// ---- FIN ÉCRITURES ----
