import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useAtelierStore } from '../../store/useAtelierStore';
import { normaliser } from '../../lib/origins';
import type { Id } from '../../types';
export const useNomCherche = create<{
    nom: string | null;
    poser: (nom: string | null) => void;
}>((set) => ({
    nom: null,
    poser: (nom) => set({ nom: nom && nom.trim() ? nom.trim() : null }),
}));
useAtelierStore.subscribe((s, avant) => {
    if (s.nomDansArbre && s.nomDansArbre !== avant.nomDansArbre)
        useNomCherche.getState().poser(s.nomDansArbre);
});
export function titreFamille(nomCherche: string | null): string | null {
    return nomCherche && nomCherche.trim() ? nomCherche.trim() : null;
}
export function useTitreFamille(_people: {
    id: Id;
    nom: string;
}[], _nomDansArbre: string | null, _choisi: Id | null) {
    return titreFamille(useNomCherche((s) => s.nom));
}
export function useNomTapeAccueil(nom: string | null | undefined, saisie = '', people: {
    nom: string;
}[] = []) {
    const avant = useRef<string | null>(null);
    const tape = normaliser(saisie);
    const dansArbre = tape ? people.find((p) => normaliser(p.nom) === tape)?.nom ?? null : null;
    const nomExact = nom && normaliser(nom).includes(tape) ? nom : null;
    useEffect(() => {
        const n = nomExact ?? dansArbre ?? nom ?? null;
        if (n)
            useNomCherche.getState().poser(n);
        else if (avant.current)
            useNomCherche.getState().poser(null);
        avant.current = n;
    }, [nom, nomExact, dansArbre]);
}
