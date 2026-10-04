import { memo, useLayoutEffect, useRef, useState } from 'react';
import type { NodeProps } from 'reactflow';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { useLectureSeule } from '../../lib/lectureSeule';
import { UnionPillNode } from './nodes/UnionPillNode';
import type { DonneesUnion } from './graphe';
import { RangsDansModifierUnion } from './OrdreUnions';
import { messageErreur } from './edition';
import { fixerPassage, LIBELLE_PASSAGE, useRelationsPassage } from './relationPassage';
export const NATURES: [
    string,
    string
][] = [['Marriage', 'Mariage'], ['Civil_Partnership', 'PACS'], ['Informal', 'Union libre'], ['Other', 'Autre union']];
export const STATUTS: [
    string,
    string
][] = [['Active', 'En couple / mariés'], ['Divorced', 'Divorcés'], ['Separated', 'Séparés'], ['Widowed', 'Veuvage']];
const puce = (actif: boolean) => `h-7 px-2.5 rounded-full border text-[12px] ${actif ? 'border-sepia bg-sepia-tint text-sepia-deep font-medium' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`;
export function unionDeLEtiquette(idNoeud: string): number | null {
    const m = /^u-(\d+)$/.exec(idNoeud);
    return m ? Number(m[1]) : null;
}
const Reglages = ({ unionId, fermer }: {
    unionId: number;
    fermer: () => void;
}) => {
    const tree = useTreeStore();
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const boite = useRef<HTMLDivElement>(null);
    const [enHaut, setEnHaut] = useState(false);
    useLayoutEffect(() => {
        const b = boite.current?.getBoundingClientRect();
        if (b && !enHaut && b.bottom > window.innerHeight - 8)
            setEnHaut(true);
    }, [enHaut]);
    const passage = useRelationsPassage((s) => s.ids.has(unionId));
    const union = (tree.unions as unknown as {
        id: number;
        typeUnion?: string;
        statut?: string;
        partenaire1Id: number;
        partenaire2Id: number;
    }[]).find((u) => u.id === unionId);
    if (!union)
        return null;
    const fixer = async (corps: Record<string, string>) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.patch(`/unions/${unionId}`, corps);
            await tree.fetchTree();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div ref={boite} className={`nodrag nopan nowheel absolute left-1/2 -translate-x-1/2 ${enHaut ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-[340px] rounded-[12px] border border-sepia bg-carte shadow-lg px-3 py-2.5 flex flex-col gap-2.5 text-[12.5px] text-left cursor-default z-10`} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} data-noeud="regler-union">
            <div>
                <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1">Nature</div>
                <div className="flex gap-1.5 flex-wrap">
                    {NATURES.map(([v, l]) => (<button key={v} type="button" disabled={envoi} className={puce((union.typeUnion ?? 'Other') === v)} onClick={() => void fixer({ type: v })} data-nature={v}>
                            {l}
                        </button>))}
                </div>
            </div>
            <div>
                <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1">Statut</div>
                <div className="flex gap-1.5 flex-wrap">
                    {STATUTS.map(([v, l]) => (<button key={v} type="button" disabled={envoi} className={puce(!passage && (union.statut ?? 'Active') === v)} onClick={() => void (async () => { if (passage)
            await fixerPassage(unionId, false); await fixer({ statut: v }); })()} data-statut-union={v}>
                            {l}
                        </button>))}
                    <button type="button" disabled={envoi} className={puce(passage)} onClick={() => void (async () => { setEnvoi(true); try {
        await fixerPassage(unionId, !passage);
        await tree.fetchTree();
    }
    catch (err) {
        setErreur(messageErreur(err));
    }
    finally {
        setEnvoi(false);
    } })()} data-statut-union="Passage" title="Une relation de passage, un enfant ensemble, jamais en couple">
                        {LIBELLE_PASSAGE}
                    </button>
                </div>
            </div>
            <RangsDansModifierUnion union={union as never}/>
            {erreur && <div style={{ color: 'var(--o-afrique)' }}>Rien n'a été changé : {erreur}</div>}
            <div className="flex justify-end">
                <button type="button" onClick={fermer} className="h-8 px-3 rounded-[9px] border border-trait text-encre-2" data-action="fermer-regler-union">
                    Fermer
                </button>
            </div>
        </div>);
};
export const PastilleReglable = memo((props: NodeProps<DonneesUnion>) => {
    const lecture = useLectureSeule((s) => s.actif);
    const [ouvert, setOuvert] = useState(false);
    const unionId = unionDeLEtiquette(props.id);
    const ici = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const noeud = ici.current?.closest<HTMLElement>('.react-flow__node');
        if (!noeud)
            return;
        if (ouvert)
            noeud.style.setProperty('z-index', '30', 'important');
        else
            noeud.style.removeProperty('z-index');
    }, [ouvert]);
    if (lecture || unionId === null)
        return <UnionPillNode data={props.data}/>;
    return (<div className="relative" ref={ici}>
            <div className="cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            setOuvert((o) => !o);
        }} title="Préciser cette union : mariage, union libre…, divorcés…, 1re ou 2e union" data-action="regler-union">
                <UnionPillNode data={props.data}/>
            </div>
            {ouvert && <Reglages unionId={unionId} fermer={() => setOuvert(false)}/>}
        </div>);
});
PastilleReglable.displayName = 'PastilleReglable';
