import { useState } from 'react';
import { ArrowSquareOut, BookBookmark, BookOpenText, CaretDown, CaretRight, LockSimple, UserCircle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
type Pub = {
    cle: string;
    libelle: string;
    accroche: string;
    icone: Icon;
    fond: string;
    inscription: string | null;
};
export const DU_MEME_AUTEUR: Pub[] = [
    { cle: 'racines', libelle: 'Racines à l’Histoire', accroche: 'La maison d’édition de La Réunion', icone: BookOpenText, fond: 'linear-gradient(135deg, #d9862f 0%, #a8541c 100%)', inscription: null },
    { cle: 'omnitheque', libelle: 'Omnithèque', accroche: 'L’encyclopédie et la bibliothèque', icone: BookBookmark, fond: 'linear-gradient(135deg, #3b5bdb 0%, #23307a 100%)', inscription: null },
];
const CLE = 'ancestria-du-meme-auteur-ouvert';
const titre = (p: Pub) => (p.inscription ? `${p.libelle} — s’inscrire` : `${p.libelle} — pas encore ouverte : bientôt`);
function useOuvert() {
    const [ouvert, setOuvert] = useState(() => { try {
        return localStorage.getItem(CLE) === 'oui';
    }
    catch {
        return false;
    } });
    const basculer = () => setOuvert((o) => { try {
        localStorage.setItem(CLE, o ? 'non' : 'oui');
    }
    catch { } return !o; });
    return { ouvert, basculer };
}
const Carte = ({ p, bientot, onBientot }: {
    p: Pub;
    bientot: boolean;
    onBientot: () => void;
}) => {
    const I = p.icone;
    const corps = (<>
            <span className="eclat pointer-events-none absolute inset-y-0 left-0 w-1/3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)' }}/>
            <I size={15} className="relative flex-none"/>
            <span className="relative min-w-0 flex flex-col gap-[3px]">
                <span className="text-[11px] font-semibold leading-[1.05] line-clamp-2" data-nom-appli>{p.libelle}</span>
                <span className="text-[9.5px] leading-none opacity-90 flex items-center gap-1">
                    {p.inscription ? <>S’inscrire <ArrowSquareOut size={10}/></> : <><LockSimple size={10} weight="bold"/> Bientôt</>}
                </span>
            </span>
        </>);
    const classe = 'relative overflow-hidden min-w-0 flex items-center gap-1.5 h-[42px] px-2 rounded-[10px] text-left text-white shadow-carte transition-transform duration-200 hover:-translate-y-0.5';
    void bientot;
    void onBientot;
    return p.inscription ? (<a href={p.inscription} target="_blank" rel="noopener noreferrer" title={titre(p)} data-porte={`auteur-${p.cle}`} className={classe} style={{ background: p.fond }}>{corps}</a>) : (<div aria-disabled="true" title={titre(p)} data-porte={`auteur-${p.cle}`} data-bloquee className={classe.replace(' transition-transform duration-200 hover:-translate-y-0.5', ' cursor-default opacity-90')} style={{ background: p.fond }}>{corps}</div>);
};
export const DuMemeAuteur = ({ rail }: {
    rail: boolean;
}) => {
    const { ouvert, basculer } = useOuvert();
    const [bientot, setBientot] = useState<string | null>(null);
    const direBientot = (cle: string) => { setBientot(cle); setTimeout(() => setBientot((b) => (b === cle ? null : b)), 3000); };
    if (rail) {
        return (<div className="flex flex-col items-center gap-1.5 pb-1.5 border-b border-trait-leger" data-bloc="du-meme-auteur" data-etat={ouvert ? 'ouvert' : 'ferme'}>
                <button type="button" onClick={basculer} aria-expanded={ouvert} title="Du même auteur" className="w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier">
                    <UserCircle />
                </button>
                {ouvert && DU_MEME_AUTEUR.map((p) => {
                const I = p.icone;
                const icone = <span className="w-9 h-9 rounded-[9px] grid place-items-center text-[17px] text-white" style={{ background: p.fond }}><I /></span>;
                return p.inscription
                    ? <a key={p.cle} href={p.inscription} target="_blank" rel="noopener noreferrer" title={titre(p)} data-porte={`auteur-${p.cle}`}>{icone}</a>
                    : <span key={p.cle} aria-disabled="true" title={titre(p)} data-porte={`auteur-${p.cle}`} data-bloquee className="cursor-default opacity-90">{icone}</span>;
            })}
            </div>);
    }
    return (<div className="flex flex-col gap-2 pb-2 border-b border-trait-leger" data-bloc="du-meme-auteur" data-etat={ouvert ? 'ouvert' : 'ferme'}>
            <style>{`
                @keyframes eclat-auteur { 0%, 72% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(260%) skewX(-20deg); } }
                [data-porte^="auteur-"] .eclat { animation: eclat-auteur 5.5s ease-in-out infinite; }
                [data-porte="auteur-omnitheque"] .eclat { animation-delay: 2.7s; }
                @media (prefers-reduced-motion: reduce) { [data-porte^="auteur-"] .eclat { animation: none; opacity: 0; } }
            `}</style>
            <button type="button" onClick={basculer} aria-expanded={ouvert} data-bouton="du-meme-auteur" className="flex items-center gap-2.5 h-9 px-3 rounded-[10px] text-[13px] text-encre-2 hover:bg-papier text-left">
                <UserCircle size={16}/>
                <span className="flex-1">Du même auteur</span>
                {ouvert ? <CaretDown size={13}/> : <CaretRight size={13}/>}
            </button>
            {ouvert && (<div className="grid grid-cols-2 gap-1.5" data-grille-auteur>
                    {DU_MEME_AUTEUR.map((p) => <Carte key={p.cle} p={p} bientot={bientot === p.cle} onBientot={() => direBientot(p.cle)}/>)}
                </div>)}
        </div>);
};
