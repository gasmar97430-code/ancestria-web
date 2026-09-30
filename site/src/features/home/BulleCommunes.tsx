import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MapPin } from '@phosphor-icons/react';
import { communesDuNom } from './communesDuNom';
export const BulleCommunes = ({ nom }: {
    nom: string;
}) => {
    const [survol, setSurvol] = useState(false);
    const [tenue, setTenue] = useState(false);
    const [versLeHaut, setVersLeHaut] = useState(false);
    const boite = useRef<HTMLDivElement>(null);
    const releve = communesDuNom(nom);
    const ouverte = survol || tenue;
    useLayoutEffect(() => {
        if (!ouverte || !boite.current)
            return;
        try {
            const r = boite.current.getBoundingClientRect();
            const dessous = window.innerHeight - r.bottom;
            setVersLeHaut(dessous < 500 && r.top > dessous);
        }
        catch {
            setVersLeHaut(false);
        }
    }, [ouverte]);
    useEffect(() => {
        setTenue(false);
        setSurvol(false);
    }, [nom]);
    useEffect(() => {
        if (!tenue)
            return;
        const dehors = (e: MouseEvent) => {
            if (boite.current && !boite.current.contains(e.target as Node))
                setTenue(false);
        };
        const echap = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                setTenue(false);
        };
        window.addEventListener('mousedown', dehors);
        window.addEventListener('keydown', echap);
        return () => {
            window.removeEventListener('mousedown', dehors);
            window.removeEventListener('keydown', echap);
        };
    }, [tenue]);
    if (!releve || releve.communes.length === 0)
        return null;
    const max = Math.max(...releve.communes.map((x) => x.individus));
    return (<div ref={boite} className="relative self-start" onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}>
            <button type="button" data-bulle-communes onClick={() => setTenue((v) => !v)} aria-expanded={ouverte} className={`flex items-center gap-1.5 whitespace-nowrap h-[28px] px-3 rounded-[14px] border text-[12.5px] font-medium text-encre-2 transition-colors hover:border-sepia ${ouverte ? 'bg-sepia-tint border-sepia' : 'bg-papier border-trait'}`}>
                <MapPin className="text-sepia"/>
                Où le nom est le plus présent
                <span className="text-encre-3 font-normal">· {releve.communes.length} communes</span>
            </button>

            {ouverte && (<div role="dialog" data-bulle-communes-contenu className={`absolute left-0 ${versLeHaut ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} z-30 w-[360px] max-w-[80vw] max-h-[calc(100vh-96px)] overflow-y-auto bg-carte border border-trait rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,.28)] px-4 py-3.5 flex flex-col gap-2`}>
                    <div className="text-[10.5px] tracking-[.12em] uppercase text-sepia">
                        Communes les plus présentes
                    </div>
                    <ol className="m-0 p-0 list-none flex flex-col gap-[5px]">
                        {releve.communes.map((x, i) => (<li key={x.commune} className="flex flex-col gap-[2px]">
                                <div className="flex items-baseline gap-2 text-[13px]">
                                    <span className="w-5 text-right text-encre-3 tabular-nums">{i + 1}.</span>
                                    <span className="flex-1 min-w-0 text-encre">
                                        {x.commune}
                                        <span className="text-encre-3"> · {x.departement}</span>
                                    </span>
                                    <span className="text-encre-2 tabular-nums">
                                        {x.individus.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')}
                                    </span>
                                </div>
                                <div className="ml-7 h-[3px] rounded-full bg-papier overflow-hidden">
                                    <div className="h-full rounded-full bg-sepia" style={{ width: `${Math.max(2, (x.individus / max) * 100)}%` }}/>
                                </div>
                            </li>))}
                    </ol>
                    <div className="text-[11px] leading-snug text-encre-3 pt-1 border-t border-trait-leger">
                        Nombre d'individus portant le nom dans chaque commune (France). {releve.source}
                    </div>
                </div>)}
        </div>);
};
