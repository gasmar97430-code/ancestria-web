import { memo } from 'react';
import type { Edge } from 'reactflow';
import './lumiere-parents.css';
export function reglesLumiere(choisi: string | null, parents: string[], lumineux: {
    noeuds: Set<string>;
} | null, edges: Edge[]): string {
    if (choisi === null || lumineux === null)
        return '';
    const allumes = parents.filter((id) => lumineux.noeuds.has(id));
    if (allumes.length === 0)
        return '';
    const prefixes = new Set<string>();
    for (const e of edges) {
        if (e.target !== choisi)
            continue;
        const m = /^(child-[^-]+|child--\d+|rel-\d+)-/.exec(e.id);
        if (m && (e.id.startsWith('child-') || allumes.includes(e.source)))
            prefixes.add(`${m[1]}-`);
    }
    const cordons = edges.filter((e) => [...prefixes].some((p) => e.id.startsWith(p)) && e.type !== 'lumineux').map((e) => e.id);
    const cartes = allumes.map((id) => `.react-flow__node[data-id="${id}"] > div`).join(',\n');
    const traits = cordons.map((id) => `.react-flow__edge[data-testid="rf__edge-${id}"] .react-flow__edge-path`).join(',\n');
    return `${cartes} { animation: parent-contour-clignote 1.1s ease-in-out infinite; }\n` + (traits ? `${traits} { stroke: #fff3d6 !important; stroke-width: 4px !important; opacity: 1 !important; filter: drop-shadow(0 0 1.5px #83501f) drop-shadow(0 0 4px #ffc861) drop-shadow(0 0 10px #e9a94f) !important; }\n` : '');
}
export const LumiereDesParents = memo(({ choisi, parents, lumineux, edges }: {
    choisi: string | null;
    parents: string[];
    lumineux: {
        noeuds: Set<string>;
    } | null;
    edges: Edge[];
}) => {
    let css = '';
    try {
        css = reglesLumiere(choisi, parents, lumineux, edges);
    }
    catch {
        css = '';
    }
    return css ? <style>{css}</style> : null;
});
LumiereDesParents.displayName = 'LumiereDesParents';
