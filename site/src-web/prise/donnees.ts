// ---- PRISE DU SITE : L'ARBRE UNIQUE ----
//
// Un seul univers (sa demande du 30/09) : le site montre SON arbre, le premier
// de « mes_arbres » du compte connecté. Tout est lu par pages de 1 000 lignes
// (limite de Supabase) pour qu'un grand arbre ne soit jamais tronqué, dans l'ordre de
// création (celui de la saisie au bureau : l'arbre du bureau range dans cet ordre).
// La traduction vers le format du bureau est gardée pour les écritures
// (numéro du bureau → identifiant de la base).

import { supabase } from './supabase';
import { traduire, type Correspondance, type DonneesSupabase } from './traduction';
import { jetonVisiteur } from '../visiteur/visiteur'; // visiteur.ts : un visiteur lit arbre_public (décédés seulement)

const PAGE = 1000;

async function toutLire<T>(table: string, arbreId: string): Promise<T[]> {
    const lignes: T[] = [];
    for (let debut = 0; ; debut += PAGE) {
        const { data, error } = await supabase.from(table).select('*').eq('arbre_id', arbreId).order('cree_le').order('id').range(debut, debut + PAGE - 1);
        if (error) throw new Error(error.message);
        lignes.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return lignes;
    }
}

let arbreId: string | null = null;
let derniere: Correspondance | null = null;

export async function arbreCourant(): Promise<string> {
    if (arbreId) return arbreId;
    const { data, error } = await supabase.rpc('mes_arbres');
    if (error) throw new Error(error.message);
    const premier = (data as { id: string }[] | null)?.[0];
    if (!premier) throw new Error('Aucun arbre dans ce compte.');
    arbreId = premier.id;
    return arbreId;
}

export async function chargerArbre() {
    const jeton = jetonVisiteur();
    if (jeton) {
        const { data, error } = await supabase.rpc('arbre_public', { p_jeton: jeton });
        if (error) throw new Error(error.message);
        const r = data as { ok: boolean; raison?: string } & Partial<DonneesSupabase>;
        if (!r.ok) throw new Error(r.raison === 'lien_ferme' ? 'Ce partage est fermé ou a expiré.' : 'Ce lien n’ouvre pas d’arbre.');
        const t = traduire({ individus: r.individus ?? [], unions: r.unions ?? [], filiations: r.filiations ?? [] });
        derniere = t.correspondance;
        return t.arbre;
    }
    const id = await arbreCourant();
    const [individus, unions, filiations] = await Promise.all([
        toutLire<DonneesSupabase['individus'][number]>('individus', id),
        toutLire<DonneesSupabase['unions'][number]>('unions', id),
        toutLire<DonneesSupabase['filiations'][number]>('filiations', id),
    ]);
    const t = traduire({ individus, unions, filiations });
    derniere = t.correspondance;
    return t.arbre;
}

/** La correspondance numéros du bureau ↔ identifiants de la base (après un chargement). */
export async function correspondance(): Promise<Correspondance> {
    if (!derniere) await chargerArbre();
    return derniere!;
}

// ---- FIN PRISE : L'ARBRE UNIQUE ----
