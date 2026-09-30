import { useEffect } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { create } from 'zustand';
import apiClient from '../../api/client';
import { normaliser } from '../../lib/origins';
export interface SourceDOrigine {
    nom: string;
    titre: string;
    editeur: string;
    adresse: string | null;
    nature: string;
    passage: string;
    repere: string | null;
    etablit: string;
    releve: string;
}
export const NATURES: Record<string, string> = {
    archives: 'Archives',
    universite: 'Université',
    etude: 'Étude',
    association: 'Compte rendu',
    encyclopedie: 'Encyclopédie collaborative',
    dictionnaire: 'Dictionnaire des noms',
};
export function rangerParNom(sources: SourceDOrigine[]): Map<string, SourceDOrigine[]> {
    const m = new Map<string, SourceDOrigine[]>();
    for (const s of sources) {
        const cle = normaliser(s.nom);
        m.set(cle, [...(m.get(cle) ?? []), s]);
    }
    return m;
}
export const sourcesDuNom = (parNom: Map<string, SourceDOrigine[]>, nom: string): SourceDOrigine[] => parNom.get(normaliser(nom)) ?? [];
export const useSourcesOrigine = create<{
    parNom: Map<string, SourceDOrigine[]>;
    charge: boolean;
    charger: () => Promise<void>;
}>((set, get) => ({
    parNom: new Map(),
    charge: false,
    charger: async () => {
        if (get().charge)
            return;
        try {
            const r = await apiClient.get('/patronymes/sources');
            set({ parNom: rangerParNom(r.data.items as SourceDOrigine[]), charge: true });
        }
        catch {
            set({ charge: true });
        }
    },
}));
export const SourceOrigine = ({ nom }: {
    nom: string;
}) => {
    const { parNom, charger } = useSourcesOrigine();
    useEffect(() => {
        void charger();
    }, [charger]);
    const sources = sourcesDuNom(parNom, nom);
    if (sources.length === 0)
        return null;
    return (<div className="flex flex-col gap-2" data-noeud="source-origine">
            <div className="text-[10.5px] tracking-[.12em] uppercase text-sepia">
                {sources.length > 1 ? `Sources de l'origine · ${sources.length}` : "Source de l'origine"}
            </div>
            {sources.map((s) => (<div key={`${s.titre}|${s.passage}`} className="flex flex-col gap-1.5 px-4 py-3 bg-papier rounded-[12px]">
                    <p className="text-[14px] leading-snug text-encre m-0">{s.etablit}</p>
                    <p className="font-display italic text-[17px] leading-snug text-encre-2 m-0">«&nbsp;{s.passage}&nbsp;»</p>
                    <p className="text-xs leading-snug text-encre-3 m-0">
                        <span className="text-encre-2">{NATURES[s.nature] ?? s.nature}</span> — {s.titre}. {s.editeur}
                        {s.repere ? ` · ${s.repere}` : ''} · {s.releve}.
                    </p>
                    {s.adresse && (<a href={s.adresse} target="_blank" rel="noreferrer" title="S'ouvre dans ton navigateur." className="self-start text-xs text-sepia-deep hover:underline inline-flex items-center gap-1">
                            Lire la source <ArrowSquareOut />
                        </a>)}
                </div>))}
        </div>);
};
