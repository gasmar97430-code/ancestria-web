import { BoutonSiteEnLigne } from './boutonSiteEnLigne';
import { PaletteEnTete } from './paletteEnTete';
import { CompteEnTete } from './compteEnTete';
import { PetiteBanniereEnTete } from './bannierePartenaires';
export const HautADroite = () => {
    return (<div className="justify-self-end grid grid-cols-[auto_auto] items-center justify-items-end gap-x-1 gap-y-0.5 text-[13px] whitespace-nowrap [&_[data-porte='site-en-ligne']]:text-[13px] [&_[data-porte='site-en-ligne']]:h-6 [&_[data-porte='site-en-ligne']]:px-2.5 [&_[data-porte='site-en-ligne']]:gap-1.5 [&_[data-porte='site-en-ligne']_svg]:w-4 [&_[data-porte='site-en-ligne']_svg]:h-4 [&_[data-bloc='palette']>button]:h-6" data-bloc="haut-a-droite">
            <div className="justify-self-start"><PetiteBanniereEnTete /></div>
            <PaletteEnTete />
            <BoutonSiteEnLigne rail={false}/>
            <CompteEnTete />
        </div>);
};
