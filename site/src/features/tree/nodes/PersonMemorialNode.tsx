import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText } from '@phosphor-icons/react';
import { nomLisible, teinteDe } from '../../../lib/origins';
import { TitreQuiTient } from '../../../lib/TitreQuiTient';
import { CARTE, DonneesCarte, periode } from '../graphe';
import { MarqueStatut } from '../StatutVie';
import { OrigineCarte } from '../Origines';
import { PhotoCarte } from '../Photos';
import { DatesOuRang } from '../OrdreNaissance';
const poignee = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0 };
export const PersonMemorialNode = memo(({ data }: {
    data: DonneesCarte;
}) => {
    const { individu: i, origine, choisi, estompe, sources } = data;
    const t = teinteDe(origine);
    const initiales = `${i.prenom.charAt(0)}${i.nom.charAt(0)}`.toUpperCase();
    const lieu = i.lieuNaissance ?? i.lieuDeces;
    return (<div className="relative flex items-center gap-[11px] px-3 bg-blanc rounded-[13px] cursor-pointer overflow-hidden border transition-[opacity,transform,box-shadow] duration-300 ease-plume hover:-translate-y-0.5" style={{
            width: CARTE.width,
            height: CARTE.height,
            borderColor: choisi ? 'var(--sepia)' : 'var(--trait-carte)',
            boxShadow: choisi ? 'var(--ombre-carte-choisie)' : 'var(--ombre-carte)',
            opacity: estompe ? 0.2 : 1,
        }}>
            <Handle type="target" position={Position.Top} style={poignee}/>
            
            <MarqueStatut individu={i}/>
            <OrigineCarte origine={origine}/>
            <div className="w-11 h-11 flex-none rounded-full grid place-items-center font-display text-lg text-encre border" style={{ background: t.t, borderColor: t.c }}>
                {initiales}
            </div>
            <PhotoCarte id={i.id} origine={origine}/>
            <div className="min-w-0 flex flex-col gap-0.5">
                
                <div className="font-display leading-none text-encre-2 truncate" style={{ fontSize: i.prenom.length > 22 ? 10.5 : i.prenom.length > 15 ? 12 : 14 }} title={i.prenom}>
                    {i.prenom}
                </div>
                
                
                <TitreQuiTient texte={nomLisible(i.nom)} taille={i.nom.length > 12 ? 14 : i.nom.length > 9 ? 16 : 18} mini={10} entier className="font-display leading-[1.05] font-semibold truncate" title={nomLisible(i.nom)}/>
                <div className="font-mono text-[10px] text-encre-2 truncate">{periode(i) ?? <DatesOuRang id={i.id} genre={i.genre}/>}</div>
                <div className="text-[10.5px] text-encre-3 flex gap-1.5 whitespace-nowrap">
                    {lieu && <span className="truncate max-w-[80px]">{lieu}</span>}
                    <span className="flex items-center gap-0.5" title="Pistes rattachées">
                        <FileText />
                        {sources}
                    </span>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} style={poignee}/>
        </div>);
});
PersonMemorialNode.displayName = 'PersonMemorialNode';
