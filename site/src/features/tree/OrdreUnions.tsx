import { useEffect, useMemo, useState } from 'react';
import type { Node } from 'reactflow';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { libelleUnion, type UnionComplete } from './graphe';
import { messageErreur } from './edition';
import { fixerRangsConjoints, rangsDesConjoints, type Rang } from './ordreConjoints';
type U = UnionComplete & {
    statut?: string;
};
type PersonneMin = {
    id: Id;
    prenom: string;
    nom: string;
    genre: string;
};
export const ordinal = (n: number) => (n === 1 ? '1re' : `${n}e`);
export const STATUT_COURT: Record<string, string> = { Divorced: 'divorcés', Separated: 'séparés', Widowed: 'veuvage' };
const STATUTS: [
    string,
    string
][] = [['Active', 'En couple / mariés'], ['Divorced', 'Divorcés'], ['Separated', 'Séparés'], ['Widowed', 'Veuvage']];
export const useRangsUnions = create<{
    rangs: Rang[];
    charger: () => Promise<void>;
}>((set) => ({
    rangs: [],
    charger: async () => {
        try {
            set({ rangs: (await apiClient.get('/rangs-unions')).data as Rang[] });
        }
        catch {
        }
    },
}));
const rafraichir = async () => {
    await useRangsUnions.getState().charger();
    await useTreeStore.getState().fetchTree();
};
export const rangDe = (rangs: Rang[], individuId: Id, unionId: Id) => rangs.find((r) => r.individuId === individuId && r.unionId === unionId)?.rang ?? null;
const unionsDe = (unions: U[], id: Id) => unions.filter((u) => u.partenaire1Id === id || u.partenaire2Id === id);
export function useAvecOrdreUnions<T extends {
    unions: unknown[];
}>(tree: T): T {
    const { rangs, charger } = useRangsUnions();
    const toutes = useTreeStore((s) => s.unions);
    const signature = `${toutes.length}:${toutes.reduce((m, u) => Math.max(m, u.id), 0)}`;
    useEffect(() => {
        void charger();
    }, [signature, charger]);
    fixerRangsConjoints(rangsDesConjoints(rangs, toutes as U[]));
    const unions = useMemo(() => [...tree.unions], [tree.unions, rangs]);
    return { ...tree, unions };
}
export function precisionUnion(u: U, rangs: Rang[], unions: U[], vuDe: Id[]): string[] {
    const morceaux: string[] = [];
    const multiples = vuDe.filter((id) => unionsDe(unions, id).length >= 2);
    if (multiples.length > 0) {
        const r = multiples.map((id) => rangDe(rangs, id, u.id));
        morceaux.push(r.every((x) => x === null) ? 'ordre à préciser' : r.map((x) => (x === null ? '?' : ordinal(x))).join(' / ') + ' union');
    }
    if (u.statut && STATUT_COURT[u.statut])
        morceaux.push(STATUT_COURT[u.statut]);
    return morceaux;
}
export function avecRangsPastilles(nodes: Node[], unions: U[], rangs: Rang[]): Node[] {
    const parNoeud = new Map(unions.map((u) => [`u-${u.id}`, u]));
    return nodes.map((n) => {
        if (n.type !== 'pastille')
            return n;
        const u = parNoeud.get(n.id);
        if (!u)
            return n;
        const avant = precisionUnion(u, rangs, unions, [u.partenaire1Id, u.partenaire2Id]);
        if (avant.length === 0)
            return n;
        const libelle = (n.data as {
            libelle: string;
        }).libelle;
        const suite = avant.length > 1 ? libelle.split(' · ')[0] : libelle;
        const texte = [...avant, suite].join(' · ');
        return { ...n, data: { ...n.data, libelle: texte.length > 30 ? avant.join(' · ') : texte } };
    });
}
export function trierParRang<T extends {
    id: Id;
}>(personneId: Id, liste: T[]): T[] {
    const rangs = useRangsUnions.getState().rangs;
    return [...liste].sort((a, b) => (rangDe(rangs, personneId, a.id) ?? 1000) - (rangDe(rangs, personneId, b.id) ?? 1000) || a.id - b.id);
}
export function libelleUnionFiche(personneId: Id, u: U, sesUnions: U[]): string {
    const { rangs } = useRangsUnions.getState();
    return [...precisionUnion(u, rangs, sesUnions, [personneId]), libelleUnion(u)].join(' · ');
}
type Choix = {
    statut: string;
    rang: number | null;
    precedents: Record<number, string>;
};
const useChoixCouple = create<Choix & {
    fixer: (c: Partial<Choix>) => void;
    vider: () => void;
}>((set) => ({
    statut: 'Active',
    rang: null,
    precedents: {},
    fixer: (c) => set(c),
    vider: () => set({ statut: 'Active', rang: null, precedents: {} }),
}));
const puce = (on: boolean) => `h-8 px-2.5 rounded-lg text-[12.5px] border ${on ? 'border-sepia text-sepia-deep bg-sepia-tint font-medium' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`;
const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1.5';
export const ChoixCouple = ({ personne }: {
    personne: PersonneMin;
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const sesUnions = unionsDe(tree.unions as U[], personne.id);
    const { statut, rang, precedents, fixer, vider } = useChoixCouple();
    const rangs = useRangsUnions((s) => s.rangs);
    useEffect(() => {
        vider();
        void useRangsUnions.getState().charger();
    }, [personne.id, vider]);
    const pris = new Set(sesUnions.map((u) => rangDe(rangs, personne.id, u.id)).filter((x): x is number => x !== null));
    const conjointDe = (u: U) => people.find((p) => p.id === (u.partenaire1Id === personne.id ? u.partenaire2Id : u.partenaire1Id));
    const qui = (p?: PersonneMin) => (p ? `${p.prenom} ${nomLisible(p.nom)}` : '?');
    return (<div className="flex flex-col gap-3" data-noeud="choix-couple">
            <div>
                <label className={etiquette}>Ce couple</label>
                <div className="flex flex-wrap gap-1.5">
                    {STATUTS.map(([v, t]) => (<button key={v} type="button" className={puce(statut === v)} onClick={() => fixer({ statut: v })} data-statut={v}>
                            {t}
                        </button>))}
                </div>
            </div>
            {sesUnions.length > 0 && (<div>
                    <label className={etiquette}>C'est sa… union ({sesUnions.length} déjà enregistrée{sesUnions.length > 1 ? 's' : ''})</label>
                    <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: sesUnions.length + 1 }, (_, k) => k + 1).map((n) => (<button key={n} type="button" disabled={pris.has(n)} className={`${puce(rang === n)} disabled:opacity-35`} onClick={() => fixer({ rang: n })} data-rang={n} title={pris.has(n) ? `La ${ordinal(n)} union est déjà dite pour un autre couple` : undefined}>
                                {ordinal(n)}
                            </button>))}
                        <button type="button" className={puce(rang === null)} onClick={() => fixer({ rang: null })} data-rang="?">
                            je ne sais pas
                        </button>
                    </div>
                </div>)}
            {sesUnions.filter((u) => (u.statut ?? 'Active') === 'Active').map((u) => (<div key={u.id}>
                    <label className={etiquette}>Et le couple avec {qui(conjointDe(u))} ?</label>
                    <div className="flex flex-wrap gap-1.5">
                        {STATUTS.map(([v, t]) => (<button key={v} type="button" className={puce((precedents[u.id] ?? 'Active') === v)} onClick={() => fixer({ precedents: { ...precedents, [u.id]: v } })} data-precedent={`${u.id}-${v}`}>
                                {v === 'Active' ? 'Toujours en couple / on ne sait pas' : t}
                            </button>))}
                    </div>
                </div>))}
        </div>);
};
export async function appliquerChoixCouple(personneId: Id, unionId: Id): Promise<void> {
    const { statut, rang, precedents, vider } = useChoixCouple.getState();
    if (statut !== 'Active')
        await apiClient.patch(`/unions/${unionId}`, { statut });
    if (rang !== null)
        await apiClient.put('/rang-union', { individuId: personneId, unionId, rang });
    for (const [id, s] of Object.entries(precedents))
        if (s !== 'Active')
            await apiClient.patch(`/unions/${id}`, { statut: s });
    vider();
    await useRangsUnions.getState().charger();
}
export const RangsDansModifierUnion = ({ union }: {
    union: U;
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const rangs = useRangsUnions((s) => s.rangs);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const lignes = useMemo(() => [union.partenaire1Id, union.partenaire2Id].map((id) => ({ p: people.find((x) => x.id === id), n: unionsDe(tree.unions as U[], id).length })).filter((l) => l.p && l.n >= 2), [union, people, tree.unions]);
    useEffect(() => {
        void useRangsUnions.getState().charger();
    }, []);
    if (lignes.length === 0)
        return null;
    const choisir = async (individuId: Id, rang: number | null) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.put('/rang-union', { individuId, unionId: union.id, rang });
            await rafraichir();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="flex flex-col gap-2" data-noeud="rangs-union">
            {lignes.map(({ p, n }) => {
            const r = rangDe(rangs, p!.id, union.id);
            return (<div key={p!.id}>
                        <label className={etiquette}>Pour {p!.prenom} {nomLisible(p!.nom)} ({n} unions), c'est sa…</label>
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: n }, (_, k) => k + 1).map((k) => (<button key={k} type="button" disabled={envoi} className={puce(r === k)} onClick={() => void choisir(p!.id, k)} data-rang={`${p!.id}-${k}`}>
                                    {ordinal(k)} union
                                </button>))}
                            <button type="button" disabled={envoi} className={puce(r === null)} onClick={() => void choisir(p!.id, null)} data-rang={`${p!.id}-?`}>
                                je ne sais pas
                            </button>
                        </div>
                    </div>);
        })}
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
export const avecRangsDesUnions = (nodes: Node[]): Node[] => avecRangsPastilles(nodes, useTreeStore.getState().unions as U[], useRangsUnions.getState().rangs);
