import { useEffect, useMemo, useRef } from 'react';
import { useStoreApi, type Node } from 'reactflow';
import { zoomIdentity } from 'd3-zoom';
export function positionsFinies(nodes: Node[]): boolean {
    return nodes.every((n) => Number.isFinite(n.position?.x) && Number.isFinite(n.position?.y));
}
export function garderSiValide(nodes: Node[], precedente: Node[]): Node[] {
    return positionsFinies(nodes) ? nodes : precedente;
}
export function usePositionsValides(nodes: Node[]): Node[] {
    const derniere = useRef<Node[]>([]);
    return useMemo(() => {
        const sortie = garderSiValide(nodes, derniere.current);
        derniere.current = sortie;
        return sortie;
    }, [nodes]);
}
export function cameraValide(t: readonly number[]): boolean {
    return t.length === 3 && t.every(Number.isFinite) && t[2] > 0;
}
export const GardeCamera = () => {
    const store = useStoreApi();
    useEffect(() => {
        let bonne = store.getState().transform;
        let enCours = false;
        return store.subscribe((s) => {
            if (cameraValide(s.transform)) {
                bonne = s.transform;
                return;
            }
            if (enCours || !cameraValide(bonne) || !s.d3Zoom || !s.d3Selection)
                return;
            enCours = true;
            try {
                s.d3Selection.interrupt();
                s.d3Zoom.transform(s.d3Selection, zoomIdentity.translate(bonne[0], bonne[1]).scale(bonne[2]));
            }
            catch {
            }
            finally {
                enCours = false;
            }
        });
    }, [store]);
    return null;
};
