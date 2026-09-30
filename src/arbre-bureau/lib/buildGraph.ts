import { Edge, Node, MarkerType } from 'reactflow';
import { Id, Person, Relationship, Union, UnionChild } from '../types';

export const PERSON_SIZE = { width: 170, height: 80 };
export const UNION_SIZE = { width: 24, height: 24 };

export const personNodeId = (id: Id) => `p-${id}`;
export const unionNodeId = (id: Id) => `u-${id}`;

/** Cle stable d'un couple, independante de l'ordre des partenaires. */
const pairKey = (a: Id, b: Id) => [a, b].sort((x, y) => x - y).join('|');

const UNION_LABELS: Record<string, string> = {
    Marriage: 'Mariage',
    Civil_Partnership: 'PACS',
    Informal: 'Union libre',
    Other: 'Autre',
};

/**
 * Construit le graphe affiche a partir des donnees brutes de l'API.
 *
 * Chaque union donne un noeud de jonction : les deux conjoints y sont
 * relies, et les enfants en descendent. Sans ce noeud intermediaire, dagre
 * traite le lien conjugal comme un lien hierarchique et place un conjoint
 * au-dessus de l'autre, au lieu de les mettre cote a cote.
 *
 * Le rattachement d'un enfant a une union est pris dans `enfants_unions`
 * quand il existe. Sinon, il est deduit : si une paire de ses parents forme
 * une union, et une seule, on l'accroche a cette union. C'est ce qui permet a
 * l'arbre d'etre correct sans imposer une saisie supplementaire. Sinon
 * (parent unique, ou plusieurs unions possibles donc rattachement ambigu), on
 * retombe sur des liens directs parent-enfant.
 */
export function buildGraph(
    people: Person[],
    unions: Union[],
    relationships: Relationship[],
    unionChildren: UnionChild[],
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (const p of people) {
        nodes.push({
            id: personNodeId(p.id),
            type: 'person',
            data: { prenom: p.prenom, nom: p.nom, genre: p.genre },
            position: { x: 0, y: 0 }, // recalcule par dagre
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

    // Un noeud personne peut manquer si l'API renvoie une relation vers un
    // individu absent de la liste : on ne cree jamais d'arete orpheline,
    // React Flow les rejette et dagre plante dessus.
    const knownPeople = new Set(people.map((p) => p.id));

    // 1. Conjoints -> noeud d'union
    for (const u of unions) {
        for (const [rang, partenaireId] of [u.partenaire1Id, u.partenaire2Id].entries()) {
            if (!knownPeople.has(partenaireId)) continue;
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

    // 2. Indexation
    const unionById = new Map(unions.map((u) => [u.id, u]));
    const unionByPair = new Map(unions.map((u) => [pairKey(u.partenaire1Id, u.partenaire2Id), u.id]));

    const parentsByChild = new Map<Id, Relationship[]>();
    for (const rel of relationships) {
        const list = parentsByChild.get(rel.enfantId);
        if (list) list.push(rel);
        else parentsByChild.set(rel.enfantId, [rel]);
    }

    const explicitUnionByChild = new Map(unionChildren.map((uc) => [uc.enfantId, uc.unionId]));

    const childIds = new Set([...parentsByChild.keys(), ...explicitUnionByChild.keys()]);

    const directEdge = (rel: Relationship): Edge => ({
        id: `rel-${rel.parentId}-${rel.enfantId}-${rel.typeLien}`,
        source: personNodeId(rel.parentId),
        target: personNodeId(rel.enfantId),
        // Le lien biologique est le cas courant : l'etiqueter partout ne fait
        // qu'encombrer. On ne nomme que ce qui sort de l'ordinaire.
        label: rel.typeLien === 'Biological' ? undefined : rel.typeLien,
        // Ce lien saute le noeud d'union : il doit couvrir deux rangs pour
        // que l'enfant reste aligne avec les enfants passant par une union.
        data: { minlen: 2 },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: {
            stroke: '#94a3b8',
            strokeWidth: 2,
            ...(rel.typeLien === 'Step' ? { strokeDasharray: '4,4' } : {}),
        },
    });

    // 3. Enfants
    for (const childId of childIds) {
        if (!knownPeople.has(childId)) continue;

        const rels = (parentsByChild.get(childId) ?? []).filter((r) => knownPeople.has(r.parentId));

        let unionId = explicitUnionByChild.get(childId);

        if (!unionId) {
            // On cherche une union parmi toutes les paires de parents, et non
            // seulement quand l'enfant en a exactement deux : un parent
            // supplementaire (adoption en plus du couple) ne doit pas faire
            // perdre le regroupement sous l'union des deux autres.
            const candidates = new Set<Id>();
            for (let i = 0; i < rels.length; i += 1) {
                for (let j = i + 1; j < rels.length; j += 1) {
                    const trouvee = unionByPair.get(pairKey(rels[i].parentId, rels[j].parentId));
                    if (trouvee) candidates.add(trouvee);
                }
            }
            // Plusieurs unions possibles : le rattachement est ambigu, on ne
            // devine pas. C'est a `enfants_unions` de trancher.
            if (candidates.size === 1) {
                unionId = [...candidates][0];
            }
        }

        const union = unionId ? unionById.get(unionId) : undefined;

        if (!union) {
            edges.push(...rels.map(directEdge));
            continue;
        }

        // Passer par le noeud d'union ferait perdre la nature du lien : si
        // les deux parents ont le meme type de lien et qu'il n'est pas
        // biologique (fratrie adoptee, par exemple), on le garde en etiquette.
        const couple = new Set([union.partenaire1Id, union.partenaire2Id]);
        const relsDuCouple = rels.filter((r) => couple.has(r.parentId));
        const lienCommun =
            relsDuCouple.length > 0 &&
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

        // Un parent supplementaire hors du couple (adoption, reconnaissance)
        // garde son lien direct : il ne descend pas de cette union.
        edges.push(...rels.filter((r) => !couple.has(r.parentId)).map(directEdge));
    }

    return { nodes, edges };
}
