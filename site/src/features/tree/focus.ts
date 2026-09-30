import type { Edge, Node } from 'reactflow';
import type { Id, Person, Relationship, Union, UnionChild } from '../../types';
import { disposer, HAUTEUR_CARTE } from './disposition';
export interface Liens {
    parentsDe: Map<Id, Set<Id>>;
    enfantsDe: Map<Id, Set<Id>>;
    conjointsDe: Map<Id, Set<Id>>;
}
const ajoute = (m: Map<Id, Set<Id>>, cle: Id, val: Id) => {
    const s = m.get(cle);
    if (s)
        s.add(val);
    else
        m.set(cle, new Set([val]));
};
export function liensDeFamille(unions: Union[], relationships: Relationship[], unionChildren: UnionChild[]): Liens {
    const parentsDe = new Map<Id, Set<Id>>();
    const enfantsDe = new Map<Id, Set<Id>>();
    const conjointsDe = new Map<Id, Set<Id>>();
    const parent = (p: Id, e: Id) => {
        ajoute(parentsDe, e, p);
        ajoute(enfantsDe, p, e);
    };
    for (const r of relationships)
        parent(r.parentId, r.enfantId);
    const unionParId = new Map(unions.map((u) => [u.id, u]));
    for (const uc of unionChildren) {
        const u = unionParId.get(uc.unionId);
        if (!u)
            continue;
        parent(u.partenaire1Id, uc.enfantId);
        parent(u.partenaire2Id, uc.enfantId);
    }
    for (const u of unions) {
        ajoute(conjointsDe, u.partenaire1Id, u.partenaire2Id);
        ajoute(conjointsDe, u.partenaire2Id, u.partenaire1Id);
    }
    return { parentsDe, enfantsDe, conjointsDe };
}
const parcours = (depart: Id, suivants: Map<Id, Set<Id>>): Set<Id> => {
    const vus = new Set<Id>([depart]);
    const pile = [depart];
    while (pile.length > 0) {
        for (const x of suivants.get(pile.pop()!) ?? []) {
            if (!vus.has(x)) {
                vus.add(x);
                pile.push(x);
            }
        }
    }
    return vus;
};
export function cercleDe(pivot: Id, l: Liens): Set<Id> {
    const cercle = new Set<Id>();
    const ascendants = parcours(pivot, l.parentsDe);
    const descendants = parcours(pivot, l.enfantsDe);
    ascendants.forEach((id) => cercle.add(id));
    descendants.forEach((id) => cercle.add(id));
    for (const c of l.conjointsDe.get(pivot) ?? []) {
        cercle.add(c);
        (l.parentsDe.get(c) ?? new Set()).forEach((p) => cercle.add(p));
    }
    for (const p of l.parentsDe.get(pivot) ?? []) {
        (l.enfantsDe.get(p) ?? new Set()).forEach((f) => cercle.add(f));
    }
    for (const d of descendants) {
        if (d === pivot)
            continue;
        (l.conjointsDe.get(d) ?? new Set()).forEach((c) => cercle.add(c));
    }
    return cercle;
}
export function noeudsLignee(pivot: Id, l: Liens, unions: Union[]): Set<string> {
    const asc = parcours(pivot, l.parentsDe);
    const desc = parcours(pivot, l.enfantsDe);
    const ids = new Set<string>([...asc, ...desc].map((id) => `p-${id}`));
    for (const u of unions) {
        const a = u.partenaire1Id, b = u.partenaire2Id;
        if ((asc.has(a) && asc.has(b)) || desc.has(a) || desc.has(b))
            ids.add(`u-${u.id}`);
    }
    return ids;
}
const parcoursBorne = (depart: Id, suivants: Map<Id, Set<Id>>, max: number): Map<Id, number> => {
    const dist = new Map<Id, number>([[depart, 0]]);
    let front = [depart];
    for (let k = 1; k <= max && front.length > 0; k++) {
        const suivant: Id[] = [];
        for (const id of front)
            for (const x of suivants.get(id) ?? [])
                if (!dist.has(x)) {
                    dist.set(x, k);
                    suivant.push(x);
                }
        front = suivant;
    }
    return dist;
};
export const GENERATIONS_LUMINEUSES = { haut: 3, bas: 2 };
export function noeudsLumineux(pivot: Id, l: Liens, unions: Union[]): {
    noeuds: Set<string>;
    montee: Set<string>;
} {
    const haut = parcoursBorne(pivot, l.parentsDe, GENERATIONS_LUMINEUSES.haut);
    const bas = parcoursBorne(pivot, l.enfantsDe, GENERATIONS_LUMINEUSES.bas);
    const conjoints = new Set<Id>();
    for (const [id, k] of bas)
        if (k < GENERATIONS_LUMINEUSES.bas)
            (l.conjointsDe.get(id) ?? new Set<Id>()).forEach((c) => conjoints.add(c));
    const personnes = new Set<Id>([...haut.keys(), ...bas.keys(), ...conjoints]);
    const noeuds = new Set<string>([...personnes].map((id) => `p-${id}`));
    const montee = new Set<string>([...haut.keys()].map((id) => `p-${id}`));
    for (const u of unions) {
        const a = u.partenaire1Id, b = u.partenaire2Id;
        if (haut.has(a) && haut.has(b) && a !== pivot && b !== pivot) {
            noeuds.add(`u-${u.id}`);
            montee.add(`u-${u.id}`);
        }
        else if (((bas.get(a) ?? 9) < GENERATIONS_LUMINEUSES.bas || (bas.get(b) ?? 9) < GENERATIONS_LUMINEUSES.bas) && personnes.has(a) && personnes.has(b)) {
            noeuds.add(`u-${u.id}`);
        }
    }
    return { noeuds, montee };
}
export function noyauDe(pivot: Id, l: Liens, unions: Union[]): Set<string> {
    const ids = new Set<Id>([pivot]);
    for (const m of [l.parentsDe, l.conjointsDe, l.enfantsDe])
        (m.get(pivot) ?? new Set()).forEach((x) => ids.add(x));
    const noeuds = new Set<string>([...ids].map((id) => `p-${id}`));
    for (const u of unions)
        if (ids.has(u.partenaire1Id) && ids.has(u.partenaire2Id))
            noeuds.add(`u-${u.id}`);
    return noeuds;
}
export function noeudsNets(cercle: Set<Id>, unions: Union[]): Set<string> {
    const nets = new Set<string>([...cercle].map((id) => `p-${id}`));
    for (const u of unions) {
        if (cercle.has(u.partenaire1Id) && cercle.has(u.partenaire2Id))
            nets.add(`u-${u.id}`);
    }
    return nets;
}
export const ECART_RESTE = 260;
export function disposerFocus(nodes: Node[], nets: Set<string>, cercle: Set<Id>, people: Person[], unions: Union[], relationships: Relationship[]): Node[] {
    const dedans = nodes.filter((n) => nets.has(n.id));
    const places = disposer(dedans, people.filter((p) => cercle.has(p.id)), unions.filter((u) => cercle.has(u.partenaire1Id) && cercle.has(u.partenaire2Id)), relationships.filter((r) => cercle.has(r.parentId) && cercle.has(r.enfantId)));
    const parId = new Map(places.map((n) => [n.id, n]));
    const bas = Math.max(...places.map((n) => n.position.y)) + HAUTEUR_CARTE;
    const dehors = nodes.filter((n) => !nets.has(n.id));
    const haut = dehors.length ? Math.min(...dehors.map((n) => n.position.y)) : 0;
    const decalage = bas + ECART_RESTE - haut;
    return nodes.map((n) => parId.get(n.id) ?? { ...n, position: { x: n.position.x, y: n.position.y + decalage } });
}
const FLOU_CARTE = { filter: 'blur(3px)', opacity: 0.35 };
const TRANSITION = 'filter .45s ease, opacity .45s ease';
export function appliquerFocus(nodes: Node[], edges: Edge[], nets: Set<string> | null, lignee: Set<string> = new Set(), lumineux: {
    noeuds: Set<string>;
    montee: Set<string>;
} | null = null): {
    nodes: Node[];
    edges: Edge[];
} {
    if (nets === null)
        return { nodes, edges };
    const allume = (e: Edge) => lumineux !== null && lumineux.noeuds.has(e.source) && lumineux.noeuds.has(e.target);
    return {
        nodes: nodes.map((n) => ({
            ...n,
            style: { ...n.style, transition: TRANSITION, ...(nets.has(n.id) ? {} : FLOU_CARTE) },
        })),
        edges: edges.map((e) => allume(e)
            ? {
                ...e,
                type: 'lumineux',
                zIndex: 1,
                data: { sens: lumineux!.montee.has(e.source) && lumineux!.montee.has(e.target) ? 'monte' : 'descend' },
            }
            : lignee.has(e.source) && lignee.has(e.target)
                ? { ...e, style: { ...e.style, opacity: 1, strokeWidth: 2.4, stroke: 'var(--sepia)' } }
                : nets.has(e.source) && nets.has(e.target)
                    ? { ...e, style: { ...e.style, opacity: 0.9, strokeWidth: 1.6 } }
                    : { ...e, style: { ...e.style, opacity: 0.1, filter: 'blur(1.5px)' } }),
    };
}
