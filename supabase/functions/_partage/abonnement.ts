// Logique pure (sans Deno ni Stripe) : quelle ligne « abonnements » écrire
// pour un état d'abonnement Stripe. Testée par vitest (src/…/stripe.test.ts)
// et employée par la fonction stripe-webhook.

export type StatutStripe =
    | 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';

export interface LigneAbonnement {
    utilisateur: string;
    offre: 'gratuit' | 'famille' | 'institution';
    statut: 'actif' | 'en_retard' | 'annule';
    stripe_client: string;
    stripe_abonnement: string;
    fin_periode: string | null;
    maj_le: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function ligneAbonnement(p: {
    utilisateur: string | undefined;
    offre: string | undefined;
    statut: StatutStripe;
    client: string;
    abonnement: string;
    finPeriodeSecondes: number | null | undefined;
    maintenant?: Date;
}): LigneAbonnement | null {
    if (!p.utilisateur || !UUID.test(p.utilisateur)) return null;
    const offre = p.offre === 'famille' || p.offre === 'institution' ? p.offre : null;
    if (!offre) return null;
    const statut = p.statut === 'active' || p.statut === 'trialing' ? 'actif'
        : p.statut === 'past_due' ? 'en_retard'
        : 'annule';
    return {
        utilisateur: p.utilisateur,
        offre: statut === 'annule' ? 'gratuit' : offre,
        statut,
        stripe_client: p.client,
        stripe_abonnement: p.abonnement,
        fin_periode: typeof p.finPeriodeSecondes === 'number' && Number.isFinite(p.finPeriodeSecondes) ? new Date(p.finPeriodeSecondes * 1000).toISOString() : null,
        maj_le: (p.maintenant ?? new Date()).toISOString(),
    };
}
