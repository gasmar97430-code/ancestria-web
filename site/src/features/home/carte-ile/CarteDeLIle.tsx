import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { useTreeStore } from '../../../store/useTreeStore';
import type { Individu } from '../../tree/graphe';
import carte from './communes-reunion.json';
import { lieuxDuNom } from './communesIleDuNom';
type Vue = {
    x: number;
    y: number;
    z: number;
};
const ZMIN = 1, ZMAX = 8;
export function CarteDeLIle({ nom }: {
    nom: string;
}) {
    const people = useTreeStore((s) => s.people) as Individu[];
    const { lieux, horsCarte } = useMemo(() => { try {
        return lieuxDuNom(nom, people);
    }
    catch {
        return { lieux: [], horsCarte: [] };
    } }, [nom, people]);
    const [vue, setVue] = useState<Vue>({ x: 0, y: 0, z: 1 });
    const glisse = useRef<{
        px: number;
        py: number;
        vx: number;
        vy: number;
    } | null>(null);
    const svg = useRef<SVGSVGElement>(null);
    const [largeurPx, setLargeurPx] = useState(220);
    useEffect(() => {
        const e = svg.current;
        if (!e)
            return;
        const ro = new ResizeObserver(() => setLargeurPx(e.clientWidth || 220));
        ro.observe(e);
        return () => ro.disconnect();
    }, [lieux.length]);
    useEffect(() => setVue({ x: 0, y: 0, z: 1 }), [nom]);
    if (lieux.length === 0)
        return null;
    const W = carte.largeur, H = carte.hauteur;
    const dansNom = new Map(lieux.map((l) => [l.commune, l]));
    const max = Math.max(1, ...lieux.map((l) => l.personnes));
    const borner = (v: Vue): Vue => {
        const z = Math.min(ZMAX, Math.max(ZMIN, v.z));
        const w = W / z, h = H / z;
        return { z, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(H - h, Math.max(0, v.y)) };
    };
    const zoomer = (facteur: number, cx = vue.x + W / vue.z / 2, cy = vue.y + H / vue.z / 2) => {
        const z = Math.min(ZMAX, Math.max(ZMIN, vue.z * facteur));
        setVue(borner({ z, x: cx - (cx - vue.x) * (vue.z / z), y: cy - (cy - vue.y) * (vue.z / z) }));
    };
    const pointCarte = (e: {
        clientX: number;
        clientY: number;
    }) => {
        const r = svg.current!.getBoundingClientRect();
        return { x: vue.x + ((e.clientX - r.left) / r.width) * (W / vue.z), y: vue.y + ((e.clientY - r.top) / r.height) * (H / vue.z) };
    };
    const molette = (e: WheelEvent<SVGSVGElement>) => { const p = pointCarte(e); zoomer(e.deltaY < 0 ? 1.4 : 1 / 1.4, p.x, p.y); };
    const appui = (e: PointerEvent<SVGSVGElement>) => { glisse.current = { px: e.clientX, py: e.clientY, vx: vue.x, vy: vue.y }; e.currentTarget.setPointerCapture(e.pointerId); };
    const bouge = (e: PointerEvent<SVGSVGElement>) => {
        const g = glisse.current;
        if (!g)
            return;
        const r = svg.current!.getBoundingClientRect();
        setVue(borner({ z: vue.z, x: g.vx - ((e.clientX - g.px) / r.width) * (W / vue.z), y: g.vy - ((e.clientY - g.py) / r.height) * (H / vue.z) }));
    };
    const parPx = W / vue.z / largeurPx;
    const taille = 11 * parPx;
    const tousLesNoms = vue.z >= 2;
    return (<section className="flex flex-col gap-2" data-bloc="carte-ile">
            <div className="flex items-center justify-between">
                <h4 className="text-[10.5px] tracking-[.12em] uppercase text-sepia m-0">Sur l'île</h4>
                <div className="flex gap-1">
                    <button type="button" onClick={() => zoomer(1.6)} className="w-7 h-7 rounded-md border border-trait bg-blanc text-encre leading-none" aria-label="Zoomer" data-bouton="zoom-plus">+</button>
                    <button type="button" onClick={() => zoomer(1 / 1.6)} className="w-7 h-7 rounded-md border border-trait bg-blanc text-encre leading-none" aria-label="Dézoomer" data-bouton="zoom-moins">−</button>
                </div>
            </div>
            <svg ref={svg} viewBox={`${vue.x} ${vue.y} ${W / vue.z} ${H / vue.z}`} className="w-full rounded-[10px] border border-trait bg-[#eaf3f8] touch-none select-none cursor-grab" onWheel={molette} onPointerDown={appui} onPointerMove={bouge} onPointerUp={() => (glisse.current = null)} onPointerCancel={() => (glisse.current = null)} data-zoom={vue.z.toFixed(2)}>
                {carte.communes.map((c) => (<path key={c.code} d={c.d} fill={dansNom.has(c.nom) ? '#e9c79c' : '#fbf8f1'} stroke="#9a8a74" strokeWidth={0.8 * parPx} data-commune={c.nom} data-du-nom={dansNom.has(c.nom) || undefined}>
                        <title>{c.nom}</title>
                    </path>))}
                {carte.communes.filter((c) => dansNom.has(c.nom)).map((c) => {
            const l = dansNom.get(c.nom)!;
            return <circle key={c.code} cx={c.centre[0]} cy={c.centre[1]} r={(3 + 3 * (l.personnes / max)) * parPx} fill="#8a4b2a" stroke="#fff" strokeWidth={1.2 * parPx}/>;
        })}
                {carte.communes.filter((c) => tousLesNoms || dansNom.has(c.nom)).map((c) => (<text key={c.code} x={c.centre[0]} y={c.centre[1] - 8 * parPx} textAnchor="middle" fontSize={taille} fontWeight={dansNom.has(c.nom) ? 700 : 400} fill="#2d2a26" stroke="#fffdf8" strokeWidth={3 * parPx} paintOrder="stroke" data-nom-ville={c.nom}>{c.nom}</text>))}
            </svg>
            <ul className="m-0 pl-0 list-none flex flex-col gap-0.5 text-[12.5px] text-encre-2" data-liste="communes-ile">
                {lieux.map((l) => (<li key={l.commune}><b className="text-encre">{l.lieu}</b>{l.personnes > 0 ? ` — ${l.personnes} personne${l.personnes > 1 ? 's' : ''} de votre arbre` : ' — votre relevé'}</li>))}
                {horsCarte.length > 0 && <li className="text-encre-3">Hors carte : {horsCarte.join(', ')}</li>}
            </ul>
            <p className="m-0 text-[10.5px] text-encre-3">Contours : IGN (geo.api.gouv.fr). Lieux : votre arbre et vos relevés.</p>
        </section>);
}
