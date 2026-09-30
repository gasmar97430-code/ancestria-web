// Composants de base : boutons, champs, fenêtres. Cibles tactiles de 44 px
// au moins, erreurs rattachées à leur champ (aria-describedby).
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Signature } from '../arbre-bureau/Signature';

type Variante = 'principal' | 'secondaire' | 'discret' | 'danger';

const VARIANTES: Record<Variante, string> = {
    principal: 'bg-sepia text-nuit font-semibold hover:bg-sepia-fonce',
    secondaire: 'border border-sepia text-sepia hover:bg-sepia/10',
    discret: 'border border-trait text-encre-2 hover:bg-carte-2',
    danger: 'border border-rouge text-rouge hover:bg-rouge/10',
};

export function Bouton({ variante = 'secondaire', className = '', enCours = false, children, disabled, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; enCours?: boolean }) {
    return (
        <button
            type="button"
            {...p}
            disabled={disabled || enCours}
            aria-busy={enCours || undefined}
            className={`min-h-11 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${VARIANTES[variante]} ${className}`}
        >
            {enCours ? 'Un instant…' : children}
        </button>
    );
}

interface ProprietesChamp {
    libelle: string;
    valeur: string;
    onChange: (v: string) => void;
    erreur?: string;
    aide?: string;
    type?: string;
    multiligne?: boolean;
    lignes?: number;
    placeholder?: string;
    obligatoire?: boolean;
    max?: number;
    mode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'url';
    autoComplete?: string;
    autoFocus?: boolean;
}

export function Champ({ libelle, valeur, onChange, erreur, aide, type = 'text', multiligne, lignes = 4, placeholder, obligatoire, max, mode, autoComplete, autoFocus }: ProprietesChamp) {
    const id = useId();
    const idAide = `${id}-aide`;
    const commun = {
        id,
        value: valeur,
        placeholder,
        maxLength: max,
        autoFocus,
        'aria-invalid': erreur ? true : undefined,
        'aria-describedby': erreur || aide ? idAide : undefined,
        className: `w-full rounded-xl bg-nuit border px-3 py-2.5 text-[15px] text-encre placeholder:text-encre-3 ${erreur ? 'border-rouge' : 'border-trait focus:border-sepia'}`,
    };
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm text-encre-2">
                {libelle}
                {obligatoire && <span className="text-sepia"> *</span>}
            </label>
            {multiligne ? (
                <textarea {...commun} rows={lignes} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <input {...commun} type={type} inputMode={mode} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
            )}
            {(erreur || aide) && (
                <div id={idAide} className={`text-xs ${erreur ? 'text-rouge' : 'text-encre-3'}`}>
                    {erreur ?? aide}
                </div>
            )}
        </div>
    );
}

export function Choix<T extends string>({ libelle, valeur, onChange, options, erreur, ...p }: { libelle: string; valeur: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; erreur?: string } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>) {
    const id = useId();
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm text-encre-2">{libelle}</label>
            <select
                id={id}
                {...p}
                value={valeur}
                onChange={(e) => onChange(e.target.value as T)}
                className={`w-full min-h-11 rounded-xl bg-nuit border px-3 text-[15px] text-encre ${erreur ? 'border-rouge' : 'border-trait'}`}
            >
                {options.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                ))}
            </select>
            {erreur && <div className="text-xs text-rouge">{erreur}</div>}
        </div>
    );
}

export function Case({ libelle, coche, onChange, aide, erreur }: { libelle: ReactNode; coche: boolean; onChange: (v: boolean) => void; aide?: string; erreur?: string }) {
    const id = useId();
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="flex items-start gap-3 min-h-11 py-2 cursor-pointer text-[15px]">
                <input id={id} type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--color-sepia)]" />
                <span>{libelle}</span>
            </label>
            {(erreur || aide) && <div className={`text-xs ${erreur ? 'text-rouge' : 'text-encre-3'}`}>{erreur ?? aide}</div>}
        </div>
    );
}

export function Alerte({ genre = 'erreur', children }: { genre?: 'erreur' | 'info' | 'succes'; children: ReactNode }) {
    const c = genre === 'erreur' ? 'border-rouge text-rouge' : genre === 'succes' ? 'border-vert text-vert' : 'border-trait text-encre-2';
    return (
        <div role={genre === 'erreur' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2.5 text-sm ${c}`}>
            {children}
        </div>
    );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
    return (
        <div role="status" className="flex items-center justify-center gap-3 p-8 text-encre-3">
            <span className="w-4 h-4 rounded-full border-2 border-sepia border-t-transparent animate-spin" />
            {texte}
        </div>
    );
}

/**
 * Fenêtre : centrée sur ordinateur, panneau qui monte du bas sur téléphone.
 * Échap ferme ; le focus entre dans la fenêtre à l'ouverture et revient
 * ensuite là où il était.
 */
export function Fenetre({ titre, onFermer, children, large }: { titre: string; onFermer: () => void; children: ReactNode; large?: boolean }) {
    const boite = useRef<HTMLDivElement>(null);
    const idTitre = useId();
    // La page donne une nouvelle fonction « fermer » à chaque rendu : gardée à part, pour que
    // l'ouverture (prise de la main) ne se rejoue pas à chaque lettre tapée (30/09 : seule la 1re s'écrivait).
    const fermer = useRef(onFermer);
    fermer.current = onFermer;
    useEffect(() => {
        const avant = document.activeElement as HTMLElement | null;
        // Un champ « autoFocus » de la fenêtre a déjà la main : ne pas la lui reprendre.
        if (!boite.current?.contains(document.activeElement)) boite.current?.focus();
        const clavier = (e: KeyboardEvent) => {
            if (e.key === 'Escape') fermer.current();
        };
        document.addEventListener('keydown', clavier);
        const defilement = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', clavier);
            document.body.style.overflow = defilement;
            avant?.focus?.();
        };
    }, []);
    return (
        // z-[1100] : au-dessus des couches de la carte Leaflet (jusqu'à 1000), sinon la carte recouvrait la fenêtre
        <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
            <div
                ref={boite}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitre}
                className={`w-full ${large ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92dvh] overflow-y-auto bg-carte border border-trait rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none`}
            >
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 id={idTitre} className="font-display text-2xl leading-tight">{titre}</h2>
                    <button type="button" onClick={onFermer} aria-label="Fermer" className="min-w-11 min-h-11 -mr-2 -mt-2 rounded-full text-2xl text-encre-3 hover:text-encre">
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/** Lien de retour : 44 px de haut, pour le doigt. */
export function LienRetour({ vers, children }: { vers: string; children: ReactNode }) {
    return (
        <Link to={vers} className="inline-flex items-center min-h-11 text-sepia hover:underline underline-offset-4">
            ← {children}
        </Link>
    );
}

export function EnTetePage({ titre, sousTitre, actions }: { titre: string; sousTitre?: ReactNode; actions?: ReactNode }) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div className="min-w-0">
                <div className="mb-4"><Signature lien /></div>{/* arbre-bureau/Signature.tsx : sa signature en haut de chaque écran */}
                <h1 className="font-display text-3xl sm:text-4xl leading-tight break-words">{titre}</h1>
                {sousTitre && <div className="text-sm text-encre-3 mt-1">{sousTitre}</div>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
    );
}
