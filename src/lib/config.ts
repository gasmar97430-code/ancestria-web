// Configuration lue au moment de la construction (variables VITE_…).
// Rien de secret ici : l'URL et la clé « anon » de Supabase sont publiques
// par nature ; la sécurité est dans la base (sécurité par ligne).

const brut = import.meta.env;

function adresse(): string {
    const donnee = (brut.VITE_ADRESSE_PUBLIQUE as string | undefined)?.trim();
    const base = donnee || (typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : '/');
    return base.endsWith('/') ? base : `${base}/`;
}

export const config = {
    url: (brut.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '',
    cle: (brut.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '',
    adressePublique: adresse(),
    stripeActif: brut.VITE_STRIPE_ACTIF === 'true',
};

/** Ce qui manque pour démarrer (vide = prêt). */
export function configurationManquante(): string[] {
    const manque: string[] = [];
    if (!/^https?:\/\/[^\s]+$/.test(config.url)) manque.push('VITE_SUPABASE_URL (adresse du projet Supabase)');
    if (config.cle.length < 20) manque.push('VITE_SUPABASE_ANON_KEY (clé publique « anon »)');
    return manque;
}

/** Lien public d'un partage (lu par le QR code). */
export const lienDePartage = (jeton: string) => `${config.adressePublique}c/${jeton}`;
export const lienPatrimoine = (slug: string) => `${config.adressePublique}patrimoine/${slug}`;
