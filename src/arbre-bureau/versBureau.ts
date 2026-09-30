// ---- DONNÉES EN LIGNE → FORMAT DE L'ANCESTRIA DE BUREAU ----
//
// Les pièces de l'arbre du bureau (copiées telles quelles dans arbre-bureau/)
// attendent ses données : identifiants entiers, genre M/F, typeLien
// Biological/Adoptive/Step, typeUnion Marriage/… Ici, la seule traduction ;
// aucune pièce copiée n'est modifiée.
// Numéros : dans l'ordre de création des fiches (comme les numéros de fiche du
// bureau, qui servent d'ordre de rangement quand rien d'autre n'est dit).

import type { DonneesArbre, Id as IdWeb, Individu as IndividuWeb } from '../domaine/types';
import { PARENT_A_TROUVER } from '../domaine/libelles';
import type { Individu, UnionComplete } from './features/tree/graphe';
import type { Relationship, UnionChild } from './types';

export type IndividuBureau = Individu & { decede: boolean | null; aTrouver: boolean };

const GENRE: Record<string, string> = { homme: 'M', femme: 'F', non_binaire: 'Other', inconnu: 'Unknown' };
const LIEN: Record<string, string> = {
    biologique: 'Biological', don_gametes: 'Biological', gestation: 'Biological',
    adoptive: 'Adoptive', legale: 'Adoptive', sociale: 'Adoptive', intention: 'Adoptive',
    beau_parent: 'Step', accueil: 'Step',
};
const UNION: Record<string, string> = { mariage: 'Marriage', pacs: 'Civil_Partnership', union_libre: 'Informal' };
const STATUT: Record<string, string> = { en_cours: 'Active', separes: 'Separated', divorces: 'Divorced', veuvage: 'Widowed' };

export interface Traduction {
    people: IndividuBureau[];
    unions: UnionComplete[];
    relationships: Relationship[];
    unionChildren: UnionChild[];
    versWeb: Map<number, IdWeb>;
    versBureau: Map<IdWeb, number>;
}

export function versBureau(d: DonneesArbre): Traduction {
    const tries: IndividuWeb[] = [...d.individus].sort((a, b) => (a.cree_le < b.cree_le ? -1 : a.cree_le > b.cree_le ? 1 : a.id < b.id ? -1 : 1));
    const versBureau = new Map<IdWeb, number>();
    const versWeb = new Map<number, IdWeb>();
    tries.forEach((i, k) => { versBureau.set(i.id, k + 1); versWeb.set(k + 1, i.id); });

    const people: IndividuBureau[] = tries.map((i) => ({
        id: versBureau.get(i.id)!,
        prenom: i.prenom,
        nom: i.nom,
        genre: GENRE[i.genre] ?? 'Unknown',
        dateNaissance: i.naissance,
        lieuNaissance: i.lieu_naissance,
        dateDeces: i.deces,
        lieuDeces: i.lieu_deces,
        notes: i.notes,
        decede: i.deces ? true : !i.vivant,
        aTrouver: i.prenom === PARENT_A_TROUVER,
    }));

    const unions: UnionComplete[] = d.unions
        .filter((u) => versBureau.has(u.partenaire_a) && versBureau.has(u.partenaire_b))
        .map((u, k) => ({
            id: k + 1,
            partenaire1Id: versBureau.get(u.partenaire_a)!,
            partenaire2Id: versBureau.get(u.partenaire_b)!,
            typeUnion: UNION[u.nature] ?? 'Other',
            statut: STATUT[u.statut] ?? 'Active',
            dateDebut: u.debut,
            lieuUnion: null,
        }));

    const relationships: Relationship[] = d.filiations
        .filter((f) => versBureau.has(f.parent_id) && versBureau.has(f.enfant_id))
        .map((f) => ({ parentId: versBureau.get(f.parent_id)!, enfantId: versBureau.get(f.enfant_id)!, typeLien: LIEN[f.nature] ?? 'Biological' }));

    // Le couple de naissance est déduit par l'arbre du bureau (paire de parents) : rien à fournir.
    return { people, unions, relationships, unionChildren: [], versWeb, versBureau };
}

// ---- FIN DONNÉES EN LIGNE → FORMAT DU BUREAU ----
