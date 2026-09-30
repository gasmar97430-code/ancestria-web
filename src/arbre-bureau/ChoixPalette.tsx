// ---- PALETTE : SOMBRE, IVOIRE, PARCHEMIN ----
//
// Sa demande du 29/09 : « il faudrait un bouton pour le changement de sombre,
// clair ou autre ; certaines personnes préfèrent la couleur sombre, d'autres le
// blanc ». Le bureau l'a déjà (bloc « Palette » de sa barre de gauche,
// store/useAtelierStore.ts) : même aspect, même clé de mémoire, même défaut
// (sombre), mêmes trois palettes (ui/theme-bureau.css).
// Le choix est gardé dans le navigateur du téléphone / du PC : un confort, rien
// ne casse s'il se perd.

import { useState } from 'react';

export type Palette = 'ivoire' | 'parchemin' | 'sombre';
export const PALETTES: { cle: Palette; libelle: string }[] = [
    { cle: 'sombre', libelle: 'Sombre' },
    { cle: 'ivoire', libelle: 'Ivoire' },
    { cle: 'parchemin', libelle: 'Parchemin' },
];
const CLE_PALETTE = 'ancestria.palette.v2';

function lire(): Palette {
    try {
        const p = localStorage.getItem(CLE_PALETTE);
        return p === 'parchemin' || p === 'ivoire' ? p : 'sombre';
    } catch {
        return 'sombre';
    }
}

export function appliquerPalette(p: Palette) {
    try {
        document.documentElement.dataset.theme = p;
        // Barres de défilement, cases, listes natives : clair ou sombre selon la palette.
        document.documentElement.style.colorScheme = p === 'sombre' ? 'dark' : 'light';
    } catch {
        /* rendu hors navigateur (essais) */
    }
}

// Posée dès le chargement du module (importé tôt dans main.tsx) : pas d'éclair d'une autre palette.
if (typeof document !== 'undefined') appliquerPalette(lire());

/** Le bloc « Palette » du bureau. `compact` : sans le titre, pour une barre d'en-tête. */
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
                    className={`flex-1 h-7 px-2 rounded-lg text-[12px] font-medium transition-all ${palette === p.cle ? 'bg-blanc shadow-onglet text-encre' : 'text-encre-2'}`}
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
