export interface Teinte {
    c: string;
    t: string;
    court: string;
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
    'Hors repertoire': {
        c: 'var(--caret)',
        t: 'var(--papier)',
        court: 'Hors répertoire',
        adjectif: 'absent du répertoire',
    },
};
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
export const teinteDe = (origine: string | null | undefined): Teinte => (origine && TEINTES[origine]) || NEUTRE;
export const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
export const nomLisible = (nom: string) => nom.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
