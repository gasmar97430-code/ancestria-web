// ---- GEDCOM : INTERPRETATION (fichier -> personnes, couples, filiations) ----
//
// Regle : ne rien deviner. Ce qui a sa place dans la base y va ; ce qui n'en a
// pas (date approchee, bapteme, inhumation, profession, note) est recopie mot
// pour mot dans les notes de la personne ; le reste (sources, medias…) est
// COMPTE et annonce dans l'apercu, jamais passe sous silence.

import { enfant, enfants, Noeud } from './lecture';
import { dateEnFrancais, DateLue, lireDate } from './dates';

export interface Evenement {
    date: DateLue;
    lieu: string | null;
}

export interface IndividuLu {
    xref: string;
    prenom: string;
    nom: string;
    genre: 'M' | 'F' | 'Unknown';
    naissance: Evenement | null;
    deces: Evenement | null;
    /** DEAT present (meme sans date) : decede. Sinon on ne sait pas. */
    decede: boolean | null;
    /** Lignes a ajouter aux notes, deja redigees. */
    notes: string[];
}

export interface FamilleLue {
    xref: string;
    parent1: string | null;
    parent2: string | null;
    /** Enfants et nature du lien (PEDI de la norme : birth, adopted, foster, sealed). */
    enfants: { xref: string; lien: 'Biological' | 'Adoptive' | 'autre' }[];
    mariage: Evenement | null;
    divorce: Evenement | null;
    notes: string[];
}

export interface ModeleGedcom {
    individus: IndividuLu[];
    familles: FamilleLue[];
    /** Etiquettes lues mais non reprises : { SOUR: 120, OBJE: 4 } */
    nonRepris: Record<string, number>;
    logiciel: string | null;
    version: string | null;
}

const compter = (t: Record<string, number>, tag: string) => (t[tag] = (t[tag] ?? 0) + 1);

function evenement(n: Noeud | undefined): Evenement | null {
    if (!n) return null;
    return { date: lireDate(enfant(n, 'DATE')?.valeur), lieu: enfant(n, 'PLAC')?.valeur.trim() || null };
}

/** « 12 avril 1950 (vers), Saint-Paul » pour les notes. */
function decrire(e: Evenement): string {
    return [e.date.brute ? dateEnFrancais(e.date) : '', e.lieu ?? ''].filter(Boolean).join(', ');
}

const ETIQUETTES_EVENEMENTS: Record<string, string> = {
    CHR: 'Baptême',
    BAPM: 'Baptême',
    BURI: 'Inhumation',
    CREM: 'Crémation',
    OCCU: 'Profession',
    RESI: 'Résidence',
    TITL: 'Titre',
    NATI: 'Nationalité',
    RELI: 'Religion',
    EDUC: 'Études',
    GRAD: 'Diplôme',
    RETI: 'Retraite',
    EMIG: 'Émigration',
    IMMI: 'Immigration',
    NATU: 'Naturalisation',
    CENS: 'Recensement',
    WILL: 'Testament',
    PROB: 'Succession',
    CONF: 'Confirmation',
    FCOM: 'Première communion',
    EVEN: 'Événement',
    FACT: 'Fait',
};

function nomEtPrenom(indi: Noeud): { prenom: string; nom: string; reste: string | null } {
    const name = enfant(indi, 'NAME');
    const givn = enfant(name, 'GIVN')?.valeur.trim();
    const surn = enfant(name, 'SURN')?.valeur.trim();
    const v = name?.valeur ?? '';
    const m = /^(.*?)\/(.*?)\/(.*)$/.exec(v);
    const prenomLu = (givn || (m ? m[1] : v)).replace(/\s+/g, ' ').trim();
    const nomLu = (surn || (m ? m[2] : '')).replace(/\s+/g, ' ').trim();
    const suffixe = m?.[3]?.trim() || null;
    // « ? » : la convention des genealogistes (Geneanet, Geneweb) pour « inconnu ».
    return { prenom: prenomLu || '?', nom: nomLu || '?', reste: suffixe };
}

/** Le texte d'une note : en ligne (« 1 NOTE texte ») ou renvoi a un enregistrement (« 1 NOTE @N1@ »). */
function texteNote(n: Noeud, notes: Map<string, string>): string {
    const renvoi = /^@[^@]+@$/.exec(n.valeur.trim());
    return (renvoi ? notes.get(n.valeur.trim()) ?? '' : n.valeur).trim();
}

