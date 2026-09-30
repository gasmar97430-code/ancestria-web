// ---- INSCRIPTION : QUI CONTRIBUE ----
// Règle de l'administrateur (30/09/2026) : pour ajouter une famille ou contribuer,
// il faut s'inscrire — Nom, Prénom, et e-mail OU téléphone. Aucune contribution
// anonyme. La base refait ce contrôle (supabase/schema.sql, « 7 bis ») : elle seule
// fait foi. Les règles ci-dessous sont les siennes, lettre pour lettre (l'essai
// tests/sql/inscription.test.ts compare les deux sur des milliers de saisies).

export interface Inscrit {
    nom: string;
    prenom: string;
    contact: string;
}
export type ErreursInscription = Partial<Record<keyof Inscrit, string>>;

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const TELEPHONE = /^\+?[0-9(][0-9 .()-]*$/;

/** Retire les espaces du début et de la fin (les espaces seulement, comme la base). */
const sansBords = (t: string) => t.replace(/^ +| +$/g, '');
/** Nombre de caractères, compté comme la base (un accent ou un emoji = un caractère). */
const longueur = (t: string) => [...t].length;

/** 'email', 'telephone', ou null quand ce n'est ni l'un ni l'autre. */
export function genreContact(brut: string | null | undefined): 'email' | 'telephone' | null {
    if (brut == null || longueur(brut) > 200) return null;
    const c = sansBords(brut);
    if (EMAIL.test(c)) return 'email';
    const chiffres = brut.replace(/[^0-9]/g, '').length;
    if (TELEPHONE.test(c) && chiffres >= 8 && chiffres <= 15) return 'telephone';
    return null;
}

const entre1et80 = (t: unknown): t is string => typeof t === 'string' && longueur(sansBords(t)) >= 1 && longueur(sansBords(t)) <= 80;

/** Même verdict que `defaut_inscription` de la base : true = l'inscription est complète. */
export function inscriptionComplete(inscrit: unknown, contact: string | null | undefined): boolean {
    if (typeof inscrit !== 'object' || inscrit === null || Array.isArray(inscrit)) return false;
    const i = inscrit as Record<string, unknown>;
    return entre1et80(i.nom) && entre1et80(i.prenom) && genreContact(contact) !== null;
}

/** Contrôle du formulaire : chaque erreur dit quoi écrire. */
export function validerInscription(s: Inscrit): { ok: true; inscrit: Inscrit } | { ok: false; erreurs: ErreursInscription } {
    const erreurs: ErreursInscription = {};
    const nom = sansBords(s.nom);
    const prenom = sansBords(s.prenom);
    const contact = sansBords(s.contact);
    if (longueur(nom) < 1) erreurs.nom = 'Votre nom est obligatoire.';
    else if (longueur(nom) > 80) erreurs.nom = '80 caractères au plus.';
    if (longueur(prenom) < 1) erreurs.prenom = 'Votre prénom est obligatoire.';
    else if (longueur(prenom) > 80) erreurs.prenom = '80 caractères au plus.';
    if (contact === '') erreurs.contact = 'Donnez une adresse e-mail ou un numéro de téléphone.';
    else if (genreContact(contact) === null) erreurs.contact = 'Écrivez une adresse e-mail (nom@exemple.fr) ou un numéro de téléphone (8 à 15 chiffres).';
    if (Object.keys(erreurs).length) return { ok: false, erreurs };
    return { ok: true, inscrit: { nom, prenom, contact } };
}

// L'inscription est gardée dans ce téléphone : on ne la redemande pas à chaque ajout.
const CLE = 'ancestria-inscription';

export function lireInscription(stockage: Pick<Storage, 'getItem'>): Inscrit | null {
    try {
        const v = JSON.parse(stockage.getItem(CLE) ?? 'null') as Partial<Inscrit> | null;
        if (!v || typeof v.nom !== 'string' || typeof v.prenom !== 'string' || typeof v.contact !== 'string') return null;
        const r = validerInscription({ nom: v.nom, prenom: v.prenom, contact: v.contact });
        return r.ok ? r.inscrit : null;
    } catch {
        return null;
    }
}

export function garderInscription(stockage: Pick<Storage, 'setItem'>, inscrit: Inscrit): void {
    try {
        stockage.setItem(CLE, JSON.stringify(inscrit));
    } catch {
        /* navigation privée : l'inscription vaut pour cette visite */
    }
}

export function oublierInscription(stockage: Pick<Storage, 'removeItem'>): void {
    try {
        stockage.removeItem(CLE);
    } catch {
        /* rien à retirer */
    }
}

// ---- FIN INSCRIPTION : QUI CONTRIBUE ----
