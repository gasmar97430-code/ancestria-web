import { MagnifyingGlass } from '@phosphor-icons/react';
import type { Id } from '../../types';
import { useNomCherche } from './titreFamille';
export function arbreVisible(nomCherche: string | null, choisi: Id | null): boolean {
    return (nomCherche !== null && nomCherche.trim() !== '') || choisi !== null;
}
export function useArbreVisible(choisi: Id | null): boolean {
    return arbreVisible(useNomCherche((s) => s.nom), choisi);
}
export function siRecherche<T>(liste: T[], visible: boolean): T[] {
    return visible ? liste : [];
}
export function InviteArbre({ visible }: {
    visible: boolean;
}) {
    if (visible)
        return null;
    return (<div className="absolute inset-0 z-[5] grid place-items-center pointer-events-none" data-invite="arbre">
            <div className="flex items-center gap-3 rounded-[14px] border border-trait-leger px-5 py-3.5 shadow-carte text-[14px] text-encre max-w-[440px]" style={{ background: 'var(--carte)' }}>
                <MagnifyingGlass size={20} className="flex-none text-sepia"/>
                <span>Tapez un nom de famille dans « Nom de famille ou personne » : son arborescence apparaît.</span>
            </div>
        </div>);
}
