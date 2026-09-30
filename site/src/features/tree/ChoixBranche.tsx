import { useMemo } from 'react';
import type { Id, Union } from '../../types';
import { ascendance, type Individu } from './graphe';
import { nomLisible } from '../../lib/origins';
import { compterSansInconnus } from './ParentInconnu';
export type Branche = 'Toutes' | 'Paternelle' | 'Maternelle';
export function parentDuCote(choisi: Id, cote: 'M' | 'F', parentsDe: Map<Id, Id[]>, people: Individu[]): Individu | null {
    for (const id of parentsDe.get(choisi) ?? []) {
        const p = people.find((x) => x.id === id);
        if (p?.genre === cote)
            return p;
    }
    return null;
}
export function lumineuxDeLaBranche(lumineux: {
    noeuds: Set<string>;
    montee: Set<string>;
} | null, garde: Set<Id> | null, unions: Union[]): {
    noeuds: Set<string>;
    montee: Set<string>;
} | null {
    if (!lumineux || !garde)
        return lumineux;
    const dedans = new Set<string>([...garde].map((id) => `p-${id}`));
    for (const u of unions)
        if (garde.has(u.partenaire1Id) || garde.has(u.partenaire2Id))
            dedans.add(`u-${u.id}`);
    const montee = new Set([...lumineux.montee].filter((n) => dedans.has(n)));
    return { noeuds: montee, montee };
}
function noeudsDeLaBranche(garde: Set<Id>, unions: Union[]): Set<string> {
    const r = new Set<string>([...garde].map((id) => `p-${id}`));
    for (const u of unions)
        if (garde.has(u.partenaire1Id) || garde.has(u.partenaire2Id))
            r.add(`u-${u.id}`);
    return r;
}
export function netsDeLaBranche<T extends Set<string> | null | undefined>(nets: T, garde: Set<Id> | null, unions: Union[]): T {
    if (!nets || !garde)
        return nets;
    const dedans = noeudsDeLaBranche(garde, unions);
    return new Set([...nets].filter((n) => dedans.has(n))) as T;
}
export function noyauDeLaBranche(noyau: Set<string> | null, garde: Set<Id> | null, unions: Union[]): Set<string> | null {
    return garde ? noeudsDeLaBranche(garde, unions) : noyau;
}
export const ChoixBranche = ({ branche, setBranche, choisi, people, parentsDe, }: {
    branche: Branche;
    setBranche: (b: Branche) => void;
    choisi: Id | null;
    people: Individu[];
    parentsDe: Map<Id, Id[]>;
}) => {
    const message = useMemo(() => {
        if (branche === 'Toutes')
            return null;
        const cote = branche === 'Paternelle' ? 'père' : 'mère';
        if (choisi === null)
            return `Cliquez une personne : on verra ses ancêtres côté ${cote}`;
        const personne = people.find((p) => p.id === choisi);
        const parent = parentDuCote(choisi, branche === 'Paternelle' ? 'M' : 'F', parentsDe, people);
        if (!parent)
            return `${cote === 'père' ? 'Père' : 'Mère'} de ${personne?.prenom ?? 'cette personne'} non saisi${cote === 'mère' ? 'e' : ''}`;
        const n = compterSansInconnus(ascendance(parent.id, parentsDe));
        return `Côté ${cote} : ${parent.prenom} ${nomLisible(parent.nom)} · ${n} ancêtre${n > 1 ? 's' : ''}`;
    }, [branche, choisi, people, parentsDe]);
    return (<div className="flex flex-col gap-1 ml-3 flex-none" data-bloc="choix-branche">
            <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5 self-start">
                {(['Toutes', 'Paternelle', 'Maternelle'] as Branche[]).map((b) => (<button key={b} onClick={() => setBranche(b)} title={b === 'Toutes' ? "Tout l'arbre" : `Ancêtres côté ${b === 'Paternelle' ? 'père' : 'mère'} de la personne choisie`} className={`h-[30px] px-3 rounded-lg text-[12.5px] font-medium text-encre transition-all ${branche === b ? 'bg-blanc shadow-onglet' : 'hover:bg-sepia-tint'}`}>
                        {b}
                    </button>))}
            </div>
            {message && <div className="text-[11px] leading-[1.25] text-encre-3 line-clamp-2 w-0 min-w-full" title={message} data-message-branche>{message}</div>}
        </div>);
};
