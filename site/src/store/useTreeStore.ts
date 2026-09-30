import { create } from 'zustand';
import apiClient from '../api/client';
import { Person, Relationship, Union, UnionChild } from '../types';
interface TreeState {
    people: Person[];
    relationships: Relationship[];
    unions: Union[];
    unionChildren: UnionChild[];
    loading: boolean;
    error: string | null;
    fetchTree: () => Promise<void>;
    addPerson: (data: any) => Promise<void>;
}
export const useTreeStore = create<TreeState>((set) => ({
    people: [],
    relationships: [],
    unions: [],
    unionChildren: [],
    loading: false,
    error: null,
    fetchTree: async () => {
        set({ loading: true });
        try {
            const response = await apiClient.get('/tree');
            set({
                people: response.data.people,
                relationships: response.data.relationships,
                unions: response.data.unions,
                unionChildren: response.data.unionChildren ?? [],
                loading: false,
                error: null,
            });
        }
        catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },
    addPerson: async (data) => {
        try {
            const response = await apiClient.post('/people', data);
            set((state) => ({ people: [...state.people, response.data] }));
        }
        catch (err: any) {
            alert(err.response?.data?.error || "Error adding person");
        }
    }
}));
