import { memo, useState } from 'react';
import type { Node } from 'reactflow';
import { Trash } from '@phosphor-icons/react';
import { ConfirmationSurCarte } from './CorbeilleDoublons';
const COTE = 28;
export const BoutonSupprimerCarte = memo(({ data }: {
    data: {
        personneId: number;
    };
}) => {
    const [ouvert, setOuvert] = useState(false);
    return (<div className="relative" style={{ width: COTE, height: COTE }}>
            <button className="nodrag nopan grid place-items-center rounded-[8px] bg-carte border text-[11px] hover:bg-sepia-tint" style={{ width: COTE, height: COTE, borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} onClick={(e) => {
            e.stopPropagation();
            setOuvert((o) => !o);
        }} title="Supprimer cette personne (la confirmation dit ce qui part et propose de fusionner si c'est un doublon)" data-action="supprimer-depuis-carte">
                <Trash size={14}/>
            </button>
            {ouvert && (<div className="absolute left-0 w-[300px] h-0" style={{ top: COTE }}>
                    <ConfirmationSurCarte personneId={data.personneId} fermer={() => setOuvert(false)}/>
                </div>)}
        </div>);
});
BoutonSupprimerCarte.displayName = 'BoutonSupprimerCarte';
export function avecPoubelle(nodes: Node[]): Node[] {
    const barre = nodes.find((n) => n.id === 'edition');
    if (!barre)
        return nodes;
    return [
        ...nodes,
        {
            id: 'supprimer-carte',
            type: 'supprimerCarte',
            position: { x: barre.position.x - COTE - 4, y: barre.position.y },
            data: { personneId: (barre.data as {
                    personneId: number;
                }).personneId },
            width: COTE,
            height: COTE,
            selectable: false,
            draggable: false,
            zIndex: 20,
        },
    ];
}
