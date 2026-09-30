import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type Node } from 'reactflow';
import { UsersThree } from '@phosphor-icons/react';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { CARTE, type DonneesCarte } from './graphe';
import { corpsPersonne, messageErreur, personneVide } from './edition';
import { ChoixPersonne, champ } from './ChoixPersonne';
import { enfantsAUnSeulParent, parentsConnus } from './EnfantsAussiSiens';
import { accorde } from '../../lib/accord';
import { ChampDate, datesLisibles } from './ChampDate';
import { ChoixLienFratrie, FratrieAutreLien, InconnuRetrouve, type LienFratrie } from './FratrieTypes';
export type Etat = 'attente' | 'acte';
type PersonneMin = {
    id: Id;
    prenom: string;
    nom: string;
    genre: string;
    dateNaissance?: string | null;
};
type UnionMin = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
export const useParentsInconnus = create<{
    marques: Map<Id, Etat>;
    charger: () => Promise<void>;
}>((set) => ({
    marques: new Map(),
    charger: async () => {
        try {
            const r = (await apiClient.get('/parents-inconnus')).data as {
                individuId: Id;
                etat: Etat;
            }[];
            set({ marques: new Map(r.map((x) => [x.individuId, x.etat])) });
        }
        catch {
        }
    },
}));
export function useAvecParentsInconnus<T extends {
    totalPersonnes: number;
}>(tree: T): T & {
    inconnus: Map<Id, Etat>;
} {
    const { marques, charger } = useParentsInconnus();
    const toutes = useTreeStore((s) => s.people);
    const signature = `${toutes.length}:${toutes.reduce((m, p) => Math.max(m, p.id), 0)}`;
    useEffect(() => {
        void charger();
    }, [signature, charger]);
    const n = useMemo(() => toutes.filter((p) => marques.has(p.id)).length, [toutes, marques]);
    return { ...tree, totalPersonnes: tree.totalPersonnes - n, inconnus: marques };
}
export function avecCartesInconnues(nodes: Node[], marques: Map<Id, Etat>): Node[] {
    if (marques.size === 0)
        return nodes;
    return nodes.map((n) => {
        if (n.type !== 'carte')
            return n;
        const etat = marques.get((n.data as DonneesCarte).individu.id);
        return etat ? { ...n, type: 'inconnu', width: CARTE.width, height: CARTE.height, data: { ...n.data, etat } } : n;
    });
}
const libelle = (genre: string, etat: Etat) => etat === 'acte' ? (genre === 'F' ? 'Mère inconnue' : genre === 'M' ? 'Père inconnu' : 'Parent inconnu') : genre === 'F' ? 'Mère à trouver' : genre === 'M' ? 'Père à trouver' : 'Parent à trouver';
const rafraichir = async () => {
    await useParentsInconnus.getState().charger();
    await useTreeStore.getState().fetchTree();
};
const poignee = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0 };
const petit = 'nodrag h-[20px] px-1.5 rounded-[6px] border text-[10px] leading-none hover:bg-sepia-tint';
export const CarteInconnue = memo(({ data }: {
    data: DonneesCarte & {
        etat: Etat;
    };
}) => {
    const i = data.individu;
    const acte = data.etat === 'acte';
    const [ouvert, setOuvert] = useState(false);
    return (<div data-noeud="carte-inconnue" className="relative flex items-center gap-[11px] px-3 rounded-[13px] overflow-hidden transition-[opacity] duration-300" style={{
            width: CARTE.width,
            height: CARTE.height,
            border: acte ? '1px solid var(--trait-carte)' : '1.5px dashed var(--sepia)',
            background: acte ? 'var(--papier)' : 'transparent',
            opacity: data.estompe ? 0.2 : 1,
        }} title={acte ? `${accorde(i.genre, 'Inconnu', 'Inconnue', 'Inconnu(e)')} sur l'acte : c'est un fait, pas une recherche` : 'Nom à trouver : clique « Compléter » quand tu le sais'}>
            <Handle type="target" position={Position.Top} style={poignee}/>
            <div className="w-11 h-11 flex-none rounded-full grid place-items-center font-display text-[22px] text-encre-2" style={{ border: acte ? '1px solid var(--trait-carte)' : '1.5px dashed var(--sepia)' }}>
                ?
            </div>
            <div className="min-w-0 flex flex-col gap-1">
                <div className="font-display text-[15px] leading-none font-semibold text-encre truncate">{libelle(i.genre, data.etat)}</div>
                <div className="text-[10.5px] text-encre-3 leading-none whitespace-nowrap">{acte ? "écrit sur l'acte" : 'à compléter'}</div>
                <button type="button" className={`${petit} self-start mt-0.5 ${acte ? 'border-trait text-encre-2' : 'border-sepia text-sepia-deep'}`} onClick={(e) => { e.stopPropagation(); setOuvert(true); }}>
                    {acte ? 'Modifier' : 'Compléter'}
                </button>
            </div>
            <Handle type="source" position={Position.Bottom} style={poignee}/>
            {ouvert && createPortal(<CompleterInconnu individu={i as PersonneMin} etat={data.etat} onFermer={() => setOuvert(false)}/>, document.body)}
        </div>);
});
CarteInconnue.displayName = 'CarteInconnue';
const Cadre = ({ titre, sous, onFermer, children }: {
    titre: string;
    sous: string;
    onFermer: () => void;
    children: React.ReactNode;
}) => (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
            <div>
                <h2 className="font-display text-[28px] font-medium leading-tight m-0">{titre}</h2>
                <div className="text-[13px] text-encre-2 mt-1.5">{sous}</div>
            </div>
            {children}
        </div>
    </div>);
