import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { elleLui } from '../../lib/accord';
const mots = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
interface PersonneMin {
    id: Id;
    prenom: string;
    nom: string;
}
export function memesNoms<P extends PersonneMin>(prenom: string, nom: string, people: P[]): P[] {
    const n = mots(nom).join(' ');
    const p = mots(prenom)[0];
    if (!n || !p)
        return [];
    return people.filter((x) => mots(x.nom).join(' ') === n && mots(x.prenom)[0] === p);
}
export const DoublonPossible = ({ prenom, nom, onChoisir, exclus }: {
    prenom: string;
    nom: string;
    onChoisir?: (id: Id) => void;
    exclus?: Set<Id>;
}) => {
    const tree = useTreeStore();
    const trouves = memesNoms(prenom, nom, tree.people);
    if (trouves.length === 0)
        return null;
    const nomDe = (id: Id) => {
        const p = tree.people.find((x) => x.id === id);
        return p ? `${p.prenom} ${nomLisible(p.nom)}` : '?';
    };
    const decrire = (id: Id) => {
        const p = tree.people.find((x) => x.id === id)! as {
            dateNaissance?: string | null;
            lieuNaissance?: string | null;
        };
        const parents = tree.relationships.filter((r) => r.enfantId === id).map((r) => nomDe(r.parentId));
        const conjoints = tree.unions
            .filter((u) => u.partenaire1Id === id || u.partenaire2Id === id)
            .map((u) => nomDe(u.partenaire1Id === id ? u.partenaire2Id : u.partenaire1Id));
        const enfants = tree.relationships.filter((r) => r.parentId === id).length;
        return [
            p.dateNaissance ? `née ou né en ${new Date(p.dateNaissance).getUTCFullYear()}` : null,
            p.lieuNaissance ? `à ${p.lieuNaissance}` : null,
            parents.length ? `enfant de ${parents.join(' et ')}` : null,
            conjoints.length ? `conjoint de ${conjoints.join(', ')}` : null,
            enfants ? `${enfants} enfant${enfants > 1 ? 's' : ''}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
    };
    return (<div className="rounded-[12px] border px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
            <div className="text-[13px] text-encre">
                {trouves.length > 1 ? `${trouves.length} personnes portent déjà ce nom dans l'arbre :` : "Cette personne existe peut-être déjà dans l'arbre :"}
            </div>
            {trouves.map((t) => (<div key={t.id} className="flex items-start gap-2 text-[12.5px]">
                    <div className="min-w-0">
                        <div className="text-encre font-medium">{t.prenom} {nomLisible(t.nom)}</div>
                        <div className="text-encre-3">{decrire(t.id) || 'aucune autre information'}</div>
                    </div>
                    {onChoisir && !exclus?.has(t.id) && (<button type="button" onClick={() => onChoisir(t.id)} className="ml-auto flex-none h-8 px-3 rounded-[9px] border border-sepia text-sepia-deep text-[12.5px] font-medium hover:bg-sepia-tint">
                            C'est {elleLui(t.genre)}
                        </button>)}
                    {exclus?.has(t.id) && <span className="ml-auto flex-none text-encre-3 text-[12px]">déjà lié ici</span>}
                </div>))}
            <div className="text-[11.5px] text-encre-3">
                Si c'est la même personne, ne la recréez pas{onChoisir ? ' : choisissez-la' : ''}. Un enfant mal placé se corrige par « ✎ Modifier » → « Changer de parents ».
            </div>
        </div>);
};
