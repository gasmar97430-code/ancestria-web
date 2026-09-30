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
export interface Patronyme {
    id: Id;
    nom: string;
    origine: string;
    procede?: string | null;
    certitude: string;
    frequence?: number | null;
    rang?: number | null;
    notes?: string | null;
}
