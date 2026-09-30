import { create } from 'zustand';
export type Ecran = 'accueil' | 'arbre' | 'traque' | 'sources';
export type Palette = 'ivoire' | 'parchemin' | 'sombre';
export const PALETTES: {
    cle: Palette;
    libelle: string;
}[] = [
    { cle: 'sombre', libelle: 'Sombre' },
    { cle: 'ivoire', libelle: 'Ivoire' },
    { cle: 'parchemin', libelle: 'Parchemin' },
];
const lire = (cle: string) => {
    try {
        return localStorage.getItem(cle);
    }
    catch {
        return null;
    }
};
const ecrire = (cle: string, valeur: string) => {
    try {
        localStorage.setItem(cle, valeur);
    }
    catch {
    }
};
const CLE_PALETTE = 'ancestria.palette.v2';
const paletteInitiale = (): Palette => {
    const p = lire(CLE_PALETTE);
    return p === 'parchemin' || p === 'ivoire' ? p : 'sombre';
};
const recentsInitiaux = (): string[] => {
    try {
        const r = JSON.parse(lire('ancestria.recents') ?? '[]');
        return Array.isArray(r) ? r.filter((x) => typeof x === 'string').slice(0, 5) : [];
    }
    catch {
        return [];
    }
};
export function appliquerPalette(p: Palette) {
    document.documentElement.dataset.theme = p;
}
interface AtelierState {
    ecran: Ecran;
    palette: Palette;
    recents: string[];
    nomATraquer: string | null;
    nomDansArbre: string | null;
    nomChoisi: string | null;
    aller: (e: Ecran) => void;
    changerPalette: (p: Palette) => void;
    consulter: (nom: string) => void;
    choisir: (nom: string) => void;
    traquer: (nom: string) => void;
    ouvrirDansArbre: (nom: string) => void;
    consommerNomATraquer: () => string | null;
}
const ecranInitial = (): Ecran => {
    const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    return h === 'arbre' || h === 'traque' || h === 'sources' ? h : 'accueil';
};
export const useAtelierStore = create<AtelierState>((set, get) => ({
    ecran: ecranInitial(),
    palette: paletteInitiale(),
    recents: recentsInitiaux(),
    nomATraquer: null,
    nomDansArbre: null,
    nomChoisi: null,
    aller: (ecran) => set({ ecran }),
    changerPalette: (palette) => {
        appliquerPalette(palette);
        ecrire(CLE_PALETTE, palette);
        set({ palette });
    },
    consulter: (nom) => {
        const recents = [nom, ...get().recents.filter((r) => r !== nom)].slice(0, 5);
        ecrire('ancestria.recents', JSON.stringify(recents));
        set({ recents });
    },
    choisir: (nom) => {
        get().consulter(nom);
        set({ nomChoisi: nom, ecran: 'accueil' });
    },
    traquer: (nom) => set({ nomATraquer: nom, ecran: 'traque' }),
    ouvrirDansArbre: (nom) => set({ nomDansArbre: nom, ecran: 'arbre' }),
    consommerNomATraquer: () => {
        const n = get().nomATraquer;
        if (n)
            set({ nomATraquer: null });
        return n;
    },
}));
