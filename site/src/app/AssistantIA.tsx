import { useEffect, useState } from 'react';
import { Sparkle, User } from '@phosphor-icons/react';
import { create } from 'zustand';
import apiClient from '../api/client';
import { allerALaPersonne } from '../store/versPersonne';
import { useTreeStore } from '../store/useTreeStore';
export const useAssistantIA = create<{
    actif: boolean;
}>(() => ({ actif: true }));
interface Ligne {
    texte: string;
    personneId?: number;
}
interface Reponse {
    outil: string;
    arguments: Record<string, unknown>;
    texte: string;
    lignes: Ligne[];
    ouvrir?: number;
    choix?: {
        cle: string;
        libelle: string;
        candidats: {
            id: number;
            libelle: string;
        }[];
    };
    ia?: {
        modele: string;
        dureeMs: number;
    };
}
export const AssistantIA = ({ question, onFermer }: {
    question: string;
    onFermer: () => void;
}) => {
    const actif = useAssistantIA((s) => s.actif);
    const [etat, setEtat] = useState<'repos' | 'attente' | 'fait'>('repos');
    const [r, setR] = useState<Reponse | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [pour, setPour] = useState('');
    const q = question.trim();
    const demander = async (corps: Record<string, unknown>) => {
        setEtat('attente');
        setErreur(null);
        setPour(q);
        try {
            const x = await apiClient.post('/assistant', { question: q, ...corps });
            setR(x.data as Reponse);
            setEtat('fait');
        }
        catch (e: any) {
            setErreur(e?.response?.data?.error ?? e?.message ?? 'L’assistant n’a pas répondu.');
            setEtat('repos');
        }
    };
    useEffect(() => {
        if (!actif)
            return;
        const t = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && e.shiftKey && q.length >= 4 && etat !== 'attente') {
                e.preventDefault();
                e.stopPropagation();
                void demander({});
            }
        };
        window.addEventListener('keydown', t, true);
        return () => window.removeEventListener('keydown', t, true);
    });
    if (!actif || q.length < 4)
        return null;
    const perimee = etat === 'fait' && pour !== q;
    const ouvrir = (id: number) => { const p = useTreeStore.getState().people.find((x) => x.id === id); onFermer(); allerALaPersonne(id, p?.nom ?? ''); };
    return (<div className="mx-1.5 mt-1.5 rounded-[12px] border border-trait bg-blanc" data-bloc="assistant">
            <button onClick={() => void demander({})} disabled={etat === 'attente'} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-sepia-tint disabled:opacity-70" data-porte="assistant">
                <Sparkle size={16} className="text-sepia flex-none"/>
                <span className="flex-1 min-w-0 text-[14px] text-encre truncate">
                    Demander à l’assistant : « {q} »
                </span>
                <span className="font-mono text-[10.5px] text-encre-3 border border-trait rounded-md px-1.5 py-px flex-none">Maj Entrée</span>
            </button>
            {etat === 'attente' && <div className="px-3 pb-3 text-[13px] text-encre-3" data-assistant="attente">L’assistant cherche dans votre arbre… (au processeur, quelques secondes)</div>}
            {erreur && <div className="px-3 pb-3 text-[13px]" style={{ color: 'var(--o-afrique)' }} data-assistant="erreur">{erreur}</div>}
            {etat === 'fait' && r && !perimee && (<div className="px-3 pb-3 flex flex-col gap-1.5 text-[13.5px] text-encre" data-assistant="reponse">
                    <p className="m-0 leading-relaxed">{r.texte}</p>
                    {r.lignes.map((l, i) => l.personneId ? (<button key={i} onClick={() => ouvrir(l.personneId!)} className="self-start flex items-center gap-2 text-left text-sepia-deep underline underline-offset-4 min-h-8" data-personne={l.personneId}>
                                <User size={14} className="flex-none"/>
                                {l.texte}
                            </button>) : (<span key={i} className="text-encre-2">{l.texte}</span>))}
                    {r.choix && (<div className="flex flex-wrap gap-1.5" data-assistant="choix">
                            {r.choix.candidats.map((c) => (<button key={c.id} onClick={() => void demander({ outil: r.outil, arguments: r.arguments, ids: { [r.choix!.cle]: c.id } })} className="min-h-9 px-3 rounded-[10px] border border-trait bg-carte text-[13px] text-encre hover:border-sepia">
                                    {c.libelle}
                                </button>))}
                        </div>)}
                    {r.ouvrir && <button onClick={() => ouvrir(r.ouvrir!)} className="self-start min-h-9 px-3 rounded-[10px] border border-sepia text-sepia-deep text-[13px]" data-assistant="ouvrir">Ouvrir dans l’arbre</button>}
                    {r.ia && <span className="text-[11px] text-encre-3 font-mono" data-assistant="duree">{r.ia.modele} · {(r.ia.dureeMs / 1000).toFixed(1)} s · au processeur</span>}
                </div>)}
        </div>);
};
