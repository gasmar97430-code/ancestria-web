import { useCallback } from 'react';
import { getViewportForBounds, useReactFlow, useStoreApi, type Node } from 'reactflow';
import { CARTE } from './graphe';
import { avecTaillesConnues } from './taillesConnues';
type Boite = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export function boiteArrivee(nodes: Node[]): Boite | null {
    const vus = avecTaillesConnues(nodes).filter((n) => !n.hidden);
    if (vus.length === 0)
        return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of vus) {
        const w = n.width ?? (n.type === 'carte' ? CARTE.width : 0);
        const h = n.height ?? (n.type === 'carte' ? CARTE.height : 0);
        x0 = Math.min(x0, n.position.x);
        y0 = Math.min(y0, n.position.y);
        x1 = Math.max(x1, n.position.x + w);
        y1 = Math.max(y1, n.position.y + h);
    }
    const b = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    return [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0 ? b : null;
}
export function useCadrageArrivee(): (nodes: Node[]) => boolean {
    const { setViewport } = useReactFlow();
    const store = useStoreApi();
    return useCallback((nodes: Node[]) => {
        const { width, height, minZoom, maxZoom } = store.getState();
        const b = boiteArrivee(nodes);
        if (!b || width === 0 || height === 0)
            return false;
        const v = getViewportForBounds(b, width, height, minZoom, maxZoom, 0.15);
        if (![v.x, v.y, v.zoom].every(Number.isFinite))
            return false;
        setViewport(v, { duration: 650 });
        return true;
    }, [setViewport, store]);
}
