import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TitreCentre } from './TitreCentre';
import { Accueil } from '../features/home/Accueil';
import { Arbre } from '../features/tree/Arbre';
import { TraqueBoard } from '../features/traque/TraqueBoard';
import { Sources } from '../features/sources/Sources';
import { RechercheGlobale } from './RechercheGlobale';
import { ColonnePartenaires } from '../lib/bannierePartenaires';
import { RapatriementSite } from '../lib/envoiSite';
import { appliquerPalette, useAtelierStore } from '../store/useAtelierStore';
import { usePatronymeStore } from '../store/usePatronymeStore';
import { useTreeStore } from '../store/useTreeStore';
import '../features/tree/libellesExacts';
export const AppShell = () => {
    const { ecran, palette } = useAtelierStore();
    const chargerPatronymes = usePatronymeStore((s) => s.charger);
    const fetchTree = useTreeStore((s) => s.fetchTree);
    useEffect(() => {
        appliquerPalette(palette);
    }, [palette]);
    useEffect(() => {
        chargerPatronymes();
        fetchTree();
    }, [chargerPatronymes, fetchTree]);
    return (<div className="flex flex-col h-screen w-screen overflow-hidden bg-papier text-encre font-sans">
            <TitreCentre />
            <div className="flex flex-1 min-h-0">
                <Sidebar rail={ecran !== 'accueil'}/>
                <RapatriementSite />
                {ecran === 'accueil' && <Accueil />}
                {ecran === 'accueil' && <ColonnePartenaires />}
                {ecran === 'arbre' && <Arbre />}
                {ecran === 'traque' && <TraqueBoard />}
                {ecran === 'sources' && <Sources />}
            </div>
            <RechercheGlobale />
        </div>);
};
