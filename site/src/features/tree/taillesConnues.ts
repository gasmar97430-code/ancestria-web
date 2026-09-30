import { useMemo } from 'react';
import { useStoreApi, type Node } from 'reactflow';
import { CARTE, PASTILLE_UNION } from './graphe';
const TAILLES: Record<string, {
    width: number;
    height: number;
}> = {
    carte: CARTE,
    pastille: PASTILLE_UNION,
};
export function avecTaillesConnues(nodes: Node[], mesurees: Map<string, Node> = new Map()): Node[] {
    return nodes.map((n) => {
        if (n.width && n.height)
            return n;
        const fixe = n.type ? TAILLES[n.type] : undefined;
        if (fixe)
            return { ...n, width: fixe.width, height: fixe.height };
        const m = mesurees.get(n.id);
        return m && m.type === n.type && m.width && m.height ? { ...n, width: m.width, height: m.height } : n;
    });
}
export function useTaillesConnues(nodes: Node[]): Node[] {
    const store = useStoreApi();
    return useMemo(() => avecTaillesConnues(nodes, store.getState().nodeInternals), [nodes, store]);
}
