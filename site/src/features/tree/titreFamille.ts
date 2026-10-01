import type { Id } from '../../types';
export function titreFamille(_people: {
    id: Id;
    nom: string;
}[], _nomDansArbre: string | null, _choisi: Id | null): string | null {
    return null;
}
export function useTitreFamille(people: {
    id: Id;
    nom: string;
}[], nomDansArbre: string | null, choisi: Id | null) {
    return titreFamille(people, nomDansArbre, choisi);
}
