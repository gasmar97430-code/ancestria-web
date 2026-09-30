import { MarkerType, type Edge, type Node } from 'reactflow';
import type { Id, Person, Relationship, UnionChild } from '../../../types';
import { estVirtuel, type Couple } from './normaliser';
export const noeudPersonne = (id: Id) => `p-${id}`;
export const noeudFoyer = (id: Id) => `u-${id}`;
const LIBELLES_UNION: Record<string, string> = { Marriage: 'Mariage', Civil_Partnership: 'PACS', Informal: 'Union libre', Other: 'Autre' };
const GRIS = '#94a3b8';
export function tracerFoyers(people: Person[], couples: Couple[], relationships: Relationship[], rattachements: UnionChild[]): {
    nodes: Node[];
    edges: Edge[];
} {
    const gens = [...people].sort((a, b) => a.id - b.id);
    const presents = new Set(gens.map((p) => p.id));
    const foyers = [...couples].filter((c) => presents.has(c.partenaire1Id) && presents.has(c.partenaire2Id)).sort((a, b) => a.id - b.id);
    const foyerParId = new Map(foyers.map((c) => [c.id, c]));
    const nodes: Node[] = [
        ...gens.map((p) => ({ id: noeudPersonne(p.id), type: 'person', data: { prenom: p.prenom, nom: p.nom, genre: p.genre }, position: { x: 0, y: 0 } })),
        ...foyers.map((c) => ({ id: noeudFoyer(c.id), type: 'union', data: { statut: c.statut, title: LIBELLES_UNION[c.typeUnion ?? ''] ?? 'Union' }, position: { x: 0, y: 0 } })),
    ];
    const edges: Edge[] = [];
    for (const c of foyers) {
        const tirets = estVirtuel(c) ? '2,5' : c.statut && c.statut !== 'Active' ? '5,5' : undefined;
        [c.partenaire1Id, c.partenaire2Id].forEach((membre, rang) => {
            edges.push({
                id: `spouse-${c.id}-${rang}`,
                source: noeudPersonne(membre),
                target: noeudFoyer(c.id),
                type: 'smoothstep',
                style: { stroke: '#3b82f6', strokeWidth: 2, ...(tirets ? { strokeDasharray: tirets } : {}) },
            });
        });
    }
    const foyerDe = new Map<Id, Id>();
    for (const r of [...rattachements].sort((a, b) => a.enfantId - b.enfantId || a.unionId - b.unionId)) {
        if (!foyerDe.has(r.enfantId) && foyerParId.has(r.unionId) && presents.has(r.enfantId))
            foyerDe.set(r.enfantId, r.unionId);
    }
    const liensDe = new Map<Id, Relationship[]>();
    const vus = new Set<string>();
    for (const r of [...relationships].sort((a, b) => a.enfantId - b.enfantId || a.parentId - b.parentId || a.typeLien.localeCompare(b.typeLien))) {
        const cle = `${r.parentId}>${r.enfantId}>${r.typeLien}`;
        if (r.typeLien === 'Foyer' || vus.has(cle) || !presents.has(r.parentId) || !presents.has(r.enfantId) || r.parentId === r.enfantId)
            continue;
        vus.add(cle);
        (liensDe.get(r.enfantId) ?? liensDe.set(r.enfantId, []).get(r.enfantId)!).push(r);
    }
    const lienPropre = (r: Relationship): Edge => ({
        id: `rel-${r.parentId}-${r.enfantId}-${r.typeLien}`,
        source: noeudPersonne(r.parentId),
        target: noeudPersonne(r.enfantId),
        label: r.typeLien === 'Biological' ? undefined : r.typeLien,
        data: { minlen: 2 },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: GRIS },
        style: { stroke: GRIS, strokeWidth: 2, ...(r.typeLien === 'Step' ? { strokeDasharray: '4,4' } : {}) },
    });
    for (const enfant of [...new Set([...liensDe.keys(), ...foyerDe.keys()])].sort((a, b) => a - b)) {
        const liens = liensDe.get(enfant) ?? [];
        const foyer = foyerParId.get(foyerDe.get(enfant) ?? Number.NaN);
        if (!foyer) {
            edges.push(...liens.map(lienPropre));
            continue;
        }
        const duFoyer = liens.filter((r) => r.parentId === foyer.partenaire1Id || r.parentId === foyer.partenaire2Id);
        const commun = duFoyer.length > 0 && duFoyer.every((r) => r.typeLien === duFoyer[0].typeLien) && duFoyer[0].typeLien !== 'Biological' ? duFoyer[0].typeLien : undefined;
        edges.push({
            id: `child-${foyer.id}-${enfant}`,
            source: noeudFoyer(foyer.id),
            target: noeudPersonne(enfant),
            label: commun,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: GRIS },
            style: { stroke: GRIS, strokeWidth: 2, ...(commun === 'Step' ? { strokeDasharray: '4,4' } : {}) },
        });
        edges.push(...liens.filter((r) => r.parentId !== foyer.partenaire1Id && r.parentId !== foyer.partenaire2Id).map(lienPropre));
    }
    return { nodes, edges };
}
