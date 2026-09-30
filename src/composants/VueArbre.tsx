// ---- L'ARBRE À L'ÉCRAN ----
// React Flow : glisser au doigt ou à la souris, pincer / molette pour le
// zoom. Seules les cartes visibles sont dessinées (grands arbres fluides,
// téléphones compris). La disposition vient de domaine/disposition.ts.
// Choisir une carte centre la vue sur elle, au zoom lisible, sans jamais
// passer par une position invalide (valeurs finies vérifiées).

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { disposer, CARTE, JONCTION, idNoeud, type TraitDispose } from '../domaine/disposition';
import { NATURE_FILIATION, PARENT_A_TROUVER } from '../domaine/libelles';
import { Portrait } from '../ui/Portrait';
import { annee } from '../domaine/dates';
import type { DonneesArbre, Id, Individu } from '../domaine/types';

interface DonneesCarte {
    individu: Individu;
    choisi: boolean;
}

const cacher = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1, border: 0, background: 'transparent' } as const;

const CarteIndividu = memo(function CarteIndividu({ data }: NodeProps<DonneesCarte>) {
    const i = data.individu;
    const a = annee(i.naissance);
    const b = annee(i.deces);
    const aTrouver = i.prenom === PARENT_A_TROUVER;
    return (
        <div
            className={`rounded-2xl px-3 py-2 flex items-center gap-2.5 cursor-pointer select-none transition-shadow ${aTrouver ? 'border border-dashed border-encre-3 bg-carte/70' : 'border bg-carte-2'} ${data.choisi ? 'border-sepia shadow-[0_0_0_3px_rgba(217,169,91,0.35)]' : 'border-trait'}`}
            style={{ width: CARTE.largeur, height: CARTE.hauteur }}
            title={`${i.prenom} ${i.nom}`.trim()}
        >
            <Handle type="target" position={Position.Top} style={cacher} />
            <Handle type="source" position={Position.Bottom} style={cacher} />
            <Handle id="g" type="source" position={Position.Left} style={cacher} />
            <Handle id="d" type="target" position={Position.Right} style={cacher} />
            <Portrait individu={i} taille={40} texte={aTrouver ? '?' : undefined} />
            <div className="min-w-0 leading-tight">
                <div className="text-[13px] text-encre truncate">
                    {i.illustre && <span className="text-sepia" aria-label="personnalité illustre">★ </span>}
                    {i.prenom}
                </div>
                <div className="text-[13px] font-semibold text-encre truncate uppercase tracking-wide">{i.nom || ' '}</div>
                <div className="text-[11px] text-encre-3 truncate">
                    {!i.vivant && '† '}
                    {a || b ? `${a ?? '?'} – ${b ?? (i.vivant ? '' : '?')}` : i.vivant ? '' : 'dates inconnues'}
                </div>
            </div>
        </div>
    );
});

const Jonction = memo(function Jonction() {
    return (
        <div className="rounded-full bg-sepia/80" style={{ width: JONCTION.largeur, height: JONCTION.hauteur }}>
            <Handle type="target" position={Position.Top} style={cacher} />
            <Handle type="source" position={Position.Bottom} style={cacher} />
        </div>
    );
});

const TYPES_NOEUDS = { individu: CarteIndividu, jonction: Jonction };

