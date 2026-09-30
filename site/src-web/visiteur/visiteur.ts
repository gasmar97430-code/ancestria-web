// ---- LE VISITEUR DU LIEN PARTAGÉ ----
//
// Ses règles du 30/09/2026 : « Tout visiteur qui arrive (via le lien ou le QR code) atterrit
// directement sur le moteur de recherche de patronymes » ; « Consultation libre : les visiteurs
// peuvent chercher un nom et voir les branches et les personnes décédées » ; rien ne se modifie
// directement, une correction s'écrit à l'administrateur.
//
// Un visiteur arrive par /c/<jeton> (le lien partagé ou le QR code) :
//   - il n'a pas à se connecter (Porte.tsx) ;
//   - l'arbre est lu par arbre_public(jeton) : les personnes DÉCÉDÉES et les liens entre elles,
//     dates à l'année, ni lieux ni notes (supabase/schema.sql) — prise/donnees.ts ;
//   - toute écriture est refusée par la prise, avec le message du verrou (prise/routes.ts) —
//     et la base la refuse de toute façon ;
//   - l'écran du PC ne lui montre aucun geste d'écriture (drapeau lib/lectureSeule.tsx de la copie).
// Lignes d'appel : Porte.tsx, prise/donnees.ts, prise/routes.ts.

import { useLectureSeule } from '../../src/lib/lectureSeule';

/** Le jeton du lien partagé si la page est ouverte par /c/<jeton>, sinon null. */
export function jetonVisiteur(chemin: string = window.location.pathname, base: string = import.meta.env.BASE_URL): string | null {
    const debut = base.endsWith('/') ? base.slice(0, -1) : base;
    const reste = chemin.startsWith(debut) ? chemin.slice(debut.length) : chemin;
    const m = /^\/c\/([A-Za-z0-9_-]{8,200})\/?$/.exec(reste);
    return m ? m[1] : null;
}

/** L'adresse que l'administrateur publie (réglée à la construction), ou null. */
export function emailAdministrateur(): string | null {
    const v = (import.meta.env.VITE_EMAIL_ADMINISTRATEUR as string | undefined)?.trim() ?? '';
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) ? v : null;
}

/** À l'arrivée d'un visiteur : l'écran passe en lecture seule. */
export function entrerEnVisiteur(): void {
    useLectureSeule.setState({ actif: true, email: emailAdministrateur() });
}

export const REFUS_VISITEUR =
    'Cette fiche est verrouillée : elle ne se modifie pas ici. Pour toute correction, écrivez à l’administrateur, M’astel Marius Gastellier, en commençant votre message par le mot « CORRECTION ».';

// ---- FIN LE VISITEUR DU LIEN PARTAGÉ ----
