import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useAtelierStore } from '../../store/useAtelierStore';
const CLE = 'ancestria.arbre-de-vie-accueil';
const IMAGE = new URL('../tree/arbre-de-vie.webp', import.meta.url).href;
const lire = () => {
    try {
        return localStorage.getItem(CLE) !== 'repliee';
    }
    catch {
        return true;
    }
};
export const ArbreDeVieAccueil = () => {
    const aller = useAtelierStore((s) => s.aller);
    const [ouverte, setOuverte] = useState(lire);
    const [absente, setAbsente] = useState(false);
    if (absente)
        return null;
    const basculer = () => {
        const v = !ouverte;
        setOuverte(v);
        try {
            localStorage.setItem(CLE, v ? 'ouverte' : 'repliee');
        }
        catch {
        }
    };
    const fleche = (<button type="button" onClick={basculer} title={ouverte ? "Replier l'Arbre de Vie" : "Montrer l'Arbre de Vie"} aria-expanded={ouverte} className={`grid place-items-center w-7 h-7 rounded-full bg-blanc border border-trait text-encre-2 hover:border-sepia hover:text-sepia-deep ${ouverte ? 'absolute right-3 top-3' : ''}`}>
            {ouverte ? <CaretUp size={13}/> : <CaretDown size={13}/>}
        </button>);
    if (!ouverte) {
        return (<div className="flex-none flex items-center gap-2.5 -my-4 text-[12.5px] text-encre-3" data-arbre-de-vie-accueil="repliee">
                {fleche}
                L'Arbre de Vie
            </div>);
    }
    return (<div className="flex-none relative" data-arbre-de-vie-accueil="ouverte">
            
            <div className="absolute pointer-events-none" style={{
            inset: '-24px -36px',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(247,214,150,.55), rgba(220,235,246,.35) 45%, transparent 72%)',
        }}/>
            <div className="relative rounded-[20px] overflow-hidden bg-blanc border border-trait-leger" style={{ boxShadow: '0 24px 60px -24px rgba(200,140,60,.45), 0 2px 6px rgba(60,50,30,.06)' }}>
                <img src={IMAGE} alt="L'Arbre de Vie" onError={() => setAbsente(true)} draggable={false} className="block w-full h-[170px] object-cover select-none" style={{ objectPosition: '50% 38%' }}/>
                <div className="flex items-baseline justify-between gap-4 px-[22px] py-3">
                    <div className="min-w-0 flex items-baseline gap-2.5 flex-wrap">
                        <span className="font-display text-[19px] leading-tight text-encre">L'Arbre de Vie</span>
                        <span className="text-[13.5px] text-encre-2">Chaque lignée commence par un nom.</span>
                    </div>
                    <button type="button" onClick={() => aller('arbre')} className="flex-none text-[13.5px] font-medium hover:underline" style={{ color: 'var(--amande, var(--sepia))' }}>
                        Explorer un arbre →
                    </button>
                </div>
                {fleche}
            </div>
        </div>);
};
