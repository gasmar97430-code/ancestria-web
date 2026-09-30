import { useEffect, useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { RechercheWebLibre } from './RechercheWebLibre';
interface Fiche {
    cle: string;
    titre: string;
    domaine: string;
    etat: 'utilisable' | 'protege' | 'certificat expire' | 'compte obligatoire';
    mesure: string;
    note?: string;
    branchee: boolean;
}
const GROUPES: {
    titre: string;
    aide: string;
    filtre: (f: Fiche) => boolean;
}[] = [
    { titre: 'Branchées', aide: 'Interrogées à chaque traque.', filtre: (f) => f.branchee },
    {
        titre: 'Mesurées, à brancher',
        aide: 'Elles répondent ; leur lecture reste à écrire.',
        filtre: (f) => !f.branchee && f.etat === 'utilisable',
    },
    {
        titre: 'Écartées',
        aide: 'Protégées, fermées ou sans certificat valide : jamais contournées.',
        filtre: (f) => f.etat !== 'utilisable',
    },
];
export const Sources = () => {
    const [fiches, setFiches] = useState<Fiche[]>([]);
    const [erreur, setErreur] = useState<string | null>(null);
    useEffect(() => {
        apiClient
            .get('/traque/sources/releve')
            .then((r) => setFiches(r.data))
            .catch((e) => setErreur(e.message));
    }, []);
    return (<main className="flex-1 min-w-0 overflow-y-auto px-12 py-11 flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <div className="text-[11px] tracking-[.14em] uppercase text-sepia">Sources</div>
                <h1 className="font-display text-[56px] leading-none font-medium">Les fonds interrogés</h1>
                <p className="text-sm text-encre-2">
                    Relevé mesuré le 25/09/2026 depuis ce poste, une vraie requête par source.
                </p>
            </header>
            <RechercheWebLibre />
            {erreur && <p className="text-sm text-encre-2">Relevé indisponible : {erreur}</p>}

            {GROUPES.map((g) => {
            const liste = fiches.filter(g.filtre);
            if (liste.length === 0)
                return null;
            return (<section key={g.titre} className="flex flex-col gap-3">
                        <div className="flex items-baseline gap-3">
                            <h2 className="font-display text-[26px] font-medium m-0">{g.titre}</h2>
                            <span className="font-mono text-[11px] text-encre-3">{liste.length}</span>
                            <span className="text-[12.5px] text-encre-3">{g.aide}</span>
                        </div>
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {liste.map((f) => (<article key={f.cle} className={`rounded-[14px] p-[18px] flex flex-col gap-2 border ${f.etat === 'utilisable'
                        ? 'bg-blanc border-trait-carte shadow-carte'
                        : 'bg-transparent border-dashed border-trait'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10.5px] font-medium px-[7px] py-[3px] rounded-md bg-papier text-encre-2">
                                            {f.cle}
                                        </span>
                                        <a href={`https://${f.domaine}`} target="_blank" rel="noreferrer" className="ml-auto text-xs flex items-center gap-1">
                                            {f.domaine} <ArrowSquareOut />
                                        </a>
                                    </div>
                                    <div className="font-display text-[21px] leading-tight font-medium">{f.titre}</div>
                                    {f.note && <p className="text-[13px] leading-normal text-encre-2 m-0">{f.note}</p>}
                                    <div className="font-mono text-[10.5px] text-encre-3">{f.mesure}</div>
                                </article>))}
                        </div>
                    </section>);
        })}
        </main>);
};
