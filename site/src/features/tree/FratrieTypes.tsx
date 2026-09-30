import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import { accorde } from '../../lib/accord';
import type { Id } from '../../types';
import type { Individu } from './graphe';
import { periode } from './graphe';
import { corpsPersonne, messageErreur, type ChampsPersonne } from './edition';
import { ChoixPersonne, champ } from './ChoixPersonne';
import { chercherPersonnes } from './RechercheArbre';
import { parentsConnus } from './EnfantsAussiSiens';
import { useParentsInconnus } from './ParentInconnu';
export type LienFratrie = 'germain' | 'demi' | 'adoption';
type PersonneMin = {
    id: Id;
    prenom: string;
    nom: string;
    genre: string;
};
type UnionMin = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
const bouton = 'h-10 px-4 rounded-[10px] border text-[13.5px] disabled:opacity-40';
const qui = (p: PersonneMin) => `${p.prenom} ${nomLisible(p.nom)}`.trim();
const rafraichir = async () => {
    await useParentsInconnus.getState().charger();
    await useTreeStore.getState().fetchTree();
};
export const ChoixLienFratrie = ({ lien, setLien }: {
    lien: LienFratrie;
    setLien: (l: LienFratrie) => void;
}) => (<div className="flex flex-col gap-1">
        <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5 self-start" data-noeud="choix-lien-fratrie">
            {([
        ['germain', 'Mêmes parents'],
        ['demi', 'Demi (un parent commun)'],
        ['adoption', 'Par adoption'],
    ] as const).map(([l, texte]) => (<button key={l} type="button" data-lien={l} onClick={() => setLien(l)} className={`h-8 px-3 rounded-lg text-[12.5px] text-encre ${lien === l ? 'bg-blanc shadow-onglet font-medium' : 'text-encre-2'}`}>
                    {texte}
                </button>))}
        </div>
    </div>);
