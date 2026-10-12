// ---- MODIFIER UNE FICHE EN LIGNE, CONNECTÉ (13/10/2026) ----
//
// Ses mots : « donc quand je suis sur la page google et je me connecte je ne peux pas modifier un nom ? » puis « oui »
// (ajouter la correction de n'importe quelle fiche). Avant : « Modifier » répondait « Pas encore disponible ».
//   · Fiche d'un DÉFUNT (publique) : prénom, nom, genre, naissance, lieu de naissance, décès, lieu de décès.
//     La base n'accepte que l'auteur (ou un éditeur) : sécurité par ligne, peut_ecrire. Une fiche venue du PC
//     (« pc:N ») revient au PC à l'ouverture (corrections_proprietaire, déclencheur existant).
//   · Fiche PROTÉGÉE (vivant) : jamais ici. Ses fiches privées passent par fiches-privees/ ; une protégée sans
//     fiche privée se corrige au PC (loi 6 : un vrai nom n'entre jamais dans une fiche publique de vivant).
//   · Jamais : les notes (elles portent le repère « pc:N » qui relie la fiche au PC), remettre un défunt
//     « vivant » ou « on ne sait pas » (au PC, puis « Envoyer vers le site »).
//   · Un visiteur n'arrive jamais ici : routes.ts le refuse avant.
//
// Ligne d'appel : prise/routes.ts (PATCH /people/<n°>, après fiches-privees/).

import { supabase } from '../prise/supabase';
import type { Correspondance } from '../prise/traduction';

type Reponse = { status: number; data: unknown };

const GENRE: Record<string, string> = { M: 'homme', F: 'femme', Other: 'non_binaire', Unknown: 'inconnu' };
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const AU_PC = 'se change dans l’Ancestria du PC (puis « Envoyer vers le site »)';

function date(v: unknown): { ok: true; d: string | null } | { ok: false } {
    const d = typeof v === 'string' ? v.slice(0, 10) : '';
    if (d && !JOUR.test(d)) return { ok: false };
    return { ok: true, d: d || null };
}

/** Règle pure : le corps du « Modifier » de l'écran → les colonnes de la fiche publique d'un défunt. */
export function champsPublics(corps: Record<string, unknown>): { ok: true; champs: Record<string, unknown> } | { ok: false; message: string } {
    if ('notes' in corps) return { ok: false, message: `Les notes : ${AU_PC}.` };
    if ('decede' in corps && corps.decede !== true) return { ok: false, message: `Remettre une personne « vivante » ou « on ne sait pas » ${AU_PC}.` };
    const c: Record<string, unknown> = {};
    if (typeof corps.prenom === 'string') {
        if (!corps.prenom.trim()) return { ok: false, message: 'Le prénom ne peut pas être vide.' };
        c.prenom = corps.prenom.trim().slice(0, 80);
    }
    if (typeof corps.nom === 'string') c.nom = corps.nom.trim().slice(0, 80);
    if (typeof corps.genre === 'string') c.genre = GENRE[corps.genre] ?? 'inconnu';
    for (const [cle, col] of [['dateNaissance', 'naissance'], ['dateDeces', 'deces']] as const) {
        if (!(cle in corps)) continue;
        const r = date(corps[cle]);
        if (!r.ok) return { ok: false, message: 'Date illisible.' };
        c[col] = r.d;
        c[`${col}_precision`] = r.d && r.d.endsWith('-01-01') ? 'annee' : 'jour';
    }
    for (const [cle, col] of [['lieuNaissance', 'lieu_naissance'], ['lieuDeces', 'lieu_deces']] as const) {
        if (cle in corps) c[col] = typeof corps[cle] === 'string' && (corps[cle] as string).trim() ? (corps[cle] as string).trim().slice(0, 120) : null;
    }
    if (corps.decede === true) c.vivant = false;
    return { ok: true, champs: c };
}

/** « Modifier » d'une fiche publique (défunt). Réponse toujours (cette adresse n'a pas d'autre chemin en ligne). */
export async function modifierFiche(chemin: string, corps: unknown, correspondance: () => Promise<Correspondance>): Promise<Reponse | null> {
    const m = /^\/people\/(\d+)$/.exec(chemin);
    if (!m) return null;
    const id = (await correspondance()).versWeb.get(Number(m[1]));
    if (!id) return { status: 404, data: { error: 'Fiche introuvable en ligne (rechargez la page).' } };
    const { data: ligne, error: e1 } = await supabase.from('individus').select('id, vivant').eq('id', id).range(0, 0);
    if (e1) return { status: 500, data: { error: e1.message } };
    const fiche = (ligne as { id: string; vivant: boolean }[] | null)?.[0];
    if (!fiche) return { status: 404, data: { error: 'Fiche introuvable en ligne (rechargez la page).' } };
    if (fiche.vivant) return { status: 400, data: { error: `Fiche protégée (personne vivante) : elle ${AU_PC}.` } };
    const r = champsPublics((corps ?? {}) as Record<string, unknown>);
    if (!r.ok) return { status: 400, data: { error: r.message } };
    if (!Object.keys(r.champs).length) return { status: 200, data: { ok: true } };
    const { data, error } = await supabase.from('individus').update(r.champs).eq('id', id).select('id');
    if (error) return { status: 400, data: { error: error.message } };
    if (!data?.length) return { status: 403, data: { error: 'Seul l’auteur connecté peut modifier une fiche.' } };
    return { status: 200, data: { ok: true } };
}

// ---- FIN MODIFIER UNE FICHE EN LIGNE ----
