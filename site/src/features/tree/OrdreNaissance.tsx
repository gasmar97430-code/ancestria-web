import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import type { Id } from '../../types';
import { messageErreur } from './edition';
import { fixerDatesNaissance, fixerRangsNaissance } from './rangementFratries';
type Rang = {
    individuId: Id;
    rang: number;
};
type PersonneMin = {
    id: Id;
    prenom: string;
    nom: string;
    genre?: string;
};
type Lien = {
    parentId: Id;
    enfantId: Id;
};
export const ordinalEnfant = (n: number, genre?: string) => (n === 1 ? (genre === 'F' ? '1re' : '1er') : `${n}e`);
export const useRangsNaissance = create<{
    rangs: Map<Id, number>;
    charger: () => Promise<void>;
}>((set) => ({
    rangs: new Map(),
    charger: async () => {
        try {
            const liste = (await apiClient.get('/rangs-naissance')).data as Rang[];
            set({ rangs: new Map(liste.map((r) => [r.individuId, r.rang])) });
        }
        catch {
        }
    },
}));
export function enfantsDe(parents: Id[], liens: Lien[]): Id[] {
    const voulue = [...new Set(parents)].sort((a, b) => a - b).join(',');
    const parEnfant = new Map<Id, Set<Id>>();
    for (const l of liens)
        parEnfant.set(l.enfantId, new Set([...(parEnfant.get(l.enfantId) ?? []), l.parentId]));
    return [...parEnfant.entries()].filter(([, ps]) => [...ps].sort((a, b) => a - b).join(',') === voulue).map(([e]) => e).sort((a, b) => a - b);
}
export function fratrieDe(id: Id, liens: Lien[]): Id[] {
    const parents = liens.filter((l) => l.enfantId === id).map((l) => l.parentId);
    return parents.length ? enfantsDe(parents, liens) : [];
}
export function useAvecOrdreNaissance<T extends {
    unions: unknown[];
}>(tree: T): T {
    const { rangs, charger } = useRangsNaissance();
    const liens = useTreeStore((s) => s.relationships);
    const fiches = useTreeStore((s) => s.people);
    const signature = `${fiches.length}:${liens.length}`;
    useEffect(() => {
        void charger();
    }, [signature, charger]);
    fixerRangsNaissance(rangs);
    fixerDatesNaissance(new Map((fiches as {
        id: Id;
        dateNaissance?: string | null;
    }[]).filter((p) => p.dateNaissance).map((p) => [p.id, new Date(p.dateNaissance!).getTime()])));
    const unions = useMemo(() => [...tree.unions], [tree.unions, rangs]);
    return { ...tree, unions };
}
export const DatesOuRang = ({ id, genre }: {
    id: Id;
    genre?: string;
}) => {
    const rang = useRangsNaissance((s) => s.rangs.get(id));
    return <>{rang ? `${ordinalEnfant(rang, genre)} enfant` : 'dates inconnues'}</>;
};
export const sansDates = (id: Id, genre?: string): string => {
    const rang = useRangsNaissance.getState().rangs.get(id);
    return rang ? `${ordinalEnfant(rang, genre)} enfant` : 'dates inconnues';
};
const puce = (on: boolean) => `h-8 px-2.5 rounded-lg text-[12.5px] border ${on ? 'border-sepia text-sepia-deep bg-sepia-tint font-medium' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`;
const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1.5';
export const OrdreNaissanceFiche = ({ personne }: {
    personne: PersonneMin;
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const rangs = useRangsNaissance((s) => s.rangs);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    useEffect(() => {
        void useRangsNaissance.getState().charger();
    }, []);
    const fratrie = fratrieDe(personne.id, tree.relationships);
    if (fratrie.length < 2)
        return null;
    const mien = rangs.get(personne.id) ?? null;
    const qui = (id: Id) => people.find((p) => p.id === id);
    const pris = new Map(fratrie.filter((id) => id !== personne.id && rangs.has(id)).map((id) => [rangs.get(id)!, id]));
    const ordre = [...fratrie].sort((a, b) => (rangs.get(a) ?? 1000) - (rangs.get(b) ?? 1000) || a - b);
    const choisir = async (rang: number | null) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.put('/rang-naissance', { individuId: personne.id, rang });
            await useRangsNaissance.getState().charger();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="flex flex-col gap-2" data-noeud="ordre-naissance">
            <label className={etiquette}>Ordre de naissance ({fratrie.length} enfants de ces parents)</label>
            <div className="flex flex-wrap gap-1.5">
                {fratrie.map((_, k) => k + 1).map((n) => {
            const autre = pris.get(n);
            return (<button key={n} type="button" disabled={envoi || autre !== undefined} className={`${puce(mien === n)} disabled:opacity-35`} onClick={() => void choisir(n)} data-rang-naissance={n} title={autre !== undefined ? `Déjà dit pour ${qui(autre)?.prenom ?? '?'}` : undefined}>
                            {ordinalEnfant(n, personne.genre)}
                        </button>);
        })}
                <button type="button" disabled={envoi} className={puce(mien === null)} onClick={() => void choisir(null)} data-rang-naissance="?">
                    je ne sais pas
                </button>
            </div>
            <div className="text-[12px] text-encre-3" data-fratrie-ordre>
                {ordre.map((id) => {
            const p = qui(id);
            const r = rangs.get(id);
            return `${r ? ordinalEnfant(r, p?.genre) : '?'} ${p?.prenom ?? '?'}`;
        }).join(' · ')}
            </div>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
const useChoixRang = create<{
    rang: number | null;
    fixer: (r: number | null) => void;
}>((set) => ({ rang: null, fixer: (rang) => set({ rang }) }));
export const ChoixRangNaissance = ({ parents }: {
    parents: Id[];
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const rangs = useRangsNaissance((s) => s.rangs);
    const { rang, fixer } = useChoixRang();
    const cle = parents.join(',');
    useEffect(() => {
        fixer(null);
        void useRangsNaissance.getState().charger();
    }, [cle, fixer]);
    const deja = enfantsDe(parents, tree.relationships);
    if (deja.length === 0)
        return null;
    const pris = new Map(deja.filter((id) => rangs.has(id)).map((id) => [rangs.get(id)!, id]));
    return (<div data-noeud="choix-rang-naissance">
            <label className={etiquette}>Ordre de naissance ({deja.length} enfant{deja.length > 1 ? 's' : ''} déjà enregistré{deja.length > 1 ? 's' : ''})</label>
            <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: deja.length + 1 }, (_, k) => k + 1).map((n) => {
            const autre = pris.get(n);
            return (<button key={n} type="button" disabled={autre !== undefined} className={`${puce(rang === n)} disabled:opacity-35`} onClick={() => fixer(n)} data-rang-naissance={n} title={autre !== undefined ? `Déjà dit pour ${people.find((p) => p.id === autre)?.prenom ?? '?'}` : undefined}>
                            {ordinalEnfant(n)}
                        </button>);
        })}
                <button type="button" className={puce(rang === null)} onClick={() => fixer(null)} data-rang-naissance="?">
                    je ne sais pas
                </button>
            </div>
        </div>);
};
export async function appliquerRangNaissance(enfantId: Id): Promise<void> {
    const { rang, fixer } = useChoixRang.getState();
    fixer(null);
    if (rang === null)
        return;
    try {
        await apiClient.put('/rang-naissance', { individuId: enfantId, rang });
        await useRangsNaissance.getState().charger();
    }
    catch {
    }
}
