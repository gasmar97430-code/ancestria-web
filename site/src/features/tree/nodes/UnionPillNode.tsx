import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Infinity as Infini } from '@phosphor-icons/react';
import { DonneesUnion, PASTILLE_UNION } from '../graphe';
const poignee = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0 };
export const UnionPillNode = memo(({ data }: {
    data: DonneesUnion;
}) => (<div className="rounded-full bg-carte border border-trait flex items-center justify-center gap-1.5 text-[11.5px] whitespace-nowrap text-encre-2 transition-opacity duration-300" style={{ width: PASTILLE_UNION.width, height: PASTILLE_UNION.height, opacity: data.estompe ? 0.3 : 1 }}>
        <Handle type="target" position={Position.Top} style={poignee}/>
        <Infini className="text-sepia" size={13}/>
        {data.libelle}
        <Handle type="source" position={Position.Bottom} style={poignee}/>
    </div>));
UnionPillNode.displayName = 'UnionPillNode';
