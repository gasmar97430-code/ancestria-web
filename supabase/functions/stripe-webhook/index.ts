// Fonction Supabase (Deno) : reçoit les événements Stripe, VÉRIFIE leur
// signature, et écrit l'abonnement avec le rôle service (le seul qui peut
// écrire la table abonnements). À déployer SANS vérification de jeton :
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets : STRIPE_CLE_SECRETE, STRIPE_SECRET_WEBHOOK
// (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.)

import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { ligneAbonnement, type StatutStripe } from '../_partage/abonnement.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_CLE_SECRETE') ?? '', { apiVersion: '2025-02-24.acacia', httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();
const base = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function enregistrer(abonnement: Stripe.Subscription): Promise<void> {
    const ligne = ligneAbonnement({
        utilisateur: abonnement.metadata?.utilisateur,
        offre: abonnement.metadata?.offre,
        statut: abonnement.status as StatutStripe,
        client: typeof abonnement.customer === 'string' ? abonnement.customer : abonnement.customer.id,
        abonnement: abonnement.id,
        // selon la version d'API Stripe, la fin de période est sur l'abonnement ou sur sa première ligne
        finPeriodeSecondes: (abonnement as unknown as { current_period_end?: number }).current_period_end
            ?? (abonnement.items.data[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end,
    });
    if (!ligne) {
        console.warn('stripe-webhook : abonnement sans utilisateur/offre valides, ignoré', abonnement.id);
        return;
    }
    const { error } = await base.from('abonnements').upsert(ligne, { onConflict: 'utilisateur' });
    if (error) throw error;
}

Deno.serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature');
    const secret = Deno.env.get('STRIPE_SECRET_WEBHOOK');
    if (!signature || !secret) return new Response('Signature absente', { status: 400 });
    const corps = await req.text();
    let evenement: Stripe.Event;
    try {
        evenement = await stripe.webhooks.constructEventAsync(corps, signature, secret, undefined, crypto);
    } catch {
        return new Response('Signature invalide', { status: 400 });
    }
    try {
        switch (evenement.type) {
            case 'checkout.session.completed': {
                const s = evenement.data.object as Stripe.Checkout.Session;
                if (s.subscription) await enregistrer(await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id));
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await enregistrer(evenement.data.object as Stripe.Subscription);
                break;
            default:
                break; // autres événements : rien à faire
        }
        return new Response(JSON.stringify({ recu: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        console.error('stripe-webhook', e);
        return new Response('Erreur', { status: 500 }); // Stripe renverra l'événement
    }
});
