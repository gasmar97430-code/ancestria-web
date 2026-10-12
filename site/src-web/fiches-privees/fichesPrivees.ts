// ---- FICHES PRIVÉES DE L'AUTEUR, SUR LE SITE (12/10/2026) ----
//
// Ses mots : « tous ces noms sont de ma famille que je n'ai pas terminé donc il faut j'ai accès » · « si je vais
// leur faire une visite j'aurai tout de suite le moyen de discuter avec eux et du même coup remplir les fiches ».
// Loi 6, nouvelle forme : un vivant n'est jamais visible du public ni d'un inscrit ; en ligne, seul l'AUTEUR
// connecté voit et remplit ses vraies données.
//   · Lecture : la base ne rend les lignes de fiches_privees qu'au propriétaire de l'arbre (sécurité par ligne,
//     supabase/schema.sql) ; pour tout autre compte la liste est vide, et rien ne change à l'écran. Un visiteur
//     (lien partagé) ne passe jamais par ici : il lit arbre_public.
//   · Écriture : « Modifier » sur une fiche privée → fiches_privees (jamais la fiche publique) ; la base en fait une
//     correction qui revient au PC à l'ouverture de l'appli (corrections_proprietaire).
//   · Rien n'est gardé sur l'appareil : le mode hors connexion ne garde que l'arbre public (public/sw.js).
//
// Lignes d'appel : prise/donnees.ts (chargerArbre) et prise/routes.ts (PATCH /people/<n°>).

import { supabase } from '../prise/supabase';
import type { Correspondance, LigneIndividu, Uuid } from '../prise/traduction';

export const MARQUE_PRIVEE = 'Fiche privée — visible par vous seul, connecté (en ligne, les autres voient « Fiche protégée »).';

type LignePrivee = { individu_id: Uuid; prenom: string; nom: string; genre: string; naissance: string | null; naissance_precision: string; lieu_naissance: string | null };
type Reponse = { status: number; data: unknown };

const COLONNES = 'individu_id, prenom, nom, genre, naissance, naissance_precision, lieu_naissance';
let privees = new Set<Uuid>();

/** Règle pure : les vraies données remplacent « Fiche protégée » sur les seules fiches privées reçues. */
export function superposer(individus: LigneIndividu[], lignes: LignePrivee[]): LigneIndividu[] {
    const parId = new Map(lignes.map((l) => [l.individu_id, l]));
    return individus.map((i) => {
        const l = parId.get(i.id);
        if (!l || !i.vivant) return i;
        return { ...i, prenom: l.prenom, nom: l.nom, genre: l.genre, naissance: l.naissance, naissance_precision: l.naissance_precision,
            lieu_naissance: l.lieu_naissance, notes: MARQUE_PRIVEE };
    });
}

/** Chargement de l'arbre (compte connecté) : superpose ses fiches privées ; en cas de souci, l'arbre reste tel quel. */
export async function superposerPrives(individus: LigneIndividu[], arbreId: Uuid): Promise<LigneIndividu[]> {
    try {
        const lignes: LignePrivee[] = [];
        for (let debut = 0; ; debut += 1000) {
            const { data, error } = await supabase.from('fiches_privees').select(COLONNES).eq('arbre_id', arbreId).order('individu_id').range(debut, debut + 999);
            if (error) { privees = new Set(); return individus; }   // table absente (script pas encore rejoué) : rien ne change
            lignes.push(...((data ?? []) as LignePrivee[]));
            if (!data || data.length < 1000) break;
        }
        privees = new Set(lignes.map((l) => l.individu_id));
        return superposer(individus, lignes);
    } catch {
        privees = new Set();
        return individus;
    }
}

const GENRE: Record<string, string> = { M: 'homme', F: 'femme' };
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const AU_PC = ['dateDeces', 'lieuDeces', 'decede', 'notes'];

/** Règle pure : le corps du « Modifier » de l'écran → les colonnes de fiches_privees. Refus si un champ ne s'y range pas. */
export function champsPrives(corps: Record<string, unknown>): { ok: true; champs: Record<string, unknown> } | { ok: false; message: string } {
    const autres = Object.keys(corps).filter((k) => AU_PC.includes(k));
    if (autres.length) return { ok: false, message: 'Le décès, le statut et les notes se changent dans l’Ancestria du PC (puis « Envoyer vers le site »). Ici : prénom, nom, genre, naissance et lieu de naissance.' };
    const c: Record<string, unknown> = {};
    if (typeof corps.prenom === 'string') {
        if (!corps.prenom.trim()) return { ok: false, message: 'Le prénom ne peut pas être vide.' };
        c.prenom = corps.prenom.trim().slice(0, 80);
    }
    if (typeof corps.nom === 'string') c.nom = corps.nom.trim().slice(0, 80);
    if (typeof corps.genre === 'string') c.genre = GENRE[corps.genre] ?? 'inconnu';
    if ('dateNaissance' in corps) {
        const d = typeof corps.dateNaissance === 'string' ? corps.dateNaissance.slice(0, 10) : '';
        if (d && !JOUR.test(d)) return { ok: false, message: 'Date de naissance illisible.' };
        c.naissance = d || null;
        c.naissance_precision = d && d.endsWith('-01-01') ? 'annee' : 'jour';
    }
    if ('lieuNaissance' in corps) c.lieu_naissance = typeof corps.lieuNaissance === 'string' && corps.lieuNaissance.trim() ? corps.lieuNaissance.trim().slice(0, 120) : null;
    return { ok: true, champs: c };
}

/** « Modifier » sur une fiche : réponse si c'est une fiche privée, sinon null (le chemin habituel reste le même). */
export async function modifierPrive(chemin: string, corps: unknown, correspondance: () => Promise<Correspondance>): Promise<Reponse | null> {
    const m = /^\/people\/(\d+)$/.exec(chemin);
    if (!m) return null;
    const id = (await correspondance()).versWeb.get(Number(m[1]));
    if (!id || !privees.has(id)) return null;
    const r = champsPrives((corps ?? {}) as Record<string, unknown>);
    if (!r.ok) return { status: 400, data: { error: r.message } };
    if (!Object.keys(r.champs).length) return { status: 200, data: { ok: true } };
    const { data, error } = await supabase.from('fiches_privees').update(r.champs).eq('individu_id', id).select('individu_id');
    if (error) return { status: 500, data: { error: error.message } };
    if (!data?.length) return { status: 403, data: { error: 'Cette fiche privée ne se modifie qu’avec le compte de l’auteur.' } };
    return { status: 200, data: { ok: true } };
}

// ---- FIN FICHES PRIVÉES DE L'AUTEUR, SUR LE SITE ----
