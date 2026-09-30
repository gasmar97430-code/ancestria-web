import { useEffect, useRef } from 'react';
import { estMixte, proposerSexe } from './sexePrenom';
export function useSexePropose(prenom: string, genre: string, setGenre: (g: string) => void, actif = true) {
    const touche = useRef(false);
    const auto = useRef<string | null>(null);
    useEffect(() => {
        if (!actif || touche.current)
            return;
        const p = proposerSexe(prenom);
        const voulu = p ? p.genre : 'Unknown';
        if (p || auto.current !== null) {
            if (genre !== voulu)
                setGenre(voulu);
            auto.current = p ? voulu : null;
        }
    }, [prenom, actif]);
    return {
        manuel: () => {
            touche.current = true;
        },
        reinit: () => {
            touche.current = false;
            auto.current = null;
        },
    };
}
export const IndiceSexe = ({ prenom, genre }: {
    prenom: string;
    genre: string;
}) => {
    if (!prenom.trim())
        return null;
    const p = proposerSexe(prenom);
    const texte = p
        ? p.genre === genre
            ? `Proposé d'après le prénom : ${p.part} % des « ${p.lu} » sont des ${p.genre === 'M' ? 'garçons' : 'filles'} (INSEE). Modifiable.`
            : `Attention : ${p.part} % des « ${p.lu} » sont des ${p.genre === 'M' ? 'garçons' : 'filles'} (INSEE). Garde ton choix s'il est juste.`
        : estMixte(prenom)
            ? 'Prénom mixte : à choisir.'
            : '';
    if (!texte)
        return null;
    return <div className="text-[11px] text-encre-3 mt-1 leading-snug">{texte}</div>;
};
