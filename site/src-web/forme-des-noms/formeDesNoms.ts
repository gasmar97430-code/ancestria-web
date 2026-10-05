// ---- FORME DES NOMS (SITE) ----
// 06/10/2026, sa demande : « il manque la correction orthographique des noms prénoms » ; son choix : le nom de
// famille en MAJUSCULES (« GRONDIN »), le prénom « Marie-Thérèse ». Même règle qu'au PC (backend/src/api/formeDesNoms.ts) :
// la CASSE et les espaces seulement, jamais l'orthographe ; « ? » reste « ? ».
// Deux portes du site, une ligne chacune :
//   - src/api/client.ts (la prise) : ce que l'administrateur crée ou modifie (POST / PATCH d'une fiche) ;
//   - src-web/ajouter-famille/AjouterFamille.tsx : ce qu'un visiteur propose (famille, lui, ses proches).
// Repli : en cas d'erreur, le texte part tel qu'il a été tapé.

const espaces = (s: string) => s.trim().replace(/\s+/g, ' ');
export const formeDuNom = (nom: string): string => espaces(nom).toLocaleUpperCase('fr-FR');
export const formeDuPrenom = (prenom: string): string =>
    espaces(prenom).toLocaleLowerCase('fr-FR').replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('fr-FR'));

type Fiche = { nom?: unknown; prenom?: unknown };
const fiche = <T>(f: T): T => {
    if (!f || typeof f !== 'object') return f;
    const c = { ...(f as Fiche) };
    if (typeof c.nom === 'string') c.nom = formeDuNom(c.nom);
    if (typeof c.prenom === 'string') c.prenom = formeDuPrenom(c.prenom);
    return c as T;
};

const ROUTES = [/^(\/api)?\/people(\/\d+)?$/, /^(\/api)?\/parent-inconnu\/\d+(\/completer)?$/]; // avec ou sans /api devant

/** La prise : le corps d'une création / modification de fiche, mis en forme. */
export function corpsMisEnForme(methode: string, chemin: string, corps: unknown): unknown {
    try {
        if (!['POST', 'PUT', 'PATCH'].includes(methode) || !ROUTES.some((r) => r.test(chemin))) return corps;
        return fiche(corps);
    } catch {
        return corps;
    }
}

/** La proposition d'un visiteur : la famille, le contributeur et ses proches, mis en forme. */
export function propositionMiseEnForme<T extends { famille?: string; contributeur?: Fiche; proches?: Fiche[] }>(c: T): T {
    try {
        return { ...c, famille: typeof c.famille === 'string' ? formeDuNom(c.famille) : c.famille, contributeur: fiche(c.contributeur), proches: c.proches?.map(fiche) };
    } catch {
        return c;
    }
}
// ---- FIN FORME DES NOMS (SITE) ----
