import { useState } from 'react';
import { Baby, Heart, PencilSimple, TreeStructure } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Individu, UnionComplete } from './graphe';
import { AvecStatut, StatutFiche } from './StatutVie';
import { useEdition } from './edition';
import { OriginesAscendance } from './Origines';
import { BoutonFratrie } from './ParentInconnu';
import { libelleUnionFiche, trierParRang } from './OrdreUnions';
import { FamilleFiche } from './FamillesFormes';
import { libelleLienFiche } from './FamillesFormes';
import { SupprimerFiche } from './SupprimerFiche';
export const ActionsFiche = ({ personne }: {
    personne: Individu;
}) => {
    const tree = useTreeStore();
    const ouvrir = useEdition((s) => s.ouvrir);
    const [erreur, setErreur] = useState<string | null>(null);
    const p = ((tree.people as Individu[]).find((x) => x.id === personne.id) ?? personne) as AvecStatut;
    const people = tree.people as Individu[];
    const sesUnions = (tree.unions as UnionComplete[]).filter((u) => u.partenaire1Id === p.id || u.partenaire2Id === p.id);
    const changerStatut = async (decede: boolean | null) => {
        setErreur(null);
        try {
            await apiClient.patch(`/people/${p.id}`, { decede });
            await tree.fetchTree();
        }
        catch (err: any) {
            setErreur(err?.response?.data?.error ?? err.message);
        }
    };
    const bouton = 'flex items-center justify-center gap-1.5 h-9 rounded-[10px] border border-trait text-encre text-[12.5px] font-medium hover:bg-sepia-tint';
    return (<>
            <button onClick={() => ouvrir({ type: 'modifier', personneId: p.id })} className={bouton} title="Corriger le nom, le prénom, les dates, les lieux…">
                <PencilSimple size={14}/>
                Modifier
            </button>
            <StatutFiche individu={p} onChange={changerStatut}/>
            <DecesDansLesNotes personne={p} onMarquer={() => changerStatut(true)}/>
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}

            {sesUnions.length > 0 && (<div className="flex flex-col gap-1">
                    {trierParRang(p.id, sesUnions).map((u) => {
                const c = people.find((x) => x.id === (u.partenaire1Id === p.id ? u.partenaire2Id : u.partenaire1Id));
                const enfants = tree.unionChildren.filter((uc) => uc.unionId === u.id).length;
                return (<div key={u.id} className="flex items-center gap-2 text-[12.5px] text-encre-2">
                                <Heart size={12} className="text-sepia flex-none"/>
                                <span className="truncate text-encre">{c ? `${c.prenom} ${nomLisible(c.nom)}` : '?'}</span>
                                <span className="text-encre-3 flex-none">{libelleUnionFiche(p.id, u, sesUnions)}</span>
                                <button onClick={() => ouvrir({ type: 'union', personneId: p.id, unionId: u.id })} className="flex-none text-encre-3 hover:text-encre" title="Modifier ou supprimer cette union">
                                    ✎
                                </button>
                                <button onClick={() => ouvrir({ type: 'enfant', personneId: p.id, unionId: u.id })} className="ml-auto flex-none text-sepia-deep hover:underline" title="Ajouter un enfant de ce couple">
                                    + enfant{enfants > 0 ? ` (${enfants})` : ''}
                                </button>
                            </div>);
            })}
                </div>)}

            <ParentsFiche personne={p}/>

            <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => ouvrir({ type: 'parent', personneId: p.id })} className={bouton} title="Ajouter son père ou sa mère">
                    <TreeStructure size={14}/>
                    Parent
                </button>
                <button onClick={() => ouvrir({ type: 'conjoint', personneId: p.id })} className={bouton} title="Ajouter une épouse / un époux">
                    <Heart size={14}/>
                    Conjoint
                </button>
                <button onClick={() => ouvrir({ type: 'enfant', personneId: p.id })} className={bouton} title="Ajouter un enfant">
                    <Baby size={14}/>
                    Enfant
                </button>
            </div>
            <BoutonFratrie personne={p}/>
            <SupprimerFiche personne={p}/>
            <FamilleFiche personne={p}/>
            <OriginesAscendance personne={p}/>
        </>);
};
export function phraseDeces(notes?: string | null): string | null {
    if (!notes)
        return null;
    const m = /[^.]*d[ée]c[ée]d[ée]e?(?![a-zà-ÿ])[^.]*\.?/i.exec(notes);
    if (!m || /non d[ée]c[ée]d[ée]|pas d[ée]c[ée]d[ée]|vivante?\b/i.test(m[0]))
        return null;
    return m[0].trim();
}
const DecesDansLesNotes = ({ personne, onMarquer }: {
    personne: AvecStatut;
    onMarquer: () => Promise<void>;
}) => {
    const phrase = phraseDeces(personne.notes);
    if (!phrase || personne.dateDeces || personne.decede !== null && personne.decede !== undefined)
        return null;
    return (<div className="rounded-[10px] border border-trait bg-papier px-3 py-2 flex flex-col gap-1.5">
            <div className="text-[12px] text-encre-2">
                Les notes disent : <span className="italic text-encre">« {phrase} »</span>
            </div>
            <button onClick={() => void onMarquer()} className="self-start h-8 px-3 rounded-[9px] border border-sepia text-sepia-deep text-[12.5px] font-medium hover:bg-sepia-tint">
                Marquer {personne.genre === 'F' ? 'décédée' : 'décédé'}
            </button>
        </div>);
};
const ParentsFiche = ({ personne }: {
    personne: Individu;
}) => {
    const tree = useTreeStore();
    const [aRetirer, setARetirer] = useState<{
        parentId: number;
        typeLien: string;
    } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const people = tree.people as Individu[];
    const liens = tree.relationships.filter((r) => r.enfantId === personne.id);
    if (liens.length === 0)
        return null;
    const nomDe = (id: number) => {
        const x = people.find((q) => q.id === id);
        return x ? `${x.prenom} ${nomLisible(x.nom)}` : '?';
    };
    const TYPE: Record<string, string> = { Biological: '', Adoptive: ' (adoptif)', Step: ' (beau-parent)' };
    const retirer = async () => {
        if (!aRetirer)
            return;
        setErreur(null);
        try {
            await apiClient.delete('/relationships', { data: { parentId: aRetirer.parentId, childId: personne.id, type: aRetirer.typeLien } });
            setARetirer(null);
            await tree.fetchTree();
        }
        catch (err: any) {
            setErreur(err?.response?.data?.error ?? err.message);
        }
    };
    return (<div className="flex flex-col gap-1">
            <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">Parents</div>
            {liens.map((l) => (<div key={`${l.parentId}-${l.typeLien}`} className="flex items-center gap-2 text-[12.5px] text-encre">
                    <span className="truncate">
                        {nomDe(l.parentId)}
                        <span className="text-encre-3">{libelleLienFiche(l.parentId, personne.id, l.typeLien, TYPE[l.typeLien] ?? '')}</span>
                    </span>
                    <button onClick={() => setARetirer({ parentId: l.parentId, typeLien: l.typeLien })} className="ml-auto flex-none text-encre-3 hover:text-encre" title="Retirer ce lien (saisi par erreur)">
                        ✕
                    </button>
                </div>))}
            {aRetirer && (<div className="rounded-[10px] border px-3 py-2 flex flex-col gap-1.5" style={{ borderColor: 'var(--o-afrique)' }}>
                    <div className="text-[12.5px] text-encre">
                        {nomDe(aRetirer.parentId)} n'est pas {(() => { const g = people.find((q) => q.id === aRetirer.parentId)?.genre; return g === 'M' ? 'le père' : g === 'F' ? 'la mère' : 'le parent'; })()} de {personne.prenom} ? Le lien sera retiré ; les deux personnes restent dans l'arbre.
                    </div>
                    <div className="text-[11px] text-encre-3">Copie de sécurité de la base faite juste avant.</div>
                    <div className="flex gap-2">
                        <button onClick={() => setARetirer(null)} className="h-8 px-3 rounded-[9px] border border-trait text-encre-2 text-[12.5px]">
                            Non
                        </button>
                        <button onClick={() => void retirer()} className="h-8 px-3 rounded-[9px] border text-[12.5px] font-medium" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }}>
                            Oui, retirer le lien
                        </button>
                    </div>
                </div>)}
            {erreur && <p className="text-[12px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
