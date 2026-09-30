import { useEffect, useRef } from 'react';
import { Node, useReactFlow, useStore } from 'reactflow';
import { CARTE } from './graphe';
import { useCadrageArrivee } from './cadrageArrivee';
export const ZOOM_MIN_LISIBLE = 0.6;
export const ZOOM_MAX_FOCUS = 1.05;
export const CadrageFocus = ({ nodes, noyau, pivot, parents = [], }: {
    nodes: Node[];
    noyau: Set<string> | null;
    pivot: string | null;
    parents?: string[];
}) => {
    const { fitView, setCenter } = useReactFlow();
    const largeur = useStore((s) => s.width);
    const hauteur = useStore((s) => s.height);
    const premier = useRef(true);
    const cadrerArrivee = useCadrageArrivee();
    useEffect(() => {
        if (premier.current && noyau === null) {
            premier.current = false;
            return;
        }
        premier.current = false;
        const t = setTimeout(() => {
            if (!noyau || !pivot || largeur === 0) {
                if (!cadrerArrivee(nodes))
                    fitView({ duration: 650, padding: 0.15 });
                return;
            }
            const boites = nodes.filter((n) => noyau.has(n.id));
            const centre = nodes.find((n) => n.id === pivot);
            if (!centre || boites.length === 0)
                return;
            const x0 = Math.min(...boites.map((n) => n.position.x));
            const x1 = Math.max(...boites.map((n) => n.position.x + CARTE.width));
            const y0 = Math.min(...boites.map((n) => n.position.y));
            const y1 = Math.max(...boites.map((n) => n.position.y + CARTE.height));
            const zoom = Math.min(ZOOM_MAX_FOCUS, Math.max(ZOOM_MIN_LISIBLE, Math.min((largeur * 0.9) / (x1 - x0), (hauteur * 0.85) / (y1 - y0))));
            const cx = centre.position.x + CARTE.width / 2;
            const ps = nodes.filter((n) => parents.includes(n.id));
            let x = cx;
            if (ps.length > 0) {
                const px = ps.reduce((s, n) => s + n.position.x + CARTE.width / 2, 0) / ps.length;
                const demi = (largeur / zoom) / 2 - CARTE.width;
                x = Math.min(cx + demi, Math.max(cx - demi, (cx + px) / 2));
            }
            setCenter(x, (y0 + y1) / 2, { zoom, duration: 650 });
        }, 120);
        return () => clearTimeout(t);
    }, [noyau, pivot, largeur, hauteur, fitView, setCenter]);
    return null;
};
