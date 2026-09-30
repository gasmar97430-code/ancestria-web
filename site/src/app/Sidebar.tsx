import { Binoculars, Books, HouseSimple, Tree, TreeStructure } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { BoutonSauvegarde } from './BoutonSauvegarde';
import { BoutonRecherche } from './RechercheGlobale';
import { BoutonSuggestions } from './Suggestions';
import { BoutonIncoherences } from './Incoherences';
import { BoutonCarnet } from '../features/carnet/BoutonCarnet';
import { BoutonGedcom } from '../features/gedcom/EchangesGedcom';
import { Ecran, PALETTES, useAtelierStore } from '../store/useAtelierStore';
import { usePatronymeStore } from '../store/usePatronymeStore';
import { nomLisible, teinteDe } from '../lib/origins';
import { useLectureSeule } from '../lib/lectureSeule';
import { BoutonSiteEnLigne } from '../lib/boutonSiteEnLigne';
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
    const { ecran, aller, recents, palette, changerPalette } = useAtelierStore();
    const { patronymes } = usePatronymeStore();
    const lecture = useLectureSeule((s) => s.actif);
    if (rail) {
        return (<aside className="w-16 flex-none bg-carte border-r border-trait-leger flex flex-col items-center py-[22px] gap-1.5">
                <button onClick={() => aller('accueil')} title="M'astel.974 — L'Arbre de Lumière" className="w-9 h-9 rounded-[10px] border border-sepia grid place-items-center text-sepia text-[19px] mb-[18px]">
                    <Tree />
                </button>
                {ENTREES.map(({ ecran: e, libelle, icone: I }) => (<button key={e} onClick={() => aller(e)} title={libelle} className={`w-10 h-10 rounded-[10px] grid place-items-center text-[19px] transition-colors ${ecran === e ? 'bg-sepia-tint text-sepia-deep' : 'text-encre-2 hover:bg-papier'}`}>
                        <I />
                    </button>))}
                <BoutonRecherche rail/>
                {!lecture && <><BoutonSuggestions rail/>
                <BoutonIncoherences rail/>
                <PortesDuSite rail/>
                <BoutonSiteEnLigne rail/>
                <BoutonSauvegarde rail/>
                <BoutonCarnet rail/>
                <BoutonGedcom rail/></>}
            </aside>);
    }
    return (<aside className="w-[272px] flex-none bg-carte border-r border-trait-leger px-[18px] py-7 flex flex-col gap-8">
            
            <button onClick={() => aller('accueil')} title="Accueil" className="flex gap-3 items-center px-2 text-left">
                <span className="w-[38px] h-[38px] flex-none rounded-[11px] border border-sepia grid place-items-center text-sepia text-xl">
                    <Tree />
                </span>
                <span className="text-[10px] leading-[1.5] text-encre-3 tracking-[.12em] uppercase">
                    M'astel.974
                    <br />
                    L'Arbre de Lumière
                </span>
            </button>

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
            <BoutonSiteEnLigne rail={false}/></>}

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

            {!lecture && <><BoutonSauvegarde rail={false}/>
            <BoutonCarnet rail={false}/>
            <BoutonGedcom rail={false}/></>}
            <div className="flex flex-col gap-2 p-3 border border-trait-leger rounded-xl text-xs text-encre-2">
                <span className="text-encre font-medium">Palette</span>
                <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5">
                    {PALETTES.map((p) => (<button key={p.cle} onClick={() => changerPalette(p.cle)} className={`flex-1 h-7 rounded-lg text-[12px] font-medium transition-all ${palette === p.cle ? 'bg-blanc shadow-onglet text-encre' : 'text-encre-2'}`}>
                            {p.libelle}
                        </button>))}
                </div>
            </div>
        </aside>);
};
