import { useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu } from './graphe';
import { messageErreur } from './edition';
interface UnionMin {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
}
interface LienMin {
    parentId: Id;
    enfantId: Id;
}
export function seulParCetteUnion(conjointId: Id, unionId: Id, unions: UnionMin[], liens: LienMin[]): boolean {
    const autresUnions = unions.some((u) => u.id !== unionId && (u.partenaire1Id === conjointId || u.partenaire2Id === conjointId));
    const parente = liens.some((l) => l.parentId === conjointId || l.enfantId === conjointId);
    return !autresUnions && !parente;
}
export const ConjointsExistants = ({ personne }: {
    personne: Individu;
}) => {
    const tree = useTreeStore();
    const [ouvert, setOuvert] = useState<Id | null>(null);
    const [aussiLaPersonne, setAussiLaPersonne] = useState(true);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const sesUnions = tree.unions.filter((u) => u.partenaire1Id === personne.id || u.partenaire2Id === personne.id);
    if (sesUnions.length === 0)
        return null;
    const retirer = async (unionId: Id, conjointId: Id, supprimerConjoint: boolean) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.delete(`/unions/${unionId}`);
            if (supprimerConjoint)
                await apiClient.delete(`/people/${conjointId}`);
            await tree.fetchTree();
            setOuvert(null);
        }
        catch (err) {
            setErreur(messageErreur(err));
            await tree.fetchTree().catch(() => undefined);
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="rounded-[12px] border border-trait bg-papier px-4 py-3 flex flex-col gap-2">
            <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">
                {sesUnions.length > 1 ? 'Ses conjoints' : 'Son conjoint'}
            </div>
            {sesUnions.map((u) => {
            const conjointId = u.partenaire1Id === personne.id ? u.partenaire2Id : u.partenaire1Id;
            const c = tree.people.find((p) => p.id === conjointId);
            const nom = c ? `${c.prenom} ${nomLisible(c.nom)}` : `personne n° ${conjointId}`;
            const enfants = tree.unionChildren.filter((uc) => uc.unionId === u.id).length;
            const seul = seulParCetteUnion(conjointId, u.id, tree.unions, tree.relationships);
            return (<div key={u.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[13px]">
                            <span className="text-encre truncate">{nom}</span>
                            {enfants > 0 && <span className="text-encre-3 flex-none">· {enfants} enfant{enfants > 1 ? 's' : ''}</span>}
                            {ouvert !== u.id && (<button type="button" onClick={() => {
                        setOuvert(u.id);
                        setAussiLaPersonne(true);
                        setErreur(null);
                    }} className="ml-auto flex-none text-[12.5px] hover:underline" style={{ color: 'var(--o-afrique)' }}>
                                    Retirer ce conjoint…
                                </button>)}
                        </div>
                        {ouvert === u.id && (<div className="rounded-[10px] border px-3 py-2.5 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
                                <div className="text-[13px] text-encre">
                                    Retirer {nom} comme conjoint de {personne.prenom} {nomLisible(personne.nom)} ?
                                </div>
                                <div className="text-[11.5px] text-encre-3">
                                    Le couple est défait.
                                    {enfants > 0
                        ? ` ${enfants > 1 ? `Les ${enfants} enfants restent` : "L'enfant reste"} enfant${enfants > 1 ? 's' : ''} de ses deux parents.`
                        : ''}{' '}
                                    Une copie de sécurité de la base est faite juste avant.
                                </div>
                                {seul && (<label className="flex items-start gap-2 text-[12.5px] text-encre-2">
                                        <input type="checkbox" checked={aussiLaPersonne} onChange={(e) => setAussiLaPersonne(e.target.checked)} className="mt-0.5"/>
                                        <span>
                                            Supprimer aussi {nom} de l'arbre — cette personne n'a aucun autre lien (ni parent, ni enfant, ni autre union).
                                        </span>
                                    </label>)}
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setOuvert(null)} className="h-9 px-3 rounded-[10px] border border-trait text-encre-2 text-[13px]">
                                        Non
                                    </button>
                                    <button type="button" disabled={envoi} onClick={() => void retirer(u.id, conjointId, seul && aussiLaPersonne)} className="h-9 px-3 rounded-[10px] border text-[13px] font-medium disabled:opacity-50" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }}>
                                        {seul && aussiLaPersonne ? 'Oui, retirer et supprimer' : 'Oui, retirer'}
                                    </button>
                                </div>
                            </div>)}
                    </div>);
        })}
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
