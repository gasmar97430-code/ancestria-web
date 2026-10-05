import { useEffect, useMemo, useState } from 'react';
import type { Edge } from 'reactflow';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { allerALaPersonne } from '../../store/versPersonne';
import { nomLisible } from '../../lib/origins';
import type { Id, Relationship, UnionChild } from '../../types';
import { corpsPersonne, messageErreur, personneVide } from './edition';
import { ChoixPersonne } from './ChoixPersonne';
export const NATURES: [
    string,
    string,
    string
][] = [
    ['naissance', 'de naissance', 'Biological'],
    ['don_gametes', 'don de gamètes', 'Biological'],
    ['gestation', 'gestation (a porté l’enfant)', 'Biological'],
    ['adoption_pleniere', 'adoption plénière', 'Adoptive'],
    ['adoption_simple', 'adoption simple', 'Adoptive'],
    ['legale_sociale', 'parent légal / social', 'Adoptive'],
    ['intention_gpa', 'parent d’intention (GPA)', 'Adoptive'],
    ['beau_parent', 'beau-parent', 'Step'],
    ['accueil', 'famille d’accueil', 'Step'],
];
const LIBELLE = Object.fromEntries(NATURES.map(([c, l]) => [c, l]));
const PAR_DEFAUT: Record<string, string> = { Biological: 'naissance', Adoptive: 'adoption_pleniere', Step: 'beau_parent' };
const BASE_FR: Record<string, string> = { Adoptive: 'adoption', Step: 'beau-parent' };
type Membre = {
    unionId: Id;
    individuId: Id;
    nature: string;
};
type NatureLien = {
    parentId: Id;
    enfantId: Id;
    nature: string;
    viaFoyer: Id | null;
};
type P = {
    id: Id;
    prenom: string;
    nom: string;
    genre: string;
};
type U = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
export const useFamillesFormes = create<{
    membres: Membre[];
    natures: NatureLien[];
    genres: Map<Id, string>;
    charger: () => Promise<void>;
}>((set) => ({
    membres: [],
    natures: [],
    genres: new Map(),
    charger: async () => {
        try {
            const [m, n, g] = await Promise.all([apiClient.get('/foyers-membres'), apiClient.get('/natures-filiation'), apiClient.get('/genres-libelles')]);
            set({ membres: m.data, natures: n.data, genres: new Map((g.data as {
                    individuId: Id;
                    libelle: string;
                }[]).map((x) => [x.individuId, x.libelle])) });
        }
        catch {
        }
    },
}));
const rafraichir = async () => {
    await useFamillesFormes.getState().charger();
    await useTreeStore.getState().fetchTree();
};
function useCharge() {
    const people = useTreeStore((s) => s.people);
    const rel = useTreeStore((s) => s.relationships);
    const sig = `${people.length}:${rel.length}`;
    useEffect(() => {
        void useFamillesFormes.getState().charger();
    }, [sig]);
}
export const natureDe = (natures: NatureLien[], parentId: Id, enfantId: Id, typeLien: string) => natures.find((n) => n.parentId === parentId && n.enfantId === enfantId)?.nature ?? PAR_DEFAUT[typeLien] ?? 'naissance';
export function avecNaturesTraits(edges: Edge[]): Edge[] {
    const { natures } = useFamillesFormes.getState();
    return edges.map((e) => {
        if (!e.label)
            return e;
        if (typeof e.style?.opacity === 'number' && e.style.opacity < 0.5)
            return { ...e, label: undefined };
        const m = /^rel-(\d+)-(\d+)-(\w+)$/.exec(e.id);
        if (m) {
            const n = natures.find((x) => x.parentId === Number(m[1]) && x.enfantId === Number(m[2]));
            return { ...e, label: n ? LIBELLE[n.nature] : BASE_FR[m[3]] ?? e.label };
        }
        return { ...e, label: BASE_FR[String(e.label)] ?? e.label };
    });
}
export function libelleLienFiche(parentId: Id, enfantId: Id, _typeLien: string, ancien: string): string {
    const n = useFamillesFormes.getState().natures.find((x) => x.parentId === parentId && x.enfantId === enfantId);
    return n ? (n.nature === 'naissance' ? '' : ` (${LIBELLE[n.nature]})`) : ancien;
}
export type Fratrie = {
    germains: Id[];
    demi: {
        id: Id;
        via: Id[];
    }[];
    adoption: Id[];
    quasi: Id[];
    beaux: Id[];
};
export function calculerFratrie(id: Id, relationships: Relationship[], unionChildren: UnionChild[], unions: U[]): Fratrie {
    const unionPar = new Map(unions.map((u) => [u.id, u]));
    const naissance = (x: Id) => {
        const s = new Set(relationships.filter((r) => r.enfantId === x && r.typeLien === 'Biological').map((r) => r.parentId));
        for (const uc of unionChildren.filter((c) => c.enfantId === x)) {
            const u = unionPar.get(uc.unionId);
            if (u && !relationships.some((r) => r.enfantId === x && (r.parentId === u.partenaire1Id || r.parentId === u.partenaire2Id) && r.typeLien !== 'Biological')) {
                s.add(u.partenaire1Id);
                s.add(u.partenaire2Id);
            }
        }
        return s;
    };
    const tous = (x: Id) => new Set([...naissance(x), ...relationships.filter((r) => r.enfantId === x).map((r) => r.parentId)]);
    const enfantsDe = (p: Id) => new Set([...relationships.filter((r) => r.parentId === p).map((r) => r.enfantId), ...unionChildren.filter((c) => { const u = unionPar.get(c.unionId); return u && (u.partenaire1Id === p || u.partenaire2Id === p); }).map((c) => c.enfantId)]);
    const conjoints = (p: Id) => unions.filter((u) => u.partenaire1Id === p || u.partenaire2Id === p).map((u) => (u.partenaire1Id === p ? u.partenaire2Id : u.partenaire1Id));
    const mesNaiss = naissance(id);
    const mesTous = tous(id);
    const f: Fratrie = { germains: [], demi: [], adoption: [], quasi: [], beaux: [] };
    const candidats = new Set<Id>();
    for (const p of mesTous) {
        for (const e of enfantsDe(p))
            candidats.add(e);
        for (const c of conjoints(p))
            for (const e of enfantsDe(c))
                candidats.add(e);
    }
    candidats.delete(id);
    for (const s of candidats) {
        const sesNaiss = naissance(s);
        const communs = [...mesNaiss].filter((p) => sesNaiss.has(p));
        if (communs.length > 0 && communs.length === mesNaiss.size && communs.length === sesNaiss.size)
            f.germains.push(s);
        else if (communs.length > 0)
            f.demi.push({ id: s, via: communs });
        else if ([...mesTous].some((p) => tous(s).has(p)))
            f.adoption.push(s);
        else
            f.quasi.push(s);
    }
    const beaux = new Set<Id>();
    for (const c of conjoints(id)) {
        const fc = calculerFratrieSimple(c);
        fc.forEach((x) => beaux.add(x));
    }
    for (const s of [...f.germains, ...f.demi.map((d) => d.id)])
        conjoints(s).forEach((x) => beaux.add(x));
    beaux.delete(id);
    f.beaux = [...beaux];
    return f;
    function calculerFratrieSimple(x: Id): Id[] {
        const n = naissance(x);
        const r = new Set<Id>();
        for (const p of n)
            for (const e of enfantsDe(p))
                if (e !== x && [...naissance(e)].some((q) => n.has(q)))
                    r.add(e);
        return [...r];
    }
}
const petit = 'h-7 px-2 rounded-lg text-[12px] border';
const titre = 'text-[10.5px] tracking-[.1em] uppercase text-encre-3';
export const FamilleFiche = ({ personne }: {
    personne: P;
}) => {
    useCharge();
    const tree = useTreeStore();
    const { natures, genres } = useFamillesFormes();
    const people = tree.people as unknown as P[];
    const nom = (id: Id) => { const x = people.find((q) => q.id === id); return x ? `${x.prenom} ${nomLisible(x.nom)}` : '?'; };
    const liens = tree.relationships.filter((r) => r.enfantId === personne.id);
    const fr = useMemo(() => calculerFratrie(personne.id, tree.relationships, tree.unionChildren, tree.unions as U[]), [personne.id, tree.relationships, tree.unionChildren, tree.unions]);
    const [erreur, setErreur] = useState<string | null>(null);
    const [libelle, setLibelle] = useState(genres.get(personne.id) ?? '');
    useEffect(() => setLibelle(genres.get(personne.id) ?? ''), [genres, personne.id]);
    const agir = async (f: () => Promise<unknown>) => {
        setErreur(null);
        try {
            await f();
            await rafraichir();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
    };
    const lien = (id: Id) => (<button key={id} onClick={() => { const x = people.find((q) => q.id === id); if (x)
        allerALaPersonne(x.id, x.nom); }} className="text-encre hover:underline">
            {nom(id)}
        </button>);
    const groupe = (lib: string, ids: Id[], suite?: (id: Id) => string) => ids.length === 0 ? null : (<div className="text-[12.5px] text-encre-2" data-fratrie={lib}>
                <span className="text-encre-3">{lib} : </span>
                {ids.map((id, k) => (<span key={id}>
                        {k > 0 && ', '}
                        {lien(id)}
                        {suite && <span className="text-encre-3"> {suite(id)}</span>}
                    </span>))}
            </div>);
    const vide = fr.germains.length + fr.demi.length + fr.adoption.length + fr.quasi.length + fr.beaux.length === 0;
    return (<div className="flex flex-col gap-2.5" data-noeud="famille-fiche">
            {liens.length > 0 && (<details className="flex flex-col gap-1" data-bloc="natures">
                    <summary className={`${titre} cursor-pointer`}>Nature des liens ({liens.length})</summary>
                    {liens.map((r) => (<label key={`${r.parentId}-${r.typeLien}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-encre mt-1">
                            <span className="min-w-[6.5rem] flex-1 leading-tight">{nom(r.parentId)}</span>
                            <select className="h-7 bg-blanc border border-trait rounded-lg text-[12px] px-1 max-w-[170px]" value={natureDe(natures, r.parentId, personne.id, r.typeLien)} onChange={(e) => void agir(() => apiClient.put('/nature-filiation', { parentId: r.parentId, enfantId: personne.id, nature: e.target.value }))} data-nature={r.parentId}>
                                {NATURES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                            </select>
                        </label>))}
                </details>)}

            <div className="flex flex-col gap-1" data-bloc="genre">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={titre}>Genre</span>
                    {([['M', 'Homme'], ['F', 'Femme'], ['Other', 'Non binaire'], ['Unknown', 'Non renseigné']] as const).map(([g, t]) => (<button key={g} data-genre={g} onClick={() => personne.genre !== g && void agir(() => apiClient.patch(`/people/${personne.id}`, { genre: g }))} className={`${petit} ${personne.genre === g ? 'border-sepia text-sepia-deep bg-sepia-tint' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`}>
                            {t}
                        </button>))}
                </div>
                {personne.genre === 'Other' && (<input className="h-8 px-2 bg-blanc border border-trait rounded-lg text-[12.5px]" placeholder="comment la personne se nomme (facultatif)" value={libelle} onChange={(e) => setLibelle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} onBlur={() => libelle.trim() !== (genres.get(personne.id) ?? '') && void agir(() => apiClient.put('/genre-libelle', { individuId: personne.id, libelle: libelle.trim() || null }))} data-libelle-genre/>)}
            </div>

            {!vide && (<div className="flex flex-col gap-1" data-bloc="fratrie">
                    <div className={titre}>Frères, sœurs et alliés (calculés)</div>
                    {groupe('Frères et sœurs', fr.germains)}
                    {groupe('Demi-frères et demi-sœurs', fr.demi.map((d) => d.id), (id) => `(par ${fr.demi.find((d) => d.id === id)!.via.map(nom).join(' et ')})`)}
                    {groupe('Par adoption ou par un parent de cœur', fr.adoption)}
                    {groupe('Quasi-frères et sœurs (famille recomposée)', fr.quasi)}
                    {groupe('Beaux-frères et belles-sœurs', fr.beaux)}
                </div>)}
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
export const CoparentsDuFoyer = ({ union }: {
    union: U;
}) => {
    useCharge();
    const tree = useTreeStore();
    const { membres } = useFamillesFormes();
    const people = tree.people as unknown as P[];
    const ici = membres.filter((m) => m.unionId === union.id);
    const [ouvert, setOuvert] = useState(false);
    const [mode, setMode] = useState<'nouveau' | 'existant'>('existant');
    const [existant, setExistant] = useState<Id | null>(null);
    const [f, setF] = useState(personneVide());
    const [nature, setNature] = useState('legale_sociale');
    const [aRetirer, setARetirer] = useState<Id | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const enfants = tree.unionChildren.filter((c) => c.unionId === union.id).length;
    const exclus = new Set<Id>([union.partenaire1Id, union.partenaire2Id, ...ici.map((m) => m.individuId), ...tree.unionChildren.filter((c) => c.unionId === union.id).map((c) => c.enfantId)]);
    const nom = (id: Id) => { const x = people.find((q) => q.id === id); return x ? `${x.prenom} ${nomLisible(x.nom)}` : '?'; };
    const ajouter = async () => {
        setEnvoi(true);
        setErreur(null);
        let cree: Id | null = null;
        try {
            const individuId = mode === 'existant' ? existant! : (cree = (await apiClient.post('/people', corpsPersonne(f))).data.id as Id);
            await apiClient.post(`/foyer/${union.id}/coparent`, { individuId, nature });
            await rafraichir();
            setOuvert(false);
            setExistant(null);
            setF(personneVide());
        }
        catch (err) {
            if (cree !== null)
                await apiClient.delete(`/people/${cree}`).catch(() => undefined);
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const retirer = async (id: Id) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.delete(`/foyer/${union.id}/coparent/${id}`);
            setARetirer(null);
            await rafraichir();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="flex flex-col gap-2" data-noeud="coparents">
            <div className={titre}>Co-parents du foyer</div>
            {ici.length === 0 && !ouvert && <div className="text-[12.5px] text-encre-3">Aucun autre parent que le couple.</div>}
            {ici.map((m) => (<div key={m.individuId} className="flex items-center gap-2 text-[12.5px] text-encre">
                    <span className="truncate">{nom(m.individuId)}</span>
                    <span className="text-encre-3">{LIBELLE[m.nature]}</span>
                    {aRetirer === m.individuId ? (<span className="ml-auto flex gap-1.5">
                            <button type="button" disabled={envoi} onClick={() => void retirer(m.individuId)} className={`${petit} border-trait`} style={{ color: 'var(--o-afrique)' }} data-confirmer-retrait>Oui, retirer (ses liens avec les enfants aussi)</button>
                            <button type="button" onClick={() => setARetirer(null)} className={`${petit} border-trait text-encre-2`}>Non</button>
                        </span>) : (<button type="button" onClick={() => setARetirer(m.individuId)} className="ml-auto text-encre-3 hover:text-encre" title="Retirer ce co-parent">✕</button>)}
                </div>))}
            {!ouvert ? (<button type="button" onClick={() => setOuvert(true)} className={`${petit} self-start border-sepia text-sepia-deep hover:bg-sepia-tint`} data-action="ajouter-coparent">
                    + Ajouter un co-parent
                </button>) : (<div className="flex flex-col gap-2 p-3 rounded-[12px] border border-trait">
                    <div className="text-[12px] text-encre-2">Il ou elle deviendra parent des {enfants} enfant{enfants > 1 ? 's' : ''} de ce foyer, et de ceux ajoutés ensuite.</div>
                    <ChoixPersonne people={people as never} exclus={exclus} mode={mode} setMode={setMode} existant={existant} setExistant={setExistant} f={f} setF={setF}/>
                    <label className="flex items-center gap-2 text-[12.5px] text-encre">
                        Nature du lien
                        <select className="h-8 bg-blanc border border-trait rounded-lg text-[12.5px] px-1" value={nature} onChange={(e) => setNature(e.target.value)} data-nature-coparent>
                            {NATURES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                        </select>
                    </label>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setOuvert(false)} className={`${petit} border-trait text-encre-2`}>Annuler</button>
                        <button type="button" disabled={envoi || (mode === 'existant' ? existant === null : !f.prenom.trim())} onClick={() => void ajouter()} className={`${petit} border-sepia text-sepia-deep font-medium disabled:opacity-40`} data-action="enregistrer-coparent">
                            Enregistrer
                        </button>
                    </div>
                </div>)}
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
export function useAvecFamillesFormes<T>(tree: T): T {
    useCharge();
    useFamillesFormes((s) => s.natures);
    return tree;
}
