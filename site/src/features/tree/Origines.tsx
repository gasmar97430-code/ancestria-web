import { useMemo } from 'react';
import { usePatronymeStore } from '../../store/usePatronymeStore';
import { useTreeStore } from '../../store/useTreeStore';
import { normaliser, ORDRE_ORIGINES, teinteDe } from '../../lib/origins';
import type { Id, Patronyme } from '../../types';
import type { Individu, UnionComplete } from './graphe';
import { origineDuNom } from './graphe';
import { liensDeFamille } from './focus';
import { sansFichesInconnues } from './ParentInconnu';
export const COURT_CARTE: Record<string, string> = {
    Europe: 'Europe',
    Malgache: 'Madagascar',
    'Inde tamoule': 'Inde tam.',
    'Inde musulmane': 'Inde mus.',
    Chine: 'Chine',
    'Affranchi 1848': 'Affr. 1848',
    'Non documentee': 'Non doc.',
    'Hors repertoire': 'Hors rép.',
};
export const COURT: Record<string, string> = {
    Europe: 'Europe',
    Malgache: 'Madagascar',
    'Inde tamoule': 'Inde tamoule',
    'Inde musulmane': 'Inde musulmane',
    Chine: 'Chine',
    'Affranchi 1848': 'Affranchi 1848',
    'Non documentee': 'Non documentée',
    'Hors repertoire': 'Hors répertoire',
};
export const OrigineCarte = ({ origine }: {
    origine: string;
}) => {
    const t = teinteDe(origine);
    return (<span className="absolute bottom-[4px] left-[12px] w-[44px] flex justify-center text-[8.5px] leading-none whitespace-nowrap" style={{ color: t.c }} title={`Patronyme d'origine ${t.adjectif} (origine du nom, pas forcément de la personne)`}>
            {COURT_CARTE[origine] ?? origine}
        </span>);
};
export function originesAscendance(pivot: Id, people: Individu[], parentsDe: Map<Id, Set<Id>>, index: Map<string, Patronyme>) {
    const vus = new Set<Id>([pivot]);
    const pile = [pivot];
    while (pile.length)
        for (const p of parentsDe.get(pile.pop()!) ?? [])
            if (!vus.has(p))
                (vus.add(p), pile.push(p));
    const compte = new Map<string, number>();
    for (const id of vus) {
        const p = people.find((x) => x.id === id);
        if (!p)
            continue;
        const o = origineDuNom(p.nom, index);
        compte.set(o, (compte.get(o) ?? 0) + 1);
    }
    const ordre = [...ORDRE_ORIGINES, 'Hors repertoire'];
    return {
        total: [...compte.values()].reduce((a, b) => a + b, 0),
        lignes: [...compte.entries()].sort((a, b) => b[1] - a[1] || ordre.indexOf(a[0]) - ordre.indexOf(b[0])),
    };
}
export const OriginesAscendance = ({ personne }: {
    personne: Individu;
}) => {
    const tree = useTreeStore();
    const { patronymes } = usePatronymeStore();
    const index = useMemo(() => new Map<string, Patronyme>(patronymes.map((p) => [normaliser(p.nom), p])), [patronymes]);
    const liens = useMemo(() => liensDeFamille(tree.unions as UnionComplete[], tree.relationships, tree.unionChildren), [tree.unions, tree.relationships, tree.unionChildren]);
    const { total, lignes } = originesAscendance(personne.id, sansFichesInconnues(tree.people as Individu[]), liens.parentsDe, index);
    if (total === 0)
        return null;
    return (<div className="flex flex-col gap-1.5">
            <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">
                Origines des noms {total > 1 ? `· la personne et ${total - 1} ancêtre${total > 2 ? 's' : ''}` : ''}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
                {lignes.map(([o, n]) => (<div key={o} style={{ width: `${(100 * n) / total}%`, background: teinteDe(o).c }} title={`${COURT[o] ?? o} : ${n}`}/>))}
            </div>
            {lignes.map(([o, n]) => (<div key={o} className="flex items-center gap-2 text-[12.5px] text-encre-2">
                    <span className="w-2 h-2 rounded-full flex-none" style={{ background: teinteDe(o).c }}/>
                    <span className="text-encre">{COURT[o] ?? o}</span>
                    <span className="ml-auto font-mono text-[11px]">
                        {n} · {Math.round((100 * n) / total)} %
                    </span>
                </div>))}
            <div className="text-[11px] text-encre-3 leading-snug">
                Origine du nom, pas forcément de la personne : en 1848, des noms ont été attribués aux affranchis.
            </div>
        </div>);
};
