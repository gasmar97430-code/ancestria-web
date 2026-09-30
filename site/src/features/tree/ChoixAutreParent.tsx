import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu, UnionComplete } from './graphe';
export function unionsDansLOrdre<U extends {
    id: Id;
    dateDebut?: string | null;
}>(unions: U[]): U[] {
    return [...unions].sort((a, b) => {
        const da = a.dateDebut ? Date.parse(a.dateDebut) : Number.POSITIVE_INFINITY;
        const db = b.dateDebut ? Date.parse(b.dateDebut) : Number.POSITIVE_INFINITY;
        return da !== db ? da - db : Number(a.id) - Number(b.id);
    });
}
export function rangConjoint(rang: number, genre?: string | null): string {
    const n = rang === 1 ? '1re' : `${rang}e`;
    return `${n} ${genre === 'F' ? 'épouse' : genre === 'M' ? 'époux' : 'conjoint(e)'}`;
}
export const ChoixAutreParent = ({ unions, conjointDe, valeur, onChange, }: {
    unions: UnionComplete[];
    conjointDe: (u: UnionComplete) => Individu | null;
    valeur: Id | null | undefined;
    onChange: (v: Id | null) => void;
}) => {
    const ordre = unionsDansLOrdre(unions);
    const ligne = (actif: boolean) => `flex items-center gap-2.5 px-3 py-2 rounded-[10px] border text-[13.5px] cursor-pointer ${actif ? 'border-sepia bg-sepia-tint text-encre' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`;
    return (<div className="flex flex-col gap-1.5">
            <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">
                Autre parent{ordre.length > 1 && valeur === undefined ? ' — à choisir' : ''}
            </div>
            {ordre.map((u, i) => {
            const c = conjointDe(u);
            return (<label key={u.id} className={ligne(valeur === u.id)}>
                        <input type="radio" name="autre-parent" checked={valeur === u.id} onChange={() => onChange(u.id)}/>
                        {ordre.length > 1 && <span className="text-encre-3 text-[12px] w-[88px] flex-none">{rangConjoint(i + 1, c?.genre)}</span>}
                        <span className="truncate">{c ? `${c.prenom} ${nomLisible(c.nom)}` : 'Conjoint(e)'}</span>
                    </label>);
        })}
            <label className={ligne(valeur === null)}>
                <input type="radio" name="autre-parent" checked={valeur === null} onChange={() => onChange(null)}/>
                <span>Inconnu / non renseigné</span>
            </label>
        </div>);
};
