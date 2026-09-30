// ---- PRISE DU SITE : ACCÈS À LA BASE SUPABASE ----
// L'adresse et la clé « publishable » sont publiques par nature (la sécurité est
// dans la base : sécurité par ligne). Mode « implicit » : le lien de l'e-mail
// marche dans n'importe quel navigateur (leçon du 30/09).
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const cle = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const configurationPrete = /^https?:\/\/\S+$/.test(url) && cle.length >= 20;

export const supabase = createClient(configurationPrete ? url : 'http://localhost:54321', configurationPrete ? cle : 'configuration-manquante-00000000', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
});

/** Adresse publique du site (pour le lien de l'e-mail). */
export const adressePublique = (() => {
    const donnee = (import.meta.env.VITE_ADRESSE_PUBLIQUE as string | undefined)?.trim();
    const base = donnee || window.location.origin + import.meta.env.BASE_URL;
    return base.endsWith('/') ? base : `${base}/`;
})();

// ---- FIN PRISE : ACCÈS À LA BASE ----
