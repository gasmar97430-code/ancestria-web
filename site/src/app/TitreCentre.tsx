import { useAtelierStore } from '../store/useAtelierStore';
export const TitreCentre = () => {
    const aller = useAtelierStore((s) => s.aller);
    return (<header className="h-[64px] flex-none bg-carte border-b border-trait-leger grid place-items-center">
            <button onClick={() => aller('accueil')} title="Accueil" className="font-display text-[30px] font-medium leading-none text-encre">
                Ancestria
            </button>
        </header>);
};
