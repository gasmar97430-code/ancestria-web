// ---- PRISE DU SITE : DONNÉES SUPABASE → FORMAT DU BUREAU ----
//
// L'écran du bureau (copié tel quel) attend les réponses du serveur du PC :
// identifiants entiers, genre M/F/Other/Unknown, typeLien Biological/Adoptive/Step,
// typeUnion Marriage/…, dates ISO. Ici, la seule traduction, dans les deux sens.
// Numéros : dans l'ordre de création des fiches (cree_le, puis id), comme les
// numéros de fiche du bureau, qui servent d'ordre de rangement.

import { enfantsDesCouples } from './enfantsDesCouples'; // le couple de naissance de chaque enfant (01/10)

export type Uuid = string;

export interface LigneIndividu {
    id: Uuid;
    prenom: string;
    nom: string;
    genre: string;
    naissance: string | null;
    naissance_precision: string;
    lieu_naissance: string | null;
    deces: string | null;
    deces_precision: string;
    lieu_deces: string | null;
    vivant: boolean;
    notes: string | null;
    cree_le: string;
    maj_le: string;
}
export interface LigneUnion { id: Uuid; partenaire_a: Uuid; partenaire_b: Uuid; nature: string; statut: string; debut: string | null; fin: string | null }
export interface LigneFiliation { id: Uuid; parent_id: Uuid; enfant_id: Uuid; nature: string }
export interface DonneesSupabase { individus: LigneIndividu[]; unions: LigneUnion[]; filiations: LigneFiliation[] }

export const PARENT_A_TROUVER = 'Parent à trouver';

const GENRE: Record<string, string> = { homme: 'M', femme: 'F', non_binaire: 'Other', inconnu: 'Unknown' };
export const GENRE_WEB: Record<string, string> = { M: 'homme', F: 'femme', Other: 'non_binaire', Unknown: 'inconnu' };
const LIEN: Record<string, string> = {
    biologique: 'Biological', don_gametes: 'Biological', gestation: 'Biological',
    adoptive: 'Adoptive', legale: 'Adoptive', sociale: 'Adoptive', intention: 'Adoptive',
    beau_parent: 'Step', accueil: 'Step',
};
export const LIEN_WEB: Record<string, string> = { Biological: 'biologique', Adoptive: 'adoptive', Step: 'beau_parent' };
const UNION: Record<string, string> = { mariage: 'Marriage', pacs: 'Civil_Partnership', union_libre: 'Informal', autre: 'Other' };
export const UNION_WEB: Record<string, string> = { Marriage: 'mariage', Civil_Partnership: 'pacs', Informal: 'union_libre', Other: 'autre' };
const STATUT: Record<string, string> = { en_cours: 'Active', separes: 'Separated', divorces: 'Divorced', veuvage: 'Widowed' };
export const STATUT_WEB: Record<string, string> = { Active: 'en_cours', Separated: 'separes', Divorced: 'divorces', Widowed: 'veuvage' };

/** « 1850-01-01 » → « 1850-01-01T00:00:00.000Z » (le bureau stocke minuit UTC). */
export const isoBureau = (d: string | null) => (d ? `${d.slice(0, 10)}T00:00:00.000Z` : null);

export interface Correspondance {
    versBureau: Map<Uuid, number>;
    versWeb: Map<number, Uuid>;
    unionVersBureau: Map<Uuid, number>;
    unionVersWeb: Map<number, Uuid>;
}

export function traduire(d: DonneesSupabase) {
    const tries = [...d.individus].sort((a, b) => (a.cree_le < b.cree_le ? -1 : a.cree_le > b.cree_le ? 1 : a.id < b.id ? -1 : 1));
    const c: Correspondance = { versBureau: new Map(), versWeb: new Map(), unionVersBureau: new Map(), unionVersWeb: new Map() };
    tries.forEach((i, k) => { c.versBureau.set(i.id, k + 1); c.versWeb.set(k + 1, i.id); });

    const people = tries.map((i) => ({
        id: c.versBureau.get(i.id)!,
        nom: i.nom,
        prenom: i.prenom,
        genre: GENRE[i.genre] ?? 'Unknown',
        dateNaissance: isoBureau(i.naissance),
        lieuNaissance: i.lieu_naissance,
        dateDeces: isoBureau(i.deces),
        lieuDeces: i.lieu_deces,
        // Le bureau : true = décédé, false = vivant, null = on ne sait pas. Le site n'a que vivant oui / non.
        decede: i.deces ? true : !i.vivant,
        notes: i.notes,
        createdAt: i.cree_le,
        updatedAt: i.maj_le,
    }));

    const unions = [...d.unions]
        .filter((u) => c.versBureau.has(u.partenaire_a) && c.versBureau.has(u.partenaire_b))
        .map((u, k) => {
            c.unionVersBureau.set(u.id, k + 1);
            c.unionVersWeb.set(k + 1, u.id);
            return {
                id: k + 1,
                partenaire1Id: c.versBureau.get(u.partenaire_a)!,
                partenaire2Id: c.versBureau.get(u.partenaire_b)!,
                typeUnion: UNION[u.nature] ?? 'Other',
                statut: STATUT[u.statut] ?? 'Active',
                dateDebut: isoBureau(u.debut),
                dateFin: isoBureau(u.fin),
                lieuUnion: null,
            };
        });

    const relationships = d.filiations
        .filter((f) => c.versBureau.has(f.parent_id) && c.versBureau.has(f.enfant_id))
        .map((f) => ({ parentId: c.versBureau.get(f.parent_id)!, enfantId: c.versBureau.get(f.enfant_id)!, typeLien: LIEN[f.nature] ?? 'Biological' }));

    // Le couple de naissance de chaque enfant : la paire de ses parents (enfantsDesCouples.ts, 01/10 — la liste vide d'avant
    // rangeait l'arbre autrement qu'au PC).
    return { arbre: { people, unions, relationships, unionChildren: enfantsDesCouples(relationships, unions) }, correspondance: c };
}

// ---- FIN PRISE : TRADUCTION ----
