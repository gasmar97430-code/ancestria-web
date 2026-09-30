// ---- ERREURS EN FRANÇAIS CLAIR ----
// Toute erreur (base, réseau, session) devient une phrase qu'on comprend,
// avec ce qu'il faut faire. Les refus de nos règles arrivent déjà en
// français (raise exception du schéma) : ils sont rendus tels quels.

interface ErreurBase {
    message?: string;
    code?: string;
    hint?: string | null;
    details?: string | null;
}

const ANGLAIS = /^(new row|violates|duplicate key|insert or update|update or delete|null value|value too long|invalid input|permission denied|JWT|Failed to fetch|NetworkError|Load failed)/i;

export function messageErreur(e: unknown): string {
    if (e === null || e === undefined) return 'Erreur inconnue.';
    if (typeof e === 'string') return e;
    const err = e as ErreurBase & { name?: string };
    const message = err.message ?? '';
    const code = err.code ?? '';

    if (err.name === 'TypeError' && /fetch|network|load failed/i.test(message)) {
        return 'Pas de connexion au serveur : vérifiez le réseau puis réessayez.';
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        return 'Pas de connexion au serveur : vérifiez le réseau puis réessayez.';
    }
    if (code === 'PGRST301' || /JWT expired|jwt/i.test(message)) {
        return 'Votre session a expiré : reconnectez-vous.';
    }
    if (code === '42501' || /row-level security|permission denied/i.test(message)) {
        return /^(Seul|Seuls|Le propriétaire)/.test(message) ? message : 'Vous n’avez pas le droit de faire cela dans cet arbre.';
    }
    if (code === '23505') return 'Cet élément existe déjà.';
    if (code === '23503') return 'Une personne ou un élément lié n’existe plus : actualisez la page.';
    if (code === '23502') return 'Un champ obligatoire est vide.';
    if (code === '22001') return 'Un texte est trop long.';
    if (code === '22P02' || code === '22007' || code === '22008') return 'Une valeur saisie n’est pas au bon format.';
    if (code === '23514' || code === '22023' || code === 'P0002') {
        return ANGLAIS.test(message) ? 'Une valeur est hors des limites permises.' : message;
    }
    if (message && !ANGLAIS.test(message)) return message;
    return 'Une erreur est survenue. Réessayez ; si elle revient, notez l’heure et prévenez l’administrateur.';
}

/** Motif machine d'un refus de nos règles (BOUCLE, DATES, OFFRE_LIMITE_…). */
export function motifErreur(e: unknown): string | null {
    const h = (e as ErreurBase | null)?.hint;
    return typeof h === 'string' && /^[A-Z_]+$/.test(h) ? h : null;
}

// ---- FIN ERREURS EN FRANÇAIS CLAIR ----
