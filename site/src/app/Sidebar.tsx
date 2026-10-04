import { Binoculars, Books, HouseSimple, TreeStructure } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { BoutonSauvegarde } from './BoutonSauvegarde';
import { BoutonRecherche } from './RechercheGlobale';
import { BoutonSuggestions } from './Suggestions';
import { BoutonIncoherences } from './Incoherences';
import { BoutonCarnet } from '../features/carnet/BoutonCarnet';
import { Ecran, useAtelierStore } from '../store/useAtelierStore';
import { usePatronymeStore } from '../store/usePatronymeStore';
import { nomLisible, teinteDe } from '../lib/origins';
import { useLectureSeule } from '../lib/lectureSeule';
import { BasDuMenuPartenaires } from '../lib/bannierePartenaires';
import { DuMemeAuteur } from '../lib/duMemeAuteur';
import { OutilsRepliables } from '../lib/outilsRepliables';
import { PortesDuSite } from '../lib/portesDuSite';
import { MONTRER_RECENTS } from '../features/home/accueilNeutre';
const ENTREES: {
    ecran: Ecran;
    libelle: string;
    icone: Icon;
}[] = [
    { ecran: 'accueil', libelle: 'Accueil', icone: HouseSimple },
    { ecran: 'arbre', libelle: 'Arbre', icone: TreeStructure },
    { ecran: 'traque', libelle: 'Traque des Noms', icone: Binoculars },
    { ecran: 'sources', libelle: 'Sources', icone: Books },
];
export const Sidebar = ({ rail }: {
    rail: boolean;
}) => {
    const { ecran, aller, recents } = useAtelierStore();
    const { patronymes } = usePatronymeStore();
    const lecture = useLectureSeule((s) => s.actif);
    if (rail) {
        return (<aside className="w-16 flex-none bg-carte border-r border-trait-leger flex flex-col items-center py-[22px] gap-1.5">
                
                <span className="h-[18px]"/>
                <DuMemeAuteur rail/>
                {ENTREES.map(({ ecran: e, libelle, icone: I }) => (<button key={e} onClick={() => aller(e)} title={libelle} className={`w-10 h-10 rounded-[10px] grid place-items-center text-[19px] transition-colors ${ecran === e ? 'bg-sepia-tint text-sepia-deep' : 'text-encre-2 hover:bg-papier'}`}>
                        <I />
                    </button>))}
                <BoutonRecherche rail/>
                {!lecture && <><BoutonSuggestions rail/>
                <BoutonIncoherences rail/>
                <PortesDuSite rail/>
                <BoutonSauvegarde rail/>
                <BoutonCarnet rail/></>}
            </aside>);
    }
    return (<aside className="w-[272px] flex-none bg-carte border-r border-trait-leger px-[18px] py-7 flex flex-col gap-8 overflow-y-auto [scrollbar-width:none]">
            
            <DuMemeAuteur rail={false}/>
            <nav className="flex flex-col gap-0.5">
                {ENTREES.map(({ ecran: e, libelle, icone: I }) => (<button key={e} onClick={() => aller(e)} className={`flex gap-3 items-center h-10 px-3 rounded-[10px] text-sm transition-colors text-left ${ecran === e ? 'bg-sepia-tint text-sepia-deep font-medium' : 'text-encre-2 hover:bg-papier'}`}>
                        <I size={18}/>
                        {libelle}
                    </button>))}
            </nav>
            <BoutonRecherche rail={false}/>
            {!lecture && <><BoutonSuggestions rail={false}/>
            <BoutonIncoherences rail={false}/>
            <PortesDuSite rail={false}/>
            </>}

            {MONTRER_RECENTS && recents.length > 0 && (<div className="flex flex-col gap-2.5 px-3">
                    <div className="text-[10.5px] tracking-[.12em] uppercase text-encre-3">Récemment consultés</div>
                    {recents.slice(0, 3).map((n) => {
                const p = patronymes.find((x) => x.nom === n);
                return (<button key={n} onClick={() => useAtelierStore.getState().choisir(n)} className="flex items-center gap-2.5 font-display text-[19px] text-encre text-left transition-transform duration-200 hover:translate-x-[3px]">
                                <span className="w-[7px] h-[7px] rounded-full" style={{ background: teinteDe(p?.origine).c }}/>
                                {nomLisible(n)}
                            </button>);
            })}
                </div>)}

            {!lecture && <OutilsRepliables />}
            
            <BasDuMenuPartenaires />
        </aside>);
};
