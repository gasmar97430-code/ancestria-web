import { memo } from 'react';
import { Handle, Position } from 'reactflow';
export const UnionNode = memo(({ data }: any) => {
    const dissous = data.statut && data.statut !== 'Active';
    return (<div className={`w-6 h-6 rounded-full border-2 bg-white shadow-sm ${dissous ? 'border-gray-300 border-dashed' : 'border-blue-400'}`} title={data.title}>
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-300"/>
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-300"/>
        </div>);
});
UnionNode.displayName = 'UnionNode';
