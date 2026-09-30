import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { ArrowSquareOut, Link, LinkBreak, Seal } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { communicabilite } from '../traque/communicabilite';
import type { Id } from '../../types';
import type { Individu } from './graphe';
import { roleSelon } from '../../lib/accord';
interface Piste {
    id: Id;
    source: string;
    titre: string;
    url: string;
    extrait: string;
    cote: string | null;
    dateSource: string | null;
    certitude: string;
    statut: string;
    motifStatut: string | null;
    individus?: {
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
}
interface Reponse {
    rattachees: (Piste & {
        role: string;
    })[];
    possibles: (Piste & {
        score: number;
        raisons: string[];
    })[];
    possiblesEnTout: number;
    auNomSeul: number;
    horsEpoque: number;
}
const ROLES: [
    string,
    string
][] = [
    ['sujet', 'lui / elle'],
    ['pere', 'son père'],
    ['mere', 'sa mère'],
    ['conjoint', 'conjoint(e)'],
    ['enfant', 'un enfant'],
    ['temoin', 'témoin'],
];
const libelleRole = (r: string) => ROLES.find(([c]) => c === r)?.[1] ?? r;
const CERTITUDE: Record<string, string> = { prouve: 'prouvé', probable: 'probable', hypothese: 'hypothèse' };
const useVersion = create<{
    v: number;
}>(() => ({ v: 0 }));
const signaler = () => useVersion.setState((s) => ({ v: s.v + 1 }));
export const signalerRattachement = signaler;
export const useVersionRattachements = () => useVersion((s) => s.v);
export function useRattachements(cle: unknown): Map<Id, number> {
    const v = useVersion((s) => s.v);
    const [m, setM] = useState<Map<Id, number>>(new Map());
    useEffect(() => {
        apiClient
            .get('/traque/rattachements')
            .then((r) => setM(new Map((r.data as {
            individuId: Id;
            pistes: number;
        }[]).map((x) => [x.individuId, x.pistes]))))
            .catch(() => setM(new Map()));
    }, [cle, v]);
    return m;
}
export const PistesPersonne = ({ personne }: {
    personne: Individu;
}) => {
    const [r, setR] = useState<Reponse | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [voirProtegees, setVoirProtegees] = useState(false);
    const [role, setRole] = useState<Record<Id, string>>({});
    const [preuve, setPreuve] = useState<{
        id: Id;
        motif: string;
    } | null>(null);
    const charger = useCallback(() => {
        apiClient
            .get(`/pistes-personne/${personne.id}`)
            .then((x) => setR(x.data as Reponse))
            .catch((e) => setErreur(e?.response?.data?.error ?? e.message));
    }, [personne.id]);
    useEffect(() => {
        setR(null);
        setPreuve(null);
        charger();
    }, [charger]);
    const version = useVersionRattachements();
    useEffect(() => {
        if (version > 0)
            charger();
    }, [version, charger]);
    const geste = async (f: () => Promise<unknown>) => {
        setErreur(null);
        try {
            await f();
            charger();
            signaler();
        }
        catch (e: any) {
            setErreur(e?.response?.data?.error ?? e.message);
        }
    };
    const titre = 'text-[10.5px] tracking-[.1em] uppercase text-encre-3';
    if (!r)
        return <div className={titre}>Archives · lecture…</div>;
    const moi = { individu: { prenom: personne.prenom, nom: personne.nom, dateNaissance: personne.dateNaissance, dateDeces: personne.dateDeces, decede: (personne as {
                decede?: boolean | null;
            }).decede } };
    const protegee = (p: Piste) => communicabilite({ ...p, individus: [...(p.individus ?? []), moi] }) !== null;
    const possibles = r.possibles.filter((p) => voirProtegees || !protegee(p));
    const nbProtegees = r.possibles.filter(protegee).length;
    const lien = (p: Piste) => (<a href={p.url} target="_blank" rel="noreferrer" className="text-encre hover:underline leading-snug" title="Ouvrir la source dans votre navigateur">
            {p.titre.length > 110 ? `${p.titre.slice(0, 110)}…` : p.titre} <ArrowSquareOut size={11} className="inline"/>
        </a>);
    const meta = (p: Piste, en_plus?: string) => (<div className="text-[11px] text-encre-3">{[p.source, p.dateSource, p.cote, en_plus].filter(Boolean).join(' · ')}</div>);
    return (<div className="flex flex-col gap-2.5" data-bloc="pistes-personne">
            <div className={titre}>Archives rattachées ({r.rattachees.length})</div>
            {r.rattachees.length === 0 && <div className="text-[12px] text-encre-3">Aucune pour l'instant.</div>}
            {r.rattachees.map((p) => (<div key={p.id} className="rounded-[10px] border border-trait bg-papier px-3 py-2 flex flex-col gap-1 text-[12.5px]" data-rattachee={p.id}>
                    {lien(p)}
                    {meta(p, `${roleSelon(p.role, libelleRole(p.role), personne.genre)} · ${CERTITUDE[p.certitude] ?? p.certitude}`)}
                    {p.certitude === 'prouve' && p.motifStatut && <div className="text-[11px] text-encre-2 italic">Preuve : {p.motifStatut}</div>}
                    {preuve?.id === p.id ? (<div className="flex flex-col gap-1">
                            <input autoFocus value={preuve.motif} onChange={(e) => setPreuve({ id: p.id, motif: e.target.value })} placeholder="Pourquoi c'est prouvé (acte lu, cote…)" className="h-8 px-2 bg-blanc border border-trait rounded-lg text-[12px] outline-none focus:border-sepia"/>
                            <div className="flex gap-2">
                                <button disabled={preuve.motif.trim().length === 0} onClick={() => geste(() => apiClient.patch(`/traque/pistes/${p.id}`, { statut: 'gardee', prouvee: true, motif: preuve.motif.trim() })).then(() => setPreuve(null))} className="h-7 px-2.5 rounded-lg border border-sepia text-sepia-deep text-[12px] disabled:opacity-40">
                                    Valider la preuve
                                </button>
                                <button onClick={() => setPreuve(null)} className="text-[12px] text-encre-3 underline">
                                    Annuler
                                </button>
                            </div>
                        </div>) : (<div className="flex gap-3 text-[12px]">
                            {p.certitude === 'prouve' ? (<button onClick={() => geste(() => apiClient.patch(`/traque/pistes/${p.id}`, { statut: 'gardee', prouvee: false }))} className="text-encre-3 hover:text-encre">
                                    Retirer la preuve
                                </button>) : (<button onClick={() => setPreuve({ id: p.id, motif: '' })} className="flex items-center gap-1 text-sepia-deep hover:underline">
                                    <Seal size={12}/> Prouver…
                                </button>)}
                            <button onClick={() => geste(() => apiClient.delete(`/traque/pistes/${p.id}/rattacher/${personne.id}`))} className="flex items-center gap-1 text-encre-3 hover:text-encre ml-auto" title="Cette piste ne concerne pas cette personne">
                                <LinkBreak size={12}/> Détacher
                            </button>
                        </div>)}
                </div>))}

            <div className={`${titre} pt-1`}>Archives possibles ({r.possiblesEnTout - nbProtegees + (voirProtegees ? nbProtegees : 0)})</div>
            {possibles.length === 0 && (<div className="text-[12px] text-encre-3">
                    {nbProtegees > 0 ? 'Seules des pistes protégées correspondent.' : 'Aucune piste ne cite son prénom, ou son lieu et son époque.'}
                </div>)}
            {possibles.map((p) => (<div key={p.id} className="rounded-[10px] border border-dashed border-trait px-3 py-2 flex flex-col gap-1 text-[12.5px]" data-possible={p.id}>
                    {lien(p)}
                    {meta(p, CERTITUDE[p.certitude] ?? p.certitude)}
                    <div className="text-[11.5px] text-encre-2">Pourquoi : {p.raisons.join(' ; ')}</div>
                    {protegee(p) && <div className="text-[11px]" style={{ color: 'var(--o-afrique)' }}>Piste protégée (personne vivante ou acte de moins de 75 ans)</div>}
                    <div className="flex items-center gap-2 text-[12px]">
                        <select value={role[p.id] ?? 'sujet'} onChange={(e) => setRole((x) => ({ ...x, [p.id]: e.target.value }))} className="h-7 bg-blanc border border-trait rounded-lg text-[12px] px-1" title="De qui parle cette piste ?">
                            {ROLES.map(([c, l]) => (<option key={c} value={c}>
                                    {roleSelon(c, l, personne.genre)}
                                </option>))}
                        </select>
                        <button onClick={() => geste(() => apiClient.post(`/traque/pistes/${p.id}/rattacher`, { individuId: personne.id, role: role[p.id] ?? 'sujet' }))} className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sepia text-sepia-deep hover:bg-sepia-tint">
                            <Link size={12}/> Rattacher
                        </button>
                        <button onClick={() => geste(() => apiClient.post('/suggestions/ecarter', { url: p.url, individuId: personne.id }))} className="ml-auto text-encre-3 hover:text-encre" title="Cette piste ne parle pas de cette personne : elle ne lui sera plus proposée">
                            {personne.genre === 'F' ? 'Pas elle' : 'Pas lui'}
                        </button>
                    </div>
                </div>))}
            {nbProtegees > 0 && (<button onClick={() => setVoirProtegees((v) => !v)} className="self-start text-[11.5px] text-encre-3 underline">
                    {voirProtegees ? 'cacher' : 'voir'} les pistes protégées ({nbProtegees})
                </button>)}
            {(r.auNomSeul > 0 || r.horsEpoque > 0) && (<div className="text-[11.5px] text-encre-3 leading-snug">
                    {r.auNomSeul > 0 && `${r.auNomSeul} autre${r.auNomSeul > 1 ? 's' : ''} ne porte${r.auNomSeul > 1 ? 'nt' : ''} que le nom`}
                    {r.auNomSeul > 0 && r.horsEpoque > 0 && ' · '}
                    {r.horsEpoque > 0 && `${r.horsEpoque} hors de son époque`}
                    {r.auNomSeul > 0 && ' (écran Traque des noms)'}
                </div>)}
            {erreur && <p className="text-[12px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </div>);
};
