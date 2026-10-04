import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check, Palette as IconePalette } from '@phosphor-icons/react';
import { PALETTES, useAtelierStore } from '../store/useAtelierStore';
const FOND: Record<string, string> = { lumiere: '#FBF8F1', ivoire: '#F4EDE0', parchemin: '#E4D7BF' };
export const PaletteEnTete = () => {
    const { palette, changerPalette } = useAtelierStore();
    const [ouvert, setOuvert] = useState(false);
    const boite = useRef<HTMLDivElement>(null);
    const actuelle = PALETTES.find((p) => p.cle === palette) ?? PALETTES[0];
    useEffect(() => {
        if (!ouvert)
            return;
        const dehors = (e: MouseEvent) => { if (boite.current && !boite.current.contains(e.target as Node))
            setOuvert(false); };
        const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
        document.addEventListener('mousedown', dehors);
        document.addEventListener('keydown', echap);
        return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap); };
    }, [ouvert]);
    const pastille = (cle: string) => <span className="w-3 h-3 rounded-full border border-trait flex-none" style={{ background: FOND[cle] }}/>;
    return (<div ref={boite} className="relative" data-bloc="palette">
            <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} title="Palette" data-bouton="palette" className="flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] text-[13px] text-encre-2 hover:bg-papier">
                <IconePalette size={16}/>
                {pastille(actuelle.cle)}
                <span>{actuelle.libelle}</span>
                <CaretDown size={11}/>
            </button>
            {ouvert && (<div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] bg-carte border border-trait rounded-xl shadow-carte p-1 flex flex-col" role="menu">
                    {PALETTES.map((p) => (<button key={p.cle} type="button" role="menuitemradio" aria-checked={palette === p.cle} onClick={() => { changerPalette(p.cle); setOuvert(false); }} className={`flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12.5px] text-left hover:bg-papier ${palette === p.cle ? 'text-encre font-medium' : 'text-encre-2'}`}>
                            {pastille(p.cle)}
                            <span className="flex-1">{p.libelle}</span>
                            {palette === p.cle && <Check size={12}/>}
                        </button>))}
                </div>)}
        </div>);
};
