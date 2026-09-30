import { useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu, UnionComplete } from './graphe';
import { AjouterEnfant } from './AjouterEnfant';
import { ChoixPersonne, champ, etiquette } from './ChoixPersonne';
import { corpsPersonne, messageErreur, personneVide, useEdition } from './edition';
import { ModifierPersonne } from './ModifierPersonne';
import { ModifierUnion } from './ModifierUnion';
import { ConjointsExistants } from './ConjointsExistants';
import { ChampDate, datesLisibles } from './ChampDate';
import { ParentDuCouple, proposerEnfantsAussiSiens } from './EnfantsAussiSiens';
import { ParentInconnuChoix } from './ParentInconnu';
import { appliquerChoixCouple, ChoixCouple } from './OrdreUnions';
const TYPES = [
    { v: 'Marriage', t: 'Mariage' },
    { v: 'Informal', t: 'Union libre' },
    { v: 'Civil_Partnership', t: 'PACS' },
    { v: 'Other', t: 'Autre / inconnu' },
];
const Cadre = ({ titre, sous, onFermer, children }: {
    titre: string;
    sous: string;
    onFermer: () => void;
    children: React.ReactNode;
}) => (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
            <div className="flex items-start">
                <div>
                    <h2 className="font-display text-[30px] font-medium leading-none m-0">{titre}</h2>
                    <div className="text-[13px] text-encre-2 mt-1.5">{sous}</div>
                </div>
                <button type="button" onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                    <X size={20}/>
                </button>
            </div>
            {children}
        </div>
    </div>);
const Boutons = ({ envoi, pret, secondaire, onSecondaire, onPrincipal }: {
    envoi: boolean;
    pret: boolean;
    secondaire?: string;
    onSecondaire?: () => void;
    onPrincipal: () => void;
}) => (<div className="flex gap-2 justify-end pt-1">
        {secondaire && (<button type="button" disabled={envoi || !pret} onClick={onSecondaire} className="h-10 px-4 rounded-[10px] border border-trait text-encre-2 text-[13.5px] hover:bg-sepia-tint disabled:opacity-40">
                {secondaire}
            </button>)}
        <button type="button" disabled={envoi || !pret} onClick={onPrincipal} className="h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep text-[13.5px] font-medium hover:bg-sepia-tint disabled:opacity-40">
            Enregistrer
        </button>
    </div>);
