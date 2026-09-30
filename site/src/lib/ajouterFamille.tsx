import type { ComponentType } from 'react';
import { create } from 'zustand';
export const useAjouterFamille = create<{
    composant: ComponentType<{
        nom: string;
    }> | null;
}>(() => ({ composant: null }));
export const EmplacementAjouterFamille = ({ nom }: {
    nom: string;
}) => {
    const Composant = useAjouterFamille((s) => s.composant);
    return Composant ? <Composant nom={nom}/> : null;
};
