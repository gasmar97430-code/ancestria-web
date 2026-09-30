// ---- GEDCOM : DATES ----
//
// Norme GEDCOM 5.5.1 (DATE_VALUE) : « 12 APR 1950 », « APR 1950 », « 1950 »,
// qualifiees par ABT, CAL, EST, BEF, AFT, BET … AND …, FROM … TO …, INT.
//
// Convention d'Ancestria, MESUREE sur sa base le 26/09/2026 : 77 dates sur 80
// sont au 1er janvier — ce sont des ANNEES seules, et l'appli n'affiche que
// l'annee. Donc :
//   - « 1923 » et « APR 1923 » -> 1923-01-01 en base (l'annee est sure) ; le
//     mois, s'il est donne, est garde dans les notes ;
//   - une vraie date « 1 JAN 1923 » -> 1923-01-01 aussi, et « 1er janvier 1923 »
//     dans les notes pour que le jour ne se perde pas ;
//   - ABT, BEF, AFT, BET, EST, CAL, calendriers non gregoriens : RIEN en base
//     (l'annee n'est pas sure), le texte en francais dans les notes ;
//   - a l'export, une date au 1er janvier part en ANNEE SEULE (« 1923 »),
//     jamais en « 1 JAN 1923 » : ce serait affirmer un jour qu'on ne connait pas.

export const MOIS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export interface DateLue {
    /** La date, seulement si elle est exacte et grégorienne. */
    exacte: Date | null;
    /** Sinon, la date telle que donnee, en francais (« vers 1900 »). null si vide. */
    texte: string | null;
    /** La valeur GEDCOM d'origine. */
    brute: string;
    /** Ce qui va en base (voir la convention en tete). */
    pourBase: Date | null;
    /** Le texte doit-il aller dans les notes (mois, jour d'un 1er janvier, approximation) ? */
    enNote: boolean;
}

/** « 12 APR 1950 » -> Date UTC, ou null si ce n'est pas une date exacte valide. */
export function dateExacte(v: string): Date | null {
    const m = /^(\d{1,2}) ([A-Z]{3}) (\d{3,4})$/.exec(v.trim().toUpperCase());
    if (!m) return null;
    const mois = MOIS.indexOf(m[2]);
    if (mois < 0) return null;
    const jour = Number(m[1]);
    const annee = Number(m[3]);
    const d = new Date(Date.UTC(annee, mois, jour));
    // Le 31 FEB n'existe pas : Date le deplacerait au 3 mars.
    if (d.getUTCMonth() !== mois || d.getUTCDate() !== jour) return null;
    if (annee < 100) d.setUTCFullYear(annee);
    return d;
}

/** Une date simple (« 12 APR 1950 », « APR 1950 », « 1950 », « 1950/51 ») en francais. */
function simpleEnFrancais(v: string): string {
    const m = /^(?:(\d{1,2}) )?(?:([A-Z]{3}) )?(\d{3,4}(?:\/\d{2})?)$/.exec(v.trim().toUpperCase());
    if (!m) return v.trim();
    const mois = m[2] ? MOIS.indexOf(m[2]) : -1;
    if (m[2] && mois < 0) return v.trim();
    return [m[1] ? (m[1] === '1' ? '1er' : String(Number(m[1]))) : '', mois >= 0 ? MOIS_FR[mois] : '', m[3]].filter(Boolean).join(' ');
}

const QUALIFS: [RegExp, (a: string, b?: string) => string][] = [
    [/^BET (.+) AND (.+)$/, (a, b) => `entre ${simpleEnFrancais(a)} et ${simpleEnFrancais(b!)}`],
    [/^FROM (.+) TO (.+)$/, (a, b) => `du ${simpleEnFrancais(a)} au ${simpleEnFrancais(b!)}`],
    [/^FROM (.+)$/, (a) => `depuis ${simpleEnFrancais(a)}`],
    [/^TO (.+)$/, (a) => `jusqu'à ${simpleEnFrancais(a)}`],
    [/^ABT (.+)$/, (a) => `vers ${simpleEnFrancais(a)}`],
    [/^CAL (.+)$/, (a) => `${simpleEnFrancais(a)} (calculée)`],
    [/^EST (.+)$/, (a) => `${simpleEnFrancais(a)} (estimée)`],
    [/^BEF (.+)$/, (a) => `avant ${simpleEnFrancais(a)}`],
    [/^AFT (.+)$/, (a) => `après ${simpleEnFrancais(a)}`],
];

