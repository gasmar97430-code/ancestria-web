import { create } from 'zustand';
import type { Id } from '../../types';
export type Edition = {
    type: 'conjoint';
    personneId: Id;
} | {
    type: 'parent';
    personneId: Id;
} | {
    type: 'enfant';
    personneId: Id;
    unionId?: Id | null;
} | {
    type: 'modifier';
    personneId: Id;
} | {
    type: 'union';
    personneId: Id;
    unionId: Id;
} | null;
export const useEdition = create<{
    edition: Edition;
    ouvrir: (e: NonNullable<Edition>) => void;
    fermer: () => void;
}>((set) => ({
    edition: null,
    ouvrir: (edition) => set({ edition }),
    fermer: () => set({ edition: null }),
}));
export interface ChampsPersonne {
    prenom: string;
    nom: string;
    genre: string;
    dateNaissance: string;
    lieuNaissance: string;
    statut: 'vivant' | 'decede' | 'inconnu';
    dateDeces: string;
}
export const personneVide = (x: Partial<ChampsPersonne> = {}): ChampsPersonne => ({
    prenom: '',
    nom: '',
    genre: 'Unknown',
    dateNaissance: '',
    lieuNaissance: '',
    statut: 'inconnu',
    dateDeces: '',
    ...x,
});
export function corpsPersonne(f: ChampsPersonne): Record<string, unknown> {
    const c: Record<string, unknown> = { prenom: f.prenom.trim(), nom: f.nom.trim(), genre: f.genre };
    if (f.dateNaissance)
        c.dateNaissance = f.dateNaissance;
    if (f.lieuNaissance.trim())
        c.lieuNaissance = f.lieuNaissance.trim();
    if (f.statut === 'vivant')
        c.decede = false;
    if (f.statut === 'decede') {
        c.decede = true;
        if (f.dateDeces)
            c.dateDeces = f.dateDeces;
    }
    return c;
}
export function messageErreur(err: any): string {
    const d = err?.response?.data;
    return d?.details?.map((x: any) => x.message).join(' · ') ?? d?.error ?? err?.message ?? 'Erreur inconnue';
}
