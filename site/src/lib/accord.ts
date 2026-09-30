export const elleLui = (genre?: string | null): string => (genre === 'F' ? 'elle' : genre === 'M' ? 'lui' : 'cette personne');
export const accorde = (genre: string | null | undefined, masculin: string, feminin: string, double: string): string => genre === 'F' ? feminin : genre === 'M' ? masculin : double;
export const roleSelon = (code: string, libelle: string, genre?: string | null): string => code === 'sujet' ? elleLui(genre) : code === 'conjoint' ? accorde(genre, 'sa conjointe', 'son conjoint', libelle) : libelle;