function lireDateBrute(brute: string | undefined | null): Omit<DateLue, 'pourBase' | 'enNote'> {
    const v = (brute ?? '').trim();
    if (!v) return { exacte: null, texte: null, brute: '' };
    // Calendrier explicite : seul le gregorien donne une date de la base.
    const cal = /^@#D([A-Z ]+)@\s*(.*)$/.exec(v.toUpperCase());
    if (cal && cal[1].trim() !== 'GREGORIAN') {
        const nom = cal[1].trim() === 'FRENCH R' ? 'calendrier républicain' : cal[1].trim() === 'JULIAN' ? 'calendrier julien' : cal[1].trim();
        return { exacte: null, texte: `${cal[2]} (${nom})`, brute: v };
    }
    const corps = cal ? cal[2] : v;
    const exacte = dateExacte(corps);
    if (exacte) return { exacte, texte: null, brute: v };
    const haut = corps.toUpperCase();
    // INT : date interpretee, le texte d'origine suit entre parentheses.
    const inter = /^INT (.+?) \((.*)\)$/.exec(corps);
    if (inter) return { exacte: null, texte: `${simpleEnFrancais(inter[1])} (« ${inter[2]} »)`, brute: v };
    for (const [re, f] of QUALIFS) {
        const m = re.exec(haut);
        if (m) return { exacte: null, texte: f(m[1], m[2]), brute: v };
    }
    // Texte libre entre parentheses (« (vers la Toussaint) ») ou date partielle.
    const libre = /^\((.*)\)$/.exec(corps);
    return { exacte: null, texte: libre ? libre[1] : simpleEnFrancais(corps), brute: v };
}

/** Pour les notes : la date lue, en francais, exacte ou non. */
export function dateEnFrancais(d: DateLue): string {
    if (d.exacte) return simpleEnFrancais(versGedcom(d.exacte));
    return d.texte ?? d.brute;
}

/** Date de la base -> « 12 APR 1950 » (UTC : la base stocke minuit UTC). */
export function versGedcom(d: Date): string {
    return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const PREMIER_JANVIER = (d: Date) => d.getUTCMonth() === 0 && d.getUTCDate() === 1;

export function lireDate(brute: string | undefined | null): DateLue {
    const d = lireDateBrute(brute);
    if (!d.brute) return { ...d, pourBase: null, enNote: false };
    if (d.exacte) return { ...d, pourBase: d.exacte, enNote: PREMIER_JANVIER(d.exacte) };
    // Annee seule ou mois + annee, gregoriens, sans qualificatif : l'annee est sure.
    const m = /^(?:([A-Z]{3}) )?(\d{3,4})$/.exec(d.brute.trim().toUpperCase());
    if (m && (!m[1] || MOIS.includes(m[1]))) {
        return { ...d, pourBase: new Date(Date.UTC(Number(m[2]), 0, 1)), enNote: !!m[1] };
    }
    return { ...d, pourBase: null, enNote: true };
}

/** Pour l'export : une date au 1er janvier est une annee seule (convention ci-dessus). */
export function dateVersGedcom(d: Date): string {
    return PREMIER_JANVIER(d) ? String(d.getUTCFullYear()) : versGedcom(d);
}

/** Une date qui fixe le jour (pas une annee rangee au 1er janvier) : seule base de reconnaissance. */
export const jourConnu = (d: Date | null | undefined): d is Date => !!d && !PREMIER_JANVIER(d);

// ---- FIN GEDCOM : DATES ----
