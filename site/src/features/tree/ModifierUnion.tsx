import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Individu, UnionComplete } from './graphe';
import { champ, etiquette } from './ChoixPersonne';
import { messageErreur } from './edition';
import { ChampDate, dateEcrite } from './ChampDate';
import { DeplacerEnfants } from './DeplacerEnfants';
import { RangsDansModifierUnion } from './OrdreUnions';
import { CoparentsDuFoyer } from './FamillesFormes';
const TYPES: Record<string, string> = { Marriage: 'Mariage', Informal: 'Union libre', Civil_Partnership: 'PACS', Other: 'Autre / inconnu' };
const STATUTS: Record<string, string> = { Active: 'En cours', Divorced: 'Divorcés', Separated: 'Séparés', Widowed: 'Veuvage' };
const jour = (d?: string | null) => (d ? d.slice(0, 10) : '');
type U = UnionComplete & {
    dateFin?: string | null;
    statut?: string;
};
type Champs = {
    type: string;
    statut: string;
    debut: string;
    fin: string;
    lieu: string;
};
const LIB: Record<keyof Champs, string> = { type: 'Type', statut: 'Statut', debut: 'Début', fin: 'Fin', lieu: 'Lieu' };
export function champsUnion(u: U): Champs {
    return { type: u.typeUnion ?? 'Other', statut: u.statut ?? 'Active', debut: jour(u.dateDebut), fin: jour(u.dateFin), lieu: u.lieuUnion ?? '' };
}
export function patchUnion(avant: Champs, apres: Champs): Record<string, unknown> {
    const c: Record<string, unknown> = {};
    if (avant.type !== apres.type)
        c.type = apres.type;
    if (avant.statut !== apres.statut)
        c.statut = apres.statut;
    if (avant.debut !== apres.debut)
        c.startDate = apres.debut;
    if (avant.fin !== apres.fin)
        c.endDate = apres.fin;
    if (avant.lieu.trim() !== apres.lieu.trim())
        c.lieuUnion = apres.lieu.trim();
    return c;
}
export const ModifierUnion = ({ union, people, onFermer }: {
    union: U;
    people: Individu[];
    onFermer: () => void;
}) => {
    const tree = useTreeStore();
    const avant = champsUnion(union);
    const [f, setF] = useState<Champs>(avant);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [confirmer, setConfirmer] = useState(false);
    const [lisibles, setLisibles] = useState({ debut: true, fin: true });
    const a = people.find((p) => p.id === union.partenaire1Id);
    const b = people.find((p) => p.id === union.partenaire2Id);
    const nomCouple = [a, b].map((p) => (p ? `${p.prenom} ${nomLisible(p.nom)}` : '?')).join(' et ');
    const enfants = tree.unionChildren.filter((uc) => uc.unionId === union.id).length;
    const corps = patchUnion(avant, f);
    const nb = Object.keys(corps).length;
    const agir = async (fn: () => Promise<unknown>) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await fn();
            await tree.fetchTree();
            onFermer();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const lisible = (k: keyof Champs, v: string) => (v === '' ? '(vide)' : k === 'type' ? TYPES[v] ?? v : k === 'statut' ? STATUTS[v] ?? v : k === 'debut' || k === 'fin' ? dateEcrite(v) : v);
    return (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
                <div className="flex items-start">
                    <div>
                        <h2 className="font-display text-[30px] font-medium leading-none m-0">Union</h2>
                        <div className="text-[13px] text-encre-2 mt-1.5">{nomCouple}</div>
                    </div>
                    <button type="button" onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                        <X size={20}/>
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Type</label>
                        <select className={champ} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                            {Object.entries(TYPES).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className={etiquette}>Statut</label>
                        <select className={champ} value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>
                            {Object.entries(STATUTS).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={etiquette}>Début</label>
                        <ChampDate valeur={f.debut} onChange={(v) => setF((x) => ({ ...x, debut: v }))} onValidite={(ok) => setLisibles((x) => ({ ...x, debut: ok }))} compact/>
                    </div>
                    <div>
                        <label className={etiquette}>Fin</label>
                        <ChampDate valeur={f.fin} onChange={(v) => setF((x) => ({ ...x, fin: v }))} onValidite={(ok) => setLisibles((x) => ({ ...x, fin: ok }))} compact/>
                    </div>
                    <div>
                        <label className={etiquette}>Lieu</label>
                        <input className={champ} value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })}/>
                    </div>
                </div>

                {nb > 0 && (<div className="rounded-[12px] border border-trait bg-papier px-4 py-3 flex flex-col gap-1">
                        <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1">Ce qui va changer</div>
                        {(Object.keys(LIB) as (keyof Champs)[])
                .filter((k) => (k === 'lieu' ? avant[k].trim() !== f[k].trim() : avant[k] !== f[k]))
                .map((k) => (<div key={k} className="text-[12.5px] text-encre-2 flex gap-1.5 flex-wrap">
                                    <span className="text-encre-3">{LIB[k]} :</span>
                                    <span className="line-through">{lisible(k, avant[k])}</span>→<span className="text-encre font-medium">{lisible(k, f[k])}</span>
                                </div>))}
                    </div>)}

                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                <div className="flex gap-2 justify-end">
                    <button type="button" onClick={onFermer} className="h-10 px-4 rounded-[10px] border border-trait text-encre-2 text-[13.5px] hover:bg-sepia-tint">
                        Annuler
                    </button>
                    <button type="button" disabled={envoi || nb === 0 || !lisibles.debut || !lisibles.fin} onClick={() => void agir(() => apiClient.patch(`/unions/${union.id}`, corps))} className="h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep text-[13.5px] font-medium hover:bg-sepia-tint disabled:opacity-40">
                        Enregistrer{nb > 0 ? ` (${nb})` : ''}
                    </button>
                </div>

                <RangsDansModifierUnion union={union}/>
                <CoparentsDuFoyer union={union}/>
                <DeplacerEnfants depuisUnionId={union.id} titre="Enfants de ce couple"/>
                <div className="filet"/>
                {!confirmer ? (<button type="button" onClick={() => setConfirmer(true)} className="self-start text-[12.5px] hover:underline" style={{ color: 'var(--o-afrique)' }}>
                        Supprimer cette union…
                    </button>) : (<div className="rounded-[12px] border px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
                        <div className="text-[13px] text-encre">
                            Supprimer l'union de {nomCouple} ?
                            {enfants === 1 ? ' Son enfant reste l’enfant de ses deux parents.' : enfants > 1 ? ` Ses ${enfants} enfants restent les enfants de leurs deux parents.` : ''}
                        </div>
                        <div className="text-[11.5px] text-encre-3">Une copie de sécurité de la base est faite juste avant.</div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmer(false)} className="h-9 px-3 rounded-[10px] border border-trait text-encre-2 text-[13px]">
                                Non
                            </button>
                            <button type="button" disabled={envoi} onClick={() => void agir(() => apiClient.delete(`/unions/${union.id}`))} className="h-9 px-3 rounded-[10px] border text-[13px] font-medium" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }}>
                                Oui, supprimer l'union
                            </button>
                        </div>
                    </div>)}
            </div>
        </div>);
};
