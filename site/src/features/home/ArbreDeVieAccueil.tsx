import { useState } from 'react';
import { useAtelierStore } from '../../store/useAtelierStore';
const IMAGE = new URL('../tree/arbre-de-vie.webp', import.meta.url).href;
export const ArbreDeVieAccueil = () => {
    const aller = useAtelierStore((s) => s.aller);
    const [absente, setAbsente] = useState(false);
    if (absente)
        return null;
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
            </div>
        </div>);
};
