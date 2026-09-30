import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
const CLE = 'ancestria.banniere-arbre';
const IMAGE = new URL('./arbre-de-vie.webp', import.meta.url).href;
const lire = () => {
    try {
        return localStorage.getItem(CLE) !== 'repliee';
    }
    catch {
        return true;
    }
};
export const BanniereArbreDeVie = () => {
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
    return (<div className="flex-none relative bg-carte px-7 pt-3" data-banniere-arbre>
            {ouverte && (<div className="relative rounded-[20px] overflow-hidden border border-trait-leger" style={{ boxShadow: '0 24px 60px -28px rgba(200,140,60,.5)' }}>
                    <img src={IMAGE} alt="L'Arbre de Vie" onError={() => setAbsente(true)} draggable={false} className="block w-full h-[150px] object-cover select-none" style={{ objectPosition: '50% 38%' }}/>
                    <div className="absolute inset-x-0 bottom-0 h-[52px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--carte))' }}/>
                </div>)}
            <button type="button" onClick={basculer} title={ouverte ? "Replier l'Arbre de Vie" : "Montrer l'Arbre de Vie"} aria-expanded={ouverte} className={`absolute right-9 ${ouverte ? 'top-5' : 'top-1'} grid place-items-center w-7 h-7 rounded-full bg-blanc border border-trait text-encre-2 hover:border-sepia hover:text-sepia-deep`}>
                {ouverte ? <CaretUp size={13}/> : <CaretDown size={13}/>}
            </button>
        </div>);
};
