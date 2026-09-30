// ---- PAIEMENT (Stripe) ----
// Le site n'a JAMAIS de clé secrète : il demande à la fonction Supabase
// « stripe-checkout » une page de paiement Stripe, puis y envoie la personne.
// Au retour, c'est le webhook (« stripe-webhook ») qui écrit l'abonnement
// dans la base, avec le rôle service : le navigateur ne peut pas s'offrir
// une offre (vérifié par les essais de la base).
// Tant que VITE_STRIPE_ACTIF n'est pas « true », rien de tout cela n'est
// proposé.

import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { messageErreur } from '../domaine/erreurs';

export const paiementActif = () => config.stripeActif;

export async function allerAuPaiement(offre: 'famille'): Promise<void> {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { offre, retour: `${config.adressePublique}offres` },
    });
    if (error) throw new Error(messageErreur(error));
    const url = (data as { url?: string } | null)?.url;
    if (!url || !/^https:\/\/checkout\.stripe\.com\//.test(url)) throw new Error('Le paiement n’a pas pu être préparé. Réessayez plus tard.');
    window.location.assign(url);
}

// ---- FIN PAIEMENT ----
