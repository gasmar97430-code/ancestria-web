// ---- PERSONNES TAPÉES À L'ACCUEIL DU SITE (12/10/2026) ----
// Sa capture : « hoarau emile ceus » → « Aucun patronyme ne correspond » : « sur la page ne fonctionne pas la
// recherche, barre de recherche obsolète ». Sa règle du 26/09 : « si je cherche hoarau céus c'est hoarau céus qui
// doit s'afficher », « et de même pour les autres ». Au PC, /api/recherche-globale le fait ; sur le site la route
// rendait TOUJOURS une liste vide. Ici : la même règle sur l'arbre en ligne — chaque mot tapé (2 lettres et plus)
// doit se trouver dans le prénom ou le nom (accents et majuscules ignorés). Jamais une « Fiche protégée » (loi 6 :
// un vivant n'a pas de nom en ligne). Ligne d'appel : prise/routes.ts ('/recherche-globale').

export type PersonneArbre = { id: number | string; prenom: string; nom: string; dateNaissance?: string | null; dateDeces?: string | null; lieuNaissance?: string | null; lieuDeces?: string | null };
export type PersonneTrouvee = { id: number | string; prenom: string; nom: string; naissance: number | null; deces: number | null; lieu: string | null };

export const plat = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const annee = (d?: string | null): number | null => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);

/** Règle pure (testée) : les personnes de l'arbre dont le prénom + nom contiennent chaque mot tapé. */
export function trouverPersonnes(saisie: string, gens: PersonneArbre[], max = 8): PersonneTrouvee[] {
    const mots = plat(saisie).split(' ').filter((m) => m.length >= 2);
    if (mots.length === 0) return [];
    return gens
        .filter((p) => p.prenom && p.prenom !== 'Fiche protégée')
        .map((p) => {
            const tout = ` ${plat(`${p.prenom} ${p.nom}`)} `;
            if (!mots.every((m) => tout.includes(m))) return null;
            const entiers = mots.filter((m) => tout.includes(` ${m} `)).length;   // mots entiers d'abord
            return { p, note: entiers };
        })
        .filter((x): x is { p: PersonneArbre; note: number } => x !== null)
        .sort((a, b) => b.note - a.note || a.p.nom.localeCompare(b.p.nom) || a.p.prenom.localeCompare(b.p.prenom))
        .slice(0, max)
        .map(({ p }) => ({ id: p.id, prenom: p.prenom, nom: p.nom, naissance: annee(p.dateNaissance), deces: annee(p.dateDeces), lieu: p.lieuNaissance ?? p.lieuDeces ?? null }));
}
// ---- FIN PERSONNES TAPÉES ----
