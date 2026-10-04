import { create } from 'zustand';
import apiClient from '../../api/client';
export const LIBELLE_PASSAGE = 'De passage';
export const STATUT_PASSAGE = 'Passage';
export const useRelationsPassage = create<{
    ids: Set<number>;
    charger: () => Promise<void>;
}>((set) => ({
    ids: new Set(),
    charger: async () => {
        try {
            set({ ids: new Set((await apiClient.get<number[]>('/relations-passage')).data) });
        }
        catch {
        }
    },
}));
export const estDePassage = (unionId: number) => useRelationsPassage.getState().ids.has(unionId);
export async function fixerPassage(unionId: number, passage: boolean): Promise<void> {
    await apiClient.put(`/relation-passage/${unionId}`, { passage });
    await useRelationsPassage.getState().charger();
}