const FormulaireConjoint = ({ personne, people, unions, onFermer }: {
    personne: Individu;
    people: Individu[];
    unions: UnionComplete[];
    onFermer: () => void;
}) => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const ouvrir = useEdition((s) => s.ouvrir);
    const genreConjoint = personne.genre === 'M' ? 'F' : personne.genre === 'F' ? 'M' : 'Unknown';
    const [mode, setMode] = useState<'nouveau' | 'existant'>('nouveau');
    const [existant, setExistant] = useState<Id | null>(null);
    const [f, setF] = useState(personneVide({ genre: genreConjoint }));
    const [u, setU] = useState({ type: 'Marriage', date: '', lieu: '' });
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const deja = useMemo(() => {
        const s = new Set<Id>([personne.id]);
        unions.forEach((x) => {
            if (x.partenaire1Id === personne.id)
                s.add(x.partenaire2Id);
            if (x.partenaire2Id === personne.id)
                s.add(x.partenaire1Id);
        });
        return s;
    }, [unions, personne.id]);
    const nbUnions = deja.size - 1;
    const pret = (mode === 'existant' ? existant !== null : f.prenom.trim() !== '' && datesLisibles(f.dateNaissance, f.statut === 'decede' ? f.dateDeces : '')) &&
        datesLisibles(u.date);
    const enregistrer = async (puisEnfants: boolean) => {
        setEnvoi(true);
        setErreur(null);
        let cree: Id | null = null;
        try {
            const conjointId = mode === 'existant' ? existant! : (cree = (await apiClient.post('/people', corpsPersonne(f))).data.id as Id);
            const [p1, p2] = personne.genre === 'F' ? [conjointId, personne.id] : [personne.id, conjointId];
            const corps: Record<string, unknown> = { partner1Id: p1, partner2Id: p2, type: u.type };
            if (u.date)
                corps.startDate = u.date;
            if (u.lieu.trim())
                corps.lieuUnion = u.lieu.trim();
            const union = (await apiClient.post('/unions', corps)).data as {
                id: Id;
            };
            await appliquerChoixCouple(personne.id, union.id);
            await fetchTree();
            proposerEnfantsAussiSiens(personne.id, union.id);
            if (puisEnfants)
                ouvrir({ type: 'enfant', personneId: personne.id, unionId: union.id });
            else
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
    return (<Cadre titre={personne.genre === 'M' ? 'Nouvelle épouse' : personne.genre === 'F' ? 'Nouvel époux' : 'Nouveau conjoint'} sous={`de ${personne.prenom} ${nomLisible(personne.nom)}${nbUnions > 0 ? ` — ${nbUnions} union${nbUnions > 1 ? 's' : ''} déjà enregistrée${nbUnions > 1 ? 's' : ''}` : ''}`} onFermer={onFermer}>
            <ConjointsExistants personne={personne}/>
            <ChoixPersonne people={people} exclus={deja} mode={mode} setMode={setMode} existant={existant} setExistant={setExistant} f={f} setF={setF}/>
            <div className="filet"/>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={etiquette}>Union</label>
                    <select className={champ} value={u.type} onChange={(e) => setU({ ...u, type: e.target.value })}>
                        {TYPES.map((t) => (<option key={t.v} value={t.v}>
                                {t.t}
                            </option>))}
                    </select>
                </div>
                <div>
                    <label className={etiquette}>Le</label>
                    <ChampDate valeur={u.date} onChange={(v) => setU((x) => ({ ...x, date: v }))} signalerIllisible compact/>
                </div>
                <div>
                    <label className={etiquette}>à</label>
                    <input className={champ} value={u.lieu} onChange={(e) => setU({ ...u, lieu: e.target.value })}/>
                </div>
            </div>
            <ChoixCouple personne={personne}/>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <Boutons envoi={envoi} pret={pret} secondaire="Enregistrer et ajouter leurs enfants" onSecondaire={() => void enregistrer(true)} onPrincipal={() => void enregistrer(false)}/>
        </Cadre>);
};
const FormulaireParent = ({ personne, people, unions, parentsDe, onFermer, }: {
    personne: Individu;
    people: Individu[];
    unions: UnionComplete[];
    parentsDe: (id: Id) => Id[];
    onFermer: () => void;
}) => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const actuels = parentsDe(personne.id).map((id) => people.find((p) => p.id === id)).filter(Boolean) as Individu[];
    const aPere = actuels.some((p) => p.genre === 'M');
    const [role, setRole] = useState<'M' | 'F'>(aPere ? 'F' : 'M');
    const [mode, setMode] = useState<'nouveau' | 'existant'>('nouveau');
    const [existant, setExistant] = useState<Id | null>(null);
    const [f, setF] = useState(personneVide({ genre: role, nom: role === 'M' ? personne.nom : '' }));
    const autre = actuels.find((p) => p.genre !== role) ?? null;
    const [couple, setCouple] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const pret = (mode === 'existant' ? existant !== null : f.prenom.trim() !== '' && datesLisibles(f.dateNaissance, f.statut === 'decede' ? f.dateDeces : ''));
    const choisirRole = (r: 'M' | 'F') => {
        setRole(r);
        setF({ ...f, genre: r, nom: f.nom || (r === 'M' ? personne.nom : '') });
    };
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        let cree: Id | null = null;
        try {
            const parentId = mode === 'existant' ? existant! : (cree = (await apiClient.post('/people', corpsPersonne({ ...f, genre: role }))).data.id as Id);
            await apiClient.post('/relationships', { parentId, childId: personne.id });
            if (autre && couple) {
                const existe = unions.find((u) => (u.partenaire1Id === parentId && u.partenaire2Id === autre.id) || (u.partenaire1Id === autre.id && u.partenaire2Id === parentId));
                const unionId = existe?.id ??
                    ((await apiClient.post('/unions', { partner1Id: role === 'M' ? parentId : autre.id, partner2Id: role === 'M' ? autre.id : parentId, type: 'Other' })).data.id as Id);
                await apiClient.post('/union-children', { childId: personne.id, unionId }).catch(() => undefined);
            }
            await fetchTree();
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
    return (<Cadre titre="Nouveau parent" sous={`de ${personne.prenom} ${nomLisible(personne.nom)}`} onFermer={onFermer}>
            <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5 self-start">
                {(['M', 'F'] as const).map((r) => (<button key={r} type="button" onClick={() => choisirRole(r)} className={`h-8 px-3 rounded-lg text-[12.5px] text-encre ${role === r ? 'bg-blanc shadow-onglet font-medium' : 'text-encre-2'}`}>
                        {r === 'M' ? 'Père' : 'Mère'}
                    </button>))}
            </div>
            <ChoixPersonne people={people} exclus={new Set([personne.id, ...actuels.map((p) => p.id)])} mode={mode} setMode={setMode} existant={existant} setExistant={setExistant} f={{ ...f, genre: role }} setF={setF} genreFixe/>
            <ParentDuCouple enfantId={personne.id} onFait={onFermer}/>
            <ParentInconnuChoix personne={personne} role={role} onFait={onFermer}/>
            {autre && (<label className="flex items-center gap-2 text-[13px] text-encre-2">
                    <input type="checkbox" checked={couple} onChange={(e) => setCouple(e.target.checked)}/>
                    Former le couple avec {autre.prenom} {nomLisible(autre.nom)} ({role === 'M' ? 'la mère' : 'le père'} déjà enregistré{role === 'M' ? 'e' : ''})
                </label>)}
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <Boutons envoi={envoi} pret={pret} onPrincipal={() => void enregistrer()}/>
        </Cadre>);
};
export const EditeurFamille = () => {
    const { edition, fermer } = useEdition();
    const tree = useTreeStore();
    const people = tree.people as Individu[];
    const unions = tree.unions as UnionComplete[];
    if (!edition)
        return null;
    const personne = people.find((p) => p.id === edition.personneId);
    if (!personne)
        return null;
    const parentsDe = (id: Id) => [
        ...new Set([
            ...tree.relationships.filter((r) => r.enfantId === id).map((r) => r.parentId),
            ...tree.unionChildren
                .filter((uc) => uc.enfantId === id)
                .flatMap((uc) => {
                const u = unions.find((x) => x.id === uc.unionId);
                return u ? [u.partenaire1Id, u.partenaire2Id] : [];
            }),
        ]),
    ];
    if (edition.type === 'union') {
        const u = unions.find((x) => x.id === edition.unionId);
        return u ? <ModifierUnion key={`u${u.id}`} union={u} people={people} onFermer={fermer}/> : null;
    }
    if (edition.type === 'modifier')
        return <ModifierPersonne key={`m${personne.id}`} personne={personne} onFermer={fermer}/>;
    if (edition.type === 'conjoint')
        return <FormulaireConjoint key={`c${personne.id}`} personne={personne} people={people} unions={unions} onFermer={fermer}/>;
    if (edition.type === 'parent')
        return <FormulaireParent key={`p${personne.id}`} personne={personne} people={people} unions={unions} parentsDe={parentsDe} onFermer={fermer}/>;
    return <AjouterEnfant key={`e${personne.id}-${edition.unionId ?? ''}`} parent={personne} people={people} unions={unions} unionInitiale={edition.unionId} onFermer={fermer}/>;
};
