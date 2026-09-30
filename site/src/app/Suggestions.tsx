import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, Lightbulb, Link, TreeStructure } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { allerALaPersonne } from '../store/versPersonne';
import { communicabilite } from '../features/traque/communicabilite';
import { signalerRattachement, useVersionRattachements } from '../features/tree/PistesPersonne';
import { nomLisible } from '../lib/origins';
import type { Id } from '../types';
import { roleSelon } from '../lib/accord';
import { useTreeStore } from '../store/useTreeStore';
interface Suggestion {
    individu: {
        id: Id;
        prenom: string;
        nom: string;
        dateNaissance: string | null;
        dateDeces: string | null;
        decede: boolean | null;
    };
    piste: {
        id: Id;
        titre: string;
        url: string;
        source: string;
        extrait: string;
        cote: string | null;
        dateSource: string | null;
        certitude: string;
        individus: {
            individuId: Id;
            role: string;
            individu: {
                prenom: string;
                nom: string;
                dateNaissance?: string | null;
                dateDeces?: string | null;
                decede?: boolean | null;
            };
        }[];
    };
    score: number;
    raisons: string[];
}
interface Reponse {
    suggestions: Suggestion[];
    refusees: number;
    dureeMs: number;
}
const ROLES: [
    string,
    string
][] = [['sujet', 'lui / elle'], ['pere', 'son père'], ['mere', 'sa mère'], ['conjoint', 'conjoint(e)'], ['enfant', 'un enfant'], ['temoin', 'témoin']];
const CERTITUDE: Record<string, string> = { probable: 'probable', hypothese: 'hypothèse' };
const protegee = (s: Suggestion) => communicabilite({ ...s.piste, individus: [...s.piste.individus, { individu: s.individu }] }) !== null;
function useSuggestions() {
    const version = useVersionRattachements();
    const [r, setR] = useState<Reponse | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const charger = useCallback(() => {
        apiClient
            .get('/suggestions')
            .then((x) => { setR(x.data as Reponse); setErreur(null); })
            .catch((e) => setErreur(e?.response?.data?.error ?? e.message));
    }, []);
    useEffect(() => charger(), [charger, version]);
    return { r, erreur, charger };
}
export const BoutonSuggestions = ({ rail }: {
    rail: boolean;
}) => {
    const { r } = useSuggestions();
    const [ouverte, setOuverte] = useState(false);
    const n = r ? r.suggestions.filter((s) => !protegee(s)).length : null;
    const titre = `Suggestions de croisement${n !== null ? ` (${n})` : ''}`;
    return (<>
            {rail ? (<button onClick={() => setOuverte(true)} title={titre} className="relative w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="suggestions">
                    <Lightbulb />
                    {n ? <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-sepia text-[10px] leading-4 text-blanc font-medium">{n}</span> : null}
                </button>) : (<button onClick={() => setOuverte(true)} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="suggestions">
                    <Lightbulb size={18}/>
                    <span className="flex-1">Suggestions</span>
                    {n !== null && <span className="text-[12px] text-sepia-deep font-medium">{n}</span>}
                </button>)}
            {ouverte && <Fenetre onFermer={() => setOuverte(false)}/>}
        </>);
};
const Fenetre = ({ onFermer }: {
    onFermer: () => void;
}) => {
    const { r, erreur, charger } = useSuggestions();
    const [voirProtegees, setVoirProtegees] = useState(false);
    const [role, setRole] = useState<Record<string, string>>({});
    const [erreurGeste, setErreurGeste] = useState<string | null>(null);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    }, [onFermer]);
    const visibles = useMemo(() => (r ? r.suggestions.filter((s) => voirProtegees || !protegee(s)) : []), [r, voirProtegees]);
    const nbProtegees = r ? r.suggestions.filter(protegee).length : 0;
    const parPersonne = useMemo(() => {
        const m = new Map<Id, Suggestion[]>();
        for (const s of visibles)
            m.set(s.individu.id, [...(m.get(s.individu.id) ?? []), s]);
        return [...m.values()];
    }, [visibles]);
    const geste = async (f: () => Promise<unknown>) => {
        setErreurGeste(null);
        try {
            await f();
            signalerRattachement();
            charger();
        }
        catch (e: any) {
            setErreurGeste(e?.response?.data?.error ?? e.message);
        }
    };
    const cle = (s: Suggestion) => `${s.piste.url}|${s.individu.id}`;
    return (<div className="fixed inset-0 z-[60] bg-black/40 grid place-items-start justify-center pt-[8vh] px-4" onMouseDown={onFermer} data-bloc="suggestions">
            <div className="w-[760px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[84vh]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-trait-leger flex flex-col gap-1">
                    <div className="font-display text-[26px] leading-none">Suggestions de croisement</div>
                    <div className="text-[12.5px] text-encre-3">
                        Pistes des archives que les règles rapprochent d'une personne de votre arbre. Rien n'est relié sans votre clic ; un même nom n'est jamais une preuve.
                    </div>
                </div>
                <div className="overflow-y-auto px-4 py-3 flex flex-col gap-4">
                    {!r && !erreur && <div className="text-sm text-encre-3">Calcul…</div>}
                    {erreur && <div className="text-sm" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
                    {r && visibles.length === 0 && (<div className="text-sm text-encre-3">
                            Aucune suggestion{nbProtegees > 0 ? ' visible (seules des pistes protégées restent)' : ''}. Les suggestions viennent des pistes de la Traque qui citent un prénom avec le nom, ou un lieu et une date de la vie de la personne.
                        </div>)}
                    {parPersonne.map((groupe) => {
            const g = groupe[0].individu;
            return (<div key={g.id} className="flex flex-col gap-2" data-suggestion-personne={g.id}>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-[15px] text-encre"><span className="font-medium">{g.prenom}</span> {nomLisible(g.nom)}</span>
                                    <button onClick={() => { onFermer(); allerALaPersonne(g.id, g.nom); }} className="flex items-center gap-1 text-[12px] text-sepia-deep hover:underline">
                                        <TreeStructure size={12}/> voir dans l'arbre
                                    </button>
                                </div>
                                {groupe.map((s) => (<div key={cle(s)} className="rounded-[10px] border border-dashed border-trait px-3 py-2 flex flex-col gap-1 text-[12.5px]" data-suggestion={cle(s)}>
                                        <a href={s.piste.url} target="_blank" rel="noreferrer" className="text-encre hover:underline leading-snug">
                                            {s.piste.titre.length > 140 ? `${s.piste.titre.slice(0, 140)}…` : s.piste.titre} <ArrowSquareOut size={11} className="inline"/>
                                        </a>
                                        <div className="text-[11px] text-encre-3">{[s.piste.source, s.piste.dateSource, s.piste.cote, CERTITUDE[s.piste.certitude] ?? s.piste.certitude].filter(Boolean).join(' · ')}</div>
                                        <div className="text-[11.5px] text-encre-2">Pourquoi : {s.raisons.join(' ; ')}</div>
                                        {protegee(s) && <div className="text-[11px]" style={{ color: 'var(--o-afrique)' }}>Piste protégée (personne vivante ou acte de moins de 75 ans)</div>}
                                        <div className="flex items-center gap-2 text-[12px]">
                                            <select value={role[cle(s)] ?? 'sujet'} onChange={(e) => setRole((x) => ({ ...x, [cle(s)]: e.target.value }))} className="h-7 bg-blanc border border-trait rounded-lg text-[12px] px-1" title="De qui parle cette piste ?">
                                                {ROLES.map(([c, l]) => <option key={c} value={c}>{roleSelon(c, l, useTreeStore.getState().people.find((x) => x.id === g.id)?.genre)}</option>)}
                                            </select>
                                            <button onClick={() => geste(() => apiClient.post(`/traque/pistes/${s.piste.id}/rattacher`, { individuId: g.id, role: role[cle(s)] ?? 'sujet' }))} className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sepia text-sepia-deep hover:bg-sepia-tint">
                                                <Link size={12}/> Rattacher
                                            </button>
                                            <button onClick={() => geste(() => apiClient.post('/suggestions/ecarter', { url: s.piste.url, individuId: g.id }))} className="ml-auto text-encre-3 hover:text-encre" title="Cette piste ne parle pas de cette personne : elle ne sera plus proposée">
                                                Pas {g.prenom.split(/[\s-]/)[0]}
                                            </button>
                                        </div>
                                    </div>))}
                            </div>);
        })}
                    {erreurGeste && <div className="text-[12px]" style={{ color: 'var(--o-afrique)' }}>{erreurGeste}</div>}
                </div>
                <div className="px-5 py-2.5 border-t border-trait-leger text-[11.5px] text-encre-3 flex gap-4 items-center">
                    {nbProtegees > 0 && (<button onClick={() => setVoirProtegees((v) => !v)} className="underline">
                            {voirProtegees ? 'cacher' : 'voir'} les pistes protégées ({nbProtegees})
                        </button>)}
                    {r && r.refusees > 0 && <span>{r.refusees} refusée{r.refusees > 1 ? 's' : ''} (ne reviennent plus)</span>}
                    {r && <span className="ml-auto font-mono" data-duree>{r.dureeMs} ms</span>}
                    <button onClick={onFermer} className="underline">Fermer</button>
                </div>
            </div>
        </div>);
};
