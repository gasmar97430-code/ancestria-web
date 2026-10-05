import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { accorde, elleLui } from '../../lib/accord';
const mots = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
interface PersonneMin {
    id: Id;
    prenom: string;
    nom: string;
}
const cleNom = (s: string | null | undefined) => mots(s).join(' ') || ((s ?? '').trim() ? '?' : '');
export function memesNoms<P extends PersonneMin>(prenom: string, nom: string, people: P[]): P[] {
    const n = cleNom(nom);
    const p = mots(prenom)[0];
    if (!n || !p)
        return [];
    return people.filter((x) => cleNom(x.nom) === n && mots(x.prenom)[0] === p);
}
export const DoublonPossible = ({ prenom, nom, onChoisir, exclus, sauf, conseil }: {
    prenom: string;
    nom: string;
    onChoisir?: (id: Id) => void;
    exclus?: Set<Id>;
    sauf?: Id;
    conseil?: string;
}) => {
    const tree = useTreeStore();
    const trouves = memesNoms(prenom, nom, tree.people).filter((t) => t.id !== sauf);
    if (trouves.length === 0)
        return null;
    const nomDe = (id: Id) => {
        const p = tree.people.find((x) => x.id === id);
        return p ? `${p.prenom} ${nomLisible(p.nom)}` : '?';
    };
    const decrire = (id: Id) => {
        const p = tree.people.find((x) => x.id === id)! as {
            genre?: string | null;
            dateNaissance?: string | null;
            lieuNaissance?: string | null;
        };
        const parents = tree.relationships.filter((r) => r.enfantId === id).map((r) => nomDe(r.parentId));
        const conjoints = tree.unions
            .filter((u) => u.partenaire1Id === id || u.partenaire2Id === id)
            .map((u) => nomDe(u.partenaire1Id === id ? u.partenaire2Id : u.partenaire1Id));
        const enfants = tree.relationships.filter((r) => r.parentId === id).length;
        const g = p.genre;
        const naissance = [p.dateNaissance ? `en ${new Date(p.dateNaissance).getUTCFullYear()}` : null, p.lieuNaissance ? `à ${p.lieuNaissance}` : null].filter(Boolean).join(' ');
        const liens = [
            parents.length ? `${accorde(g, 'fils', 'fille', 'enfant')} de ${parents.join(' et ')}` : null,
            conjoints.length ? `${accorde(g, 'conjoint', 'conjointe', 'conjoint(e)')} de ${conjoints.join(', ')}` : null,
        ].filter(Boolean).join(', puis ');
        return [
            liens || null,
            enfants ? `${enfants} enfant${enfants > 1 ? 's' : ''}` : null,
            naissance ? `${accorde(g, 'né', 'née', 'né(e)')} ${naissance}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
    };
    return (<div className="rounded-[12px] border px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
            <div className="text-[13px] text-encre">
                <span style={{ color: 'var(--o-afrique)' }}>⚠ </span>{trouves.length > 1 ? `Déjà ${trouves.length} fois dans l'arbre :` : "Déjà dans l'arbre :"}
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
                {conseil ?? (onChoisir ? 'Si c’est la même personne, touchez « C’est elle / C’est lui » : elle ne sera pas créée deux fois.' : 'Si c’est la même personne, ne la créez pas une deuxième fois.')}
            </div>
        </div>);
};
