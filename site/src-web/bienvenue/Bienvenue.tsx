// ---- FENÊTRE DE BIENVENUE À LA PREMIÈRE VISITE (10/10/2026) ----
//
// Son texte (collé le 10/10), gardé mot pour mot SAUF les trois étapes : « créez votre fiche », « + Parent / + Enfant
// / + Conjoint », « importez un GEDCOM » ne sont pas possibles pour un visiteur du site (sa règle du 06/10 : le
// visiteur s'inscrit et ajoute des noms, rien d'autre ; loi 6 : un vivant n'est pas montré). Remplacées, avec son
// « oui » du 10/10, par ce qui existe vraiment : s'inscrire, ajouter les noms de sa famille, partager.
// Une seule fois par appareil (localStorage « ancestria-bienvenue-vue ») ; sans stockage : montrée, puis fermée.
//
// Ligne d'appel : porte-inscription/PorteInscription.tsx.

import { useState } from 'react';

const CLE = 'ancestria-bienvenue-vue';

function dejaVue(): boolean {
    try { return localStorage.getItem(CLE) === '1'; } catch { return false; }
}

export function Bienvenue() {
    const [ouverte, setOuverte] = useState(() => !dejaVue());
    if (!ouverte) return null;
    const fermer = () => {
        try { localStorage.setItem(CLE, '1'); } catch { /* sans stockage : fermée pour cette visite */ }
        setOuverte(false);
    };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="bienvenue-titre" data-fenetre="bienvenue">
            <div className="w-full max-w-[560px] max-h-[88dvh] overflow-y-auto rounded-[18px] bg-carte border border-trait shadow-xl px-5 py-6 sm:px-7 flex flex-col gap-4 text-encre">
                <h2 id="bienvenue-titre" className="font-display text-[30px] leading-tight m-0">🌿 Bienvenue sur Ancestria</h2>
                <p className="italic text-[15px] leading-relaxed m-0">Bienvenue chez vous. Ancestria est un espace de partage né pour honorer la mémoire de nos gramounes et relier les cœurs de notre belle île de La Réunion.</p>
                <p className="italic text-[15px] leading-relaxed m-0">Ici, la plateforme est et restera entièrement gratuite, ouverte à tous, sans aucune obligation d’achat ni publicité intrusive.</p>
                <h3 className="font-display text-xl m-0">Comment faire vos premiers pas ?</h3>
                <ol className="m-0 pl-5 flex flex-col gap-1.5 text-[15px] leading-relaxed">
                    <li><b>Inscrivez-vous :</b> votre nom, votre prénom, votre e-mail ou votre téléphone, et la charte de l’Arbre de Lumière.</li>
                    <li><b>Ajoutez les noms de votre famille :</b> ils arrivent à l’administrateur, qui les vérifie avant de les poser dans l’arbre.</li>
                    <li><b>Partagez avec vos proches :</b> le bouton « Faire connaître Ancestria » vous donne le lien et l’affiche.</li>
                </ol>
                <h3 className="font-display text-xl m-0">Une œuvre collective et solidaire</h3>
                <p className="italic text-[15px] leading-relaxed m-0">Ancestria vit grâce à la générosité et à la bienveillance de chacun. Si votre cœur vous en dit et que vous le pouvez, un petit soutien libre (même symbolique) aide beaucoup à faire vivre et grandir ce bel outil pour toute la communauté. C’est un geste d’amour totalement facultatif.</p>
                <button type="button" onClick={fermer} className="self-center mt-1 min-h-12 px-6 rounded-[12px] bg-sepia text-blanc text-[16px] font-medium hover:bg-sepia-deep" data-bouton="entrer-bienvenue">
                    Entrer sur Ancestria
                </button>
            </div>
        </div>
    );
}

// ---- FIN FENÊTRE DE BIENVENUE ----
