// ---- PARTENAIRES : LES EMPLACEMENTS DE BANNIÈRES ET LEURS RÈGLES ----
//
// Demande du créateur (30/09/2026) : des emplacements de bannières publicitaires posés
// « de manière stratégique », « réservés exclusivement à des entreprises ou des régies
// susceptibles de générer des revenus concrets et réguliers », sur « des thématiques
// cohérentes ou à fort rendement », « parfaitement intégrés et propres dans l'interface
// lumineuse ». Et sa règle du cahier du portail : zéro publicité politique, zéro
// polémique ; seulement des acteurs culturels, littéraires, artistiques, locaux, ou des
// services grand public neutres et sains.
//
// Ce fichier ne dessine rien : il dit OÙ sont les emplacements, QUELS formats ils
// acceptent, et ce qu'une annonce doit déclarer pour y entrer. Une annonce qui ne
// respecte pas une règle n'est jamais affichée (refus(), essayé dans emplacements.test.ts).
// Les annonces elles-mêmes sont dans annonces.ts ; le dessin dans Partenaires.tsx.

/** Largeur × hauteur en pixels : les formats standard que les régies et les annonceurs fournissent. */
export const FORMATS = {
    '728x90': { largeur: 728, hauteur: 90, nom: 'bannière large (leaderboard)' },
    '320x100': { largeur: 320, hauteur: 100, nom: 'grande bannière mobile' },
    '320x50': { largeur: 320, hauteur: 50, nom: 'bannière mobile' },
    '300x600': { largeur: 300, hauteur: 600, nom: 'demi-page' },
    '300x250': { largeur: 300, hauteur: 250, nom: 'rectangle moyen (le format le plus demandé par les annonceurs, avec le 728 × 90)' },
} as const;
export type Format = keyof typeof FORMATS;

export type IdEmplacement = 'pied' | 'cote';
export type Ecran = 'accueil' | 'arbre' | 'traque' | 'sources';

export interface Emplacement {
    nom: string;
    /** Où il est, en clair. */
    ou: string;
    /** Formats acceptés, du plus grand au plus petit : le premier qui tient dans la fenêtre ET que l'annonce fournit est pris. */
    formats: Format[];
    /** Écrans où il peut paraître. */
    ecrans: Ecran[];
    /** Largeur de fenêtre en dessous de laquelle il ne paraît pas. */
    largeurMin: number;
}

/**
 * Deux emplacements, pas plus : jamais sur le contenu, jamais plus d'annonces que de contenu.
 *  - « pied » : un bandeau au bas de la fenêtre, présent sur tous les écrans — toujours visible
 *    sans jamais couvrir l'arbre ni la recherche ;
 *  - « cote » : une colonne à droite, seulement sur l'Accueil et les Sources, seulement sur un
 *    grand écran (l'arbre garde toute sa largeur).
 */
export const EMPLACEMENTS: Record<IdEmplacement, Emplacement> = {
    pied: {
        nom: 'Bandeau du pied',
        ou: 'au bas de la fenêtre, sur tous les écrans',
        formats: ['728x90', '320x100', '320x50'],
        ecrans: ['accueil', 'arbre', 'traque', 'sources'],
        largeurMin: 340,
    },
    cote: {
        nom: 'Colonne de droite',
        ou: "à droite de l'Accueil et des Sources, sur grand écran seulement",
        formats: ['300x600', '300x250'],
        ecrans: ['accueil', 'sources'],
        largeurMin: 1680,
    },
};

/** Les seules thématiques admises (liste fermée : ce qui n'y est pas ne peut pas être configuré). */
export const THEMES = {
    genealogie: 'Généalogie, archives, histoire des familles',
    livres: 'Livres, édition, librairies',
    memoire: 'Photo et mémoire familiale (livres photo, tirages, numérisation)',
    culture: 'Culture, arts, musique, spectacles',
    reunion: 'Acteurs locaux de La Réunion (artisans, commerces, associations)',
    voyage: 'Voyage et tourisme de racines',
    services: 'Services grand public neutres et sains (assurance, énergie, télécom, banque du quotidien)',
} as const;
export type Theme = keyof typeof THEMES;

/** Comment l'annonce rapporte : un emplacement n'est donné qu'à ce qui paie. */
export const REMUNERATIONS = {
    clic: 'payée au clic',
    affichage: "payée à l'affichage",
    commission: 'commission sur la vente (affiliation)',
    forfait: 'forfait au mois',
} as const;
export type Remuneration = keyof typeof REMUNERATIONS;

export interface Annonce {
    /** Nom court, unique. */
    id: string;
    emplacement: IdEmplacement;
    /** Qui parle : toujours nommé (la publicité et son annonceur doivent être identifiables). */
    annonceur: string;
    theme: Theme;
    /** Adresse ouverte au clic (https). */
    lien: string;
    /** Le texte lu à la place de l'image (lecteurs d'écran, image absente). */
    texte: string;
    /** Une image par format fourni : fichier posé dans public/partenaires/. */
    images: Partial<Record<Format, string>>;
    remuneration: { mode: Remuneration; detail: string };
    /** Campagne : du / au (AAAA-MM-JJ), bornes comprises. Absentes : sans limite. */
    du?: string;
    au?: string;
}

