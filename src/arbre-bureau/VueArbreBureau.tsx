// ---- L'ARBRE, DESSINÉ PAR LES PIÈCES DE L'ANCESTRIA DE BUREAU ----
//
// Ses demandes du 29/09 : « l'affichage identique sur le téléphone et sur le
// PC », « même arborescence ». Les pièces du bureau sont copiées TELLES QUELLES
// (arbre-bureau/lib, arbre-bureau/features/tree : buildGraph, disposition par
// foyers, recentrage, pastilles d'union, cartes mémorielles, marque vivant /
// décédé). Ce fichier ne fait que les assembler comme Arbre.tsx du bureau :
// même trame à points, même vue d'ensemble, même dock de zoom.
// Pas repris ici (propres au bureau) : répertoire des patronymes (toutes les
// cartes « Hors rép. », comme les noms absents du répertoire au bureau), rang
// des unions, flou de focus au clic.
// Posé par une ligne dans pages/ArbrePage.tsx, à la place de VueArbre (gardé).

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Handle, MiniMap, Position, ReactFlowProvider, useReactFlow, useStore, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { CornersOut, Minus, Plus } from '@phosphor-icons/react';
import './ui/theme-bureau.css';
import { CARTE, construireArbre, type DonneesCarte } from './features/tree/graphe';
import { PersonMemorialNode } from './features/tree/nodes/PersonMemorialNode';
import { UnionPillNode } from './features/tree/nodes/UnionPillNode';
import { teinteDe } from './lib/origins';
import { versBureau, type IndividuBureau } from './versBureau';
import type { DonneesArbre, Id } from '../domaine/types';

// ---- la carte « à trouver » (celle du bureau, ParentInconnu.tsx, sans son formulaire) ----
const poignee = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0 };
const libelleInconnu = (genre: string) => (genre === 'F' ? 'Mère à trouver' : genre === 'M' ? 'Père à trouver' : 'Parent à trouver');
const CarteInconnue = memo(({ data }: { data: DonneesCarte }) => (
    <div
        data-noeud="carte-inconnue"
        className="relative flex items-center gap-[11px] px-3 rounded-[13px] overflow-hidden transition-[opacity] duration-300"
        style={{ width: CARTE.width, height: CARTE.height, border: '1.5px dashed var(--sepia)', background: 'transparent', opacity: data.estompe ? 0.2 : 1 }}
        title="Nom à trouver : ouvre la fiche pour la compléter"
    >
        <Handle type="target" position={Position.Top} style={poignee} />
        <div className="w-11 h-11 flex-none rounded-full grid place-items-center font-display text-[22px] text-encre-2" style={{ border: '1.5px dashed var(--sepia)' }}>
            ?
        </div>
        <div className="min-w-0 flex flex-col gap-1">
            <div className="font-display text-[15px] leading-none font-semibold text-encre truncate">{libelleInconnu(data.individu.genre)}</div>
            <div className="text-[10.5px] text-encre-3 leading-none whitespace-nowrap">à compléter</div>
            <span className="h-[20px] px-1.5 rounded-[6px] border text-[10px] leading-none self-start mt-0.5 border-sepia text-sepia-deep grid place-items-center">Compléter</span>
        </div>
        <Handle type="source" position={Position.Bottom} style={poignee} />
    </div>
));
CarteInconnue.displayName = 'CarteInconnue';

const TYPES = { carte: PersonMemorialNode, pastille: UnionPillNode, inconnu: CarteInconnue };

