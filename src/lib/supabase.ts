import { createClient } from '@supabase/supabase-js';
import { config, configurationManquante } from './config';

// Sans configuration, l'application affiche la page « configuration
// manquante » et n'appelle jamais ce client : l'adresse de repli ne sert
// qu'à ne pas planter au chargement.
const pret = configurationManquante().length === 0;

export const supabase = createClient(pret ? config.url : 'http://localhost:54321', pret ? config.cle : 'configuration-manquante-00000000', {
    // 'implicit' (défaut de Supabase) : le lien de l'e-mail marche dans n'importe quel navigateur. En 'pkce', il ne
    // marchait que dans le navigateur qui l'avait demandé (doc Supabase) — refusé si Gmail l'ouvre ailleurs (30/09).
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    realtime: { params: { eventsPerSecond: 10 } },
});
