import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import type { Id } from '../types';
import { normaliser } from '../lib/origins';
import { useAtelierStore } from './useAtelierStore';
const useEnAttente = create<{
    id: Id | null;
}>(() => ({ id: null }));
export function allerALaPersonne(id: Id, nom: string) {
    useEnAttente.setState({ id });
    useAtelierStore.setState({ nomDansArbre: nom, ecran: 'arbre' });
}
export function useArriveeDansArbre(nomDansArbre: string | null, people: {
    id: Id;
    nom: string;
}[], choisir: (id: Id | null) => void) {
    const enAttente = useEnAttente((s) => s.id);
    const dejaFait = useRef<string | null>(null);
    useEffect(() => {
        if (enAttente !== null) {
            if (people.length === 0)
                return;
            choisir(enAttente);
            dejaFait.current = nomDansArbre;
            useEnAttente.setState({ id: null });
            return;
        }
        if (!nomDansArbre || dejaFait.current === nomDansArbre || people.length === 0)
            return;
        const porteur = people.find((p) => normaliser(p.nom) === normaliser(nomDansArbre));
        choisir(porteur ? porteur.id : null);
        dejaFait.current = nomDansArbre;
    }, [enAttente, nomDansArbre, people, choisir]);
}
