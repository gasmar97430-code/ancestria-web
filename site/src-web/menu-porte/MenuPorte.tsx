// ---- LE MENU DE L'APPLI SUR LA PAGE D'INSCRIPTION (05/10/2026) ----
//
// Ses mots (image du menu de l'appli) : « pour revenir sur la page d'accueil sur l'appli c'est simple … mais sur
// le site pourquoi tu ne le fais pas ? ». La page « Bienvenue / Inscription » du site n'avait ni menu ni Accueil :
// on y restait enfermé. Ce bloc y pose les mêmes entrées que le menu de l'appli (Sidebar.tsx) :
//   - appareil INSCRIT (lien de l'arbre gardé, jetonGarde.ts) : le clic ouvre l'appli sur cet écran ;
//   - pas inscrit : on n'entre pas (sa règle stricte du 05/10) — une bulle le dit simplement et le curseur va
//     sur « Nom » ; l'auteur se connecte par « S'inscrire · Se connecter » en haut à droite.
// Ordinateur : colonne à gauche sous l'en-tête (comme le menu replié de l'appli) ; téléphone : barre en bas.
// Posé par UNE ligne dans Porte.tsx (autour de <PorteInscription/>).

import { useState, type ReactNode } from 'react';
import { Binoculars, Books, HouseSimple, TreeStructure } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useAtelierStore, type Ecran } from '../../src/store/useAtelierStore';
import { jetonVisiteur } from '../visiteur/visiteur';
import { jetonGarde } from '../porte-inscription/jetonGarde';
import { dejaInscrit } from '../porte-inscription/PorteInscription';

const ENTREES: { ecran: Ecran; libelle: string; icone: Icon }[] = [
    { ecran: 'accueil', libelle: 'Accueil', icone: HouseSimple },
    { ecran: 'arbre', libelle: 'Arbre', icone: TreeStructure },
    { ecran: 'traque', libelle: 'Traque des Noms', icone: Binoculars },
    { ecran: 'sources', libelle: 'Sources', icone: Books },
];

export const MSG_PAS_INSCRIT = 'Inscrivez-vous ici, c’est gratuit : l’Accueil s’ouvre juste après.';

export function MenuPorte({ children, onEntrer }: { children: ReactNode; onEntrer: (jeton: string) => void }) {
    const [bulle, setBulle] = useState(false);
    const aller = (e: Ecran) => {
        const jeton = jetonVisiteur() ?? jetonGarde();
        if (jeton && dejaInscrit()) {
            useAtelierStore.getState().aller(e);
            onEntrer(jeton);
            return;
        }
        setBulle(true);
        window.setTimeout(() => setBulle(false), 7000); // s'efface seule : elle ne reste pas sur le formulaire
        const nom = document.querySelector<HTMLInputElement>('[data-champ="inscrit-nom"]');
        nom?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        nom?.focus({ preventScroll: true });
    };
    return (
        <div data-menu-porte="" className="[&_main]:pb-[76px] sm:[&_main]:pb-8 sm:[&_main]:pl-[64px]">
            {children}
            <nav
                aria-label="Menu"
                data-bloc="menu-porte"
                className="fixed z-30 bg-carte border-trait-leger flex items-center left-0 right-0 bottom-0 h-[60px] border-t justify-around sm:right-auto sm:top-[64px] sm:h-auto sm:w-16 sm:border-t-0 sm:border-r sm:flex-col sm:justify-start sm:py-[22px] sm:gap-1.5"
            >
                {ENTREES.map(({ ecran, libelle, icone: I }) => (
                    <button
                        key={ecran}
                        type="button"
                        onClick={() => aller(ecran)}
                        title={libelle}
                        aria-label={libelle}
                        data-menu-porte-entree={ecran}
                        className={`w-11 h-11 sm:w-10 sm:h-10 rounded-[10px] grid place-items-center text-[20px] sm:text-[19px] transition-colors ${ecran === 'accueil' ? 'text-sepia-deep' : 'text-encre-2'} hover:bg-papier`}
                    >
                        <I />
                    </button>
                ))}
            </nav>
            {bulle && (
                <div
                    role="status"
                    data-bulle="pas-inscrit"
                    className="fixed z-40 left-3 right-3 bottom-[70px] sm:left-[76px] sm:right-auto sm:top-[86px] sm:bottom-auto sm:max-w-[260px] rounded-[12px] border bg-blanc px-4 py-3 text-[13.5px] leading-snug text-encre shadow-sm"
                    style={{ borderColor: 'var(--sepia)' }}
                    onClick={() => setBulle(false)}
                >
                    {MSG_PAS_INSCRIT}
                    <span className="block text-[12px] text-encre-3 mt-1">Vous êtes l’auteur ? « S’inscrire · Se connecter », en haut à droite.</span>
                </div>
            )}
        </div>
    );
}

// ---- FIN LE MENU DE L'APPLI SUR LA PAGE D'INSCRIPTION ----
