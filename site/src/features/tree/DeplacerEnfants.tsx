import { useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { champ } from './ChoixPersonne';
import { messageErreur } from './edition';
const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const DeplacerEnfants = ({ enfantsIds: donnes, depuisUnionId, titre }: {
    enfantsIds?: Id[];
    depuisUnionId?: Id | null;
    titre: string;
}) => {
    const tree = useTreeStore();
    const enfantsIds = donnes ?? tree.unionChildren.filter((c) => c.unionId === depuisUnionId).map((c) => c.enfantId);
    const [ouvert, setOuvert] = useState(false);
    const [decoches, setDecoches] = useState<Set<Id>>(new Set());
    const [filtre, setFiltre] = useState('');
    const [cible, setCible] = useState<Id | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const [fait, setFait] = useState<string | null>(null);
    const nom = (id: Id) => {
        const p = tree.people.find((x) => x.id === id);
        return p ? `${p.prenom} ${nomLisible(p.nom)}` : `n° ${id}`;
    };
    const couple = (u: {
        partenaire1Id: Id;
        partenaire2Id: Id;
    }) => `${nom(u.partenaire1Id)} + ${nom(u.partenaire2Id)}`;
    const couples = useMemo(() => tree.unions
        .filter((u) => u.id !== depuisUnionId)
        .map((u) => ({ u, libelle: couple(u), enfants: tree.unionChildren.filter((c) => c.unionId === u.id).length }))
        .filter((c) => plat(c.libelle).includes(plat(filtre.trim())))
        .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')), [tree.unions, tree.unionChildren, tree.people, filtre, depuisUnionId]);
    if (enfantsIds.length === 0 && !fait)
        return null;
    const choisis = enfantsIds.filter((id) => !decoches.has(id));
    const parentsActuels = donnes && donnes.length === 1 ? tree.relationships.filter((r) => r.enfantId === donnes[0]).map((r) => nom(r.parentId)) : [];
    const cibleU = tree.unions.find((u) => u.id === cible) ?? null;
    const deplacer = async () => {
        if (!cibleU || choisis.length === 0)
            return;
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post('/deplacer-enfants', { enfants: choisis, versUnionId: cibleU.id });
            setFait(`${choisis.map(nom).join(', ')} : maintenant enfant${choisis.length > 1 ? 's' : ''} de ${couple(cibleU)}.`);
            setOuvert(false);
            setCible(null);
            await tree.fetchTree();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="rounded-[12px] border border-trait bg-papier px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">{titre}</div>
                {!ouvert && (<button type="button" onClick={() => { setOuvert(true); setFait(null); }} className="ml-auto text-[12.5px] text-sepia-deep hover:underline">
                        {enfantsIds.length > 1 ? 'Déplacer vers un autre couple…' : 'Changer de parents…'}
                    </button>)}
            </div>
            {donnes && donnes.length === 1 && (<div className="text-[13px] text-encre">{parentsActuels.length > 0 ? parentsActuels.join(' + ') : 'Aucun parent enregistré'}</div>)}
            {fait && <div className="text-[12.5px] text-encre">{fait}</div>}
            {ouvert && (<>
                    {enfantsIds.length > 1 && (<div className="flex flex-col gap-1">
                            {enfantsIds.map((id) => (<label key={id} className="flex items-center gap-2 text-[13px] text-encre">
                                    <input type="checkbox" checked={!decoches.has(id)} onChange={(e) => {
                        const s = new Set(decoches);
                        if (e.target.checked)
                            s.delete(id);
                        else
                            s.add(id);
                        setDecoches(s);
                    }}/>
                                    {nom(id)}
                                </label>))}
                        </div>)}
                    <input className={champ} placeholder="Chercher le bon couple (un nom)…" value={filtre} onChange={(e) => setFiltre(e.target.value)} autoFocus/>
                    <div className="max-h-44 overflow-y-auto flex flex-col gap-1">
                        {couples.slice(0, 60).map(({ u, libelle, enfants }) => (<label key={u.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[9px] border text-[13px] cursor-pointer ${cible === u.id ? 'border-sepia bg-sepia-tint text-encre' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`}>
                                <input type="radio" name="couple-cible" checked={cible === u.id} onChange={() => setCible(u.id)}/>
                                <span className="truncate">{libelle}</span>
                                <span className="ml-auto flex-none text-encre-3 text-[12px]">{enfants} enfant{enfants > 1 ? 's' : ''}</span>
                            </label>))}
                        {couples.length === 0 && <div className="text-[12.5px] text-encre-3">Aucun couple ne porte ce nom.</div>}
                    </div>
                    {cibleU && choisis.length > 0 && (<div className="rounded-[10px] border px-3 py-2.5 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
                            <div className="text-[13px] text-encre">
                                {choisis.map(nom).join(', ')} {choisis.length > 1 ? 'deviendront les enfants' : "deviendra l'enfant"} de <strong>{couple(cibleU)}</strong>.
                            </div>
                            <div className="text-[11.5px] text-encre-3">
                                Leurs liens avec les parents actuels partent ; les liens adoptifs restent. Une copie de sécurité de la base est faite juste avant.
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setOuvert(false); setCible(null); setErreur(null); }} className="h-9 px-3 rounded-[10px] border border-trait text-encre-2 text-[13px]">
                                    Annuler
                                </button>
                                <button type="button" disabled={envoi} onClick={() => void deplacer()} className="h-9 px-3 rounded-[10px] border text-[13px] font-medium disabled:opacity-50" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }}>
                                    Oui, déplacer
                                </button>
                            </div>
                        </div>)}
                    {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                </>)}
        </div>);
};
