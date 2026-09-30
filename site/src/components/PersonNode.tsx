import { memo } from 'react';
import { Handle, Position } from 'reactflow';
export const PersonNode = memo(({ data }: any) => {
    const isMale = data.genre === 'M';
    const isFemale = data.genre === 'F';
    return (<div className={`px-4 py-2 shadow-lg rounded-lg border-2 bg-white min-w-[150px] transition-all hover:scale-105 ${isMale ? 'border-blue-400' : isFemale ? 'border-pink-400' : 'border-gray-300'}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400"/>
            
            <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Individu</span>
                <span className="text-sm font-semibold text-gray-800">{data.prenom} {data.nom}</span>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400"/>
        </div>);
});