const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1';
const bouton = 'h-10 px-4 rounded-[10px] border text-[13.5px] disabled:opacity-40';
const CompleterInconnu = ({ individu, etat, onFermer }: {
    individu: PersonneMin;
    etat: Etat;
    onFermer: () => void;
}) => {
    const [f, setF] = useState({ prenom: '', nom: '', dateNaissance: '', lieuNaissance: '' });
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const basculer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.patch(`/parent-inconnu/${individu.id}`, { etat: etat === 'acte' ? 'attente' : 'acte' });
            await useParentsInconnus.getState().charger();
            onFermer();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            const corps: Record<string, unknown> = { prenom: f.prenom.trim(), nom: f.nom.trim(), genre: individu.genre };
            if (f.dateNaissance)
                corps.dateNaissance = f.dateNaissance;
            if (f.lieuNaissance.trim())
                corps.lieuNaissance = f.lieuNaissance.trim();
            await apiClient.post(`/parent-inconnu/${individu.id}/completer`, corps);
            await rafraichir();
            onFermer();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<Cadre titre={`${libelle(individu.genre, etat)} : ${etat === 'acte' ? 'modifier' : 'compléter'}`} sous="La carte « ? » devient une personne ; ses enfants restent rattachés. Si elle est déjà ailleurs dans l'arbre : « C'est une personne déjà dans l'arbre… », en bas." onFermer={onFermer}>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={etiquette}>Prénom(s)</label>
                    <input className={champ} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoFocus/>
                </div>
                <div>
                    <label className={etiquette}>Nom</label>
                    <input className={champ} value={f.nom} placeholder="inconnu : laisser vide" onChange={(e) => setF({ ...f, nom: e.target.value })}/>
                </div>
                <div>
                    <label className={etiquette}>Né(e) le</label>
                    <ChampDate valeur={f.dateNaissance} onChange={(v) => setF((x) => ({ ...x, dateNaissance: v }))} signalerIllisible/>
                </div>
                <div>
                    <label className={etiquette}>À</label>
                    <input className={champ} value={f.lieuNaissance} onChange={(e) => setF({ ...f, lieuNaissance: e.target.value })}/>
                </div>
            </div>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <div className="flex gap-2 justify-end">
                <button type="button" disabled={envoi} onClick={() => void basculer()} data-action="basculer-inconnu" className={`${bouton} mr-auto border-trait text-encre-2 hover:bg-sepia-tint`} title={etat === 'acte' ? 'Le nom reste à trouver : la carte redevient « à compléter »' : "Le parent est déclaré inconnu sur l'acte : c'est un fait, pas une recherche"}>
                    {etat === 'acte' ? 'Le nom reste à trouver' : `« ${libelle(individu.genre, 'acte')} » sur l'acte`}
                </button>
                <button type="button" onClick={onFermer} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>Annuler</button>
                <button type="button" disabled={envoi || !f.prenom.trim() || !datesLisibles(f.dateNaissance)} onClick={() => void enregistrer()} className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                    Enregistrer
                </button>
            </div>
            <InconnuRetrouve individu={individu} onFait={onFermer}/>
        </Cadre>);
};
export const ParentInconnuChoix = ({ personne, role, onFait }: {
    personne: PersonneMin;
    role: 'M' | 'F';
    onFait: () => void;
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const unions = tree.unions as unknown as UnionMin[];
    const [coches, setCoches] = useState<Set<Id>>(new Set());
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const connus = [...parentsConnus(personne.id, tree.relationships, tree.unionChildren, unions)];
    const deja = tree.unionChildren.some((c) => c.enfantId === personne.id);
    if (deja || connus.length >= 2)
        return null;
    const autre = connus.length === 1 ? people.find((p) => p.id === connus[0]) ?? null : null;
    if (autre && autre.genre === role)
        return null;
    const freres = autre ? enfantsAUnSeulParent(autre.id, tree.relationships, tree.unionChildren, unions).filter((id) => id !== personne.id) : [];
    const qui = (p: PersonneMin) => `${p.prenom} ${nomLisible(p.nom)}`;
    const mot = role === 'M' ? 'père' : 'mère';
    const poser = async (etat: Etat) => {
        setEnvoi(true);
        setErreur(null);
        try {
            const inconnu = { inconnu: etat };
            const lautre = autre ? { id: autre.id } : { inconnu: 'attente' as Etat };
            await apiClient.post('/parent-inconnu', { enfants: [personne.id, ...coches], pere: role === 'M' ? inconnu : lautre, mere: role === 'F' ? inconnu : lautre });
            await rafraichir();
            onFait();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="flex flex-col gap-2 p-3 rounded-[12px] border border-dashed border-sepia" data-noeud="parent-inconnu-choix">
            <div className="text-[13px] text-encre">
                Tu ne connais pas le nom de {role === 'M' ? 'son père' : 'sa mère'} ?
                {!autre && <span className="text-encre-3"> {role === 'M' ? 'La mère' : 'Le père'} sera aussi posé{role === 'M' ? 'e' : ''} « ? », à compléter.</span>}
            </div>
            {freres.length > 0 && autre && (<div className="flex flex-col gap-1">
                    <div className="text-[12px] text-encre-2">Le même {mot} inconnu{role === 'F' ? 'e' : ''} pour ses frères et sœurs (enfants de {qui(autre)} sans autre parent) ? Coche seulement si tu le sais.</div>
                    {freres.map((id) => {
                const e = people.find((p) => p.id === id);
                if (!e)
                    return null;
                return (<label key={id} className="flex items-center gap-2 text-[13px] text-encre">
                                <input type="checkbox" checked={coches.has(id)} onChange={(ev) => setCoches((s) => { const n = new Set(s); if (ev.target.checked)
                    n.add(id);
                else
                    n.delete(id); return n; })}/>
                                {qui(e)}
                            </label>);
            })}
                </div>)}
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={envoi} onClick={() => void poser('attente')} className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                    Nom à trouver : poser « ? »
                </button>
                <button type="button" disabled={envoi} onClick={() => void poser('acte')} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>
                    « {role === 'M' ? 'Père inconnu' : 'Mère inconnue'} » sur l'acte
                </button>
            </div>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
export const BoutonFratrie = ({ personne }: {
    personne: PersonneMin;
}) => {
    const [ouvert, setOuvert] = useState(false);
    return (<>
            <button onClick={() => setOuvert(true)} data-action="frere-soeur" className="h-9 flex items-center justify-center gap-1.5 rounded-[10px] border border-trait text-encre-2 text-[12.5px] hover:bg-sepia-tint" title="Relier un frère ou une sœur, même sans connaître les parents">
                <UsersThree size={14}/>
                Frère / sœur
            </button>
            {ouvert && createPortal(<FormulaireFratrie personne={personne} onFermer={() => setOuvert(false)}/>, document.body)}
        </>);
};
const FormulaireFratrie = ({ personne, onFermer }: {
    personne: PersonneMin;
    onFermer: () => void;
}) => {
    const tree = useTreeStore();
    const marques = useParentsInconnus((s) => s.marques);
    const people = tree.people as unknown as PersonneMin[];
    const unions = tree.unions as unknown as UnionMin[];
    const [mode, setMode] = useState<'nouveau' | 'existant'>('nouveau');
    const [existant, setExistant] = useState<Id | null>(null);
    const [f, setF] = useState(personneVide({ nom: personne.nom }));
    const [lien, setLien] = useState<LienFratrie>('germain');
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const naissance = tree.unionChildren.find((c) => c.enfantId === personne.id)?.unionId ?? null;
    const connus = [...parentsConnus(personne.id, tree.relationships, tree.unionChildren, unions)].map((id) => people.find((p) => p.id === id)).filter(Boolean) as PersonneMin[];
    const exclus = useMemo(() => new Set<Id>([personne.id, ...connus.map((p) => p.id), ...marques.keys()]), [personne.id, connus, marques]);
    const pret = mode === 'existant' ? existant !== null : f.prenom.trim() !== '';
    const qui = (p: PersonneMin) => `${p.prenom} ${nomLisible(p.nom)}`;
    const seul = connus.length === 1 ? connus[0] : null;
    const coupleInconnu = !naissance && seul ? unions.find((u) => (u.partenaire1Id === seul.id && marques.has(u.partenaire2Id)) || (u.partenaire2Id === seul.id && marques.has(u.partenaire1Id))) ?? null : null;
    const phrase = naissance
        ? `${accorde(mode === 'existant' ? people.find((p) => p.id === existant)?.genre : f.genre, 'Il sera rattaché', 'Elle sera rattachée', 'Il ou elle sera rattaché(e)')} aux parents de ${qui(personne)}.`
        : coupleInconnu
            ? `Les deux seront rattachés au couple de ${qui(seul!)} et du parent « ? » déjà posé.`
            : seul
                ? `${qui(personne)} n'a qu'un parent connu (${qui(seul)}) : l'autre sera posé « ? », à compléter plus tard.`
                : `${qui(personne)} n'a pas de parents connus : un père « ? » et une mère « ? » seront posés, à compléter plus tard.`;
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        let cree: Id | null = null;
        try {
            if (seul && !naissance && !coupleInconnu && seul.genre !== 'M' && seul.genre !== 'F')
                throw new Error(`Indique d'abord le sexe de ${qui(seul)} (✎ Modifier) : on saura si le parent « ? » est le père ou la mère.`);
            if (mode === 'existant') {
                const siens = [...parentsConnus(existant!, tree.relationships, tree.unionChildren, unions)].map((id) => people.find((p) => p.id === id)).filter(Boolean) as PersonneMin[];
                if (siens.length > 0) {
                    const e = people.find((p) => p.id === existant)!;
                    throw new Error(`${qui(e)} a déjà ${siens.length > 1 ? 'ses parents' : 'un parent'} (${siens.map(qui).join(' et ')}) : rien n'est changé. Si ce sont les mêmes parents que ${qui(personne)}, fusionne les fiches en double dans « Incohérences » ; sinon, « ✎ Modifier » → « Changer de parents ».`);
                }
            }
            const frere = mode === 'existant' ? existant! : (cree = (await apiClient.post('/people', corpsPersonne(f))).data.id as Id);
            if (naissance)
                await apiClient.post('/deplacer-enfants', { enfants: [frere], versUnionId: naissance });
            else if (coupleInconnu)
                await apiClient.post('/deplacer-enfants', { enfants: [personne.id, frere], versUnionId: coupleInconnu.id });
            else {
                const inconnu = { inconnu: 'attente' };
                await apiClient.post('/parent-inconnu', {
                    enfants: [personne.id, frere],
                    pere: seul?.genre === 'M' ? { id: seul.id } : inconnu,
                    mere: seul?.genre === 'F' ? { id: seul.id } : inconnu,
                });
            }
            await rafraichir();
            onFermer();
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
    if (lien !== 'germain')
        return <FratrieAutreLien personne={personne} lien={lien} setLien={setLien} onFermer={onFermer} etat={{ mode, setMode, existant, setExistant, f, setF }} Cadre={Cadre}/>;
    return (<Cadre titre="Frère ou sœur" sous={`de ${qui(personne)} — ${phrase}`} onFermer={onFermer}>
            <ChoixLienFratrie lien={lien} setLien={setLien}/>
            <ChoixPersonne people={people as never} exclus={exclus} mode={mode} setMode={setMode} existant={existant} setExistant={setExistant} f={f} setF={setF}/>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onFermer} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>Annuler</button>
                <button type="button" disabled={envoi || !pret} onClick={() => void enregistrer()} className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                    Enregistrer
                </button>
            </div>
        </Cadre>);
};
export function renommerFichesInconnues<T extends {
    id: Id;
    prenom: string;
    nom: string;
    genre: string;
}>(people: T[], marques: Map<Id, Etat>): T[] | null {
    if (marques.size === 0)
        return null;
    let change = false;
    const suite = people.map((p) => {
        const e = marques.get(p.id);
        if (!e)
            return p;
        const l = libelle(p.genre, e);
        if (p.prenom === l && p.nom === '')
            return p;
        change = true;
        return { ...p, prenom: l, nom: '' };
    });
    return change ? suite : null;
}
function appliquerNoms() {
    const suite = renommerFichesInconnues(useTreeStore.getState().people as never[], useParentsInconnus.getState().marques);
    if (suite)
        useTreeStore.setState({ people: suite });
}
let signatureVue = '';
useParentsInconnus.subscribe(appliquerNoms);
useTreeStore.subscribe((s) => {
    appliquerNoms();
    const sig = `${s.people.length}:${s.people.reduce((m, p) => Math.max(m, p.id), 0)}`;
    if (sig !== signatureVue) {
        signatureVue = sig;
        void useParentsInconnus.getState().charger();
    }
});
export function sansFichesInconnues<T extends {
    id: Id;
}>(people: T[]): T[] {
    const m = useParentsInconnus.getState().marques;
    return m.size === 0 ? people : people.filter((p) => !m.has(p.id));
}
export function compterSansInconnus(ids: Set<Id>): number {
    const m = useParentsInconnus.getState().marques;
    let n = 0;
    for (const id of ids)
        if (!m.has(id))
            n += 1;
    return n;
}
