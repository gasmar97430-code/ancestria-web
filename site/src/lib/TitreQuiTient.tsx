import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
export function TitreQuiTient({ texte, taille = 72, mini = 24, entier = false, className = '', title, children }: {
    texte: string;
    taille?: number;
    mini?: number;
    entier?: boolean;
    className?: string;
    title?: string;
    children?: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [px, setPx] = useState(taille);
    useLayoutEffect(() => {
        try {
            const boite = ref.current;
            if (!boite)
                return;
            const placeLibre = () => {
                const colonne = boite.parentElement, rangee = colonne?.parentElement;
                if (!colonne || !rangee)
                    return boite.clientWidth;
                const sr = getComputedStyle(rangee);
                let reste = rangee.clientWidth - parseFloat(sr.paddingLeft) - parseFloat(sr.paddingRight);
                const voisins = [...rangee.children].filter((e) => e !== colonne && !['absolute', 'fixed'].includes(getComputedStyle(e).position) && getComputedStyle(e).display !== 'none');
                for (const e of voisins)
                    reste -= (e as HTMLElement).offsetWidth;
                reste -= (parseFloat(sr.columnGap) || 0) * voisins.length;
                return Math.max(boite.clientWidth, Math.floor(reste));
            };
            const ajuster = () => {
                const large = entier ? placeLibre() : boite.clientWidth;
                if (!large)
                    return;
                const mesure = document.createElement('span');
                const style = getComputedStyle(boite);
                Object.assign(mesure.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', fontFamily: style.fontFamily, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing === 'normal' ? 'normal' : `${(parseFloat(style.letterSpacing) / parseFloat(style.fontSize)) * taille}px`, fontSize: `${taille}px` });
                document.body.appendChild(mesure);
                let plusLarge = 0;
                for (const morceau of entier ? [texte] : texte.split(/\s+|(?<=-)/)) {
                    mesure.textContent = morceau;
                    plusLarge = Math.max(plusLarge, mesure.getBoundingClientRect().width);
                }
                mesure.remove();
                setPx(plusLarge > large ? Math.max(mini, Math.floor(taille * (large / plusLarge) * 0.98 * 10) / 10) : taille);
            };
            ajuster();
            document.fonts?.ready.then(ajuster).catch(() => { });
            const ro = new ResizeObserver(ajuster);
            ro.observe(boite);
            return () => ro.disconnect();
        }
        catch {
            setPx(taille);
        }
    }, [texte, taille, mini, entier]);
    return (<div ref={ref} className={className} style={{ fontSize: px }} data-titre-tient={px} title={title}>
            {children ?? texte}
        </div>);
}
