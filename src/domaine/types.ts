// Types des lignes de la base (supabase/schema.sql). Un seul endroit : si
// une colonne change, TypeScript signale chaque écran concerné.

export type Id = string;
export type Precision = 'jour' | 'annee';
export type Genre = 'femme' | 'homme' | 'non_binaire' | 'inconnu';
export type Role = 'proprietaire' | 'editeur' | 'lecteur';
export type Offre = 'gratuit' | 'famille' | 'institution';

export const NATURES_FILIATION = [
    'biologique', 'adoptive', 'legale', 'sociale', 'beau_parent', 'accueil', 'don_gametes', 'gestation', 'intention',
] as const;
export type NatureFiliation = (typeof NATURES_FILIATION)[number];

export const NATURES_UNION = ['mariage', 'pacs', 'union_libre', 'religieuse', 'coutumiere', 'autre'] as const;
export type NatureUnion = (typeof NATURES_UNION)[number];

export const STATUTS_UNION = ['en_cours', 'separes', 'divorces', 'veuvage'] as const;
export type StatutUnion = (typeof STATUTS_UNION)[number];

export const FORMES_FOYER = ['couple', 'monoparental', 'homoparental', 'pluriparental', 'recompose', 'accueil', 'autre'] as const;
export type FormeFoyer = (typeof FORMES_FOYER)[number];

export const TYPES_DOCUMENT = ['registre', 'acte', 'photo', 'carte', 'presse', 'temoignage', 'objet', 'autre'] as const;
export type TypeDocument = (typeof TYPES_DOCUMENT)[number];

export interface Arbre {
    id: Id;
    nom: string;
    proprietaire: Id;
    slug: string | null;
    public_patrimoine: boolean;
    territoire: string | null;
    description: string | null;
    centre_lat: number | null;
    centre_lng: number | null;
    cree_le: string;
}

export interface Individu {
    id: Id;
    arbre_id: Id;
    prenom: string;
    nom: string;
    genre: Genre;
    se_nomme: string | null;
    naissance: string | null;
    naissance_precision: Precision;
    lieu_naissance: string | null;
    naissance_lat: number | null;
    naissance_lng: number | null;
    deces: string | null;
    deces_precision: Precision;
    lieu_deces: string | null;
    vivant: boolean;
    profession: string | null;
    biographie: string | null;
    notes: string | null;
    illustre: boolean;
    thematiques: string[];
    photo_url: string | null;
    cree_le: string;
    maj_le: string;
}

export interface Union {
    id: Id;
    arbre_id: Id;
    partenaire_a: Id;
    partenaire_b: Id;
    nature: NatureUnion;
    statut: StatutUnion;
    debut: string | null;
    fin: string | null;
}

export interface Foyer {
    id: Id;
    arbre_id: Id;
    libelle: string;
    forme: FormeFoyer;
    notes: string | null;
}

export interface FoyerParent {
    foyer_id: Id;
    arbre_id: Id;
    individu_id: Id;
    qualite: string | null;
}

export interface Filiation {
    id: Id;
    arbre_id: Id;
    parent_id: Id;
    enfant_id: Id;
    nature: NatureFiliation;
    foyer_id: Id | null;
}

export interface DocumentArchive {
    id: Id;
    arbre_id: Id;
    titre: string;
    type: TypeDocument;
    date_document: string | null;
    periode: string | null;
    lieu: string | null;
    lat: number | null;
    lng: number | null;
    url: string | null;
    cote: string | null;
    source: string | null;
    droits: string | null;
    description: string | null;
    public: boolean;
}

export interface DocumentIndividu {
    document_id: Id;
    individu_id: Id;
    arbre_id: Id;
}

export interface FamilleHistorique {
    id: Id;
    arbre_id: Id;
    nom: string;
    resume: string | null;
    origine: string | null;
    periode: string | null;
}

/** Colonnes lisibles des invitations (le haché du PIN n'est jamais ouvert). */
export const COLONNES_INVITATION = 'id, arbre_id, jeton, libelle, avec_pin, expire_le, ferme, cree_par, cree_le';
export interface Invitation {
    id: Id;
    arbre_id: Id;
    jeton: string;
    libelle: string;
    avec_pin: boolean;
    expire_le: string;
    ferme: boolean;
    cree_par: Id;
    cree_le: string;
}

export type RelationContribution = 'enfant' | 'petit_enfant' | 'parent' | 'conjoint' | 'frere_soeur' | 'inconnu';
export type RelationProche = 'parent' | 'enfant' | 'conjoint';

export interface ContenuContribution {
    contributeur: { prenom: string; nom: string; genre: Genre; naissance_annee: number | null; vivant: boolean };
    lien: { relation: RelationContribution; individu_id: Id | null; texte: string };
    proches: { prenom: string; nom: string; genre: Genre; naissance_annee: number | null; vivant: boolean; relation: RelationProche }[];
    message: string;
}

export interface Contribution {
    id: Id;
    arbre_id: Id;
    invitation_id: Id | null;
    contenu: ContenuContribution;
    contact: string | null;
    statut: 'en_attente' | 'acceptee' | 'refusee';
    motif: string | null;
    cree_le: string;
    traitee_le: string | null;
}

export interface EtatOffre {
    offre: Offre;
    libelle: string;
    individus: number;
    max_individus: number | null;
    documents: number;
    max_documents: number | null;
    invitations_ouvertes: number;
    max_invitations_ouvertes: number | null;
    patrimoine_public: boolean;
    export_certifie: boolean;
}

/** Tout ce qu'il faut pour dessiner et contrôler un arbre. */
export interface DonneesArbre {
    individus: Individu[];
    unions: Union[];
    foyers: Foyer[];
    foyerParents: FoyerParent[];
    filiations: Filiation[];
}
