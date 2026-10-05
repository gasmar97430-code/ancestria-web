// ---- « ← REVENIR À ANCESTRIA » SUR LA PAGE D'INSCRIPTION (sa demande du 05/10/2026) ----
//
// Ses mots : « quand je clique sur inscription je n'ai pas de retour pour revenir sur la page d'accueil ».
// Montré seulement à qui vient de l'appli (clic sur « S'inscrire · Se connecter », compte-site/CompteSite.tsx)
// ET déjà inscrit sur cet appareil : la porte reste fermée à qui ne l'est pas (sa règle : sans inscription, rien).
// Ligne d'appel : porte-inscription/PorteInscription.tsx (au-dessus de « Bienvenue »).

import { CLE_RETOUR } from '../compte-site/CompteSite';

export function RetourAncestria({ inscrit }: { inscrit: boolean }) {
    let retour: string | null = null;
    try { retour = sessionStorage.getItem(CLE_RETOUR); } catch { /* sans stockage */ }
    if (!inscrit || !retour || !retour.includes('/c/')) return null;
    return (
        <a href={retour} className="self-start inline-flex items-center gap-1.5 min-h-11 text-[14px] text-sepia-deep underline underline-offset-4" data-bouton="retour-ancestria"
            onClick={() => { try { sessionStorage.removeItem(CLE_RETOUR); } catch { /* rien */ } }}>
            ← Revenir à Ancestria
        </a>
    );
}

// ---- FIN « ← REVENIR À ANCESTRIA » ----
