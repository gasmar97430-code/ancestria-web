// ---- RETOUR DEPUIS LA PAGE D'INSCRIPTION (ses demandes du 05/10/2026) ----
//
// Ses mots : « quand je clique sur inscription je n'ai pas de retour pour revenir sur la page d'accueil », puis
// (capture de la page Bienvenue) « tu n'as toujours pas résolu ?? le retour à la page ». Le 1er jet ne montrait le
// lien que dans UN parcours (inscrit, venu de l'appli par « S'inscrire · Se connecter » dans le même onglet).
// Bloc refait (tiroir) :
//   - INSCRIT sur cet appareil et lien de l'arbre connu (jetonGarde, ou noté au clic) → « ← Revenir à Ancestria » ;
//   - sinon, venu d'une autre page du site (même adresse) → « ← Retour » (la page d'avant) ;
//   - inscrit sans lien gardé (inscrit avant le 05/10) : le formulaire est déjà rempli (PorteInscription), un toucher.
// La porte reste fermée à qui n'est pas inscrit : « Retour » ramène seulement d'où il vient, jamais dans l'arbre.
// Ligne d'appel : porte-inscription/PorteInscription.tsx (au-dessus de « Bienvenue »).

import { CLE_RETOUR } from '../compte-site/CompteSite';
import { jetonGarde } from './jetonGarde';

const style = 'self-start inline-flex items-center gap-1.5 min-h-11 text-[14px] text-sepia-deep underline underline-offset-4';

export function RetourAncestria({ inscrit }: { inscrit: boolean }) {
    let note: string | null = null;
    try { note = sessionStorage.getItem(CLE_RETOUR); } catch { /* sans stockage */ }
    const base = import.meta.env.BASE_URL;
    const jeton = jetonGarde();
    const versArbre = jeton ? `${base}c/${jeton}` : note && note.includes('/c/') ? note : null;
    if (inscrit && versArbre) {
        return (
            <a href={versArbre} className={style} data-bouton="retour-ancestria" onClick={() => { try { sessionStorage.removeItem(CLE_RETOUR); } catch { /* rien */ } }}>
                ← Revenir à Ancestria
            </a>
        );
    }
    const precedente = (() => { try { return document.referrer ? new URL(document.referrer) : null; } catch { return null; } })();
    const venuDuSite = !!precedente && precedente.origin === window.location.origin && precedente.pathname.startsWith(base)
        && precedente.href !== window.location.href;
    if (venuDuSite && window.history.length > 1) {
        return (
            <button type="button" onClick={() => window.history.back()} className={style} data-bouton="retour-page">
                ← Retour
            </button>
        );
    }
    return null;
}

// ---- FIN RETOUR DEPUIS LA PAGE D'INSCRIPTION ----
