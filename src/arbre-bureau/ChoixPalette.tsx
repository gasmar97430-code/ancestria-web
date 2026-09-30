// ---- PALETTE : LUMIÈRE, IVOIRE, PARCHEMIN ----
//
// Loi 1 de l'administrateur (30/09/2026) : « Design lumineux, propre, tons ivoire,
// cuivre et vert amande (aucun thème sombre) ». Avant : « Sombre » était la palette par
// défaut du site (demande du 29/09, d'avant sa maquette claire). Maintenant, comme à
// l'Ancestria du PC depuis la 1.6.38 : « Lumière » par défaut (ui/theme-lumiere.css,
// copie exacte de celle du PC), Ivoire et Parchemin au choix, et plus aucun thème
// sombre — ni proposé, ni repris d'un ancien choix (la clé de mémoire change).
// Le choix est gardé dans le navigateur : un confort, rien ne casse s'il se perd.

import { useState } from 'react';

export type Palette = 'lumiere' | 'ivoire' | 'parchemin';
export const PALETTES: { cle: Palette; libelle: string }[] = [
    { cle: 'lumiere', libelle: 'Lumière' },
    { cle: 'ivoire', libelle: 'Ivoire' },
    { cle: 'parchemin', libelle: 'Parchemin' },
];
/** Même clé qu'au PC : un ancien choix « sombre » (clé v2) n'est plus lu. */
const CLE_PALETTE = 'ancestria.palette.v3';

function lire(): Palette {
    try {
        const p = localStorage.getItem(CLE_PALETTE);
        return p === 'parchemin' || p === 'ivoire' ? p : 'lumiere';
    } catch {
        return 'lumiere';
    }
}

export function appliquerPalette(p: Palette) {
    try {
        document.documentElement.dataset.theme = p;
        // Barres de défilement, cases, listes natives : toujours claires.
        document.documentElement.style.colorScheme = 'light';
    } catch {
        /* rendu hors navigateur (essais) */
    }
}

// Posée dès le chargement du module (importé tôt dans main.tsx) : pas d'éclair d'une autre palette.
if (typeof document !== 'undefined') appliquerPalette(lire());

/** Le bloc « Palette » du bureau. `compact` : sans le titre, boutons à hauteur de doigt (téléphone). */
export function ChoixPalette({ compact = false }: { compact?: boolean }) {
    const [palette, setPalette] = useState<Palette>(lire);
    const changer = (p: Palette) => {
        appliquerPalette(p);
        try {
            localStorage.setItem(CLE_PALETTE, p);
        } catch {
            /* confort seulement */
        }
        setPalette(p);
    };
    const boutons = (
        <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5" data-noeud="choix-palette">
            {PALETTES.map((p) => (
                <button
                    key={p.cle}
                    type="button"
                    onClick={() => changer(p.cle)}
                    aria-pressed={palette === p.cle}
                    className={`flex-1 ${compact ? 'h-11' : 'h-7'} px-2 rounded-lg text-[12px] font-medium transition-all ${palette === p.cle ? 'bg-blanc shadow-onglet text-encre' : 'text-encre-2'}`}
                >
                    {p.libelle}
                </button>
            ))}
        </div>
    );
    if (compact) return boutons;
    return (
        <div className="flex flex-col gap-2 p-3 border border-trait-leger rounded-xl text-xs text-encre-2">
            <span className="text-encre font-medium">Palette</span>
            {boutons}
        </div>
    );
}

// ---- FIN PALETTE ----
