import { create } from 'zustand';
export const useDoublonsVrais = create<{
    ids: Set<number> | null;
}>(() => ({ ids: null }));
export function fixerDoublonsVrais(liste: {
    genre: string;
    personnes: number[];
}[]): void {
    try {
        useDoublonsVrais.setState({ ids: new Set(liste.filter((x) => x.genre === 'doublon').flatMap((x) => x.personnes).filter((id) => id > 0)) });
    }
    catch {
        useDoublonsVrais.setState({ ids: new Set() });
    }
}
