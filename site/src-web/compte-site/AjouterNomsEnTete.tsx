// ---- « AJOUTER DES NOMS » DANS L'EN-TÊTE, POUR UN INSCRIT (12/10/2026) ----
//
// Ses mots : « tout le monde le même principe : ils s'inscrivent, puis tapent le nom, et voilà » · « ajouter des noms
// c'est tout à fait normal, mais aussi de pouvoir faire des recherches » · « l'appli doit ressembler exactement à mon
// appli … page d'accueil et l'arborescence ». L'inscrit a donc l'appli (Accueil + Arbre, lecture seule, vivants
// protégés) ET, à la place de « S'inscrire · Se connecter » (inutile : il est inscrit), « Ajouter des noms » : la
// même fenêtre que l'ancienne page visiteur (nom de famille + « Ajouter cette famille »  ; depuis le 12/10, les noms
// entrent tout de suite dans l'arbre : sa règle « direct sans chichi »). Pas de bloc flottant : la place du lien existant.
// Ligne d'appel : compte-site/CompteSite.tsx.

import { useState } from 'react';
import { PlusCircle, X } from '@phosphor-icons/react';
import { AjouterFamille } from '../ajouter-famille/AjouterFamille';
import { MaSauvegarde } from '../hors-connexion/MaSauvegarde'; // 12/10 : ma sauvegarde (JSON)
import { Desinscription } from './Desinscription'; // 12/10 : se désinscrire (mot de passe)

export function AjouterNomsEnTete({ classe }: { classe: string }) {
    const [ouvert, setOuvert] = useState(false);
    const [nom, setNom] = useState('');
    const [partir, setPartir] = useState(false);
    return (
        <>
            <button type="button" className={classe} data-bouton="ajouter-noms" onClick={() => setOuvert(true)} title="Proposer des noms de votre famille">
                <PlusCircle size={16} />
                Ajouter des noms
            </button>
            {ouvert && (
                <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-3 sm:p-8" onClick={() => setOuvert(false)} data-fenetre="ajouter-noms">
                    <div className="w-full max-w-xl rounded-[16px] bg-papier border border-trait shadow-carte p-4 sm:p-6 flex flex-col gap-4 whitespace-normal text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <h2 className="font-display text-[32px] leading-none font-medium m-0">{partir ? 'Mon inscription' : 'Ajouter des noms'}</h2>
                            <button type="button" onClick={() => setOuvert(false)} className="ml-auto h-10 w-10 grid place-items-center rounded-full hover:bg-sepia-tint" aria-label="Fermer"><X size={20} /></button>
                        </div>
                        {!partir && (
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm text-encre-2">Nom de famille</span>
                            <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} autoComplete="family-name" data-champ="nom-visiteur" autoFocus
                                className="h-12 w-full px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[17px] outline-none focus:border-sepia" />
                        </label>
                        )}
                        {partir ? <Desinscription onAnnuler={() => setPartir(false)} /> : (<>
                        <div className="rounded-[14px] border border-trait bg-carte -mx-1 pt-4 empty:hidden" data-bloc="ajout-visiteur">
                            <AjouterFamille nom={nom.trim()} />
                        </div>
                        <MaSauvegarde />{/* 12/10 : exporter / importer (hors-connexion/MaSauvegarde.tsx) */}
                        <button type="button" onClick={() => setPartir(true)} className="self-start mt-2 text-[13px] text-encre-3 underline underline-offset-4 min-h-11" data-bouton="vers-desinscription">Me désinscrire…</button>
                        </>)}
                    </div>
                </div>
            )}
        </>
    );
}

// ---- FIN « AJOUTER DES NOMS » DANS L'EN-TÊTE ----
