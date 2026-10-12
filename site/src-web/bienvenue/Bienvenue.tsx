// ---- FENÊTRE DE BIENVENUE À LA PREMIÈRE VISITE (10/10/2026) ----
//
// Son texte (collé le 10/10), gardé mot pour mot SAUF les trois étapes : « créez votre fiche », « + Parent / + Enfant
// / + Conjoint », « importez un GEDCOM » ne sont pas possibles pour un visiteur du site (sa règle du 06/10 : le
// visiteur s'inscrit et ajoute des noms, rien d'autre ; loi 6 : un vivant n'est pas montré). Remplacées, avec son
// « oui » du 10/10, par ce qui existe vraiment : s'inscrire, ajouter les noms de sa famille, partager.
// Une seule fois par appareil (localStorage « ancestria-bienvenue-vue ») ; sans stockage : montrée, puis fermée.
//
// 12/10, ses mots : « rajouter un petit bloc en bas du texte de présentation … qu'il faut cocher si avoir lu les
// informations pour déverrouiller et fermer le texte, et s'inscrire pour arriver sur la page du site directement » →
// case « J'ai lu ces informations » : tant qu'elle n'est pas cochée, le bouton reste verrouillé ; une fois fermée, la
// page descend toute seule au formulaire d'inscription. Étape 2 mise à jour (sa règle du 12/10 : chercher un nom).
// Ligne d'appel : porte-inscription/PorteInscription.tsx.

import { useState } from 'react';

const CLE = 'ancestria-bienvenue-vue';

function dejaVue(): boolean {
    try { return localStorage.getItem(CLE) === '1'; } catch { return false; }
}

export function Bienvenue() {
    const [ouverte, setOuverte] = useState(() => !dejaVue());
    const [lu, setLu] = useState(false);
    if (!ouverte) return null;
    const fermer = () => {
        try { localStorage.setItem(CLE, '1'); } catch { /* sans stockage : fermée pour cette visite */ }
        setOuverte(false);
        setTimeout(() => { const f = document.querySelector<HTMLElement>('[data-inscription="porte"]'); f?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }); f?.scrollIntoView({ block: 'start' }); }, 80);
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
                    <li><b>Cherchez un nom :</b> tapez-le, son arbre apparaît (les personnes vivantes restent protégées).</li>
                    <li><b>Ajoutez les noms de votre famille :</b> ils entrent tout de suite dans l’arbre.</li>{/* 12/10, ses mots : « direct sans chichi » */}
                    <li><b>Vous aimez Ancestria ?</b> N’hésitez pas à la partager avec vos proches : le bouton « Faire connaître Ancestria » vous donne le lien et l’affiche.</li>{/* 12/10 : « le partage ne doit pas être une obligation » */}
                </ol>
                <h3 className="font-display text-xl m-0">Une œuvre collective et solidaire</h3>
                <p className="italic text-[15px] leading-relaxed m-0">Ancestria vit grâce à la générosité et à la bienveillance de chacun. Si votre cœur vous en dit et que vous le pouvez, un petit soutien libre (même symbolique) aide beaucoup à faire vivre et grandir ce bel outil pour toute la communauté. C’est un geste d’amour totalement facultatif.</p>
                <label className="flex items-start gap-3 rounded-[12px] border border-sepia bg-blanc px-4 py-3 text-[15px] cursor-pointer" data-bloc="lu-bienvenue">
                    <input type="checkbox" className="mt-0.5 w-6 h-6 flex-none accent-[var(--sepia)]" checked={lu} onChange={(e) => setLu(e.target.checked)} data-champ="lu-bienvenue" />
                    <span>J’ai lu ces informations.</span>
                </label>
                <button type="button" onClick={fermer} disabled={!lu} className="self-center mt-1 min-h-12 px-6 rounded-[12px] bg-sepia text-blanc text-[16px] font-medium hover:bg-sepia-deep disabled:opacity-40 disabled:cursor-not-allowed" data-bouton="entrer-bienvenue">
                    {lu ? 'Entrer sur Ancestria et m’inscrire' : 'Cochez « J’ai lu » pour entrer'}
                </button>
            </div>
        </div>
    );
}

// ---- FIN FENÊTRE DE BIENVENUE ----
