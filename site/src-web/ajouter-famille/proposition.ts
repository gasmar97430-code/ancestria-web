// ---- PROPOSITION D'UNE FAMILLE (le contenu envoyé) ----
//
// Ce que le visiteur propose quand son nom n'est pas dans la base : lui-même et ses proches de
// cette famille. Le contenu a EXACTEMENT la forme que la base attend déjà
// (supabase/schema.sql : soumettre_contribution contrôle, accepter_contribution verse dans
// l'arbre) : aucune table ni fonction nouvelle.
//   - contributeur : la personne qui propose (prénom obligatoire), vivante ;
//   - lien : relation « inconnu » (personne de l'arbre à qui se rattacher) et, en texte, la famille ;
//   - proches : parent / enfant / conjoint, 20 au plus, prénom obligatoire ;
//   - message : ce qu'il sait de la famille (origine, communes…), 2000 signes au plus ;
//   - inscrit : ajouté à l'envoi (nom, prénom, version de la charte) — aucune proposition anonyme.
// Rien n'entre dans l'arbre sans l'accord de l'administrateur.

export type RelationProche = 'parent' | 'enfant' | 'conjoint';

export interface ProcheSaisi {
    relation: RelationProche;
    prenom: string;
    nom: string;
    annee: string;
    decede: boolean;
}

export interface SaisieFamille {
    famille: string;
    prenom: string;
    nom: string;
    annee: string;
    proches: ProcheSaisi[];
    message: string;
}

export type ErreursFamille = Record<string, string>;

export const MAX_PROCHES = 20;

const propre = (t: string) => t.replace(/\s+/g, ' ').trim();

/** Année seule, 4 chiffres, entre 1000 et cette année ; vide = inconnue. */
export function anneeValide(t: string, maintenant = new Date().getFullYear()): boolean {
    const v = t.trim();
    if (v === '') return true;
    if (!/^[0-9]{4}$/.test(v)) return false;
    const a = Number(v);
    return a >= 1000 && a <= maintenant;
}

export function validerFamille(s: SaisieFamille, maintenant = new Date().getFullYear()):
    { ok: true; contenu: Record<string, unknown> } | { ok: false; erreurs: ErreursFamille } {
    const e: ErreursFamille = {};
    const famille = propre(s.famille);
    if (famille.length < 1 || famille.length > 80) e.famille = 'Écrivez le nom de famille (80 signes au plus).';
    if (propre(s.prenom).length < 1 || propre(s.prenom).length > 80) e.prenom = 'Votre prénom est obligatoire (80 signes au plus).';
    if (propre(s.nom).length > 80) e.nom = '80 signes au plus.';
    if (!anneeValide(s.annee, maintenant)) e.annee = 'Une année sur 4 chiffres, ou rien.';
    if (s.proches.length > MAX_PROCHES) e.proches = `${MAX_PROCHES} proches au plus par envoi.`;
    s.proches.forEach((p, i) => {
        if (propre(p.prenom).length < 1 || propre(p.prenom).length > 80) e[`proche-${i}-prenom`] = 'Le prénom est obligatoire.';
        if (propre(p.nom).length > 80) e[`proche-${i}-nom`] = '80 signes au plus.';
        if (!anneeValide(p.annee, maintenant)) e[`proche-${i}-annee`] = 'Une année sur 4 chiffres, ou rien.';
        if (!['parent', 'enfant', 'conjoint'].includes(p.relation)) e[`proche-${i}-relation`] = 'Choisissez le lien.';
    });
    if (s.message.length > 2000) e.message = '2000 signes au plus.';
    if (Object.keys(e).length > 0) return { ok: false, erreurs: e };
    return {
        ok: true,
        contenu: {
            famille,
            contributeur: { prenom: propre(s.prenom), nom: propre(s.nom), genre: 'inconnu', naissance_annee: s.annee.trim() || null, vivant: true },
            lien: { relation: 'inconnu', individu_id: null, texte: `Nouvelle famille proposée : ${famille}` },
            proches: s.proches.map((p) => ({
                prenom: propre(p.prenom), nom: propre(p.nom), genre: 'inconnu', naissance_annee: p.annee.trim() || null, vivant: !p.decede, relation: p.relation,
            })),
            message: s.message.trim(),
        },
    };
}

// ---- FIN PROPOSITION D'UNE FAMILLE ----
