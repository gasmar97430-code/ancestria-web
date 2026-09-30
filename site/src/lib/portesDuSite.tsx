import type { ComponentType } from 'react';
import { create } from 'zustand';
export const usePortesDuSite = create<{
    portes: ComponentType<{
        rail: boolean;
    }>[];
}>(() => ({ portes: [] }));
export const PortesDuSite = ({ rail }: {
    rail: boolean;
}) => {
    const portes = usePortesDuSite((s) => s.portes);
    return (<>
            {portes.map((P, i) => (<P key={i} rail={rail}/>))}
        </>);
};
