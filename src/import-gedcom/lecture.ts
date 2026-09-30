// ---- GEDCOM : LECTURE DU FICHIER ----
//
// 1. Decoder les octets. L'en-tete dit l'encodage (« 1 CHAR ... ») :
//      UTF-8 (Geneanet, la plupart des logiciels recents), UNICODE (UTF-16,
//      reconnu par sa marque BOM), ANSI (Windows-1252), ANSEL (vieux fichiers),
//      ASCII. Mesure rapportee par les forums Geneanet : son export « ASCII »
//      est en realite du Windows-1252 — on le lit donc comme tel.
//    ANSEL : table MARC-8 verifiee sur pymarc (marc8_mapping.py, jeu 0x45) ;
//    l'accent combinant PRECEDE la lettre, a l'inverse d'Unicode.
// 2. Decouper en lignes « niveau [@XREF@] ETIQUETTE [valeur] » et en arbre.
//    CONT = nouvelle ligne, CONC = suite sans espace (norme 5.5.1).

export interface Noeud {
    niveau: number;
    xref: string | null;
    tag: string;
    valeur: string;
    enfants: Noeud[];
}

/** ANSEL -> Unicode : caracteres d'espacement (0xA1-0xC8). */
const ANSEL_ESPACANTS: Record<number, number> = {
    0xa1: 0x141, 0xa2: 0xd8, 0xa3: 0x110, 0xa4: 0xde, 0xa5: 0xc6, 0xa6: 0x152, 0xa7: 0x2b9, 0xa8: 0xb7,
    0xa9: 0x266d, 0xaa: 0xae, 0xab: 0xb1, 0xac: 0x1a0, 0xad: 0x1af, 0xae: 0x2bc, 0xb0: 0x2bb, 0xb1: 0x142,
    0xb2: 0xf8, 0xb3: 0x111, 0xb4: 0xfe, 0xb5: 0xe6, 0xb6: 0x153, 0xb7: 0x2ba, 0xb8: 0x131, 0xb9: 0xa3,
    0xba: 0xf0, 0xbc: 0x1a1, 0xbd: 0x1b0, 0xc0: 0xb0, 0xc1: 0x2113, 0xc2: 0x2117, 0xc3: 0xa9, 0xc4: 0x266f,
    0xc5: 0xbf, 0xc6: 0xa1, 0xc7: 0xdf, 0xc8: 0x20ac,
};
/** ANSEL -> Unicode : accents combinants (0xE0-0xFE), places AVANT la lettre. */
const ANSEL_COMBINANTS: Record<number, number> = {
    0xe0: 0x309, 0xe1: 0x300, 0xe2: 0x301, 0xe3: 0x302, 0xe4: 0x303, 0xe5: 0x304, 0xe6: 0x306, 0xe7: 0x307,
    0xe8: 0x308, 0xe9: 0x30c, 0xea: 0x30a, 0xeb: 0xfe20, 0xec: 0xfe21, 0xed: 0x315, 0xee: 0x30b, 0xef: 0x310,
    0xf0: 0x327, 0xf1: 0x328, 0xf2: 0x323, 0xf3: 0x324, 0xf4: 0x325, 0xf5: 0x333, 0xf6: 0x332, 0xf7: 0x326,
    0xf8: 0x31c, 0xf9: 0x32e, 0xfa: 0xfe22, 0xfb: 0xfe23, 0xfe: 0x313,
};

export function decoderAnsel(o: Uint8Array): string {
    let s = '';
    let enAttente: number[] = [];
    for (const b of o) {
        if (ANSEL_COMBINANTS[b] !== undefined) {
            enAttente.push(ANSEL_COMBINANTS[b]);
            continue;
        }
        const c = b < 0x80 ? b : (ANSEL_ESPACANTS[b] ?? 0xfffd);
        s += String.fromCodePoint(c) + enAttente.map((x) => String.fromCodePoint(x)).join('');
        enAttente = [];
    }
    return s.normalize('NFC');
}

export type Encodage = 'UTF-8' | 'UTF-16' | 'ANSI' | 'ANSEL' | 'ASCII';

/** Decode le fichier ; rend aussi l'encodage retenu (affiche dans l'apercu). */
export function decoder(octets: Uint8Array): { texte: string; encodage: Encodage } {
    if (octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
        return { texte: new TextDecoder('utf-8').decode(octets.subarray(3)), encodage: 'UTF-8' };
    }
    if ((octets[0] === 0xff && octets[1] === 0xfe) || (octets[0] === 0xfe && octets[1] === 0xff)) {
        return { texte: new TextDecoder(octets[0] === 0xff ? 'utf-16le' : 'utf-16be').decode(octets.subarray(2)), encodage: 'UTF-16' };
    }
    // L'en-tete est en ASCII quel que soit l'encodage : on le lit d'abord ainsi.
    const debut = new TextDecoder('latin1').decode(octets.subarray(0, 4000));
    const decl = /^\s*1\s+CHAR\s+(\S+)/im.exec(debut)?.[1]?.toUpperCase() ?? '';
    if (decl === 'ANSEL') return { texte: decoderAnsel(octets), encodage: 'ANSEL' };
    if (decl === 'UTF-8' || decl === 'UTF8' || decl === '') {
        try {
            return { texte: new TextDecoder('utf-8', { fatal: true }).decode(octets), encodage: 'UTF-8' };
        } catch {
            /* annonce UTF-8 mais ne l'est pas : Windows-1252, le cas le plus courant */
        }
    }
    return { texte: new TextDecoder('windows-1252').decode(octets), encodage: decl === 'ASCII' ? 'ASCII' : 'ANSI' };
}

const LIGNE = /^\s*(\d{1,2})\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/;

/** Decoupe en arbre. Les lignes illisibles sont comptees, jamais inventees. */
export function analyser(texte: string): { racines: Noeud[]; illisibles: number } {
    const racines: Noeud[] = [];
    const pile: Noeud[] = [];
    let illisibles = 0;
    for (const brute of texte.split(/\r\n|\r|\n/)) {
        if (!brute.trim()) continue;
        const m = LIGNE.exec(brute);
        if (!m) {
            illisibles += 1;
            continue;
        }
        const n: Noeud = { niveau: Number(m[1]), xref: m[2] ?? null, tag: m[3].toUpperCase(), valeur: (m[4] ?? '').replace(/@@/g, '@'), enfants: [] };
        if (n.tag === 'CONT' || n.tag === 'CONC') {
            const parent = pile[n.niveau - 1];
            if (parent) parent.valeur += (n.tag === 'CONT' ? '\n' : '') + n.valeur;
            else illisibles += 1;
            continue;
        }
        pile.length = n.niveau;
        if (n.niveau === 0) racines.push(n);
        else if (pile[n.niveau - 1]) pile[n.niveau - 1].enfants.push(n);
        else {
            illisibles += 1;
            continue;
        }
        pile[n.niveau] = n;
    }
    return { racines, illisibles };
}

export const enfant = (n: Noeud | undefined, tag: string) => n?.enfants.find((e) => e.tag === tag);
export const enfants = (n: Noeud | undefined, tag: string) => n?.enfants.filter((e) => e.tag === tag) ?? [];

// ---- FIN GEDCOM : LECTURE DU FICHIER ----
