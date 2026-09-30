import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Search } from 'lucide-react';
import { usePatronymeStore } from '../store/usePatronymeStore';
import { Patronyme } from '../types';
const ORDRE_ORIGINES = [
    'Europe',
    'Malgache',
    'Affranchi 1848',
    'Inde tamoule',
    'Inde musulmane',
    'Chine',
    'Non documentee',
];
const LIBELLES: Record<string, string> = {
    'Non documentee': 'Origine non documentée',
};
const COULEURS: Record<string, string> = {
    Europe: 'bg-sky-100 text-sky-800',
    Malgache: 'bg-emerald-100 text-emerald-800',
    'Affranchi 1848': 'bg-amber-100 text-amber-900',
    'Inde tamoule': 'bg-violet-100 text-violet-800',
    'Inde musulmane': 'bg-rose-100 text-rose-800',
    Chine: 'bg-orange-100 text-orange-800',
    'Non documentee': 'bg-gray-100 text-gray-600',
};
interface Props {
    onChoisir: (nom: string) => void;
}
export const RepertoirePatronymes = ({ onChoisir }: Props) => {
    const { patronymes, charge, erreur, charger } = usePatronymeStore();
    const [recherche, setRecherche] = useState('');
    const [deplie, setDeplie] = useState(false);
    useEffect(() => {
        charger();
    }, [charger]);
    const terme = recherche.trim().toUpperCase();
    const groupes = useMemo(() => {
        const retenus = terme ? patronymes.filter((p) => p.nom.includes(terme)) : patronymes;
        const parOrigine = new Map<string, Patronyme[]>();
        for (const p of retenus) {
            const liste = parOrigine.get(p.origine);
            if (liste)
                liste.push(p);
            else
                parOrigine.set(p.origine, [p]);
        }
        const connues = ORDRE_ORIGINES.filter((o) => parOrigine.has(o));
        const autres = [...parOrigine.keys()].filter((o) => !ORDRE_ORIGINES.includes(o));
        return [...connues, ...autres].map((origine) => ({
            origine,
            noms: parOrigine.get(origine)!,
        }));
    }, [patronymes, terme]);
    if (erreur) {
        return <p className="text-xs text-gray-500">Répertoire indisponible&nbsp;: {erreur}</p>;
    }
    const rendreNom = (p: Patronyme) => (<li key={p.id}>
            <button type="button" onClick={() => onChoisir(p.nom)} title={[
            p.certitude === 'Probable'
                ? 'Origine probable, déduite de la forme du nom'
                : null,
            p.procede ? `Procédé : ${p.procede}` : null,
            p.frequence ? `${p.frequence} naissances entre 1891 et 1915` : null,
            p.rang ? `${p.rang}ᵉ patronyme de l'île` : null,
            p.notes,
        ]
            .filter(Boolean)
            .join('\n') || undefined} className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 text-sm text-gray-700 flex justify-between items-baseline gap-2">
                <span className="truncate flex items-center gap-1">
                    {p.nom}
                    {p.certitude === 'Probable' && (<HelpCircle size={11} className="text-gray-400 shrink-0"/>)}
                </span>
                {p.frequence && (<span className="text-[11px] text-gray-400 shrink-0">{p.frequence}</span>)}
            </button>
        </li>);
    return (<section className="flex flex-col min-h-0 flex-1">
            <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Patronymes réunionnais
                </h2>
                <span className="text-xs text-gray-400">{patronymes.length}</span>
            </div>

            <div className="relative mb-2">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un nom" aria-label="Rechercher un patronyme" className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 -mr-2 pr-2">
                {!charge && <p className="text-xs text-gray-400">Chargement…</p>}

                {charge && groupes.length === 0 && (<p className="text-xs text-gray-400">Aucun nom ne correspond.</p>)}

                {groupes.map(({ origine, noms }) => {
            const sansOrigine = origine === 'Non documentee';
            const visible = !sansOrigine || deplie || terme.length > 0;
            return (<div key={origine} className="mb-3">
                            <button type="button" disabled={!sansOrigine} onClick={() => setDeplie((v) => !v)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold mb-1 ${COULEURS[origine] ?? 'bg-gray-100 text-gray-700'} ${sansOrigine && !terme ? 'cursor-pointer' : 'cursor-default'}`}>
                                {sansOrigine &&
                    !terme &&
                    (deplie ? (<ChevronDown size={11}/>) : (<ChevronRight size={11}/>))}
                                {LIBELLES[origine] ?? origine} · {noms.length}
                            </button>

                            {visible && <ul>{noms.map(rendreNom)}</ul>}
                        </div>);
        })}
            </div>

            <p className="mt-2 text-[11px] leading-snug text-gray-400 border-t border-gray-200 pt-2">
                L'origine indiquée est celle <strong>du nom</strong>, pas celle des
                familles qui le portent&nbsp;: en 1848 l'état civil a attribué un
                patronyme à plus de 62&nbsp;000 affranchis. Les noms marqués{' '}
                <HelpCircle size={10} className="inline align-baseline"/> portent une
                origine probable, déduite de leur forme et non établie par une source.
            </p>
        </section>);
};
