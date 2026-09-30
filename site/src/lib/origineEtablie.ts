import { normaliser } from './origins';
const NON_DOCUMENTEE = 'Non documentee';
export function origineEtablie<T extends {
    origine: string;
    certitude?: string | null;
}>(p: T): T {
    return p.certitude === 'Documentee' || p.origine === NON_DOCUMENTEE ? p : { ...p, origine: NON_DOCUMENTEE };
}
export const DEGRES: Record<string, string> = {
    Documentee: 'origine documentée',
    Probable: 'un indice linguistique existe ; il ne vaut pas preuve',
    'Non documentee': 'origine non documentée',
};
export const DEFINITIONS: Record<string, string> = {
    Europe: 'Europe : une source lue établit que ce nom vient d’Europe. Elle est citée dans la fiche du nom.',
    'Inde tamoule': 'Inde : nom d’origine indienne, d’après une source citée dans la fiche du nom. Les sources lues disent « indienne » ; elles ne précisent pas la région de l’Inde.',
    'Affranchi 1848': 'Nom d’affranchi : nom de famille donné à une personne affranchie, par l’état civil, entre 1832 et 1849. C’est la façon dont le nom est né, pas une origine géographique.',
    'Non documentee': 'Non documentée : le nom est au répertoire, mais aucune source n’établit son origine. Aucune région ne lui est attribuée — ni par sa sonorité, ni par sa terminaison.',
    'Hors repertoire': 'Hors répertoire : ce nom ne figure pas parmi les patronymes du répertoire. On n’en sait rien ici : aucune origine ne lui est attribuée.',
};
export const definitionOrigine = (origine: string | null | undefined): string | undefined => (origine ? DEFINITIONS[origine] : undefined);
export function origineAMontrer(nom: string, repertoire: {
    nom: string;
    origine: string;
}[]): string {
    const n = normaliser(nom);
    return repertoire.find((x) => normaliser(x.nom) === n)?.origine ?? NON_DOCUMENTEE;
}
