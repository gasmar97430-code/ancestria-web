// ---- OFFRES ET LICENCES ----
// Toute différence entre gratuit, famille et collectivité passe par ce
// module ET par la base (limites_offres) — la base fait foi : même un client
// modifié ne peut pas dépasser sa limite. Brancher Stripe ne touche que
// stripe.ts et les deux fonctions Supabase (supabase/functions) ; le site
// reste un site statique (GitHub Pages).

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { EtatOffre, Offre } from '../domaine/types';

export const FONCTIONS = {
    partagesMultiples: { libelle: 'Plusieurs partages ouverts à la fois', offres: ['famille', 'institution'] },
    individusIllimites: { libelle: 'Plus de 500 individus', offres: ['famille', 'institution'] },
    documentsIllimites: { libelle: 'Plus de 50 documents d’archives', offres: ['famille', 'institution'] },
    patrimoinePublic: { libelle: 'Espace public « Patrimoine & tourisme de racines »', offres: ['institution'] },
    exportCertifie: { libelle: 'Export patrimonial certifié (empreinte SHA-256 vérifiable)', offres: ['institution'] },
} as const satisfies Record<string, { libelle: string; offres: readonly Offre[] }>;
export type Fonction = keyof typeof FONCTIONS;

export const OFFRES: { id: Offre; nom: string; pour: string; prix: string; points: string[] }[] = [
    { id: 'gratuit', nom: 'Gratuit', pour: 'Pour commencer en famille', prix: '0 €', points: ['500 individus par arbre', '1 partage QR ouvert à la fois', '50 documents d’archives', 'Temps réel, foyers, modération'] },
    { id: 'famille', nom: 'Famille', pour: 'Pour les grandes familles', prix: 'abonnement', points: ['Individus illimités', 'Partages QR illimités', 'Documents illimités', 'Tout le gratuit'] },
    { id: 'institution', nom: 'Licence collectivité', pour: 'Mairies, départements, régions', prix: 'sur devis', points: ['Espace public Patrimoine & tourisme de racines', 'Carte, personnalités illustres, familles historiques', 'Export patrimonial certifié', 'Tout Famille'] },
];

export function disponible(etat: EtatOffre | null, f: Fonction): boolean {
    return Boolean(etat && (FONCTIONS[f].offres as readonly Offre[]).includes(etat.offre));
}

export function useEtatOffre(arbreId: string | undefined): { etat: EtatOffre | null; recharger: () => void } {
    const [etat, setEtat] = useState<EtatOffre | null>(null);
    const recharger = useCallback(() => {
        if (!arbreId) return;
        void supabase.rpc('etat_offre', { p_arbre: arbreId }).then(({ data }) => setEtat((data as EtatOffre | null) ?? null));
    }, [arbreId]);
    useEffect(recharger, [recharger]);
    return { etat, recharger };
}

/** Affiche les enfants si la fonction est dans l'offre, sinon une porte vers les offres. */
export function Reserve({ etat, fonction, children }: { etat: EtatOffre | null; fonction: Fonction; children: ReactNode }) {
    if (!etat) return null;
    if (disponible(etat, fonction)) return <>{children}</>;
    return (
        <div className="rounded-2xl border border-dashed border-sepia/60 p-4 text-sm text-encre-2">
            <b className="text-sepia">{FONCTIONS[fonction].libelle}</b> — réservé à l’offre {(FONCTIONS[fonction].offres as readonly Offre[]).includes('famille') ? 'Famille' : 'collectivité'}.{' '}
            <Link to="/offres" className="text-sepia underline underline-offset-4">Voir les offres</Link>
        </div>
    );
}

/** « 312 / 500 » avec une barre ; rien si illimité. */
export function Jauge({ libelle, valeur, max }: { libelle: string; valeur: number; max: number | null }) {
    if (max === null) return <div className="text-xs text-encre-3">{libelle} : {valeur} (illimité)</div>;
    const pc = Math.min(100, Math.round((100 * valeur) / max));
    return (
        <div className="text-xs text-encre-3">
            {libelle} : {valeur} / {max}
            <div className="mt-1 h-1.5 rounded-full bg-trait overflow-hidden" role="progressbar" aria-valuenow={valeur} aria-valuemin={0} aria-valuemax={max} aria-label={libelle}>
                <div className={`h-full ${pc >= 90 ? 'bg-rouge' : 'bg-sepia'}`} style={{ width: `${pc}%` }} />
            </div>
        </div>
    );
}

// ---- FIN OFFRES ET LICENCES ----
