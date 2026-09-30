import { Edge, Node, MarkerType } from 'reactflow';
import { Id, Person, Relationship, Union, UnionChild } from '../types';
export const PERSON_SIZE = { width: 170, height: 80 };
export const UNION_SIZE = { width: 24, height: 24 };
export const personNodeId = (id: Id) => `p-${id}`;
export const unionNodeId = (id: Id) => `u-${id}`;
const pairKey = (a: Id, b: Id) => [a, b].sort((x, y) => x - y).join('|');
const UNION_LABELS: Record<string, string> = {
    Marriage: 'Mariage',
    Civil_Partnership: 'PACS',
    Informal: 'Union libre',
    Other: 'Autre',
};
export function buildGraph(people: Person[], unions: Union[], relationships: Relationship[], unionChildren: UnionChild[]): {
    nodes: Node[];
    edges: Edge[];
} {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    for (const p of people) {
        nodes.push({
            id: personNodeId(p.id),
            type: 'person',
            data: { prenom: p.prenom, nom: p.nom, genre: p.genre },
            position: { x: 0, y: 0 },
        });
    }
    for (const u of unions) {
        nodes.push({
            id: unionNodeId(u.id),
            type: 'union',
            data: {
                statut: u.statut,
                title: UNION_LABELS[u.typeUnion ?? ''] ?? 'Union',
            },
            position: { x: 0, y: 0 },
        });
    }
    const knownPeople = new Set(people.map((p) => p.id));
    for (const u of unions) {
        for (const [rang, partenaireId] of [u.partenaire1Id, u.partenaire2Id].entries()) {
            if (!knownPeople.has(partenaireId))
                continue;
            edges.push({
                id: `spouse-${u.id}-${rang}`,
                source: personNodeId(partenaireId),
                target: unionNodeId(u.id),
                type: 'smoothstep',
                style: {
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    ...(u.statut && u.statut !== 'Active' ? { strokeDasharray: '5,5' } : {}),
                },
            });
        }
    }
    const unionById = new Map(unions.map((u) => [u.id, u]));
    const unionByPair = new Map(unions.map((u) => [pairKey(u.partenaire1Id, u.partenaire2Id), u.id]));
    const parentsByChild = new Map<Id, Relationship[]>();
    for (const rel of relationships) {
        const list = parentsByChild.get(rel.enfantId);
        if (list)
            list.push(rel);
        else
            parentsByChild.set(rel.enfantId, [rel]);
    }
    const explicitUnionByChild = new Map(unionChildren.map((uc) => [uc.enfantId, uc.unionId]));
    const childIds = new Set([...parentsByChild.keys(), ...explicitUnionByChild.keys()]);
    const directEdge = (rel: Relationship): Edge => ({
        id: `rel-${rel.parentId}-${rel.enfantId}-${rel.typeLien}`,
        source: personNodeId(rel.parentId),
        target: personNodeId(rel.enfantId),
        label: rel.typeLien === 'Biological' ? undefined : rel.typeLien,
        data: { minlen: 2 },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: {
            stroke: '#94a3b8',
            strokeWidth: 2,
            ...(rel.typeLien === 'Step' ? { strokeDasharray: '4,4' } : {}),
        },
    });
    for (const childId of childIds) {
        if (!knownPeople.has(childId))
            continue;
        const rels = (parentsByChild.get(childId) ?? []).filter((r) => knownPeople.has(r.parentId));
        let unionId = explicitUnionByChild.get(childId);
        if (!unionId) {
            const candidates = new Set<Id>();
            for (let i = 0; i < rels.length; i += 1) {
                for (let j = i + 1; j < rels.length; j += 1) {
                    const trouvee = unionByPair.get(pairKey(rels[i].parentId, rels[j].parentId));
                    if (trouvee)
                        candidates.add(trouvee);
                }
            }
            if (candidates.size === 1) {
                unionId = [...candidates][0];
            }
        }
        const union = unionId ? unionById.get(unionId) : undefined;
        if (!union) {
            edges.push(...rels.map(directEdge));
            continue;
        }
        const couple = new Set([union.partenaire1Id, union.partenaire2Id]);
        const relsDuCouple = rels.filter((r) => couple.has(r.parentId));
        const lienCommun = relsDuCouple.length > 0 &&
            relsDuCouple.every((r) => r.typeLien === relsDuCouple[0].typeLien) &&
            relsDuCouple[0].typeLien !== 'Biological'
            ? relsDuCouple[0].typeLien
            : undefined;
        edges.push({
            id: `child-${union.id}-${childId}`,
            source: unionNodeId(union.id),
            target: personNodeId(childId),
            label: lienCommun,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            style: {
                stroke: '#94a3b8',
                strokeWidth: 2,
                ...(lienCommun === 'Step' ? { strokeDasharray: '4,4' } : {}),
            },
        });
        edges.push(...rels.filter((r) => !couple.has(r.parentId)).map(directEdge));
    }
    return { nodes, edges };
}
