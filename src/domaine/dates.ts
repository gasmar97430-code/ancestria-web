// ---- DATES ----
// Saisie telle qu'on la tape : « 24/04/1962 », « 24-04-1962 », « 24041962 »
// (8 chiffres d'affilée), ou « 1962 » (année seule, précision « annee »,
// rangée au 1er janvier comme dans la base). Une date impossible
// (31/02/1962) est refusée, jamais « corrigée » en silence.

import type { Precision } from './types';

export type DateLue = { date: string; precision: Precision };
export type LectureDate = { ok: true; valeur: DateLue | null } | { ok: false; erreur: string };

const deux = (n: number) => String(n).padStart(2, '0');

function dateReelle(a: number, m: number, j: number): boolean {
    if (a < 1000 || m < 1 || m > 12 || j < 1) return false;
    const d = new Date(Date.UTC(a, m - 1, j));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

/** Aujourd'hui (AAAA-MM-JJ, heure locale). Paramétrable pour les essais. */
export function aujourdhui(maintenant = new Date()): string {
    return `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
}

export function lireDate(texte: string, maintenant = new Date()): LectureDate {
    const t = texte.trim();
    if (t === '') return { ok: true, valeur: null };
    let a: number, m: number, j: number;
    let precision: Precision = 'jour';
    let r: RegExpMatchArray | null;
    if ((r = t.match(/^(\d{4})$/))) {
        a = Number(r[1]);
        m = 1;
        j = 1;
        precision = 'annee';
    } else if ((r = t.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/))) {
        j = Number(r[1]);
        m = Number(r[2]);
        a = Number(r[3]);
    } else if ((r = t.match(/^(\d{2})(\d{2})(\d{4})$/))) {
        j = Number(r[1]);
        m = Number(r[2]);
        a = Number(r[3]);
    } else if ((r = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
        a = Number(r[1]);
        m = Number(r[2]);
        j = Number(r[3]);
    } else {
        return { ok: false, erreur: 'Date illisible : écrivez JJ/MM/AAAA, JJMMAAAA ou l’année seule (AAAA).' };
    }
    if (!dateReelle(a, m, j)) return { ok: false, erreur: 'Cette date n’existe pas.' };
    const date = `${a}-${deux(m)}-${deux(j)}`;
    if (date > aujourdhui(maintenant)) return { ok: false, erreur: 'Cette date est dans le futur.' };
    return { ok: true, valeur: { date, precision } };
}

/** Pour remplir un champ de saisie depuis la base. */
export function dateVersSaisie(date: string | null, precision: Precision): string {
    if (!date) return '';
    const [a, m, j] = date.slice(0, 10).split('-');
    return precision === 'annee' ? a : `${j}/${m}/${a}`;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 24 avril 1962 » ou « 1962 ». */
export function dateLisible(date: string | null, precision: Precision): string {
    if (!date) return '';
    const [a, m, j] = date.slice(0, 10).split('-').map(Number);
    if (precision === 'annee') return String(a);
    return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}

/** Dernier jour possible d'une date selon sa précision (même règle que public.date_max). */
export function dateMax(date: string, precision: Precision): string {
    return precision === 'annee' ? `${date.slice(0, 4)}-12-31` : date.slice(0, 10);
}

/** Ajoute des années / jours à une date AAAA-MM-JJ (29 février → 28 février, comme PostgreSQL). */
export function ajouter(date: string, annees: number, jours = 0): string {
    const [a, m, j] = date.slice(0, 10).split('-').map(Number);
    const an = a + annees;
    const jour = m === 2 && j === 29 && !dateReelle(an, 2, 29) ? 28 : j;
    const d = new Date(Date.UTC(an, m - 1, jour));
    d.setUTCDate(d.getUTCDate() + jours);
    return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

export function annee(date: string | null): number | null {
    return date ? Number(date.slice(0, 4)) : null;
}

// ---- FIN DATES ----
