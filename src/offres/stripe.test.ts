import { describe, expect, it } from 'vitest';
import { ligneAbonnement } from '../../supabase/functions/_partage/abonnement';

const U = '8f14e45f-ceea-467a-9575-7d4a2c1e0b3a';
const maintenant = new Date('2026-09-28T12:00:00Z');

describe('webhook Stripe : état → ligne d’abonnement', () => {
    it('actif → offre famille active jusqu’à la fin de période', () => {
        expect(ligneAbonnement({ utilisateur: U, offre: 'famille', statut: 'active', client: 'cus_1', abonnement: 'sub_1', finPeriodeSecondes: 1790000000, maintenant })).toEqual({
            utilisateur: U, offre: 'famille', statut: 'actif', stripe_client: 'cus_1', stripe_abonnement: 'sub_1',
            fin_periode: new Date(1790000000 * 1000).toISOString(), maj_le: maintenant.toISOString(),
        });
    });
    it('retard de paiement : l’offre reste (statut en_retard) ; annulé : retour au gratuit', () => {
        expect(ligneAbonnement({ utilisateur: U, offre: 'famille', statut: 'past_due', client: 'c', abonnement: 's', finPeriodeSecondes: null })?.statut).toBe('en_retard');
        for (const st of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused'] as const) {
            expect(ligneAbonnement({ utilisateur: U, offre: 'famille', statut: st, client: 'c', abonnement: 's', finPeriodeSecondes: null })).toMatchObject({ statut: 'annule', offre: 'gratuit' });
        }
    });
    it('sans utilisateur valide ou offre connue : rien n’est écrit', () => {
        expect(ligneAbonnement({ utilisateur: undefined, offre: 'famille', statut: 'active', client: 'c', abonnement: 's', finPeriodeSecondes: 1 })).toBeNull();
        expect(ligneAbonnement({ utilisateur: 'pas-un-uuid', offre: 'famille', statut: 'active', client: 'c', abonnement: 's', finPeriodeSecondes: 1 })).toBeNull();
        expect(ligneAbonnement({ utilisateur: U, offre: 'platine', statut: 'active', client: 'c', abonnement: 's', finPeriodeSecondes: 1 })).toBeNull();
    });
});
