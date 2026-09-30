import { useMemo } from 'react';
import { normaliser } from '../../lib/origins';
import type { Id } from '../../types';
export function titreFamille(people: {
    id: Id;
    nom: string;
}[], nomDansArbre: string | null, choisi: Id | null): string | null {
    const personne = choisi === null ? undefined : people.find((p) => p.id === choisi);
    if (personne)
        return personne.nom;
    if (nomDansArbre && people.some((p) => normaliser(p.nom) === normaliser(nomDansArbre)))
        return nomDansArbre;
    return null;
}
export function useTitreFamille(people: {
    id: Id;
    nom: string;
}[], nomDansArbre: string | null, choisi: Id | null) {
    return useMemo(() => titreFamille(people, nomDansArbre, choisi), [people, nomDansArbre, choisi]);
}