type Etat = {
    mode: 'nouveau' | 'existant';
    setMode: (m: 'nouveau' | 'existant') => void;
    existant: Id | null;
    setExistant: (id: Id | null) => void;
    f: ChampsPersonne;
    setF: (f: ChampsPersonne) => void;
};
type Commun = {
    id: Id;
} | {
    inconnu: 'M' | 'F' | 'Unknown';
};
export const FratrieAutreLien = ({ personne, lien, setLien, onFermer, etat, Cadre }: {
    personne: PersonneMin;
    lien: 'demi' | 'adoption';
    setLien: (l: LienFratrie) => void;
    onFermer: () => void;
    etat: Etat;
    Cadre: (p: {
        titre: string;
        sous: string;
        onFermer: () => void;
        children: React.ReactNode;
    }) => React.ReactElement;
}) => {
    const tree = useTreeStore();
    const marques = useParentsInconnus((s) => s.marques);
    const people = tree.people as unknown as PersonneMin[];
    const unions = tree.unions as unknown as UnionMin[];
    const { mode, existant, f } = etat;
    const [commun, setCommun] = useState<Commun | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const parentsDe = (x: Id) => [...parentsConnus(x, tree.relationships, tree.unionChildren, unions)].map((id) => people.find((p) => p.id === id)).filter(Boolean) as PersonneMin[];
    const siens = parentsDe(personne.id);
    const frere = mode === 'existant' ? people.find((p) => p.id === existant) ?? null : null;
    const ceuxDuFrere = frere ? parentsDe(frere.id).filter((p) => !siens.some((s) => s.id === p.id)) : [];
    const adoptifs = tree.relationships.filter((r) => r.enfantId === personne.id && r.typeLien === 'Adoptive').map((r) => people.find((p) => p.id === r.parentId)).filter(Boolean) as PersonneMin[];
    const exclus = useMemo(() => new Set<Id>([personne.id, ...siens.map((p) => p.id), ...marques.keys()]), [personne.id, siens, marques]);
    const nomFrere = frere ? qui(frere) : f.prenom.trim() ? `${f.prenom.trim()} ${f.nom.trim()}`.trim() : 'la personne ajoutée';
    const genreFrere = frere ? frere.genre : f.genre;
    useEffect(() => setCommun(null), [existant, mode]);
    const phrase = (() => {
        if (lien === 'adoption') {
            const par = [...siens, ...adoptifs.filter((a) => !siens.some((s) => s.id === a.id))];
            return par.length > 0
                ? `${nomFrere} sera ${accorde(genreFrere, 'relié', 'reliée', 'relié(e)')} par adoption à ${par.map(qui).join(' et ')}, les parents de ${qui(personne)}. Si c'est ${qui(personne)} qui a été ${accorde(personne.genre, 'adopté', 'adoptée', 'adopté(e)')}, faites-le depuis l'autre fiche.`
                : `${qui(personne)} n'a pas de parents connus : un père « ? » et une mère « ? » seront posés, et ${nomFrere} leur sera ${accorde(genreFrere, 'relié', 'reliée', 'relié(e)')} par adoption.`;
        }
        if (!commun)
            return 'Choisissez le parent qu’ils ont en commun.';
        const inconnuOppose = (g: string) => (g === 'M' ? 'une mère « ? »' : g === 'F' ? 'un père « ? »' : 'un parent « ? »');
        if ('id' in commun) {
            const c = people.find((p) => p.id === commun.id);
            if (!c)
                return '';
            const versPersonne = !siens.some((p) => p.id === c.id);
            const cible = versPersonne ? qui(personne) : nomFrere;
            const sesParents = versPersonne ? siens : frere ? parentsDe(frere.id) : [];
            const autre = sesParents.length === 1 ? qui(sesParents[0]) : `${inconnuOppose(c.genre)}, à compléter plus tard`;
            return `${cible} aura pour parents ${qui(c)} et ${autre}.`;
        }
        const role = commun.inconnu === 'M' ? 'Un père « ? »' : commun.inconnu === 'F' ? 'Une mère « ? »' : 'Un parent « ? »';
        return `${role} sera posé pour les deux (la même fiche) ; chacun garde son autre parent connu, sinon ${inconnuOppose(commun.inconnu)} est posé${commun.inconnu === 'M' ? 'e' : ''} pour lui.`;
    })();
    const pret = (mode === 'existant' ? existant !== null : f.prenom.trim() !== '') && (lien === 'adoption' || commun !== null);
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        let cree: Id | null = null;
        try {
            const autre = mode === 'existant' ? existant! : (cree = (await apiClient.post('/people', corpsPersonne(f))).data.id as Id);
            if (lien === 'demi')
                await apiClient.post('/fratrie/demi', { personne: personne.id, frere: autre, commun });
            else
                await apiClient.post('/fratrie/adoption', { personne: personne.id, frere: autre });
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
    const optionCommun = (cle: string, valeur: Commun, texte: string, sous?: string) => (<label key={cle} className="flex items-start gap-2 text-[13px] text-encre cursor-pointer">
            <input type="radio" name="parent-commun" className="mt-[3px]" checked={JSON.stringify(commun) === JSON.stringify(valeur)} onChange={() => setCommun(valeur)}/>
            <span>
                {texte}
                {sous && <span className="text-encre-3"> — {sous}</span>}
            </span>
        </label>);
    return (<Cadre titre={lien === 'demi' ? 'Demi-frère ou demi-sœur' : 'Frère ou sœur par adoption'} sous={`de ${qui(personne)} — ${phrase}`} onFermer={onFermer}>
            <ChoixLienFratrie lien={lien} setLien={setLien}/>
            <ChoixPersonne people={people as never} exclus={exclus} mode={etat.mode} setMode={etat.setMode} existant={etat.existant} setExistant={etat.setExistant} f={etat.f} setF={etat.setF}/>
            {lien === 'demi' && (<div className="flex flex-col gap-1.5 p-3 rounded-[12px] border border-trait" data-bloc="parent-commun">
                    <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">Le parent en commun</div>
                    {siens.map((p) => optionCommun(`a${p.id}`, { id: p.id }, qui(p), `parent de ${qui(personne)}`))}
                    {ceuxDuFrere.map((p) => optionCommun(`b${p.id}`, { id: p.id }, qui(p), `parent de ${nomFrere}`))}
                    {siens.length < 2 && (<>
                            {optionCommun('im', { inconnu: 'M' }, 'Un père qu’on ne connaît pas', 'posé « ? », le même pour les deux')}
                            {optionCommun('if', { inconnu: 'F' }, 'Une mère qu’on ne connaît pas', 'posée « ? », la même pour les deux')}
                        </>)}
                    {siens.length === 0 && ceuxDuFrere.length === 0 && <div className="text-[12px] text-encre-3">Aucun parent connu : le parent commun sera une fiche « ? », à compléter plus tard.</div>}
                </div>)}
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onFermer} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>Annuler</button>
                <button type="button" disabled={envoi || !pret} onClick={() => void enregistrer()} data-action="enregistrer-fratrie" className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                    Enregistrer
                </button>
            </div>
        </Cadre>);
};
export const InconnuRetrouve = ({ individu, onFait }: {
    individu: PersonneMin;
    onFait: () => void;
}) => {
    const people = useTreeStore((s) => s.people) as unknown as Individu[];
    const marques = useParentsInconnus((s) => s.marques);
    const [ouvert, setOuvert] = useState(false);
    const [saisie, setSaisie] = useState('');
    const [choisi, setChoisi] = useState<Id | null>(null);
    const [apercu, setApercu] = useState<{
        enfants: number;
        couples: number;
    } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const trouves = useMemo(() => chercherPersonnes(people.filter((p) => p.id !== individu.id && !marques.has(p.id)), saisie), [people, marques, individu.id, saisie]);
    const reel = people.find((p) => p.id === choisi) ?? null;
    useEffect(() => {
        setApercu(null);
        setErreur(null);
        if (choisi === null)
            return;
        let vivant = true;
        apiClient
            .get(`/parent-inconnu/${individu.id}/retrouve/apercu`, { params: { reel: choisi } })
            .then((r) => vivant && setApercu(r.data))
            .catch((err) => vivant && setErreur(messageErreur(err)));
        return () => {
            vivant = false;
        };
    }, [choisi, individu.id]);
    const confirmer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post(`/parent-inconnu/${individu.id}/retrouve`, { reel: choisi });
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
    if (!ouvert)
        return (<button type="button" data-action="inconnu-retrouve" onClick={() => setOuvert(true)} className={`${bouton} self-start border-trait text-encre-2 hover:bg-sepia-tint`}>
                C'est une personne déjà dans l'arbre…
            </button>);
    return (<div className="flex flex-col gap-2 p-3 rounded-[12px] border border-dashed border-sepia" data-noeud="inconnu-retrouve">
            <div className="text-[13px] text-encre">Qui est-ce ? Ses liens (enfants, couple) passeront sur cette personne, et la fiche « ? » disparaîtra.</div>
            <input className={champ} value={saisie} onChange={(e) => { setSaisie(e.target.value); setChoisi(null); }} placeholder="Taper son nom ou son prénom…" autoFocus/>
            {saisie.trim() !== '' && choisi === null && (<div className="border border-trait rounded-[10px] overflow-hidden max-h-44 overflow-y-auto">
                    {trouves.length === 0 ? (<div className="px-3 py-2 text-[12.5px] text-encre-3">Personne de ce nom dans l'arbre.</div>) : (trouves.map((p) => (<button key={p.id} type="button" onClick={() => setChoisi(p.id)} className="w-full text-left px-3 py-2 flex gap-2 text-[13px] hover:bg-sepia-tint">
                                <span className="truncate">
                                    {p.prenom} <span className="font-semibold">{nomLisible(p.nom)}</span>
                                </span>
                                <span className="ml-auto font-mono text-[10.5px] text-encre-3">{periode(p) ?? ''}</span>
                            </button>)))}
                </div>)}
            {reel && apercu && (<div className="text-[13px] text-encre" data-apercu="inconnu-retrouve">
                    {apercu.enfants > 1 ? `Ses ${apercu.enfants} enfants` : apercu.enfants === 1 ? 'Son enfant' : 'Ses liens'} {apercu.enfants > 1 ? 'passeront' : 'passera'} sur <span className="font-semibold">{qui(reel)}</span>
                    {apercu.couples > 0 ? `, avec ${apercu.couples > 1 ? 'ses couples' : 'son couple'}` : ''}. La fiche « ? » disparaîtra.
                </div>)}
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setOuvert(false); setChoisi(null); setSaisie(''); }} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>Annuler</button>
                <button type="button" disabled={envoi || !reel || !apercu} onClick={() => void confirmer()} data-action="confirmer-retrouve" className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                    {reel ? `Oui, c'est ${qui(reel)}` : 'Choisir une personne'}
                </button>
            </div>
        </div>);
};
