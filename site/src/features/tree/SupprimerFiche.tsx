import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import { messageErreur } from './edition';
const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const SupprimerFiche = ({ personne }: {
    personne: {
        id: number;
        prenom: string;
        nom: string;
    };
}) => {
    const tree = useTreeStore();
    const [ouvert, setOuvert] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const parents = tree.relationships.filter((r) => r.enfantId === personne.id).length;
    const enfants = tree.relationships.filter((r) => r.parentId === personne.id).length;
    const couples = tree.unions.filter((u) => u.partenaire1Id === personne.id || u.partenaire2Id === personne.id).length;
    const jumelles = tree.people.filter((p) => p.id !== personne.id && plat(p.prenom) === plat(personne.prenom) && plat(p.nom) === plat(personne.nom));
    const supprimer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.delete(`/people/${personne.id}`);
            setOuvert(false);
            await tree.fetchTree();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const qui = `${personne.prenom} ${nomLisible(personne.nom)}`;
    return (<>
            <button onClick={() => setOuvert(true)} data-action="supprimer-fiche" className="h-9 flex items-center justify-center gap-1.5 rounded-[10px] border border-trait text-encre-2 text-[12.5px] hover:bg-sepia-tint" title="Supprimer cette fiche de l'arbre">
                <Trash size={14}/> Supprimer
            </button>
            {ouvert && (<div className="rounded-[12px] border px-3 py-2.5 flex flex-col gap-2 text-[12.5px]" style={{ borderColor: 'var(--o-afrique)' }} data-noeud="supprimer-fiche">
                    <div className="text-encre">
                        Supprimer <b>{qui}</b> (n° {personne.id}) ? Partent avec la fiche : {parents} lien{parents > 1 ? 's' : ''} vers ses parents, {enfants} lien{enfants > 1 ? 's' : ''} vers ses enfants, {couples} couple{couples > 1 ? 's' : ''}. Les autres personnes restent dans l'arbre.
                    </div>
                    {jumelles.length > 0 && (enfants > 0 || couples > 0) && (<div className="text-encre-2">
                            ⚠ Une autre fiche porte le même nom (n° {jumelles.map((j) => j.id).join(', ')}). Si c'est la même personne, mieux vaut <b>fusionner</b> (bouton « Incohérences » → « Comparer et fusionner… ») : ses liens et ses enfants seront gardés sur une seule fiche.
                        </div>)}
                    <div className="text-encre-3 text-[11px]">Copie de sécurité de la base faite juste avant.</div>
                    <div className="flex gap-2">
                        <button onClick={() => setOuvert(false)} className="h-8 px-3 rounded-[9px] border border-trait text-encre-2">Non</button>
                        <button disabled={envoi} onClick={() => void supprimer()} className="min-h-8 py-1 px-3 rounded-[9px] border disabled:opacity-40 text-left" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} data-action="confirmer-suppression">
                            Oui, supprimer {qui}
                        </button>
                    </div>
                    {erreur && <div style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
                </div>)}
        </>);
};
