// ---- FILE D'ENVOI HORS LIGNE (page publique) ----
// Une proposition faite sans réseau (fond de ravine, réunion sans wifi) est
// gardée dans le téléphone et repart seule au retour du réseau. Chaque
// envoi porte un identifiant : la base ne voit jamais deux fois le même
// (on le retire de la file dès que la base a répondu, même par un refus).

import type { ContenuContribution } from '../domaine/types';

export interface EnvoiEnAttente {
    uid: string;
    jeton: string;
    pin: string | null;
    contenu: ContenuContribution;
    contact: string | null;
    le: string;
}

export type Reponse = { ok: true } | { ok: false; raison: string };
export type Envoyeur = (e: EnvoiEnAttente) => Promise<Reponse>;

const CLE = 'ancestria-a-envoyer';
const MAX = 50;

function lire(stockage: Storage): EnvoiEnAttente[] {
    try {
        const v = JSON.parse(stockage.getItem(CLE) ?? '[]') as unknown;
        return Array.isArray(v) ? (v as EnvoiEnAttente[]) : [];
    } catch {
        return [];
    }
}

function ecrire(stockage: Storage, liste: EnvoiEnAttente[]): void {
    try {
        stockage.setItem(CLE, JSON.stringify(liste.slice(-MAX)));
    } catch {
        /* stockage plein ou interdit (navigation privée) : on ne peut rien garder */
    }
}

export function mettreEnAttente(stockage: Storage, e: EnvoiEnAttente): void {
    const l = lire(stockage).filter((x) => x.uid !== e.uid);
    ecrire(stockage, [...l, e]);
}

export const enAttente = (stockage: Storage) => lire(stockage);

/**
 * Réessaie tout ce qui attend. Une erreur RÉSEAU (exception) garde l'envoi ;
 * toute réponse de la base (acceptée ou refusée) le retire.
 */
export async function vider(stockage: Storage, envoyer: Envoyeur): Promise<{ envoyes: number; refuses: number; restants: number }> {
    let envoyes = 0;
    let refuses = 0;
    const restants: EnvoiEnAttente[] = [];
    for (const e of lire(stockage)) {
        try {
            const r = await envoyer(e);
            if (r.ok) envoyes++;
            else refuses++;
        } catch {
            restants.push(e);
        }
    }
    ecrire(stockage, restants);
    return { envoyes, refuses, restants: restants.length };
}

// ---- FIN FILE D'ENVOI HORS LIGNE ----
