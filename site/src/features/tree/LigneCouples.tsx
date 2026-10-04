import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import { libelleUnion, type Individu, type UnionComplete } from './graphe';
import { LIBELLE_PASSAGE, useRelationsPassage } from './relationPassage';
export const LigneCouples = ({ personne }: {
    personne: Individu;
}) => {
    const tree = useTreeStore();
    const passages = useRelationsPassage((s) => s.ids);
    const tous = (tree.unions as UnionComplete[]).filter((u) => u.partenaire1Id === personne.id || u.partenaire2Id === personne.id);
    const sesCouples = tous.filter((u) => !passages.has(u.id));
    const nbPassage = tous.length - sesCouples.length;
    let valeur = '—';
    if (sesCouples.length === 1) {
        const u = sesCouples[0];
        const c = tree.people.find((x) => x.id === (u.partenaire1Id === personne.id ? u.partenaire2Id : u.partenaire1Id));
        valeur = [c ? `${c.prenom} ${nomLisible(c.nom)}` : null, libelleUnion(u)].filter(Boolean).join(' · ');
    }
    else if (sesCouples.length > 1)
        valeur = `${sesCouples.length} couples (détail plus bas)`;
    if (nbPassage > 0)
        valeur = sesCouples.length === 0 ? `${nbPassage > 1 ? `${nbPassage} relations` : 'Relation'} ${LIBELLE_PASSAGE.toLowerCase()}` : `${valeur} · + ${nbPassage} ${LIBELLE_PASSAGE.toLowerCase()}`;
    return (<div className="flex justify-between gap-3" data-ligne="couples">
            <span className="flex-none">{sesCouples.length > 1 ? 'Couples' : 'Couple'}</span>
            <span className="text-encre text-right truncate" title={valeur}>{valeur}</span>
        </div>);
};
