import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
export const personneChoisie = (uid: string | undefined): number | null => {
    const m = /^P(\d+)-/.exec(uid ?? '');
    return m ? Number(m[1]) : null;
};
export const NoteCiblee = ({ note, envoi, onAjouter }: {
    note: {
        uid?: string;
    };
    envoi: boolean;
    onAjouter: (individuId: number) => void;
}) => {
    const people = useTreeStore((s) => s.people) as unknown as {
        id: number;
        prenom: string;
        nom: string;
        dateNaissance?: string | null;
        dateDeces?: string | null;
    }[];
    const id = personneChoisie(note.uid);
    if (id === null)
        return null;
    const p = people.find((x) => x.id === id);
    if (!p) {
        return (<div className="text-[12.5px] rounded-[10px] border px-3 py-2" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} data-noeud="note-ciblee">
                Choisie sur le téléphone, mais cette personne n'est plus dans l'arbre (fiche supprimée ou fusionnée) : créez-la ou rattachez la note à la bonne personne ci-dessous.
            </div>);
    }
    const an = (d?: string | null) => (d ? String(d).slice(0, 4) : '');
    const periode = p.dateNaissance || p.dateDeces ? ` (${an(p.dateNaissance) || '?'}–${an(p.dateDeces)})` : '';
    return (<div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-sepia px-3 py-2 bg-sepia-tint" data-noeud="note-ciblee">
            <span className="text-[13px] text-encre">
                Choisie sur le téléphone : <b>{p.prenom} {nomLisible(p.nom)}</b>
                <span className="text-encre-3">{periode}</span>
            </span>
            <button type="button" disabled={envoi} onClick={() => onAjouter(p.id)} className="ml-auto h-8 px-3 rounded-[9px] border border-sepia text-sepia-deep text-[12.5px] font-medium hover:bg-blanc disabled:opacity-40" data-action="ajouter-a-sa-fiche">
                Ajouter à sa fiche
            </button>
            <span className="w-full text-[11.5px] text-encre-3">Elle est déjà dans l'arbre : ne la recréez pas (« Créer la personne » ferait un doublon).</span>
        </div>);
};
