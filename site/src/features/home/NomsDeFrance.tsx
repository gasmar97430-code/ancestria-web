import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { create } from 'zustand';
import { normaliser } from '../../lib/origins';
import { sansRecherche } from './accueilNeutre';
const MAX = 6;
type Nom = {
    nom: string;
    cle: string;
    naissances: number;
};
let liste: Promise<Nom[]> | null = null;
export const useNomFrance = create<{
    nom: string | null;
    pour: string;
}>(() => ({ nom: null, pour: '' }));
function charger(): Promise<Nom[]> {
    liste ??= fetch('noms-france.txt')
        .then((r) => (r.ok ? r.text() : ''))
        .then((t) => t.split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => {
        const [nom, n] = l.split('\t');
        return { nom, cle: normaliser(nom), naissances: Number(n) || 0 };
    }))
        .catch(() => []);
    return liste;
}
export function adresseOrigine(nom: string): string {
    const s = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `https://www.linternaute.com/noms-de-famille/nom/famille-${s}`;
}
export const BoutonOrigine = ({ nomChoisi, saisie }: {
    nomChoisi?: string;
    saisie: string;
}) => {
    const { nom, pour } = useNomFrance();
    if (sansRecherche(normaliser(saisie)))
        return null;
    const cible = (nom && pour === saisie ? nom : null) ?? nomChoisi ?? saisie.trim();
    return (<a href={adresseOrigine(cible)} target="_blank" rel="noopener noreferrer" title={`Origine du nom ${cible.toUpperCase()} (linternaute.com)`} className="flex items-center gap-[7px] h-[30px] px-3 rounded-[15px] border text-[12.5px] font-medium text-encre transition-all hover:border-sepia bg-carte border-trait" data-bouton="origine">
            Origine <ArrowSquareOut size={13}/>
        </a>);
};
export const NomsDeFrance = ({ saisie }: {
    saisie: string;
}) => {
    const [noms, setNoms] = useState<Nom[] | null>(null);
    const choisi = useNomFrance((s) => (s.pour === saisie ? s.nom : null));
    const terme = normaliser(saisie);
    const vide = sansRecherche(terme);
    useEffect(() => {
        if (!vide && !noms)
            void charger().then(setNoms);
    }, [vide, noms]);
    const trouves = useMemo(() => {
        if (vide || !noms)
            return [];
        const debut: Nom[] = [], dedans: Nom[] = [];
        for (const n of noms) {
            if (n.cle.startsWith(terme)) {
                if (debut.length < MAX)
                    debut.push(n);
            }
            else if (dedans.length < MAX && n.cle.includes(terme))
                dedans.push(n);
            if (debut.length >= MAX)
                break;
        }
        return [...debut, ...dedans].slice(0, MAX);
    }, [noms, terme, vide]);
    if (vide || !noms || trouves.length === 0)
        return null;
    return (<section className="bg-carte border border-trait-leger rounded-2xl p-1.5 flex flex-col" data-bloc="noms-de-france">
            <div className="px-3.5 pt-2 pb-1 text-[10.5px] tracking-[.12em] uppercase text-encre-3">Noms de France</div>
            {trouves.map((n) => (<button key={n.nom} onClick={() => useNomFrance.setState({ nom: n.nom, pour: saisie })} data-nom-france={n.nom} className={`flex flex-col px-3.5 py-2 rounded-[11px] text-left transition-colors hover:bg-sepia-tint ${choisi === n.nom ? 'bg-sepia-tint' : ''}`}>
                    <span className="font-display text-[19px] leading-[1.15] text-encre">{n.nom}</span>
                    <span className="text-xs text-encre-3">{n.naissances.toLocaleString('fr-FR')} naissances en France (1891-2000)</span>
                </button>))}
        </section>);
};
