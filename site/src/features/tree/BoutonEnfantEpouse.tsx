import { memo } from 'react';
import type { Node } from 'reactflow';
import type { Id } from '../../types';
import { useEdition } from './edition';
import { HAUTEUR_BARRE, LARGEUR_BARRE } from './BarreEdition';
const LARGEUR = 92;
export const BoutonEnfantEpouse = memo(({ data }: {
    data: {
        epouseId: Id;
        unionId: Id;
    };
}) => {
    const ouvrir = useEdition((s) => s.ouvrir);
    return (<button className="nodrag nopan rounded-[8px] text-[11px] font-medium text-sepia-deep bg-carte border border-sepia hover:bg-sepia-tint whitespace-nowrap" style={{ width: LARGEUR, height: HAUTEUR_BARRE }} title="Ajouter un enfant de ce couple (cette épouse est la mère)" onClick={(e) => {
            e.stopPropagation();
            ouvrir({ type: 'enfant', personneId: data.epouseId, unionId: data.unionId });
        }}>
            + Enfant
        </button>);
});
BoutonEnfantEpouse.displayName = 'BoutonEnfantEpouse';
export const BarreSansEnfant = memo(({ data }: {
    data: {
        personneId: Id;
    };
}) => {
    const ouvrir = useEdition((s) => s.ouvrir);
    const bouton = 'nodrag nopan flex-1 h-full rounded-[8px] text-[11px] font-medium text-sepia-deep bg-carte border border-sepia hover:bg-sepia-tint whitespace-nowrap';
    const clic = (type: 'parent' | 'conjoint' | 'modifier') => (e: React.MouseEvent) => {
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
            <button className={`${bouton} !flex-none w-7`} onClick={clic('modifier')} title="Modifier (corriger une erreur)">
                ✎
            </button>
        </div>);
});
BarreSansEnfant.displayName = 'BarreSansEnfant';
interface PersonneMin {
    id: Id;
    genre?: string | null;
}
interface UnionMin {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
}
export function epousesDe(choisi: Id | null, people: PersonneMin[], unions: UnionMin[]): {
    epouseId: Id;
    unionId: Id;
}[] {
    if (choisi === null)
        return [];
    const lui = people.find((p) => p.id === choisi);
    if (!lui || lui.genre === 'F')
        return [];
    return unions
        .filter((u) => u.partenaire1Id === choisi || u.partenaire2Id === choisi)
        .map((u) => ({ epouseId: u.partenaire1Id === choisi ? u.partenaire2Id : u.partenaire1Id, unionId: u.id }))
        .filter(({ epouseId }) => people.find((p) => p.id === epouseId)?.genre !== 'M');
}
export function avecBoutonsEpouses(nodes: Node[], choisi: Id | null, people: PersonneMin[], unions: UnionMin[], largeurCarte: number): Node[] {
    const ajouts: Node[] = [];
    for (const { epouseId, unionId } of epousesDe(choisi, people, unions)) {
        const carte = nodes.find((n) => n.id === `p-${epouseId}`);
        if (!carte)
            continue;
        ajouts.push({
            id: `enfant-epouse-${unionId}`,
            type: 'enfantEpouse',
            position: { x: carte.position.x + largeurCarte / 2 - LARGEUR / 2, y: carte.position.y - HAUTEUR_BARRE - 12 },
            data: { epouseId, unionId },
            selectable: false,
            draggable: false,
            zIndex: 20,
        });
    }
    if (ajouts.length === 0)
        return nodes;
    return [...nodes.map((n) => (n.id === 'edition' ? { ...n, type: 'editionSansEnfant' } : n)), ...ajouts];
}
