// ---- SIGNATURE : M'ASTEL.974 · L'ARBRE DE LUMIÈRE ----
//
// Sa règle du 29/09 : « dans tous les projets du groupe de Zulublanc le pseudo
// doit être en haut de l'appli, c'est ma signature ». Bloc COPIÉ du bureau
// (Ancestria/frontend/src/app/Sidebar.tsx, haut de la barre : logo arbre,
// « M'astel.974 », « L'Arbre de Lumière ») : même dessin, mêmes classes.
// `lien` : sur les écrans du propriétaire, elle ramène à « Mes arbres » (au
// bureau, à l'Accueil) ; sur les pages publiques (QR, patrimoine), pas de lien.
// Posée par une ligne dans chaque en-tête (ui/ui.tsx EnTetePage, ArbrePage,
// Contribuer, Connexion, PatrimoinePublic).

import { Link } from 'react-router-dom';
import { Tree } from '@phosphor-icons/react';

export function Signature({ lien = false, centre = false }: { lien?: boolean; centre?: boolean }) {
    const contenu = (
        <>
            <span className="w-[38px] h-[38px] flex-none rounded-[11px] border border-sepia grid place-items-center text-sepia text-xl">
                <Tree />
            </span>
            <span className="text-[10px] leading-[1.5] text-encre-3 tracking-[.12em] uppercase text-left">
                M'astel.974
                <br />
                L'Arbre de Lumière
            </span>
        </>
    );
    const classe = `flex gap-3 items-center ${centre ? 'justify-center' : ''}`;
    return lien ? (
        <Link to="/" title="Mes arbres" className={classe} data-noeud="signature">
            {contenu}
        </Link>
    ) : (
        <div className={classe} data-noeud="signature" title="M'astel.974 — L'Arbre de Lumière">
            {contenu}
        </div>
    );
}

// ---- FIN SIGNATURE ----
