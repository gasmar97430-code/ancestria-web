// ---- VALIDATION DES FORMULAIRES ----
// Chaque formulaire passe par ici AVANT l'envoi : les champs sont nettoyés,
// bornés aux mêmes limites que la base, et chaque erreur est rattachée à
// son champ. La base refait ses propres contrôles (elle seule fait foi).

import { z } from 'zod';
import { lireDate, type DateLue } from './dates';
import {
    FORMES_FOYER, NATURES_FILIATION, NATURES_UNION, STATUTS_UNION, TYPES_DOCUMENT,
    type ContenuContribution, type Genre, type Id, type Precision,
} from './types';

export type Erreurs = Record<string, string>;
export type Resultat<T> = { ok: true; donnees: T } | { ok: false; erreurs: Erreurs };

const GENRES = ['femme', 'homme', 'non_binaire', 'inconnu'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const texte = (max: number) => z.string().trim().max(max, `${max} caractères au plus.`);
const facultatif = (max: number) => texte(max).transform((v) => (v === '' ? null : v));

function erreursDe(e: z.ZodError): Erreurs {
    const r: Erreurs = {};
    for (const i of e.issues) {
        const champ = i.path.length ? String(i.path[0]) : '_';
        if (!(champ in r)) r[champ] = i.message;
    }
    return r;
}

function valider<T>(schema: z.ZodType<T>, valeurs: unknown): Resultat<T> {
    const r = schema.safeParse(valeurs);
    return r.success ? { ok: true, donnees: r.data } : { ok: false, erreurs: erreursDe(r.error) };
}

/** Lit un champ de date ; ajoute l'erreur au bon champ. */
function champDate(ctx: z.RefinementCtx, champ: string, valeur: string): DateLue | null {
    const l = lireDate(valeur);
    if (!l.ok) {
        ctx.addIssue({ code: 'custom', message: l.erreur, path: [champ] });
        return null;
    }
    return l.valeur;
}

/** « -21.0096, 55.2707 » → [lat, lng] ; vide → null. */
export function lirePosition(t: string): { ok: true; valeur: [number, number] | null } | { ok: false; erreur: string } {
    const s = t.trim();
    if (s === '') return { ok: true, valeur: null };
    const m = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!m) return { ok: false, erreur: 'Écrivez « latitude, longitude » avec des points, ex. -21.0096, 55.2707.' };
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { ok: false, erreur: 'Coordonnées hors de la Terre.' };
    return { ok: true, valeur: [lat, lng] };
}

function champPosition(ctx: z.RefinementCtx, champ: string, valeur: string): [number, number] | null {
    const p = lirePosition(valeur);
    if (!p.ok) {
        ctx.addIssue({ code: 'custom', message: p.erreur, path: [champ] });
        return null;
    }
    return p.valeur;
}

/** Lien web sûr (https, sans espace, 1000 caractères au plus) ; vide → null. Même règle que la base. */
const lienHttps = z.string().trim().max(1000, '1000 caractères au plus.')
    .refine((u) => u === '' || /^https:\/\/[^\s]+$/.test(u), 'Adresse web sûre seulement (commence par https://).')
    .transform((u) => (u === '' ? null : u));

