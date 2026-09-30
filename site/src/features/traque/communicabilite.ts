export interface PersonneRattachee {
    prenom: string;
    nom: string;
    dateNaissance?: string | null;
    dateDeces?: string | null;
    decede?: boolean | null;
}
export interface PisteACommuniquer {
    source: string;
    titre: string;
    extrait: string;
    dateSource: string | null;
    individus?: {
        individu: PersonneRattachee;
    }[];
}
export interface Masque {
    motif: string;
    communicableLe: string | null;
}
const DELAI_ANS = 75;
const EXCEPTION_DECES_ANS = 25;
const VIE_MAX_ANS = 110;
const ETAT_CIVIL = /[ée]tat[- ]civil|naissance|mariage|d[ée]c[èe]s|divorce|reconnaissance|affranchi|sans vie|registre/i;
const NON_DECES = /naissance|mariage|divorce|reconnaissance|affranchi|sans vie|tous actes|jugement/i;
const DECES = /d[ée]c[èe]s/i;
export function estActeEtatCivil(p: PisteACommuniquer): boolean {
    if (p.source === 'anom')
        return true;
    if (p.source === 'ad974')
        return ETAT_CIVIL.test(`${p.titre} ${p.extrait}`);
    return false;
}
export function anneeLaPlusRecente(p: PisteACommuniquer, aujourdhui: Date): number | null {
    const texte = p.dateSource ?? p.titre;
    const annees = (texte.match(/\b(1[5-9]\d\d|20\d\d)\b/g) ?? []).map(Number).filter((a) => a <= aujourdhui.getFullYear());
    return annees.length ? Math.max(...annees) : null;
}
export function estVivante(i: PersonneRattachee, aujourdhui: Date): boolean {
    if (i.decede === true || i.dateDeces)
        return false;
    if (i.decede === false)
        return true;
    if (!i.dateNaissance)
        return false;
    return new Date(i.dateNaissance).getUTCFullYear() > aujourdhui.getFullYear() - VIE_MAX_ANS;
}
export function communicabilite(p: PisteACommuniquer, aujourdhui = new Date()): Masque | null {
    const rattachees = (p.individus ?? []).map((r) => r.individu);
    const vivante = rattachees.find((i) => estVivante(i, aujourdhui));
    if (vivante) {
        return { motif: `Concerne une personne vivante de l'arbre (${vivante.prenom} ${vivante.nom})`, communicableLe: null };
    }
    if (!estActeEtatCivil(p))
        return null;
    const texte = `${p.titre} ${p.extrait}`;
    if (DECES.test(texte) && !NON_DECES.test(texte))
        return null;
    const annee = anneeLaPlusRecente(p, aujourdhui);
    if (annee === null)
        return null;
    const libre = annee + DELAI_ANS + 1;
    if (aujourdhui.getFullYear() >= libre)
        return null;
    const limite = aujourdhui.getFullYear() - EXCEPTION_DECES_ANS;
    if (rattachees.length > 0 && rattachees.every((i) => i.dateDeces && new Date(i.dateDeces).getUTCFullYear() < limite))
        return null;
    return {
        motif: `Acte d'état civil de moins de ${DELAI_ANS} ans (${annee}) : non communicable (Code du patrimoine, art. L213-2)`,
        communicableLe: `1er janvier ${libre}`,
    };
}
