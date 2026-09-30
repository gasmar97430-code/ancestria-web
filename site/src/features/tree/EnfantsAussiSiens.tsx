import { useMemo, useState } from 'react';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id, Relationship, UnionChild } from '../../types';
import { messageErreur } from './edition';
type UnionMin = {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
};
type PersonneMin = {
    id: Id;
    prenom: string;
    nom: string;
    genre?: string;
    dateNaissance?: string | null;
};
export function parentsConnus(id: Id, relationships: Relationship[], unionChildren: UnionChild[], unions: UnionMin[]): Set<Id> {
    const s = new Set<Id>(relationships.filter((r) => r.enfantId === id && r.typeLien === 'Biological').map((r) => r.parentId));
    for (const uc of unionChildren.filter((x) => x.enfantId === id)) {
        const u = unions.find((x) => x.id === uc.unionId);
        if (u) {
            s.add(u.partenaire1Id);
            s.add(u.partenaire2Id);
        }
    }
    return s;
}
export function enfantsAUnSeulParent(parentId: Id, relationships: Relationship[], unionChildren: UnionChild[], unions: UnionMin[]): Id[] {
    const enfants = [...new Set(relationships.filter((r) => r.parentId === parentId && r.typeLien === 'Biological').map((r) => r.enfantId))];
    return enfants.filter((e) => { const p = parentsConnus(e, relationships, unionChildren, unions); return p.size === 1 && p.has(parentId); });
}
export const useEnfantsAussiSiens = create<{
    question: {
        personneId: Id;
        unionId: Id;
    } | null;
    proposer: (personneId: Id, unionId: Id) => void;
    fermer: () => void;
}>((set) => ({
    question: null,
    proposer: (personneId, unionId) => set({ question: { personneId, unionId } }),
    fermer: () => set({ question: null }),
}));
export const proposerEnfantsAussiSiens = (personneId: Id, unionId: Id) => useEnfantsAussiSiens.getState().proposer(personneId, unionId);
const annee = (d?: string | null) => (d ? ` (${String(d).slice(0, 4)})` : '');
const bouton = 'h-10 px-4 rounded-[10px] border text-[13.5px] disabled:opacity-40';
export const EnfantsAussiSiens = () => {
    const { question, fermer } = useEnfantsAussiSiens();
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const unions = tree.unions as unknown as UnionMin[];
    const [coches, setCoches] = useState<Set<Id>>(new Set());
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const union = question ? unions.find((u) => u.id === question.unionId) : undefined;
    const candidats = useMemo(() => (question ? enfantsAUnSeulParent(question.personneId, tree.relationships, tree.unionChildren, unions) : []), [question, tree.relationships, tree.unionChildren, unions]);
    if (!question || !union || candidats.length === 0)
        return null;
    const personne = people.find((p) => p.id === question.personneId);
    const conjoint = people.find((p) => p.id === (union.partenaire1Id === question.personneId ? union.partenaire2Id : union.partenaire1Id));
    if (!personne || !conjoint)
        return null;
    const qui = (p: PersonneMin) => `${p.prenom} ${nomLisible(p.nom)}`;
    const finir = () => { setCoches(new Set()); setErreur(null); fermer(); };
    const rattacher = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post('/deplacer-enfants', { enfants: [...coches], versUnionId: union.id });
            await tree.fetchTree();
            finir();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="fixed inset-0 z-[60] bg-black/30 grid place-items-center p-4" data-noeud="enfants-aussi-siens">
            <div className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
                <div>
                    <h2 className="font-display text-[26px] font-medium leading-tight m-0">{candidats.length === 1 ? 'Cet enfant est-il aussi celui' : 'Ces enfants sont-ils aussi ceux'} de {qui(conjoint)} ?</h2>
                    <div className="text-[13px] text-encre-2 mt-1.5">
                        {candidats.length === 1 ? 'Cet enfant de' : 'Ces enfants de'} {qui(personne)} n'{candidats.length === 1 ? 'a' : 'ont'} pas d'autre parent enregistré. Coche seulement ceux dont tu sais que {qui(conjoint)} est le parent.
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {candidats.map((id) => {
            const e = people.find((p) => p.id === id);
            if (!e)
                return null;
            return (<label key={id} className="flex items-center gap-2.5 text-[14px] text-encre px-3 py-2 rounded-[10px] border border-trait hover:bg-sepia-tint cursor-pointer">
                                <input type="checkbox" checked={coches.has(id)} onChange={(ev) => setCoches((s) => { const n = new Set(s); if (ev.target.checked)
                n.add(id);
            else
                n.delete(id); return n; })}/>
                                {qui(e)}{annee(e.dateNaissance)}
                            </label>);
        })}
                </div>
                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                <div className="flex gap-2 justify-end">
                    <button type="button" disabled={envoi} onClick={finir} className={`${bouton} border-trait text-encre-2 hover:bg-sepia-tint`}>
                        Non, aucun
                    </button>
                    <button type="button" disabled={envoi || coches.size === 0} onClick={() => void rattacher()} className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                        Oui, rattacher {coches.size > 0 ? `(${coches.size})` : ''} au couple
                    </button>
                </div>
            </div>
        </div>);
};
export const ParentDuCouple = ({ enfantId, onFait }: {
    enfantId: Id;
    onFait: () => void;
}) => {
    const tree = useTreeStore();
    const people = tree.people as unknown as PersonneMin[];
    const unions = tree.unions as unknown as UnionMin[];
    const [envoi, setEnvoi] = useState<Id | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const parents = [...parentsConnus(enfantId, tree.relationships, tree.unionChildren, unions)];
    if (parents.length !== 1)
        return null;
    const seul = people.find((p) => p.id === parents[0]);
    const couples = unions.filter((u) => u.partenaire1Id === parents[0] || u.partenaire2Id === parents[0]);
    if (!seul || couples.length === 0)
        return null;
    const qui = (p: PersonneMin) => `${p.prenom} ${nomLisible(p.nom)}`;
    const choisir = async (unionId: Id) => {
        setEnvoi(unionId);
        setErreur(null);
        try {
            await apiClient.post('/deplacer-enfants', { enfants: [enfantId], versUnionId: unionId });
            await tree.fetchTree();
            onFait();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(null);
        }
    };
    return (<div className="flex flex-col gap-1.5 p-3 rounded-[12px] border border-trait bg-papier" data-noeud="parent-du-couple">
            <div className="text-[13px] text-encre-2">
                {qui(seul)} vit en couple. L'autre parent est-il {couples.length === 1 ? 'son conjoint' : 'l\'un de ses conjoints'} ?
            </div>
            <div className="flex flex-wrap gap-2">
                {couples.map((u) => {
            const c = people.find((p) => p.id === (u.partenaire1Id === seul.id ? u.partenaire2Id : u.partenaire1Id));
            if (!c || c.id === enfantId)
                return null;
            return (<button key={u.id} type="button" disabled={envoi !== null} onClick={() => void choisir(u.id)} className={`${bouton} border-sepia text-sepia-deep font-medium hover:bg-sepia-tint`}>
                            Oui, c'est {qui(c)}
                        </button>);
        })}
            </div>
            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
