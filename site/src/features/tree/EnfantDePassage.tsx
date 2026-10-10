import { useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id, Person } from '../../types';
import { messageErreur } from './edition';
import { LIBELLE_PASSAGE, useRelationsPassage } from './relationPassage';
import { useFamillesFormes } from './FamillesFormes';
export const EnfantDePassage = ({ personne }: {
    personne: Person;
}) => {
    const tree = useTreeStore();
    const passages = useRelationsPassage((s) => s.ids);
    const [ouvert, setOuvert] = useState<Id | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const [fait, setFait] = useState<string | null>(null);
    const nom = (id: Id) => {
        const p = tree.people.find((x) => x.id === id);
        return p ? `${p.prenom} ${nomLisible(p.nom)}` : `n° ${id}`;
    };
    const bio = tree.relationships.filter((r) => r.enfantId === personne.id && r.typeLien === 'Biological').map((r) => r.parentId);
    const dejaSous = new Set(tree.unionChildren.filter((c) => c.enfantId === personne.id).map((c) => c.unionId));
    const couples = tree.unions.filter((u) => passages.has(u.id) && !dejaSous.has(u.id) && (bio.includes(u.partenaire1Id) || bio.includes(u.partenaire2Id)) && u.partenaire1Id !== personne.id && u.partenaire2Id !== personne.id);
    if (couples.length === 0 && !fait)
        return null;
    const confirmer = async (unionId: Id) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post('/enfant-de-passage', { enfantId: personne.id, unionId, garderParentDuNom: false });
            const u = tree.unions.find((x) => x.id === unionId)!;
            setFait(`${personne.prenom} est maintenant sous « ${LIBELLE_PASSAGE} » : enfant de ${nom(u.partenaire1Id)} et de ${nom(u.partenaire2Id)}.`);
            setOuvert(null);
            await Promise.all([tree.fetchTree(), useFamillesFormes.getState().charger()]);
        }
        catch (e) {
            setErreur(messageErreur(e));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<section className="flex flex-col gap-2 rounded-[12px] border border-trait-leger bg-papier px-3.5 py-3" data-bloc="enfant-de-passage">
            <div className="text-[10.5px] tracking-[.12em] uppercase text-encre-3">Ses parents : {LIBELLE_PASSAGE.toLowerCase()} ?</div>
            {fait && <p className="m-0 text-[13px] text-encre" data-fait="enfant-de-passage">{fait}</p>}
            {couples.map((u) => {
            return ouvert !== u.id ? (<button key={u.id} type="button" onClick={() => { setOuvert(u.id); setErreur(null); }} data-geste="enfant-de-passage" data-union={u.id} className="self-start text-left h-auto min-h-9 px-3 py-1.5 rounded-[10px] border border-trait text-[13px] text-encre-2 hover:border-sepia hover:bg-sepia-tint">
                        <b>{LIBELLE_PASSAGE}</b> : enfant de {nom(u.partenaire1Id)} + {nom(u.partenaire2Id)}…
                    </button>) : (<div key={u.id} className="flex flex-col gap-2 text-[13px] text-encre" data-confirmer="enfant-de-passage">
                        <p className="m-0">
                            {personne.prenom} {nomLisible(personne.nom)} passe sous « {LIBELLE_PASSAGE} » : ses parents biologiques deviennent{' '}
                            <b>{nom(u.partenaire1Id)}</b> et <b>{nom(u.partenaire2Id)}</b>. Son nom ne change pas.
                        </p>
                        {erreur && <p className="m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                        <div className="flex gap-2">
                            <button type="button" disabled={envoi} onClick={() => void confirmer(u.id)} data-geste="confirmer-enfant-de-passage" className="h-9 px-3 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint disabled:opacity-50">
                                Confirmer
                            </button>
                            <button type="button" onClick={() => setOuvert(null)} className="h-9 px-3 rounded-[10px] text-encre-2 text-[13px] hover:bg-sepia-tint">Annuler</button>
                        </div>
                    </div>);
        })}
        </section>);
};
