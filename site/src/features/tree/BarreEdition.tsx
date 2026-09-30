import { memo } from 'react';
import type { Node } from 'reactflow';
import type { Id } from '../../types';
import { useEdition } from './edition';
export const LARGEUR_BARRE = 228;
export const HAUTEUR_BARRE = 28;
export const BarreEdition = memo(({ data }: {
    data: {
        personneId: Id;
    };
}) => {
    const ouvrir = useEdition((s) => s.ouvrir);
    const bouton = 'nodrag nopan flex-1 h-full rounded-[8px] text-[11px] font-medium text-sepia-deep bg-carte border border-sepia hover:bg-sepia-tint whitespace-nowrap';
    const clic = (type: 'parent' | 'conjoint' | 'enfant' | 'modifier') => (e: React.MouseEvent) => {
        e.stopPropagation();
        ouvrir({ type, personneId: data.personneId });
    };
    return (<div className="flex gap-1" style={{ width: LARGEUR_BARRE, height: HAUTEUR_BARRE }}>
            <button className={bouton} onClick={clic('parent')} title="Ajouter son père ou sa mère">
                + Parent
            </button>
            <button className={bouton} onClick={clic('conjoint')} title="Ajouter une épouse / un époux (plusieurs unions possibles)">
                + Conjoint
            </button>
            <button className={bouton} onClick={clic('enfant')} title="Ajouter un enfant">
                + Enfant
            </button>
            <button className={`${bouton} !flex-none w-7`} onClick={clic('modifier')} title="Modifier (corriger une erreur)">
                ✎
            </button>
        </div>);
});
BarreEdition.displayName = 'BarreEdition';
export function avecBarre(nodes: Node[], choisi: Id | null, largeurCarte: number): Node[] {
    if (choisi === null)
        return nodes;
    const carte = nodes.find((n) => n.id === `p-${choisi}`);
    if (!carte)
        return nodes;
    return [
        ...nodes,
        {
            id: 'edition',
            type: 'edition',
            position: { x: carte.position.x + largeurCarte / 2 - LARGEUR_BARRE / 2, y: carte.position.y - HAUTEUR_BARRE - 12 },
            data: { personneId: choisi },
            selectable: false,
            draggable: false,
            zIndex: 20,
        },
    ];
}
