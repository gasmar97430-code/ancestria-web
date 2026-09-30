// ---- IMPORT GEDCOM : ÉCRITURE DANS L'ARBRE ----
//
// Ordre : personnes, puis couples, puis liens parent → enfant. Par paquets de
// 100 ; un paquet refusé est repris ligne par ligne, pour que les règles de
// la base (boucles, dates absurdes, 3e parent biologique…) ne refusent QUE la
// ligne en cause. Chaque refus est rendu avec son motif, rien n'est tu.
// Une personne refusée : ses couples et ses liens sont refusés avec elle.
// La limite de l'offre atteinte, pas le droit d'écrire, réseau ou session perdus : l'import s'arrête et le dit.
// L'écrivain est passé en paramètre : Supabase dans le site, PGlite + vrai
// schéma dans les essais.

import { messageErreur } from '../domaine/erreurs';
import type { LigneFiliation, LigneIndividu, LigneUnion, PlanImport } from './versWeb';

export type Table = 'individus' | 'unions' | 'filiations';

export interface ErreurEcriture {
    message: string;
    /** Indice de la base (hint) : OFFRE_LIMITE_INDIVIDUS, BOUCLE, DATES… */
    indice: string | null;
}

export interface Ecrivain {
    /** Insère les lignes ; rend null si tout est passé, sinon l'erreur (rien n'est écrit du paquet). */
    inserer(table: Table, lignes: Record<string, unknown>[]): Promise<ErreurEcriture | null>;
}

export interface Refus {
    quoi: 'personne' | 'couple' | 'lien';
    libelle: string;
    motif: string;
}

export interface ResultatImport {
    personnes: number;
    couples: number;
    liens: number;
    refus: Refus[];
    /** L'import s'est arrêté avant la fin (limite de l'offre, réseau…). */
    arrete: string | null;
}

export type Progres = (fait: number, total: number) => void;

const PAQUET = 100;

export async function importer(arbreId: string, plan: PlanImport, ecrivain: Ecrivain, progres: Progres = () => {}): Promise<ResultatImport> {
    const r: ResultatImport = { personnes: 0, couples: 0, liens: 0, refus: [], arrete: null };
    const total = plan.individus.length + plan.unions.length + plan.filiations.length;
    let fait = 0;
    const absents = new Set<string>();

    async function ecrire<T>(table: Table, lignes: T[], versBase: (l: T) => Record<string, unknown>, quoi: Refus['quoi'], nom: (l: T) => string,
        reussi: (l: T) => void, refuse: (l: T) => void): Promise<boolean> {
        for (let i = 0; i < lignes.length; i += PAQUET) {
            const paquet = lignes.slice(i, i + PAQUET);
            const erreur = await ecrivain.inserer(table, paquet.map(versBase));
            if (!erreur) {
                paquet.forEach(reussi);
            } else {
                for (const l of paquet) {
                    const e = await ecrivain.inserer(table, [versBase(l)]);
                    if (!e) {
                        reussi(l);
                        continue;
                    }
                    if (e.indice === 'OFFRE_LIMITE_INDIVIDUS' || /Pas de connexion|session a expiré|pas le droit/.test(e.message)) {
                        r.arrete = e.message;
                        return false;
                    }
                    r.refus.push({ quoi, libelle: nom(l), motif: e.message });
                    refuse(l);
                }
            }
            fait += paquet.length;
            progres(fait, total);
        }
        return true;
    }

    const suite = await ecrire<LigneIndividu>(
        'individus', plan.individus,
        ({ xref: _x, ...l }) => ({ ...l, arbre_id: arbreId }),
        'personne', (l) => [l.prenom, l.nom].filter(Boolean).join(' '),
        () => (r.personnes += 1), (l) => absents.add(l.id),
    );
    if (!suite) return r;

    const sansAbsent = <T>(lignes: T[], ids: (l: T) => string[], quoi: Refus['quoi'], nom: (l: T) => string) =>
        lignes.filter((l) => {
            if (!ids(l).some((x) => absents.has(x))) return true;
            r.refus.push({ quoi, libelle: nom(l), motif: 'Une des personnes n’a pas été importée (voir plus haut).' });
            fait += 1;
            return false;
        });

    const unions = sansAbsent<LigneUnion>(plan.unions, (u) => [u.partenaire_a, u.partenaire_b], 'couple', (u) => u.libelle);
    if (!(await ecrire<LigneUnion>('unions', unions, ({ libelle: _l, ...u }) => ({ ...u, arbre_id: arbreId }), 'couple', (u) => u.libelle,
        () => (r.couples += 1), () => {}))) return r;

    const liens = sansAbsent<LigneFiliation>(plan.filiations, (f) => [f.parent_id, f.enfant_id], 'lien', (f) => f.libelle);
    await ecrire<LigneFiliation>('filiations', liens, ({ libelle: _l, ...f }) => ({ ...f, arbre_id: arbreId }), 'lien', (f) => f.libelle,
        () => (r.liens += 1), () => {});
    progres(total, total);
    return r;
}

/** L'erreur d'une écriture Supabase / PostgREST, en français clair (messageErreur du site). */
export function versErreurEcriture(e: { message?: string; code?: string; hint?: string | null; details?: string | null }): ErreurEcriture {
    return { message: messageErreur(e), indice: e.hint ?? null };
}

// ---- FIN IMPORT GEDCOM : ÉCRITURE DANS L'ARBRE ----
