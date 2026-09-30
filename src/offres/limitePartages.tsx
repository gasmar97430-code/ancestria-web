// ---- LIMITE DES PARTAGES OUVERTS ----
// Vu au banc « téléphone » le 29/09 : jauge « Partages ouverts : 1 / 1 » en rouge,
// mais « Créer le partage » restait actif ; la base refusait ensuite. Le bouton se
// grise et la page dit quoi faire (fermer un partage, ou voir les offres).
// Posé par 2 lignes dans pages/Partage.tsx. Retirer ce fichier et ces lignes rend
// la page d'avant (la base refuse toujours au-delà de la limite).
import { Link } from 'react-router-dom';
import type { EtatOffre } from '../domaine/types';

export function limiteAtteinte(etat: EtatOffre | null): boolean {
    try {
        return !!etat && etat.max_invitations_ouvertes !== null && etat.invitations_ouvertes >= etat.max_invitations_ouvertes;
    } catch {
        return false; // repli : la page d'avant
    }
}

export function AvisLimitePartages({ etat }: { etat: EtatOffre | null }) {
    if (!limiteAtteinte(etat)) return null;
    return (
        <p className="text-sm text-encre-2" data-avis="limite-partages">
            Votre offre permet {etat!.max_invitations_ouvertes} partage{etat!.max_invitations_ouvertes! > 1 ? 's' : ''} ouvert{etat!.max_invitations_ouvertes! > 1 ? 's' : ''} à la fois :
            fermez un partage ci-dessous pour en créer un autre, ou <Link to="/offres" className="text-sepia underline underline-offset-4">voyez les offres</Link>.
        </p>
    );
}

// ---- FIN LIMITE DES PARTAGES OUVERTS ----
