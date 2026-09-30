import { useEffect, useMemo, useRef, useState } from 'react';
import type { Node } from 'reactflow';
import './glissement.css';
export const DUREE_GLISSEMENT_MS = 450;
type Pos = {
    x: number;
    y: number;
};
export function douce(k: number): number {
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}
export function entre(a: Pos, b: Pos, k: number): Pos {
    const e = douce(Math.min(1, Math.max(0, k)));
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
}
export function useGlissement(cibles: Node[], duree = DUREE_GLISSEMENT_MS): Node[] {
    const signature = useMemo(() => cibles.map((n) => `${n.id}:${Math.round(n.position.x)},${Math.round(n.position.y)}`).join('|'), [cibles]);
    const derniere = useRef<Map<string, Pos>>(new Map());
    const [image, setImage] = useState<{
        pos: Map<string, Pos>;
        nouveaux: Set<string>;
    } | null>(null);
    useEffect(() => {
        const arrivee = new Map(cibles.map((n) => [n.id, { ...n.position }]));
        const depart = derniere.current;
        const bouge = depart.size > 0 && cibles.some((n) => { const d = depart.get(n.id); return d && (Math.abs(d.x - n.position.x) > 0.5 || Math.abs(d.y - n.position.y) > 0.5); });
        if (!bouge || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            derniere.current = arrivee;
            setImage(null);
            return;
        }
        const nouveaux = new Set(cibles.filter((n) => !depart.has(n.id)).map((n) => n.id));
        const t0 = performance.now();
        let raf = 0;
        const pas = (t: number) => {
            const k = (t - t0) / duree;
            const pos = new Map<string, Pos>();
            for (const [id, b] of arrivee) {
                const a = depart.get(id);
                pos.set(id, a ? entre(a, b, k) : b);
            }
            derniere.current = pos;
            if (k < 1) {
                setImage({ pos, nouveaux });
                raf = requestAnimationFrame(pas);
            }
            else {
                derniere.current = arrivee;
                setImage(null);
            }
        };
        raf = requestAnimationFrame(pas);
        return () => cancelAnimationFrame(raf);
    }, [signature, duree]);
    if (!image)
        return cibles;
    return cibles.map((n) => ({
        ...n,
        position: image.pos.get(n.id) ?? n.position,
        className: image.nouveaux.has(n.id) ? `${n.className ?? ''} apparition`.trim() : n.className,
    }));
}
