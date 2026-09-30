// ---- ANNÉES PLAUSIBLES (PAGE DU QR CODE) ----
// Vu au banc « téléphone » le 29/09 : un visiteur né en 1990 se voyait proposer
// « Je suis son parent » face à un ancêtre né en 1900, et pouvait déclarer une
// « enfant » née en 1962. Rien ne l'arrêtait avant que la famille, en acceptant,
// se heurte au refus de la base. Même seuil que la base et incoherenceDates :
// 10 ans au moins entre un parent et son enfant. Années inconnues = tout permis
// (on ne devine jamais).
// Posé par des lignes dans pages/Contribuer.tsx. Retirer ce fichier et ces
// lignes rend la page d'avant.

import type { RelationContribution } from './types';

export const ECART_PARENT = 10;
const ECART_FRATRIE = 50;
const ECART_CONJOINTS = 60;

type Cible = { naissance_annee: number | null; deces_annee: number | null } | undefined;
type Proche = { prenom: string; relation: string; naissance_annee: string };

const lire = (a: string | number | null | undefined): number | null => {
    const n = typeof a === 'number' ? a : /^\d{4}$/.test(String(a ?? '').trim()) ? Number(a) : NaN;
    return Number.isFinite(n) ? n : null;
};

/** Les liens possibles entre le visiteur (né en `visiteur`) et la personne choisie de l'arbre. */
export function liensPossibles(visiteur: string | number | null, cible: Cible): (r: RelationContribution) => boolean {
    const v = lire(visiteur);
    const a = lire(cible?.naissance_annee);
    const d = lire(cible?.deces_annee);
    return (r) => {
        try {
            if (v === null) return true;
            switch (r) {
                case 'enfant': return (a === null || v >= a + ECART_PARENT) && (d === null || v <= d + 1);
                case 'petit_enfant': return a === null || v >= a + 2 * ECART_PARENT;
                case 'parent': return a === null || a >= v + ECART_PARENT;
                case 'conjoint': return (d === null || v <= d) && (a === null || Math.abs(v - a) <= ECART_CONJOINTS);
                case 'frere_soeur': return a === null || Math.abs(v - a) <= ECART_FRATRIE;
                default: return true;
            }
        } catch {
            return true; // repli : la page d'avant
        }
    };
}

/** Le premier défaut des proches (prénom manquant, âge impossible), ou null. */
export function defautProches(visiteur: string | number | null, proches: Proche[]): string | null {
    const v = lire(visiteur);
    for (const [k, p] of proches.entries()) {
        const n = `Proche ${k + 1}`;
        if (!p.prenom.trim()) return `${n} : son prénom manque (ou retirez ce proche).`;
        const a = lire(p.naissance_annee);
        if (v === null || a === null) continue;
        if (p.relation === 'parent' && a > v - ECART_PARENT)
            return a >= v
                ? `${n} : un parent né en ${a} serait né après vous (${v}). Vérifiez l’année ou le lien (enfant ?).`
                : `${n} : un parent né en ${a} aurait eu moins de ${ECART_PARENT} ans à votre naissance (${v}). Vérifiez l’année ou le lien.`;
        if (p.relation === 'enfant' && a < v + ECART_PARENT)
            return a <= v
                ? `${n} : un enfant né en ${a} serait né avant vous (${v}). Vérifiez l’année ou le lien (parent ?).`
                : `${n} : un enfant né en ${a} serait né quand vous aviez moins de ${ECART_PARENT} ans (vous êtes né·e en ${v}). Vérifiez l’année ou le lien.`;
    }
    return null;
}

// ---- FIN ANNÉES PLAUSIBLES ----
