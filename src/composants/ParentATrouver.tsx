// ---- PARENT « À TROUVER » RETROUVÉ ----
// Sa demande du 28/09 : « si plus tard on a trouvé les noms d'un des
// parents, on pourra les corriger ». Deux cas :
//   · la personne n'est pas dans l'arbre → on complète la fiche « à trouver »
//     (nom, dates) : tous les enfants qui y sont reliés en profitent ;
//   · elle y est déjà → « C'est en fait… » : les liens passent sur elle
//     (fonction de la base, tout ou rien, boucles et dates contrôlées).

import { useMemo, useState } from 'react';
import { Alerte, Bouton, Champ } from '../ui/ui';
import { descendants } from '../domaine/coherence';
import { nomAffiche } from '../domaine/libelles';
import { annee } from '../domaine/dates';
import type { DonneesArbre, Individu } from '../domaine/types';
import { remplacerParentATrouver } from '../donnees/actions';

const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ParentATrouver({ individu, donnees, onCompleter, onRemplace }: { individu: Individu; donnees: DonneesArbre; onCompleter: () => void; onRemplace: (reel: string) => void }) {
    const [ouvert, setOuvert] = useState(false);
    const [recherche, setRecherche] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const enfants = donnees.filiations.filter((f) => f.parent_id === individu.id).map((f) => donnees.individus.find((i) => i.id === f.enfant_id)).filter((i): i is Individu => Boolean(i));
    const candidats = useMemo(() => {
        const interdits = descendants(donnees.filiations, individu.id);
        const q = plat(recherche.trim());
        return donnees.individus.filter((i) => !interdits.has(i.id) && q.length >= 2 && plat(nomAffiche(i)).includes(q)).slice(0, 20);
    }, [donnees, individu.id, recherche]);

    const remplacer = async (reel: Individu) => {
        if (!window.confirm(`${nomAffiche(reel)} devient le parent de ${enfants.map(nomAffiche).join(', ')} ; la fiche « à trouver » disparaît. Confirmer ?`)) return;
        setErreur(null);
        setEnvoi(true);
        try {
            await remplacerParentATrouver(individu.id, reel.id);
            onRemplace(reel.id);
        } catch (e) {
            setErreur(`${e instanceof Error ? e.message : String(e)} — rien n’a été changé.`);
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <section className="mt-4 rounded-2xl border border-dashed border-sepia/60 p-3 flex flex-col gap-3">
            <p className="text-sm text-encre-2">
                Parent encore inconnu de <b className="text-encre">{enfants.map(nomAffiche).join(', ') || 'personne'}</b>. Vous avez trouvé son nom ?
            </p>
            <div className="flex flex-wrap gap-2">
                <Bouton variante="principal" onClick={onCompleter}>Compléter sa fiche</Bouton>
                <Bouton variante="secondaire" onClick={() => setOuvert(!ouvert)}>C’est une personne déjà dans l’arbre…</Bouton>
            </div>
            {ouvert && (
                <div className="flex flex-col gap-2">
                    <Champ libelle="Chercher la personne" valeur={recherche} onChange={setRecherche} placeholder="prénom ou nom" autoComplete="off" autoFocus />
                    {candidats.map((i) => (
                        <button key={i.id} type="button" disabled={envoi} onClick={() => void remplacer(i)} className="text-left rounded-xl border border-trait px-3 min-h-11 hover:border-sepia">
                            {nomAffiche(i)} <span className="text-xs text-encre-3">{annee(i.naissance) ?? ''}</span>
                        </button>
                    ))}
                </div>
            )}
            {erreur && <Alerte>{erreur}</Alerte>}
        </section>
    );
}

// ---- FIN PARENT « À TROUVER » RETROUVÉ ----
