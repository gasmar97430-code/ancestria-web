// ---- LE LIEN DE L'ARBRE GARDÉ SUR L'APPAREIL (05/10/2026) ----
//
// Ses mots : « une fois inscrit, le visiteur n'aura plus besoin de rien faire, simplement ouvrir l'appli sur son
// téléphone ». L'appli installée démarre sur l'adresse d'accueil (manifest : start_url « ./ ») : sans ce souvenir,
// un inscrit retombait sur l'inscription (mesuré au banc le 05/10). Le lien (/c/<jeton>) est gardé dès qu'un
// INSCRIT entre ; à la réouverture, la porte le reprend. « S'inscrire · Se connecter » ouvre la porte exprès
// (adresse « ?porte ») : là, on ne rentre pas tout seul.
// Lignes d'appel : Porte.tsx.

const CLE = 'ancestria-lien-arbre';

export function garderJeton(jeton: string): void {
    try { localStorage.setItem(CLE, jeton); } catch { /* sans stockage : il repassera par la porte */ }
}

export function jetonGarde(): string | null {
    try {
        const j = localStorage.getItem(CLE);
        return j && /^[A-Za-z0-9_-]{8,200}$/.test(j) ? j : null;
    } catch {
        return null;
    }
}

/** La porte demandée exprès (lien « S'inscrire · Se connecter ») : ne pas rentrer tout seul. */
export const porteDemandee = (): boolean => new URLSearchParams(window.location.search).has('porte');

// ---- FIN LE LIEN DE L'ARBRE GARDÉ ----
