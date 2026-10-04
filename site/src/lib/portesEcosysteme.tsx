import { useEffect, useState } from 'react';
import { BookBookmark, BookOpenText, ArrowSquareOut } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import apiClient from '../api/client';
type Appli = {
    cle: string;
    libelle: string;
    present: boolean;
};
const ICONES: Record<string, Icon> = { racines: BookOpenText, omnitheque: BookBookmark };
export const PortesEcosysteme = ({ rail }: {
    rail: boolean;
}) => {
    const [applis, setApplis] = useState<Appli[] | null>(null);
    const [message, setMessage] = useState<{
        cle: string;
        texte: string;
    } | null>(null);
    useEffect(() => {
        let vivant = true;
        apiClient.get<Appli[]>('/ecosysteme')
            .then((r) => { if (vivant && Array.isArray(r.data))
            setApplis(r.data); })
            .catch(() => { if (vivant)
            setApplis(null); });
        return () => { vivant = false; };
    }, []);
    if (!applis || applis.length === 0)
        return null;
    const ouvrir = async (a: Appli) => {
        if (!a.present)
            return;
        setMessage({ cle: a.cle, texte: 'Ouverture…' });
        try {
            await apiClient.post(`/ecosysteme/${a.cle}/ouvrir`);
        }
        catch {
            setMessage({ cle: a.cle, texte: 'Impossible de l’ouvrir.' });
            return;
        }
        setTimeout(() => setMessage((m) => (m?.cle === a.cle ? null : m)), 2500);
    };
    const titre = (a: Appli) => (a.present ? `Ouvrir ${a.libelle}` : `${a.libelle} n’est pas installée sur ce PC`);
    if (rail) {
        return (<div className="flex flex-col items-center gap-1.5 pt-1.5 border-t border-trait-leger" data-portes="ecosysteme">
                {applis.map((a) => {
                const I = ICONES[a.cle] ?? ArrowSquareOut;
                return (<button key={a.cle} onClick={() => void ouvrir(a)} disabled={!a.present} title={titre(a)} data-porte={`ecosysteme-${a.cle}`} className={`w-10 h-10 rounded-[10px] grid place-items-center text-[19px] ${a.present ? 'text-encre-2 hover:bg-papier' : 'text-encre-3 opacity-50 cursor-not-allowed'}`}>
                            <I />
                        </button>);
            })}
            </div>);
    }
    return (<div className="flex flex-col gap-2 pt-2 border-t border-trait-leger" data-portes="ecosysteme">
            <style>{`
                @keyframes eclat-porte { 0%, 72% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(260%) skewX(-20deg); } }
                [data-porte^="ecosysteme-"] .eclat { animation: eclat-porte 5.5s ease-in-out infinite; }
                [data-porte="ecosysteme-omnitheque"] .eclat { animation-delay: 2.7s; }
                @media (prefers-reduced-motion: reduce) { [data-porte^="ecosysteme-"] .eclat { animation: none; opacity: 0; } }
            `}</style>
            <div className="flex gap-2">
                {applis.map((a) => {
            const I = ICONES[a.cle] ?? ArrowSquareOut;
            const fond = COULEURS[a.cle] ?? COULEURS.racines;
            return (<button key={a.cle} onClick={() => void ouvrir(a)} disabled={!a.present} title={titre(a)} data-porte={`ecosysteme-${a.cle}`} style={{ background: fond }} className={`relative overflow-hidden flex-1 min-w-0 flex flex-col justify-between gap-0.5 h-[66px] px-2.5 py-1.5 rounded-[12px] text-left text-white shadow-carte transition-transform duration-200 ${a.present ? 'hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'}`}>
                            <span className="eclat pointer-events-none absolute inset-y-0 left-0 w-1/3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)' }}/>
                            <span className="relative flex items-start gap-1.5">
                                <I size={18} className="flex-none mt-px"/>
                                <span className="text-[12.5px] font-semibold leading-[1.15]">{message?.cle === a.cle ? message.texte : a.libelle}</span>
                            </span>
                            <span className="relative text-[10.5px] opacity-90 flex items-center gap-1">Ouvrir <ArrowSquareOut size={11}/></span>
                        </button>);
        })}
            </div>
        </div>);
};
const COULEURS: Record<string, string> = {
    racines: 'linear-gradient(135deg, #d9862f 0%, #a8541c 100%)',
    omnitheque: 'linear-gradient(135deg, #3b5bdb 0%, #23307a 100%)',
};
