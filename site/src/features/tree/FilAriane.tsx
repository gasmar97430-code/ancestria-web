import { useEffect, useState } from 'react';
import { ArrowLeft, CaretRight, TreeStructure } from '@phosphor-icons/react';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu } from './graphe';
export function suivreHistorique(chemin: Id[], id: Id | null): Id[] {
    if (id === null)
        return chemin;
    const k = chemin.indexOf(id);
    return k >= 0 ? chemin.slice(0, k + 1) : [...chemin, id];
}
export const FilAriane = ({ people, choisi, onChoisir, }: {
    people: Individu[];
    choisi: Id | null;
    onChoisir: (id: Id | null) => void;
}) => {
    const [chemin, setChemin] = useState<Id[]>([]);
    useEffect(() => setChemin((c) => suivreHistorique(c, choisi)), [choisi]);
    const connus = new Map(people.map((p) => [p.id, p]));
    const etapes = chemin.filter((id) => connus.has(id));
    const reculer = () => {
        const k = choisi === null ? etapes.length : etapes.indexOf(choisi);
        onChoisir(k > 0 ? etapes[k - 1] : null);
    };
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                reculer();
            }
        };
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    });
    if (etapes.length === 0)
        return null;
    return (<div className="h-10 flex-none flex items-center gap-1 px-7 border-b border-trait-leger bg-carte text-[12.5px] select-none overflow-x-auto whitespace-nowrap">
            <button onClick={reculer} className="w-7 h-7 grid place-items-center rounded-md text-encre-2 hover:bg-sepia-tint flex-none" title="Revenir au nom précédent (Alt+←)">
                <ArrowLeft />
            </button>
            <button onClick={() => onChoisir(null)} className={`flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-sepia-tint flex-none ${choisi === null ? 'text-encre font-semibold' : 'text-encre-3'}`}>
                <TreeStructure size={14}/>
                Arbre entier
            </button>
            {etapes.map((id) => {
            const p = connus.get(id)!;
            return (<span key={id} className="flex items-center gap-1 flex-none">
                        <CaretRight size={11} className="text-encre-3"/>
                        <button onClick={() => onChoisir(id)} className={`h-7 px-2 rounded-md hover:bg-sepia-tint ${id === choisi ? 'text-sepia-deep font-semibold' : 'text-encre-2'}`}>
                            {p.prenom} {nomLisible(p.nom)}
                        </button>
                    </span>);
        })}
        </div>);
};
