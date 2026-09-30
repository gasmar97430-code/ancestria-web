// ---- LIBELLÉS ----
// Les mots affichés, en un seul endroit.
import type { FormeFoyer, Genre, Individu, NatureFiliation, NatureUnion, RelationContribution, StatutUnion, TypeDocument } from './types';

export const GENRE: Record<Genre, string> = { femme: 'Femme', homme: 'Homme', non_binaire: 'Non binaire', inconnu: 'Non précisé' };

export const NATURE_FILIATION: Record<NatureFiliation, string> = {
    biologique: 'Biologique',
    adoptive: 'Adoptive',
    legale: 'Légale (reconnaissance)',
    sociale: 'Sociale (élevé·e par)',
    beau_parent: 'Beau-parent',
    accueil: 'Famille d’accueil',
    don_gametes: 'Don de gamètes',
    gestation: 'Gestation (GPA : personne qui a porté)',
    intention: 'Parent d’intention (GPA)',
};

export const NATURE_UNION: Record<NatureUnion, string> = {
    mariage: 'Mariage', pacs: 'PACS', union_libre: 'Union libre', religieuse: 'Union religieuse', coutumiere: 'Union coutumière', autre: 'Autre',
};

export const STATUT_UNION: Record<StatutUnion, string> = { en_cours: 'En cours', separes: 'Séparés', divorces: 'Divorcés', veuvage: 'Veuvage' };

export const FORME_FOYER: Record<FormeFoyer, string> = {
    couple: 'Couple', monoparental: 'Monoparental', homoparental: 'Homoparental', pluriparental: 'Pluriparental (3 parents ou plus)',
    recompose: 'Recomposé', accueil: 'Accueil', autre: 'Autre',
};

export const TYPE_DOCUMENT: Record<TypeDocument, string> = {
    registre: 'Registre', acte: 'Acte', photo: 'Photo d’époque', carte: 'Carte ou plan', presse: 'Presse', temoignage: 'Témoignage', objet: 'Objet', autre: 'Autre',
};

export const RELATION: Record<RelationContribution, string> = {
    enfant: 'Je suis son enfant',
    petit_enfant: 'Je suis son petit-enfant',
    parent: 'Je suis son parent',
    conjoint: 'Je suis son conjoint / sa conjointe',
    frere_soeur: 'Je suis son frère / sa sœur',
    inconnu: 'Je ne sais pas encore',
};

/** Pour la modération : « Se dit petit-enfant de … ». */
export const RELATION_DECLAREE: Record<RelationContribution, string> = {
    enfant: 'Se dit enfant de',
    petit_enfant: 'Se dit petit-enfant de',
    parent: 'Se dit parent de',
    conjoint: 'Se dit conjoint·e de',
    frere_soeur: 'Se dit frère ou sœur de',
    inconnu: 'Lien avec la famille encore inconnu',
};

/** « 1 personne », « 2 personnes » ; « 0 personne » (usage français). */
export function nombre(n: number, singulier: string, pluriel: string): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
}

export function nomAffiche(i: Pick<Individu, 'prenom' | 'nom'>): string {
    return `${i.prenom} ${i.nom}`.trim();
}

export function initiales(i: Pick<Individu, 'prenom' | 'nom'>): string {
    const a = i.prenom.trim()[0] ?? '';
    const b = i.nom.trim()[0] ?? '';
    return (a + b).toUpperCase() || '?';
}

/** Accord selon le genre : accord(i, 'né', 'née', 'né·e'). */
export function accord(genre: Genre, masculin: string, feminin: string, neutre: string): string {
    return genre === 'femme' ? feminin : genre === 'homme' ? masculin : neutre;
}

export const PARENT_A_TROUVER = 'Parent à trouver';

// ---- FIN LIBELLÉS ----
