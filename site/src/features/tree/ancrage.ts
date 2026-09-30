import { useMemo, useRef } from 'react';
import type { Node } from 'reactflow';
import type { Id } from '../../types';
type Pos = {
    x: number;
    y: number;
};
export function decaler(nodes: Node[], dx: number, dy: number): Node[] {
    if (dx === 0 && dy === 0)
        return nodes;
    return nodes.map((n) => ({ ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }));
}
export function decalagePour(nodes: Node[], pivot: string, montres: Map<string, Pos>): Pos {
    const avant = montres.get(pivot);
    const apres = nodes.find((n) => n.id === pivot)?.position;
    if (!avant || !apres)
        return { x: 0, y: 0 };
    return { x: avant.x - apres.x, y: avant.y - apres.y };
}
export function useAncrage(nodes: Node[], choisi: Id | null): Node[] {
    const montres = useRef<Map<string, Pos>>(new Map());
    return useMemo(() => {
        let sortie = nodes;
        if (choisi !== null) {
            const d = decalagePour(nodes, `p-${choisi}`, montres.current);
            sortie = decaler(nodes, d.x, d.y);
        }
        montres.current = new Map(sortie.map((n) => [n.id, n.position]));
        return sortie;
    }, [nodes, choisi]);
}
