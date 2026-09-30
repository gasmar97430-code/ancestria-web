// ---- ORIGINES DES PATRONYMES : COULEURS ET LIBELLES ----
//
// Les sept origines du repertoire (backend/src/core/enums.ts), rendues avec les
// cinq teintes de la maquette. Deux n'ont PAS de teinte d'origine, et c'est
// voulu :
//   - « Affranchi 1848 » : un nom ATTRIBUE par l'administration. Le ranger sous
//     « Afrique » ferait lire une ascendance dans le nom — l'erreur que le
//     repertoire interdit. Il prend l'accent sepia, sans pretention d'origine ;
//   - « Non documentee » : aucune origine connue ; teinte neutre.

export interface Teinte {
    /** Couleur du filet et de la pastille. */
    c: string;
    /** Teinte douce pour les fonds (medaillon, portrait). */
    t: string;
    /** Libelle court (pastille de filtre). */
    court: string;
    /** « Patronyme d'origine … » */
    adjectif: string;
}

const t = (nom: string) => ({ c: `var(--o-${nom})`, t: `var(--o-${nom}-t)` });

export const TEINTES: Record<string, Teinte> = {
    Europe: { ...t('europe'), court: 'Europe', adjectif: 'européenne' },
    Malgache: { ...t('madagascar'), court: 'Madagascar', adjectif: 'malgache' },
    'Inde tamoule': { ...t('inde'), court: 'Inde tamoule', adjectif: 'indienne (tamoule)' },
    'Inde musulmane': { ...t('inde'), court: 'Inde musulmane', adjectif: 'indienne (musulmane)' },
    Chine: { ...t('chine'), court: 'Chine', adjectif: 'chinoise' },
    'Affranchi 1848': {
        c: 'var(--sepia)',
        t: 'var(--sepia-tint)',
        court: 'Affranchi 1848',
        adjectif: 'attribuée en 1848 (nom donné, pas une origine)',
    },
    'Non documentee': {
        c: 'var(--encre-3)',
        t: 'var(--papier)',
        court: 'Non documentée',
        adjectif: 'non documentée',
    },
    // Un nom qui n'est pas dans les 419 : on ne sait rien, on le dit.
    'Hors repertoire': {
        c: 'var(--caret)',
        t: 'var(--papier)',
        court: 'Hors répertoire',
        adjectif: 'absent du répertoire',
    },
};

/** Ordre des filtres : les vagues de peuplement, puis le reste. */
export const ORDRE_ORIGINES = [
    'Europe',
    'Malgache',
    'Inde tamoule',
    'Inde musulmane',
    'Chine',
    'Affranchi 1848',
    'Non documentee',
];

const NEUTRE: Teinte = TEINTES['Non documentee'];

export const teinteDe = (origine: string | null | undefined): Teinte =>
    (origine && TEINTES[origine]) || NEUTRE;

/** Sans accents ni casse : « Técher » et « TECHER » se retrouvent. */
export const normaliser = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/**
 * « AH-HOT » -> « Ah-Hot », « D'EUREUX » -> « D'Eureux ». Meme longueur que
 * l'original : le surlignage de la recherche reste aligne.
 */
export const nomLisible = (nom: string) =>
    nom.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());

// ---- FIN ORIGINES ----