// ---- Zoom : +, pourcentage, −, tout voir (le dock du bureau) ----
const ZoomDock = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const zoom = useStore((s) => s.transform[2]);
    const bouton = 'w-10 h-[38px] grid place-items-center text-encre-2 text-[17px] hover:bg-sepia-tint';
    return (
        <div className="absolute left-5 bottom-5 z-10 flex flex-col bg-carte border border-trait rounded-xl shadow-carte overflow-hidden">
            <button className={bouton} onClick={() => zoomIn({ duration: 300 })} title="Zoomer" type="button">
                <Plus />
            </button>
            <div className="h-[26px] grid place-items-center font-mono text-[10.5px] text-encre-3 border-y border-trait-leger">{Math.round(zoom * 100)}%</div>
            <button className={bouton} onClick={() => zoomOut({ duration: 300 })} title="Dézoomer" type="button">
                <Minus />
            </button>
            <button className={`${bouton} border-t border-trait-leger`} onClick={() => fitView({ duration: 450, padding: 0.15 })} title="Tout voir" type="button">
                <CornersOut />
            </button>
        </div>
    );
};

interface Proprietes {
    donnees: DonneesArbre;
    choisi: Id | null;
    onChoisir: (id: Id | null) => void;
}

function Interieur({ donnees, choisi, onChoisir }: Proprietes) {
    const t = useMemo(() => versBureau(donnees), [donnees]);
    const [petitEcran] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
    const choisiBureau = choisi ? t.versBureau.get(choisi) ?? null : null;
    const arbre = useMemo(
        () =>
            construireArbre({
                people: t.people,
                unions: t.unions,
                relationships: t.relationships,
                unionChildren: t.unionChildren,
                patronymes: new Map(),
                choisi: choisiBureau,
                visibles: () => true,
                sources: new Map(),
            }),
        [t, choisiBureau],
    );
    const nodes: Node[] = useMemo(
        () => arbre.nodes.map((n) => (n.type === 'carte' && ((n.data as DonneesCarte).individu as IndividuBureau).aTrouver ? { ...n, type: 'inconnu' } : n)).map((n) => ({ ...n, draggable: false })),
        [arbre],
    );

    // Centrer sur la carte choisie, une fois par choix, jamais sur une position invalide.
    const { setCenter, getZoom } = useReactFlow();
    const dernier = useRef<number | null>(null);
    useEffect(() => {
        if (choisiBureau === null) { dernier.current = null; return; }
        if (dernier.current === choisiBureau) return;
        const n = nodes.find((x) => x.id === `p-${choisiBureau}`);
        if (!n || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y)) return;
        dernier.current = choisiBureau;
        const zoom = Math.max(getZoom(), 0.9);
        if (Number.isFinite(zoom)) setCenter(n.position.x + CARTE.width / 2, n.position.y + CARTE.height / 2, { zoom, duration: 500 });
    }, [choisiBureau, nodes, setCenter, getZoom]);

    const clic = useCallback(
        (_: unknown, n: Node) => {
            if (n.type !== 'carte' && n.type !== 'inconnu') return;
            const id = t.versWeb.get((n.data as DonneesCarte).individu.id);
            if (id) onChoisir(id);
        },
        [t, onChoisir],
    );

    return (
        <div className="relative w-full h-full bg-papier">
            <ReactFlow
                nodes={nodes}
                edges={arbre.edges}
                nodeTypes={TYPES}
                onNodeClick={clic}
                onPaneClick={() => onChoisir(null)}
                nodesConnectable={false}
                nodesDraggable={false}
                fitView
                // Téléphone : l'arbre entier serait illisible (53 % mesuré au banc) ; départ à un zoom où les noms se lisent.
                fitViewOptions={{ padding: 0.15, minZoom: petitEcran ? 0.75 : undefined }}
                minZoom={0.1}
                maxZoom={1.6}
                zoomOnPinch
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--points)" />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={(n) => (n.type === 'carte' ? teinteDe((n.data as DonneesCarte).origine).c : 'transparent')}
                    nodeStrokeWidth={0}
                    nodeBorderRadius={3}
                    className="atelier-minimap"
                    style={{ width: 200, height: 132 }}
                />
                <ZoomDock />
            </ReactFlow>
        </div>
    );
}

export function VueArbreBureau(p: Proprietes) {
    return (
        <ReactFlowProvider>
            <Interieur {...p} />
        </ReactFlowProvider>
    );
}

// ---- FIN L'ARBRE, DESSINÉ PAR LES PIÈCES DU BUREAU ----
