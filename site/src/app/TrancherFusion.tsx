import { useState } from 'react';
import { create } from 'zustand';
import apiClient from '../api/client';
import { useTreeStore } from '../store/useTreeStore';
type Fiche = {
    id: number;
    genre: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    dateDeces: string | null;
    lieuDeces: string | null;
    decede: boolean | null;
};
const useVersion = create<{
    v: number;
}>(() => ({ v: 0 }));
export const versionFusion = () => useVersion.getState().v;
const an = (d: string | null) => (d ? String(new Date(d).getUTCFullYear()) : null);
const texte = (champ: string, f: Fiche): string | null => {
    switch (champ) {
        case 'decede': return f.decede === true ? 'décédé(e)' : f.decede === false ? 'vivant(e)' : null;
        case 'genre': return f.genre === 'M' ? 'homme' : f.genre === 'F' ? 'femme' : null;
        case 'dateNaissance': return an(f.dateNaissance);
        case 'dateDeces': return an(f.dateDeces);
        default: return (f as never)[champ] ?? null;
    }
};
const valeur = (champ: string, f: Fiche) => (f as never)[champ];
const CHAMPS: [
    string,
    string
][] = [['decede', 'Vivant ou décédé'], ['genre', 'Sexe'], ['dateNaissance', 'Année de naissance'], ['lieuNaissance', 'Lieu de naissance'], ['dateDeces', 'Année de décès'], ['lieuDeces', 'Lieu de décès']];
export const TrancherFusion = ({ a }: {
    a: {
        garder: Fiche;
        retirer: Fiche;
    };
}) => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const conflits = CHAMPS.filter(([c]) => {
        const x = texte(c, a.garder), y = texte(c, a.retirer);
        return x !== null && y !== null && x !== y;
    });
    if (conflits.length === 0)
        return null;
    const choisir = async (champ: string, juste: Fiche, faux: Fiche) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.patch(`/people/${faux.id}`, { [champ]: valeur(champ, juste) });
            useVersion.setState((s) => ({ v: s.v + 1 }));
            await fetchTree();
        }
        catch (err: any) {
            setErreur(err?.response?.data?.details?.map((x: any) => x.message).join(' · ') ?? err?.response?.data?.error ?? err.message);
        }
        finally {
            setEnvoi(false);
        }
    };
    const bouton = 'h-8 px-3 rounded-lg border border-sepia text-sepia-deep text-[12.5px] hover:bg-sepia-tint disabled:opacity-40';
    return (<div className="flex flex-col gap-2 mt-2 text-encre" data-noeud="trancher-fusion">
            <div className="text-[12.5px] text-encre-2">Si c'est bien la même personne, dites ce qui est juste : l'autre fiche est corrigée, puis la fusion se débloque.</div>
            {conflits.map(([c, lib]) => (<div key={c} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <span className="text-encre-3 min-w-[140px]">{lib} :</span>
                    <button type="button" disabled={envoi} className={bouton} onClick={() => void choisir(c, a.garder, a.retirer)} data-trancher={`${c}-${a.garder.id}`}>
                        {texte(c, a.garder)} <span className="text-encre-3">(n° {a.garder.id})</span>
                    </button>
                    <button type="button" disabled={envoi} className={bouton} onClick={() => void choisir(c, a.retirer, a.garder)} data-trancher={`${c}-${a.retirer.id}`}>
                        {texte(c, a.retirer)} <span className="text-encre-3">(n° {a.retirer.id})</span>
                    </button>
                </div>))}
            {erreur && <div className="text-[12.5px]" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
        </div>);
};