export function interpreter(racines: Noeud[]): ModeleGedcom {
    const nonRepris: Record<string, number> = {};
    const notesPartagees = new Map<string, string>();
    for (const r of racines) if (r.tag === 'NOTE' && r.xref) notesPartagees.set(r.xref, r.valeur.trim());

    const tete = racines.find((r) => r.tag === 'HEAD');
    const logiciel = enfant(tete, 'SOUR')?.valeur.trim() || null;
    const version = enfant(enfant(tete, 'GEDC'), 'VERS')?.valeur.trim() || null;

    const individus: IndividuLu[] = [];
    const familles: FamilleLue[] = [];
    /** PEDI declare cote enfant : « @I5@|@F2@ » -> adopted */
    const pedi = new Map<string, string>();

    for (const r of racines) {
        if (r.tag === 'INDI' && r.xref) {
            const { prenom, nom, reste } = nomEtPrenom(r);
            const sexe = enfant(r, 'SEX')?.valeur.trim().toUpperCase();
            const naissance = evenement(enfant(r, 'BIRT'));
            const decesN = enfant(r, 'DEAT');
            const deces = evenement(decesN);
            const notes: string[] = [];
            if (reste) notes.push(`Nom complet (GEDCOM) : ${enfant(r, 'NAME')?.valeur.replace(/\//g, '').trim()}`);
            if (enfants(r, 'NAME').length > 1) {
                for (const autre of enfants(r, 'NAME').slice(1)) notes.push(`Autre nom : ${autre.valeur.replace(/\//g, '').replace(/\s+/g, ' ').trim()}`);
            }
            if (naissance?.date.enNote) notes.push(`Naissance : ${decrire(naissance)}`);
            if (deces?.date.enNote) notes.push(`Décès : ${decrire(deces)}`);
            for (const e of r.enfants) {
                if (e.tag in ETIQUETTES_EVENEMENTS) {
                    const ev = evenement(e);
                    const type = enfant(e, 'TYPE')?.valeur.trim();
                    const detail = [e.valeur.trim(), ev ? decrire(ev) : ''].filter(Boolean).join(' — ');
                    notes.push(`${type || ETIQUETTES_EVENEMENTS[e.tag]}${detail ? ' : ' + detail : ''}`);
                } else if (e.tag === 'NOTE') {
                    const t = texteNote(e, notesPartagees);
                    if (t) notes.push(t);
                } else if (e.tag === 'FAMC') {
                    const p = enfant(e, 'PEDI')?.valeur.trim().toLowerCase();
                    if (p) pedi.set(`${r.xref}|${e.valeur.trim()}`, p);
                } else if (!['NAME', 'SEX', 'BIRT', 'DEAT', 'FAMS', 'CHAN', 'RIN', '_UID', 'UID', 'REFN'].includes(e.tag)) {
                    compter(nonRepris, e.tag);
                }
            }
            individus.push({
                xref: r.xref,
                prenom,
                nom,
                genre: sexe === 'M' ? 'M' : sexe === 'F' ? 'F' : 'Unknown',
                naissance,
                deces,
                decede: decesN ? true : null,
                notes,
            });
        } else if (r.tag === 'FAM' && r.xref) {
            const notes: string[] = [];
            const mariage = evenement(enfant(r, 'MARR'));
            const divorce = evenement(enfant(r, 'DIV'));
            if (mariage?.date.enNote) notes.push(`Mariage : ${decrire(mariage)}`);
            if (divorce?.date.enNote) notes.push(`Divorce : ${decrire(divorce)}`);
            for (const e of r.enfants) {
                if (e.tag === 'NOTE') {
                    const t = texteNote(e, notesPartagees);
                    if (t) notes.push(t);
                } else if (!['HUSB', 'WIFE', 'CHIL', 'MARR', 'DIV', 'CHAN', 'RIN', '_UID', 'NCHI'].includes(e.tag)) {
                    compter(nonRepris, `FAM ${e.tag}`);
                }
            }
            familles.push({
                xref: r.xref,
                parent1: enfant(r, 'HUSB')?.valeur.trim() || null,
                parent2: enfant(r, 'WIFE')?.valeur.trim() || null,
                enfants: enfants(r, 'CHIL').map((c) => ({ xref: c.valeur.trim(), lien: 'Biological' as const })),
                mariage,
                divorce,
                notes,
            });
        } else if (!['HEAD', 'TRLR', 'NOTE', 'SUBM', 'SUBN'].includes(r.tag)) {
            compter(nonRepris, r.tag);
        }
    }

    // La nature du lien est ecrite cote enfant (FAMC / PEDI) : on la reporte.
    for (const f of familles) {
        for (const c of f.enfants) {
            const p = pedi.get(`${c.xref}|${f.xref}`);
            if (p === 'adopted') c.lien = 'Adoptive';
            else if (p && p !== 'birth') c.lien = 'autre';
        }
    }

    return { individus, familles, nonRepris, logiciel, version };
}

// ---- FIN GEDCOM : INTERPRETATION ----
