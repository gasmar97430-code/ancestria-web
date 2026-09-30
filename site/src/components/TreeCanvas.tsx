import { useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { PersonNode } from './PersonNode';
import { UnionNode } from './UnionNode';
import { useTreeStore } from '../store/useTreeStore';
import { buildGraph, PERSON_SIZE, UNION_SIZE } from '../lib/buildGraph';
const nodeTypes = {
    person: PersonNode,
    union: UnionNode,
};
const sizeOf = (node: Node) => (node.type === 'union' ? UNION_SIZE : PERSON_SIZE);
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 70 });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { ...sizeOf(node) }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target, { minlen: edge.data?.minlen ?? 1 }));
    dagre.layout(dagreGraph);
    const layoutedNodes = nodes.map((node) => {
        const { x, y } = dagreGraph.node(node.id);
        const { width, height } = sizeOf(node);
        return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
    });
    return { nodes: layoutedNodes, edges };
};
export const TreeCanvas = () => {
    const { people, relationships, unions, unionChildren, fetchTree } = useTreeStore();
    useEffect(() => {
        fetchTree();
    }, [fetchTree]);
    const { nodes, edges } = useMemo(() => {
        const graph = buildGraph(people, unions, relationships, unionChildren);
        return getLayoutedElements(graph.nodes, graph.edges);
    }, [people, relationships, unions, unionChildren]);
    return (<div className="w-full h-full bg-gray-50">
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
                <Background color="#aaa" gap={20}/>
                <Controls />
            </ReactFlow>
        </div>);
};
