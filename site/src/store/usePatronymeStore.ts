import { create } from 'zustand';
import apiClient from '../api/client';
import { Patronyme } from '../types';
interface PatronymeState {
    patronymes: Patronyme[];
    charge: boolean;
    erreur: string | null;
    charger: () => Promise<void>;
}
export const usePatronymeStore = create<PatronymeState>((set, get) => ({
    patronymes: [],
    charge: false,
    erreur: null,
    charger: async () => {
        if (get().charge)
            return;
        try {
            const reponse = await apiClient.get('/patronymes');
            set({ patronymes: reponse.data.items, charge: true, erreur: null });
        }
        catch (err: any) {
            set({ erreur: err.message, charge: true });
        }
    },
}));
