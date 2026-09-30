// ---- ACCÈS AUX DONNÉES DE L'ARBRE ----
// Supabase renvoie au plus 1 000 lignes par requête : tout est lu par pages
// (ordre stable par id), pour qu'un grand arbre ne soit jamais tronqué en
// silence.

import { supabase } from '../lib/supabase';
import { messageErreur } from '../domaine/erreurs';
import type { DonneesArbre, Filiation, Foyer, FoyerParent, Individu, Union } from '../domaine/types';

const PAGE = 1000;

export class ErreurDonnees extends Error {
    constructor(e: unknown) {
        super(messageErreur(e));
        this.name = 'ErreurDonnees';
    }
}

/** Lit toutes les lignes d'une table d'un arbre, page par page. */
export async function toutLire<T>(table: string, arbreId: string, colonnes = '*', cleOrdre = 'id'): Promise<T[]> {
    const lignes: T[] = [];
    for (let debut = 0; ; debut += PAGE) {
        const { data, error } = await supabase
            .from(table)
            .select(colonnes)
            .eq('arbre_id', arbreId)
            .order(cleOrdre, { ascending: true })
            .range(debut, debut + PAGE - 1);
        if (error) throw new ErreurDonnees(error);
        lignes.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return lignes;
    }
}

export async function chargerArbre(arbreId: string): Promise<DonneesArbre> {
    const [individus, unions, foyers, foyerParents, filiations] = await Promise.all([
        toutLire<Individu>('individus', arbreId),
        toutLire<Union>('unions', arbreId),
        toutLire<Foyer>('foyers', arbreId),
        toutLire<FoyerParent>('foyer_parents', arbreId, '*', 'individu_id'),
        toutLire<Filiation>('filiations', arbreId),
    ]);
    return { individus, unions, foyers, foyerParents, filiations };
}

/** Exécute une écriture et transforme toute erreur en phrase claire. */
export async function ecrire<T>(promesse: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
    let r: { data: T; error: unknown };
    try {
        r = await promesse;
    } catch (e) {
        throw new ErreurDonnees(e);
    }
    if (r.error) throw new ErreurDonnees(r.error);
    return r.data;
}

// ---- FIN ACCÈS AUX DONNÉES DE L'ARBRE ----
