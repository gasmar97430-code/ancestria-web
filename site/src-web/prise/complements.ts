// ---- PRISE : COUPLES « DE PASSAGE » ET ORDRE DE NAISSANCE (10/10/2026) ----
//
// Sa demande : « maintenant corrige en ligne ». L'écran du PC demande /api/relations-passage (numéros des couples
// « De passage ») et /api/rangs-naissance ([{ individuId, rang }]). Ici : lus dans les tables relations_passage et
// rangs_naissance (envoyées par l'appli, envoi_pc_complements), traduits vers les numéros de l'écran par la
// correspondance de l'arbre chargé. Table absente (schema.sql pas encore rejoué) ou visiteur : rien, comme avant.
//
// Lignes d'appel : prise/routes.ts (deux adresses).

import { supabase } from './supabase';
import { arbreCourant, correspondance } from './donnees';
import { jetonVisiteur } from '../visiteur/visiteur';

export async function relationsPassage(): Promise<number[]> {
    try {
        if (jetonVisiteur()) return [];
        const id = await arbreCourant();
        const { data, error } = await supabase.from('relations_passage').select('union_id').eq('arbre_id', id);
        if (error || !data) return [];
        const c = await correspondance();
        return (data as { union_id: string }[]).map((r) => c.unionVersBureau.get(r.union_id)).filter((n): n is number => n !== undefined);
    } catch {
        return [];
    }
}

export async function rangsNaissance(): Promise<{ individuId: number; rang: number }[]> {
    try {
        if (jetonVisiteur()) return [];
        const id = await arbreCourant();
        const { data, error } = await supabase.from('rangs_naissance').select('individu_id, rang').eq('arbre_id', id);
        if (error || !data) return [];
        const c = await correspondance();
        return (data as { individu_id: string; rang: number }[])
            .map((r) => ({ individuId: c.versBureau.get(r.individu_id), rang: r.rang }))
            .filter((r): r is { individuId: number; rang: number } => r.individuId !== undefined);
    } catch {
        return [];
    }
}

// ---- FIN PRISE : COUPLES « DE PASSAGE » ET ORDRE DE NAISSANCE ----
