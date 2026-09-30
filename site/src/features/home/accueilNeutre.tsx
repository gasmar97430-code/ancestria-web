import { useEffect, useRef } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useAtelierStore } from '../../store/useAtelierStore';
import { nomLisible } from '../../lib/origins';
export const EXEMPLE_CHAMP = 'Tapez un nom de famille…';
export const MARQUE_CHAMP = 'accueil';
export const estChampAccueil = (el: Element | null): boolean => !!el && (el as HTMLElement).dataset?.champ === MARQUE_CHAMP;
export const MONTRER_RECENTS = false;
export const sansRecherche = (terme: string): boolean => terme.trim() === '';
export function useNomDemande(nomChoisi: string | null, affiches: string[], saisie: string, ecrire: (saisie: string) => void) {
    const avant = useRef(saisie);
    useEffect(() => {
        if (!sansRecherche(avant.current) && sansRecherche(saisie) && useAtelierStore.getState().nomChoisi) {
            useAtelierStore.setState({ nomChoisi: null });
        }
        avant.current = saisie;
    }, [saisie]);
    useEffect(() => {
        try {
            if (nomChoisi && !affiches.includes(nomChoisi))
                ecrire(nomLisible(nomChoisi));
        }
        catch {
        }
    }, [nomChoisi]);
    useEffect(() => () => {
        useAtelierStore.setState({ nomChoisi: null });
    }, []);
}
export const InviteRecherche = ({ noms, filtre }: {
    noms: number;
    filtre: string | null;
}) => (<div className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-trait-leger bg-carte text-[14px] leading-relaxed text-encre-2" data-accueil="neutre">
        <MagnifyingGlass size={17} className="text-encre-3 flex-none mt-[3px]"/>
        <span>
            Tapez un nom de famille : il est cherché parmi les {noms.toLocaleString('fr-FR')} patronymes du répertoire
            {filtre ? ` (origine choisie : ${filtre})` : ''} et parmi les personnes de l'arbre.
            <span className="block text-[12.5px] text-encre-3 mt-1">Aucun nom n'est mis en avant : chacun cherche le sien.</span>
        </span>
    </div>);
