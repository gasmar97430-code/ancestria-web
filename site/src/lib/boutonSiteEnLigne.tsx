import { Globe } from '@phosphor-icons/react';
import { create } from 'zustand';
export const ADRESSE_SITE = 'https://gasmar97430-code.github.io/ancestria-web/';
export const useBoutonSiteEnLigne = create<{
    montrer: boolean;
}>(() => ({ montrer: true }));
export const BoutonSiteEnLigne = ({ rail }: {
    rail: boolean;
}) => {
    const montrer = useBoutonSiteEnLigne((s) => s.montrer);
    if (!montrer)
        return null;
    return rail ? (<a href={ADRESSE_SITE} target="_blank" rel="noopener noreferrer" title="Ouvrir le site en ligne d'Ancestria" className="w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="site-en-ligne">
            <Globe />
        </a>) : (<a href={ADRESSE_SITE} target="_blank" rel="noopener noreferrer" title={ADRESSE_SITE} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="site-en-ligne">
            <Globe size={18}/>
            <span className="flex-1">Site en ligne</span>
        </a>);
};