/**
 * Ce qui n'entre jamais, quel que soit le thème déclaré. Garde-fou de dernier recours sur
 * le nom, le texte et le lien : la vraie règle est la liste fermée des thèmes.
 *  - tests ADN « généalogiques » ; jeux d'argent et paris ; crédit et placements risqués ;
 *    politique ; contenus pour adultes ; tabac et alcool.
 */
// Mot entier, lettres accentuées comprises (le \b de JavaScript ne connaît pas « é » : « élection » lui échappait).
const mots = (liste: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${liste})(?![\\p{L}\\p{N}])`, 'iu');
const INTERDITS: { motif: string; mots: RegExp }[] = [
    // Code civil, art. 16-10 : le démarchage publicitaire pour l'examen des caractéristiques génétiques est interdit.
    { motif: 'tests ADN', mots: mots('adn|dna|g[ée]n[ée]tiques?') },
    { motif: "jeux d'argent et paris", mots: mots('casinos?|poker|paris? sportifs?|bet|loteries?|jackpot') },
    { motif: 'crédit et placements risqués', mots: mots('cr[ée]dits?|pr[êe]ts? rapides?|crypto\\w*|bitcoin|trading|forex') },
    { motif: 'politique', mots: mots('politiques?|[ée]lections?|partis?|candidate?s?|militante?s?|votez') },
    { motif: 'contenus pour adultes', mots: mots('adultes?|rencontres? coquines?|xxx') },
    { motif: 'tabac et alcool', mots: mots('tabac|cigarettes?|vape|alcools?|rhums?|whisky|vins?') },
];

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Les raisons pour lesquelles une annonce est refusée ; liste vide = elle peut paraître. */
export function refus(a: Annonce): string[] {
    const r: string[] = [];
    const e = EMPLACEMENTS[a.emplacement];
    if (!a.id?.trim()) r.push('sans identifiant');
    if (!e) return [...r, `emplacement inconnu : ${String(a.emplacement)}`];
    if (!a.annonceur?.trim()) r.push("l'annonceur n'est pas nommé");
    if (!(a.theme in THEMES)) r.push(`thème hors liste : ${String(a.theme)}`);
    if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(a.lien ?? '')) r.push('le lien doit être une adresse https');
    if (!a.texte?.trim()) r.push("pas de texte à lire à la place de l'image");
    if (!a.remuneration || !(a.remuneration.mode in REMUNERATIONS) || !a.remuneration.detail?.trim())
        r.push("la rémunération n'est pas déclarée (clic, affichage, commission ou forfait, avec son détail) : un emplacement n'est donné qu'à ce qui rapporte");
    const fournis = Object.entries(a.images ?? {}).filter(([, fichier]) => !!fichier?.trim()) as [Format, string][];
    if (fournis.length === 0) r.push('aucune image');
    for (const [format, fichier] of fournis) {
        if (!(format in FORMATS)) r.push(`format inconnu : ${format}`);
        else if (!e.formats.includes(format)) r.push(`le format ${format} n'entre pas dans « ${e.nom} » (${e.formats.join(', ')})`);
        if (!/^[a-z0-9][a-z0-9._-]*\.(webp|png|jpe?g|svg)$/i.test(fichier)) r.push(`image ${fichier} : un simple nom de fichier de public/partenaires/ (webp, png, jpg, svg)`);
    }
    for (const borne of [a.du, a.au]) if (borne !== undefined && !JOUR.test(borne)) r.push(`date illisible : ${borne} (AAAA-MM-JJ)`);
    if (a.du && a.au && JOUR.test(a.du) && JOUR.test(a.au) && a.au < a.du) r.push('la campagne finit avant de commencer');
    const tout = `${a.annonceur ?? ''} ${a.texte ?? ''} ${a.lien ?? ''}`;
    for (const i of INTERDITS) if (i.mots.test(tout)) r.push(`interdit : ${i.motif}`);
    return r;
}

/** L'annonce est-elle en campagne ce jour-là (AAAA-MM-JJ) ? */
export const enCampagne = (a: Annonce, jour: string) => (!a.du || jour >= a.du) && (!a.au || jour <= a.au);

/** Le plus grand format de l'emplacement qui tient dans la place disponible et que l'annonce fournit. */
export function formatPour(a: Annonce, largeurDisponible: number): Format | null {
    for (const f of EMPLACEMENTS[a.emplacement].formats) if (a.images[f] && FORMATS[f].largeur <= largeurDisponible) return f;
    return null;
}

/**
 * Les annonces qui peuvent paraître à cet emplacement, maintenant : valides, en campagne,
 * sur cet écran, dans une fenêtre assez large, avec une image qui tient.
 */
export function annoncesPour(toutes: Annonce[], emplacement: IdEmplacement, ecran: Ecran, largeurFenetre: number, jour: string): { annonce: Annonce; format: Format }[] {
    const e = EMPLACEMENTS[emplacement];
    if (!e.ecrans.includes(ecran) || largeurFenetre < e.largeurMin) return [];
    const place = emplacement === 'pied' ? largeurFenetre - 20 : FORMATS['300x250'].largeur;
    const retenues: { annonce: Annonce; format: Format }[] = [];
    for (const a of toutes) {
        if (a.emplacement !== emplacement || refus(a).length > 0 || !enCampagne(a, jour)) continue;
        const format = formatPour(a, place);
        if (format) retenues.push({ annonce: a, format });
    }
    return retenues;
}

// ---- FIN PARTENAIRES : LES EMPLACEMENTS ----
