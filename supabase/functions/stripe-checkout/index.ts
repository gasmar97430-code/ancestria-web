// Fonction Supabase (Deno) : prépare une page de paiement Stripe pour
// l'utilisateur CONNECTÉ (son jeton est vérifié ici). La clé secrète Stripe
// ne quitte jamais le serveur.
//
// Secrets à poser (voir GUIDE_DEPLOIEMENT.md, étape 8) :
//   STRIPE_CLE_SECRETE, STRIPE_PRIX_FAMILLE, SITE_ADRESSE
// (SUPABASE_URL et SUPABASE_ANON_KEY sont fournis par Supabase.)

import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const stripe = new Stripe(Deno.env.get('STRIPE_CLE_SECRETE') ?? '', { apiVersion: '2025-02-24.acacia', httpClient: Stripe.createFetchHttpClient() });
const SITE = (Deno.env.get('SITE_ADRESSE') ?? '').replace(/\/?$/, '/');

const entetes = {
    'Access-Control-Allow-Origin': SITE ? new URL(SITE).origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};
const reponse = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: entetes });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: entetes });
    if (req.method !== 'POST') return reponse({ error: 'Méthode non permise' }, 405);
    try {
        const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        });
        const { data: { user } } = await client.auth.getUser();
        if (!user) return reponse({ error: 'Connectez-vous d’abord.' }, 401);

        const { offre } = (await req.json()) as { offre?: string };
        if (offre !== 'famille') return reponse({ error: 'Offre inconnue.' }, 400);
        const prix = Deno.env.get('STRIPE_PRIX_FAMILLE');
        if (!prix || !SITE) return reponse({ error: 'Paiement pas encore configuré.' }, 503);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: prix, quantity: 1 }],
            customer_email: user.email ?? undefined,
            client_reference_id: user.id,
            metadata: { utilisateur: user.id, offre },
            subscription_data: { metadata: { utilisateur: user.id, offre } },
            success_url: `${SITE}offres?paiement=ok`,
            cancel_url: `${SITE}offres?paiement=annule`,
            locale: 'fr',
        });
        return reponse({ url: session.url });
    } catch (e) {
        console.error('stripe-checkout', e);
        return reponse({ error: 'Le paiement n’a pas pu être préparé.' }, 500);
    }
});
