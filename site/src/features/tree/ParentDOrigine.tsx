import { useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import { champ } from './ChoixPersonne';
import { messageErreur } from './edition';
type Origine = 'mere' | 'pere' | 'adoption' | 'autre';
export function ParentDOrigine({ enfantsIds, nomTape, onFait }: {
    enfantsIds: Id[];
    nomTape: string;
    onFait: (phrase: string) => void;
}) {
    const tree = useTreeStore();
    const nom = nomTape.trim();
    const premier = enfantsIds[0];
    const bio = tree.relationships.filter((r) => r.enfantId === premier && (r.typeLien ?? 'Biological') === 'Biological').map((r) => r.parentId);
    const gens = (id: Id) => tree.people.find((p) => p.id === id);
    const dit = (id: Id) => { const p = gens(id); return p ? `${p.prenom} ${nomLisible(p.nom)}` : `n° ${id}`; };
    const mere = bio.find((id) => gens(id)?.genre === 'F');
    const [garde, setGarde] = useState<Id | null>(mere ?? bio[0] ?? null);
    const [prenom, setPrenom] = useState('');
    const [origine, setOrigine] = useState<Origine | null>(null);
    const [garderEcarte, setGarderEcarte] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    if (nom.length < 2 || bio.length === 0)
        return null;
    const ecarte = bio.filter((id) => id !== garde);
    const enfants = enfantsIds.map(dit).join(', ');
    const genreNouveau = gens(garde ?? -1)?.genre === 'F' ? 'père' : 'mère';
    const creer = async () => {
        if (garde === null)
            return;
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post('/parent-d-origine', { enfantIds: enfantsIds, parentGardeId: garde, nom, prenom: prenom.trim() || undefined, origineDuNom: origine ?? undefined, garderParentEcarte: garderEcarte });
            await tree.fetchTree();
            onFait(`${prenom.trim() ? prenom.trim() + ' ' : ''}${nom.toUpperCase()} ajouté comme ${genreNouveau} d'origine de ${enfants}, avec ${dit(garde)} (« De passage »).`);
        }
        catch (e) {
            setErreur(messageErreur(e));
        }
        finally {
            setEnvoi(false);
        }
    };
    const puce = (actif: boolean) => `h-8 px-3 rounded-[9px] border text-[12.5px] ${actif ? 'border-sepia bg-sepia-tint text-encre' : 'border-trait text-encre-2 hover:bg-sepia-tint'}`;
    return (<div className="rounded-[10px] border border-sepia px-3 py-2.5 flex flex-col gap-2" data-bloc="parent-d-origine">
            <div className="text-[13px] text-encre">« {nom.toUpperCase()} » n'est pas encore dans l'arbre. L'ajouter comme parent d'origine de {enfants} ?</div>
            {bio.length > 1 && (<div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-encre-2">
                    On garde :
                    {bio.map((id) => <button key={id} type="button" className={puce(garde === id)} onClick={() => setGarde(id)}>{dit(id)}</button>)}
                </div>)}
            <input className={champ} placeholder={`Prénom du ${genreNouveau} (s'il est connu)`} value={prenom} onChange={(e) => setPrenom(e.target.value)}/>
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-encre-2" data-choix="origine-du-nom">
                Son nom ({nomLisible(gens(premier)?.nom ?? '')}) lui vient :
                {([['mere', 'de sa mère'], ['pere', 'de son père'], ['adoption', "d'une adoption"], ['autre', 'je ne sais pas']] as [
            Origine,
            string
        ][]).map(([k, t]) => (<button key={k} type="button" className={puce(origine === k)} onClick={() => setOrigine(k)}>{t}</button>))}
            </div>
            {ecarte.length > 0 && (<label className="flex items-center gap-2 text-[12.5px] text-encre-2">
                    <input type="checkbox" checked={garderEcarte} onChange={(e) => setGarderEcarte(e.target.checked)}/>
                    {ecarte.map(dit).join(', ')} l'a élevé : le garder comme parent légal / social (sinon il n'est plus son parent)
                </label>)}
            <div className="flex gap-2">
                <button type="button" disabled={envoi || garde === null} onClick={() => void creer()} className="h-9 px-3 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium disabled:opacity-50" data-bouton="creer-parent-origine">
                    Ajouter {nom.toUpperCase()} comme {genreNouveau} d'origine
                </button>
            </div>
            <div className="text-[11.5px] text-encre-3">Le nom de l'enfant ne change pas. Une copie de sécurité de la base est faite juste avant.</div>
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
}
