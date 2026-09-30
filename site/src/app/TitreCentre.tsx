import { Tree } from '@phosphor-icons/react';
import { useAtelierStore } from '../store/useAtelierStore';
export const TitreCentre = () => {
    const aller = useAtelierStore((s) => s.aller);
    return (<header className="h-[64px] flex-none bg-carte border-b border-trait-leger grid grid-cols-[1fr_auto_1fr] items-center px-5" data-bloc="en-tete">
            <div className="flex gap-3 items-center justify-self-start select-none" data-bloc="signature">
                <span className="w-[38px] h-[38px] flex-none rounded-[11px] border grid place-items-center text-xl text-white" style={{ background: 'linear-gradient(135deg, #F6C453, #E08A1E)', borderColor: '#E08A1E' }} data-signature="logo">
                    <Tree />
                </span>
                <span className="text-[10px] leading-[1.5] text-encre-3 tracking-[.12em] uppercase">
                    M'astel.974
                    <br />
                    L'Arbre de Lumière
                </span>
            </div>
            <button onClick={() => aller('accueil')} title="Accueil" className="font-display text-[30px] font-medium leading-none text-encre">
                Ancestria
            </button>
            <span />
        </header>);
};
