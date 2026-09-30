// Ces types reprennent tels quels les champs renvoyes par l'API.
// Ne pas les renommer cote frontend : la divergence childId / enfantId
// avait deja fait disparaitre toutes les aretes de l'arbre.

/** Identifiant de base : entier auto-incremente. */
export type Id = number;

export interface Person {
    id: Id;
    nom: string;
    prenom: string;
    genre: string;
}

export interface Union {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
    typeUnion?: string;
    statut?: string;
}

export interface Relationship {
    parentId: Id;
    enfantId: Id;
    typeLien: string;
}

export interface UnionChild {
    enfantId: Id;
    unionId: Id;
}

/**
 * Entree du repertoire des patronymes reunionnais.
 *
 * `origine` est celle DU NOM, jamais celle des personnes qui le portent :
 * l'attribution massive de patronymes aux affranchis de 1848 a delie les noms
 * des ascendances, et confondre les deux serait faux.
 */
export interface Patronyme {
    id: Id;
    nom: string;
    origine: string;
    procede?: string | null;
    /** « Documentee », « Probable » ou « Non documentee ». */
    certitude: string;
    frequence?: number | null;
    rang?: number | null;
    notes?: string | null;
}
