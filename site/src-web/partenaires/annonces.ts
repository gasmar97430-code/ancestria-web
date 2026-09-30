// ---- PARTENAIRES : LES ANNONCES EN COURS ----
//
// La liste des annonces du portail. VIDE tant qu'aucun partenaire n'a signé : dans ce
// cas rien ne s'affiche et le site est exactement celui d'avant (aucun cadre vide).
//
// Pour accueillir un partenaire : poser son image dans public/partenaires/ (une par
// format fourni) et ajouter ici une entrée. Les règles sont dans emplacements.ts :
// une annonce qui en enfreint une n'est pas affichée, et l'essai annonces.test.ts
// échoue — rien ne part en ligne avec une annonce refusée.
//
// Modèle d'une entrée (bandeau du pied, affiliation) :
//   {
//       id: 'librairie-exemple',
//       emplacement: 'pied',
//       annonceur: 'Nom de l'entreprise',
//       theme: 'livres',
//       lien: 'https://…',                       // le lien de suivi donné par le partenaire
//       texte: 'Ce que dit la bannière, en une phrase',
//       images: { '728x90': 'librairie-728x90.webp', '320x100': 'librairie-320x100.webp' },
//       remuneration: { mode: 'commission', detail: '5 % sur chaque commande' },
//       du: '2026-10-01', au: '2026-12-31',      // facultatif
//   },

import type { Annonce } from './emplacements';

export const ANNONCES: Annonce[] = [];

// ---- FIN PARTENAIRES : LES ANNONCES EN COURS ----
