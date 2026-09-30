import { memo } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import './lien-lumineux.css';
export interface DonneesLienLumineux {
    sens: 'monte' | 'descend';
}
export const LienLumineux = memo(({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<DonneesLienLumineux>) => {
    const [d] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    return (<g className="lien-lumineux">
                <path d={d} className="lien-lumineux__halo" fill="none"/>
                <path d={d} className="lien-lumineux__coeur" fill="none"/>
                <path d={d} pathLength={1000} className={`lien-lumineux__lueur ${data?.sens === 'monte' ? 'lien-lumineux__lueur--monte' : ''}`} fill="none"/>
            </g>);
});
LienLumineux.displayName = 'LienLumineux';