export function lireThematiques(t: string): string[] {
    return [...new Set(t.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
}

// ---------------------------------------------------------------------
// Individu

export interface SaisieIndividu {
    prenom: string;
    nom: string;
    genre: Genre;
    se_nomme: string;
    naissance: string;
    lieu_naissance: string;
    position_naissance: string;
    deces: string;
    lieu_deces: string;
    vivant: boolean;
    profession: string;
    biographie: string;
    notes: string;
    illustre: boolean;
    thematiques: string;
    photo_url: string;
}

export interface IndividuPourBase {
    prenom: string;
    nom: string;
    genre: Genre;
    se_nomme: string | null;
    naissance: string | null;
    naissance_precision: Precision;
    lieu_naissance: string | null;
    naissance_lat: number | null;
    naissance_lng: number | null;
    deces: string | null;
    deces_precision: Precision;
    lieu_deces: string | null;
    vivant: boolean;
    profession: string | null;
    biographie: string | null;
    notes: string | null;
    illustre: boolean;
    thematiques: string[];
    photo_url: string | null;
}

export const SAISIE_INDIVIDU_VIDE: SaisieIndividu = {
    prenom: '', nom: '', genre: 'inconnu', se_nomme: '', naissance: '', lieu_naissance: '', position_naissance: '',
    deces: '', lieu_deces: '', vivant: true, profession: '', biographie: '', notes: '', illustre: false, thematiques: '', photo_url: '',
};

const schemaIndividu = z
    .object({
        prenom: z.string().trim().min(1, 'Le prénom est obligatoire (le nom peut rester vide).').max(80, '80 caractères au plus.'),
        nom: texte(80),
        genre: z.enum(GENRES),
        se_nomme: facultatif(80),
        naissance: z.string(),
        lieu_naissance: facultatif(120),
        position_naissance: z.string(),
        deces: z.string(),
        lieu_deces: facultatif(120),
        vivant: z.boolean(),
        profession: facultatif(120),
        biographie: facultatif(20000),
        notes: facultatif(5000),
        illustre: z.boolean(),
        thematiques: z.string(),
        photo_url: lienHttps,
    })
    .transform((v, ctx): IndividuPourBase => {
        const n = champDate(ctx, 'naissance', v.naissance);
        const d = champDate(ctx, 'deces', v.deces);
        const pos = champPosition(ctx, 'position_naissance', v.position_naissance);
        const them = lireThematiques(v.thematiques);
        if (them.length > 10) ctx.addIssue({ code: 'custom', message: '10 thématiques au plus.', path: ['thematiques'] });
        if (them.some((t) => t.length > 40)) ctx.addIssue({ code: 'custom', message: 'Une thématique fait 40 caractères au plus.', path: ['thematiques'] });
        if (n && d) {
            const finDeces = d.precision === 'annee' ? `${d.date.slice(0, 4)}-12-31` : d.date;
            if (finDeces < n.date) ctx.addIssue({ code: 'custom', message: 'Le décès est avant la naissance.', path: ['deces'] });
        }
        return {
            prenom: v.prenom, nom: v.nom, genre: v.genre, se_nomme: v.se_nomme,
            naissance: n?.date ?? null, naissance_precision: n?.precision ?? 'jour',
            lieu_naissance: v.lieu_naissance, naissance_lat: pos?.[0] ?? null, naissance_lng: pos?.[1] ?? null,
            deces: d?.date ?? null, deces_precision: d?.precision ?? 'jour', lieu_deces: v.lieu_deces,
            vivant: d ? false : v.vivant,
            profession: v.profession, biographie: v.biographie, notes: v.notes, illustre: v.illustre, thematiques: them, photo_url: v.photo_url,
        };
    });

/**
 * Toutes les erreurs en une fois : quand un champ simple est faux (prénom
 * vide…), zod ne passe pas à la lecture des dates ; on les lit quand même,
 * pour ne pas faire découvrir une erreur de date au second essai.
 */
export function validerIndividu(s: SaisieIndividu): Resultat<IndividuPourBase> {
    const r = valider(schemaIndividu, s);
    if (r.ok) return r;
    const plus: Erreurs = {};
    for (const [champ, valeur] of [['naissance', s.naissance], ['deces', s.deces]] as const) {
        const l = lireDate(valeur);
        if (!l.ok) plus[champ] = l.erreur;
    }
    const p = lirePosition(s.position_naissance);
    if (!p.ok) plus.position_naissance = p.erreur;
    return { ok: false, erreurs: { ...plus, ...r.erreurs } };
}

// ---------------------------------------------------------------------
// Union

export interface SaisieUnion {
    nature: string;
    statut: string;
    debut: string;
    fin: string;
}
export interface UnionPourBase {
    nature: (typeof NATURES_UNION)[number];
    statut: (typeof STATUTS_UNION)[number];
    debut: string | null;
    fin: string | null;
}
const schemaUnion = z
    .object({ nature: z.enum(NATURES_UNION), statut: z.enum(STATUTS_UNION), debut: z.string(), fin: z.string() })
    .transform((v, ctx): UnionPourBase => {
        const a = champDate(ctx, 'debut', v.debut);
        const b = champDate(ctx, 'fin', v.fin);
        if (a && b && b.date < a.date) ctx.addIssue({ code: 'custom', message: 'La fin est avant le début.', path: ['fin'] });
        return { nature: v.nature, statut: v.statut, debut: a?.date ?? null, fin: b?.date ?? null };
    });
export const validerUnion = (s: SaisieUnion) => valider(schemaUnion, s);

// ---------------------------------------------------------------------
// Lien, foyer

export const validerNature = (n: string) =>
    valider(z.object({ nature: z.enum(NATURES_FILIATION, { message: 'Nature de lien inconnue.' }) }), { nature: n });

export interface SaisieFoyer {
    libelle: string;
    forme: string;
    notes: string;
}
const schemaFoyer = z.object({
    libelle: z.string().trim().min(1, 'Donnez un nom au foyer.').max(120, '120 caractères au plus.'),
    forme: z.enum(FORMES_FOYER),
    notes: facultatif(2000),
});
export const validerFoyer = (s: SaisieFoyer) => valider(schemaFoyer, s);

// ---------------------------------------------------------------------
// Partage (invitation)

export interface SaisieInvitation {
    libelle: string;
    pin: string;
    jours: string;
}
const schemaInvitation = z.object({
    libelle: z.string().trim().min(1, 'Donnez un nom au partage (ex. « Facebook, septembre »).').max(80, '80 caractères au plus.'),
    pin: z.string().trim().refine((p) => p === '' || /^\d{4,8}$/.test(p), 'Le code PIN fait de 4 à 8 chiffres (ou laissez vide).')
        .transform((p) => (p === '' ? null : p)),
    jours: z.string().trim().regex(/^\d{1,3}$/, 'Nombre de jours de 1 à 365.').transform(Number)
        .refine((j) => j >= 1 && j <= 365, 'Nombre de jours de 1 à 365.'),
});
export const validerInvitation = (s: SaisieInvitation) => valider(schemaInvitation, s);

// ---------------------------------------------------------------------
// Document d'archive

export interface SaisieDocument {
    titre: string;
    type: string;
    date_document: string;
    periode: string;
    lieu: string;
    position: string;
    url: string;
    cote: string;
    source: string;
    droits: string;
    description: string;
    public: boolean;
}
export const SAISIE_DOCUMENT_VIDE: SaisieDocument = {
    titre: '', type: 'registre', date_document: '', periode: '', lieu: '', position: '', url: '', cote: '', source: '', droits: '', description: '', public: false,
};
const schemaDocument = z
    .object({
        titre: z.string().trim().min(1, 'Le titre est obligatoire.').max(200, '200 caractères au plus.'),
        type: z.enum(TYPES_DOCUMENT),
        date_document: z.string(),
        periode: facultatif(60),
        lieu: facultatif(120),
        position: z.string(),
        url: z.string().trim().max(1000, '1000 caractères au plus.')
            .refine((u) => u === '' || /^https:\/\/[^\s]+$/.test(u), 'Adresse web sûre seulement (commence par https://).')
            .transform((u) => (u === '' ? null : u)),
        cote: facultatif(120),
        source: facultatif(200),
        droits: facultatif(200),
        description: facultatif(5000),
        public: z.boolean(),
    })
    .transform((v, ctx) => {
        const d = champDate(ctx, 'date_document', v.date_document);
        const p = champPosition(ctx, 'position', v.position);
        return {
            titre: v.titre, type: v.type, date_document: d?.date ?? null, periode: v.periode, lieu: v.lieu,
            lat: p?.[0] ?? null, lng: p?.[1] ?? null, url: v.url, cote: v.cote, source: v.source, droits: v.droits,
            description: v.description, public: v.public,
        };
    });
export const validerDocument = (s: SaisieDocument) => valider(schemaDocument, s);

// ---------------------------------------------------------------------
// Famille historique, espace patrimonial

export interface SaisieFamille {
    nom: string;
    resume: string;
    origine: string;
    periode: string;
}
const schemaFamille = z.object({
    nom: z.string().trim().min(1, 'Le nom de famille est obligatoire.').max(80, '80 caractères au plus.'),
    resume: facultatif(5000),
    origine: facultatif(120),
    periode: facultatif(60),
});
export const validerFamille = (s: SaisieFamille) => valider(schemaFamille, s);

export interface SaisieEspace {
    slug: string;
    territoire: string;
    description: string;
    centre: string;
    public_patrimoine: boolean;
}
const schemaEspace = z
    .object({
        slug: z.string().trim().toLowerCase()
            .refine((s) => s === '' || /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(s), 'Adresse : 3 à 60 lettres minuscules, chiffres ou tirets (ex. saint-paul).')
            .transform((s) => (s === '' ? null : s)),
        territoire: facultatif(120),
        description: facultatif(4000),
        centre: z.string(),
        public_patrimoine: z.boolean(),
    })
    .transform((v, ctx) => {
        const c = champPosition(ctx, 'centre', v.centre);
        if (v.public_patrimoine && !v.slug) ctx.addIssue({ code: 'custom', message: 'Une adresse est nécessaire pour publier.', path: ['slug'] });
        return { slug: v.slug, territoire: v.territoire, description: v.description, centre_lat: c?.[0] ?? null, centre_lng: c?.[1] ?? null, public_patrimoine: v.public_patrimoine };
    });
export const validerEspace = (s: SaisieEspace) => valider(schemaEspace, s);

// ---------------------------------------------------------------------
// Proposition du public (page du QR code)

export interface SaisieProche {
    prenom: string;
    nom: string;
    relation: string;
    naissance_annee: string;
    vivant: boolean;
}
export interface SaisieContribution {
    prenom: string;
    nom: string;
    genre: string;
    naissance_annee: string;
    relation: string;
    individu_id: string;
    texte_lien: string;
    proches: SaisieProche[];
    message: string;
    contact: string;
    consentement: boolean;
}

const annee = (maintenant: number) =>
    z.string().trim()
        .refine((a) => a === '' || (/^\d{4}$/.test(a) && Number(a) >= 1000 && Number(a) <= maintenant), 'Année sur 4 chiffres (ex. 1962), ou vide.')
        .transform((a) => (a === '' ? null : Number(a)));

export function validerContribution(s: SaisieContribution, maintenant = new Date().getFullYear()): Resultat<{ contenu: ContenuContribution; contact: string | null }> {
    const schema = z
        .object({
            prenom: z.string().trim().min(1, 'Votre prénom est obligatoire.').max(80, '80 caractères au plus.'),
            nom: texte(80),
            genre: z.enum(GENRES),
            naissance_annee: annee(maintenant),
            relation: z.enum(['enfant', 'petit_enfant', 'parent', 'conjoint', 'frere_soeur', 'inconnu'], { message: 'Dites comment vous êtes relié(e).' }),
            individu_id: z.string(),
            texte_lien: texte(300),
            proches: z.array(z.object({
                prenom: z.string().trim().min(1, 'Chaque proche a un prénom.').max(80, '80 caractères au plus.'),
                nom: texte(80),
                relation: z.enum(['parent', 'enfant', 'conjoint'], { message: 'Choisissez le lien de ce proche.' }),
                naissance_annee: annee(maintenant),
                vivant: z.boolean(),
            })).max(20, '20 proches au plus par envoi.'),
            message: texte(2000),
            contact: facultatif(200),
            consentement: z.literal(true, { message: 'Cochez la case pour que vos informations puissent être gardées.' }),
        })
        .superRefine((v, ctx) => {
            if (v.relation !== 'inconnu' && !UUID.test(v.individu_id)) {
                ctx.addIssue({ code: 'custom', message: 'Choisissez la personne de l’arbre à qui vous êtes relié(e).', path: ['individu_id'] });
            }
        });
    const r = valider(schema, s);
    if (!r.ok) return r;
    const v = r.donnees;
    return {
        ok: true,
        donnees: {
            contenu: {
                contributeur: { prenom: v.prenom, nom: v.nom, genre: v.genre, naissance_annee: v.naissance_annee, vivant: true },
                lien: { relation: v.relation, individu_id: v.relation === 'inconnu' ? null : (v.individu_id as Id), texte: v.texte_lien },
                proches: v.proches.map((p) => ({ prenom: p.prenom, nom: p.nom, genre: 'inconnu', naissance_annee: p.naissance_annee, vivant: p.vivant, relation: p.relation })),
                message: v.message,
            },
            contact: v.contact,
        },
    };
}

// ---- FIN VALIDATION DES FORMULAIRES ----