// Posés sur chaque trait (la feuille de style de React Flow, chargée après la
// nôtre, remettait les étiquettes en blanc) : étiquette lisible sur fond sombre.
const ETIQUETTE = {
    labelStyle: { fill: '#cdbfae', fontSize: 11 },
    labelBgStyle: { fill: '#1b1612', fillOpacity: 0.92 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
};

function style(t: TraitDispose): { style: Edge['style']; label?: string; animated?: boolean } {
    if (t.genre === 'couple') {
        // conjoints côte à côte : pas la place d'une étiquette entre les cartes (elle se coupait) ;
        // pointillé serré = union terminée, le statut en toutes lettres est dans la fiche
        const fini = t.union && t.union.statut !== 'en_cours';
        return { style: { stroke: '#d9a95b', strokeWidth: 2, strokeDasharray: fini ? '2 5' : '8 5' } };
    }
    const bio = !t.nature || t.nature === 'biologique';
    return {
        style: { stroke: bio ? '#b9a48c' : '#8fbf7a', strokeWidth: 1.6, strokeDasharray: bio ? undefined : '6 4' },
        label: bio || !t.nature ? undefined : NATURE_FILIATION[t.nature].split(' (')[0],
    };
}

interface Proprietes {
    donnees: DonneesArbre;
    choisi: Id | null;
    onChoisir: (id: Id | null) => void;
}

function Interieur({ donnees, choisi, onChoisir }: Proprietes) {
    const disposition = useMemo(() => disposer(donnees), [donnees]);
    const [petitEcran] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
    const { setCenter, getZoom } = useReactFlow();

    const nodes: Node[] = useMemo(
        () =>
            disposition.noeuds.map((n) =>
                n.type === 'individu' && n.individu
                    ? { id: n.id, type: 'individu', position: { x: n.x, y: n.y }, data: { individu: n.individu, choisi: n.individu.id === choisi }, width: CARTE.largeur, height: CARTE.hauteur, draggable: false }
                    : { id: n.id, type: 'jonction', position: { x: n.x, y: n.y }, data: {}, width: JONCTION.largeur, height: JONCTION.hauteur, draggable: false, selectable: false },
            ),
        [disposition, choisi],
    );

    const positions = useMemo(() => new Map(disposition.noeuds.map((n) => [n.id, n.x])), [disposition]);
    const edges: Edge[] = useMemo(
        () =>
            disposition.traits.map((t) => {
                const s = style(t);
                if (t.genre === 'couple') {
                    // le trait part du côté qui fait face à l'autre carte
                    const gauche = (positions.get(t.source) ?? 0) <= (positions.get(t.cible) ?? 0);
                    return {
                        id: t.id, source: gauche ? t.cible : t.source, target: gauche ? t.source : t.cible,
                        sourceHandle: 'g', targetHandle: 'd', type: 'straight', ...s, ...ETIQUETTE, focusable: false,
                    };
                }
                return { id: t.id, source: t.source, target: t.cible, type: 'smoothstep', ...s, ...ETIQUETTE, focusable: false };
            }),
        [disposition, positions],
    );

    // Centrer sur la carte choisie (une fois par choix).
    const dernierCentre = useRef<Id | null>(null);
    useEffect(() => {
        if (!choisi || dernierCentre.current === choisi) return;
        const n = disposition.noeuds.find((x) => x.id === idNoeud(choisi));
        if (!n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) return;
        dernierCentre.current = choisi;
        const zoom = Math.max(getZoom(), 0.9);
        if (Number.isFinite(zoom)) setCenter(n.x + CARTE.largeur / 2, n.y + CARTE.hauteur / 2, { zoom, duration: 500 });
    }, [choisi, disposition, setCenter, getZoom]);
    useEffect(() => {
        if (!choisi) dernierCentre.current = null;
    }, [choisi]);

    const clic = useCallback((_: unknown, n: Node) => {
        if (n.type === 'individu') onChoisir((n.data as DonneesCarte).individu.id);
    }, [onChoisir]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={TYPES_NOEUDS}
            onNodeClick={clic}
            onPaneClick={() => onChoisir(null)}
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable
            onlyRenderVisibleElements
            fitView
            // sur téléphone, l'arbre entier serait illisible : on part d'un zoom où les noms se lisent
            fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: petitEcran ? 0.55 : 0.05 }}
            minZoom={0.05}
            maxZoom={1.8}
            panOnScroll={false}
            zoomOnPinch
            proOptions={{ hideAttribution: true }}
        >
            <Background color="#3a3029" gap={24} size={1.2} />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'individu' ? '#d9a95b' : 'transparent')} nodeStrokeWidth={0}
                style={{ background: '#241d18', border: '1px solid #463a30', borderRadius: 12 }} maskColor="rgba(27, 22, 18, 0.65)" />
        </ReactFlow>
    );
}

export function VueArbre(p: Proprietes) {
    return (
        <ReactFlowProvider>
            <Interieur {...p} />
        </ReactFlowProvider>
    );
}

// ---- FIN L'ARBRE À L'ÉCRAN ----
