import { memo } from 'react';
import type { Node } from 'reactflow';
import { Trash } from '@phosphor-icons/react';
import { useEdition } from './edition';
const COTE = 28;
export const BoutonSupprimerCarte = memo(({ data }: {
    data: {
        personneId: number;
    };
}) => {
    const ouvrir = useEdition((s) => s.ouvrir);
    const clic = (e: React.MouseEvent) => {
        e.stopPropagation();
        const b = document.querySelector<HTMLButtonElement>('[data-action=supprimer-fiche]');
        if (b) {
            b.click();
            setTimeout(() => document.querySelector('[data-noeud=supprimer-fiche]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
        }
        else {
            ouvrir({ type: 'modifier', personneId: data.personneId });
        }
    };
    return (<button className="nodrag nopan grid place-items-center rounded-[8px] bg-carte border text-[11px] hover:bg-sepia-tint" style={{ width: COTE, height: COTE, borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} onClick={clic} title="Supprimer cette personne (la fiche dira ce qui part et proposera de fusionner si c'est un doublon)" data-action="supprimer-depuis-carte">
            <Trash size={14}/>
        </button>);
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
