import type { ComponentType } from 'react';
import { create } from 'zustand';
export const useCompteDuSite = create<{
    Composant: ComponentType | null;
}>(() => ({ Composant: null }));
export const CompteDuSite = () => {
    const C = useCompteDuSite((s) => s.Composant);
    return C ? <C /> : null;
};
