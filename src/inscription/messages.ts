// ---- MESSAGES OFFICIELS D'ANCESTRIA ----
// Donnés par l'administrateur le 30/09/2026. Ils s'affichent MOT POUR MOT :
// on ne les reformule pas, on ne les raccourcit pas (l'essai messages.test.ts
// les compare à son texte).

export const ADMINISTRATEUR = 'M’astel Marius Gastellier';

/** Message d'accueil (inscription). */
export const MESSAGE_ACCUEIL =
    'Bienvenue sur Ancestria ! L\'accès à nos pages est entièrement gratuit et ouvert à la mémoire de tous. Pour enrichir notre grand Arbre de Lumière et contribuer dans les règles de l\'art, merci de vous inscrire (Nom, Prénom et e-mail ou téléphone). Votre contribution est précieuse pour faire vivre notre histoire !';

/** Message de prudence (contre les fausses informations). */
export const MESSAGE_PRUDENCE =
    'Attention : Ancestria est un espace de mémoire noble et rigoureux. Toute tentative d\'insertion de fausses informations, de blagues ou de données fantaisistes est strictement interdite. Par mesure de sécurité et de respect envers les familles, chaque contribution validée est verrouillée et tracée. Restons rigoureux pour honorer nos ancêtres.';

/** Mot à écrire dans une demande de correction (il sert à la reconnaître). */
export const MOT_CORRECTION = 'CORRECTION';

/**
 * Adresse de l'administrateur montrée au public : réglée à la construction du site
 * (variable VITE_EMAIL_ADMINISTRATEUR). Aucune adresse n'est écrite dans le code :
 * c'est lui qui choisit celle qu'il publie.
 */
export function emailAdministrateur(): string | null {
    const v = (import.meta.env.VITE_EMAIL_ADMINISTRATEUR as string | undefined)?.trim() ?? '';
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) ? v : null;
}

// ---- FIN MESSAGES OFFICIELS ----
