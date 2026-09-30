// ---- TEMPS RÉEL ----
// Ce qu'un autre membre ajoute, modifie ou supprime apparaît chez tous, sans
// recharger la page. Supabase Realtime (postgres_changes) respecte la
// sécurité par ligne : on ne reçoit que ce qu'on a le droit de lire.
//
// - Ajouts et modifications : filtrés sur l'arbre (arbre_id=eq.…).
// - Suppressions : Postgres ne permet pas de les filtrer ; on les écoute sur
//   la table et on ne recharge que si l'id supprimé est dans notre arbre.
// - Plusieurs changements rapprochés = un seul rechargement (250 ms).
// - À la reconnexion (réseau revenu), on recharge : rien n'est manqué.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const TABLES = ['individus', 'unions', 'foyers', 'foyer_parents', 'filiations', 'documents', 'document_individus'] as const;

export type EtatDirect = 'connexion' | 'direct' | 'coupe';

export function useTempsReel(arbreId: string | undefined, recharger: () => void, idsConnus: () => Set<string>): EtatDirect {
    const [etat, setEtat] = useState<EtatDirect>('connexion');
    const rappel = useRef(recharger);
    const connus = useRef(idsConnus);
    rappel.current = recharger;
    connus.current = idsConnus;

    useEffect(() => {
        if (!arbreId) return;
        let minuterie: ReturnType<typeof setTimeout> | undefined;
        let dejaConnecte = false;
        const plusTard = () => {
            clearTimeout(minuterie);
            minuterie = setTimeout(() => rappel.current(), 250);
        };
        let canal = supabase.channel(`arbre:${arbreId}`);
        for (const table of TABLES) {
            canal = canal
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `arbre_id=eq.${arbreId}` }, plusTard)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `arbre_id=eq.${arbreId}` }, plusTard)
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (charge) => {
                    const ancien = charge.old as Record<string, unknown>;
                    const ids = connus.current();
                    const touche = ['id', 'individu_id', 'foyer_id', 'document_id'].some((c) => typeof ancien[c] === 'string' && ids.has(ancien[c] as string));
                    if (touche || ancien.arbre_id === arbreId) plusTard();
                });
        }
        canal.subscribe((statut) => {
            if (statut === 'SUBSCRIBED') {
                setEtat('direct');
                if (dejaConnecte) plusTard(); // reconnexion : on rattrape
                dejaConnecte = true;
            } else if (statut === 'CHANNEL_ERROR' || statut === 'TIMED_OUT' || statut === 'CLOSED') {
                setEtat('coupe');
            }
        });
        return () => {
            clearTimeout(minuterie);
            void supabase.removeChannel(canal);
        };
    }, [arbreId]);

    return etat;
}

// ---- FIN TEMPS RÉEL ----
