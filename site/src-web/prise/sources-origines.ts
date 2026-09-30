// ---- PRISE DU SITE : LES SOURCES DES ORIGINES ----
//
// Loi 3 (30/09/2026) : « Rigueur scientifique et historique absolue sur les origines
// géographiques (pas d'approximations) ». Au bureau, la route /api/patronymes/sources
// lit la table patronyme_source ; ici, les mêmes lignes viennent de
// copie-serveur/sources-origines.json, écrit par scripts/copier-bureau.mjs à partir du
// relevé du bureau. Lecture seule : personne ne saisit une source depuis le site.
//
// Appelé par une ligne dans routes.ts. Retirer ce fichier et cette ligne : la fiche d'un
// nom redevient celle d'avant (origine sans sa source).

import releve from '../copie-serveur/sources-origines.json';

export interface LigneSource {
    id: number;
    nom: string;
    titre: string;
    editeur: string;
    adresse: string | null;
    nature: string;
    passage: string;
    repere: string | null;
    etablit: string;
    releve: string;
}

/** Sans accents ni casse : la même clé que le serveur du bureau (api/sources-origines.ts). */
export const cleNom = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// Rangées comme le serveur du bureau : par nom, puis dans l'ordre du relevé.
const SOURCES: LigneSource[] = [...(releve as { sources: LigneSource[] }).sources].sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : a.id - b.id));

export function sourcesDesOrigines(nom?: string): { total: number; items: LigneSource[] } {
    const demande = typeof nom === 'string' && nom.trim() !== '' ? cleNom(nom) : null;
    const items = demande ? SOURCES.filter((s) => cleNom(s.nom) === demande) : SOURCES;
    return { total: items.length, items };
}

// ---- FIN PRISE : LES SOURCES DES ORIGINES ----
