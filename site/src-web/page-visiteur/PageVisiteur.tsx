// ---- PAGE DU VISITEUR ----
//
// Sa règle du 05/10/2026 (~23:40), mot pour mot : « il faut que sur la page du site on s'inscrive et on
// ajoute des noms et rien d'autre sauf de pouvoir cliquer sur les bannières et rien d'autre pour éviter que
// toutes les personnes fouillent dans les sources inutiles ».
// Donc, pour un visiteur INSCRIT (lien /c/<jeton>) : l'en-tête et ses bannières (cliquables), un champ
// « Nom de famille », et le formulaire déjà existant « Ajouter cette famille » (ajouter-famille/ : la
// proposition part vers lui, rien n'entre dans l'arbre sans son accord). Ni arbre, ni recherche, ni fiches,
// ni Traque, ni Sources, ni menu. L'administrateur connecté garde tout (Porte.tsx).
// Ligne d'appel : Porte.tsx. Supprimer ce fichier et sa ligne = le site d'avant.

import { useState } from 'react';
import { TitreCentre } from '../../src/app/TitreCentre';
import { ColonnePartenaires } from '../../src/lib/bannierePartenaires';
import { AjouterFamille } from '../ajouter-famille/AjouterFamille';
import { InviterAmis } from '../inviter-amis/InviterAmis'; // 05/10, sa demande : la bulle « invitez vos proches » après l'inscription

export function PageVisiteur() {
    const [nom, setNom] = useState('');
    return (
        <div className="min-h-screen bg-papier text-encre font-sans flex flex-col" data-page="visiteur">
            <TitreCentre />
            <div className="flex-1 flex">
                <main className="flex-1 min-w-0 flex justify-center p-5 sm:p-8">
                    <div className="w-full max-w-xl flex flex-col gap-5">
                        <h1 className="font-display text-[44px] sm:text-[56px] leading-none font-medium m-0">Ajouter des noms</h1>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm text-encre-2">Nom de famille</span>
                            <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} autoComplete="family-name" data-champ="nom-visiteur"
                                className="h-12 w-full px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[17px] outline-none focus:border-sepia" />
                        </label>
                        <div className="rounded-[14px] border border-trait bg-carte -mx-1 pt-4 empty:hidden" data-bloc="ajout-visiteur">
                            <AjouterFamille nom={nom.trim()} />
                        </div>
                    </div>
                </main>
                <ColonnePartenaires />
            </div>
            <InviterAmis />
        </div>
    );
}
// ---- FIN PAGE DU VISITEUR ----
