import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { ArrowSquareOut, Binoculars, MagnifyingGlass, TextAa, User } from '@phosphor-icons/react';
import { AssistantIA } from './AssistantIA';
import apiClient from '../api/client';
import { useAtelierStore } from '../store/useAtelierStore';
import { allerALaPersonne } from '../store/versPersonne';
import { nomLisible, teinteDe } from '../lib/origins';
import { origineAMontrer } from '../lib/origineEtablie';
import { usePatronymeStore } from '../store/usePatronymeStore';
import type { Id } from '../types';
interface Resultats {
    personnes: {
        id: Id;
        prenom: string;
        nom: string;
        naissance: number | null;
        deces: number | null;
        lieu: string | null;
        extrait: string | null;
    }[];
    personnesEnTout: number;
    patronymes: {
        id: Id;
        nom: string;
        origine: string;
        rang: number | null;
        extrait: string | null;
    }[];
    patronymesEnTout: number;
    pistes: {
        id: Id;
        titre: string;
        url: string;
        source: string;
        dateSource: string | null;
        certitude: string;
        extrait: string | null;
        personnes: {
            id: Id;
            prenom: string;
            nom: string;
        }[];
    }[];
    pistesEnTout: number;
    dureeMs: number;
}
type Ligne = {
    genre: 'personne';
    cle: string;
    r: Resultats['personnes'][number];
} | {
    genre: 'nom';
    cle: string;
    r: Resultats['patronymes'][number];
} | {
    genre: 'piste';
    cle: string;
    r: Resultats['pistes'][number];
};
const useOuverte = create<{
    ouverte: boolean;
}>(() => ({ ouverte: false }));
export const ouvrirRecherche = () => useOuverte.setState({ ouverte: true });
const fermer = () => useOuverte.setState({ ouverte: false });
function ouvrirSource(url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
}
function agir(l: Ligne) {
    fermer();
    if (l.genre === 'personne')
        allerALaPersonne(l.r.id, l.r.nom);
    else if (l.genre === 'nom')
        useAtelierStore.getState().choisir(l.r.nom);
    else if (l.r.personnes[0])
        allerALaPersonne(l.r.personnes[0].id, l.r.personnes[0].nom);
    else
        ouvrirSource(l.r.url);
}
export const BoutonRecherche = ({ rail }: {
    rail: boolean;
}) => rail ? (<button onClick={ouvrirRecherche} title="Rechercher partout (Ctrl K)" className="w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="recherche-globale">
            <MagnifyingGlass />
        </button>) : (<button onClick={ouvrirRecherche} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] border border-trait text-encre-3 text-[13px] hover:bg-papier text-left" data-porte="recherche-globale">
            <MagnifyingGlass size={16}/>
            <span className="flex-1">Rechercher partout</span>
            <span className="font-mono text-[10.5px] border border-trait rounded-md px-1.5 py-px">Ctrl K</span>
        </button>);
export const RechercheGlobale = () => {
    const ouverte = useOuverte((s) => s.ouverte);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                e.stopPropagation();
                useOuverte.setState((s) => ({ ouverte: !s.ouverte }));
            }
        };
        window.addEventListener('keydown', touche, true);
        return () => window.removeEventListener('keydown', touche, true);
    }, []);
    return ouverte ? <Fenetre /> : null;
};
const Fenetre = () => {
    const [q, setQ] = useState('');
    const [r, setR] = useState<Resultats | null>(null);
    const [actif, setActif] = useState(0);
    const [erreur, setErreur] = useState<string | null>(null);
    const liste = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (q.trim().length < 2) {
            setR(null);
            return;
        }
        let vivant = true;
        const t = setTimeout(() => {
            apiClient
                .get('/recherche-globale', { params: { q } })
                .then((x) => {
                if (!vivant)
                    return;
                setR(x.data as Resultats);
                setActif(0);
                setErreur(null);
            })
                .catch((e) => vivant && setErreur(e?.response?.data?.error ?? e.message));
        }, 120);
        return () => {
            vivant = false;
            clearTimeout(t);
        };
    }, [q]);
    const lignes: Ligne[] = useMemo(() => r
        ? [
            ...r.personnes.map((x) => ({ genre: 'personne' as const, cle: `p${x.id}`, r: x })),
            ...r.patronymes.map((x) => ({ genre: 'nom' as const, cle: `n${x.id}`, r: x })),
            ...r.pistes.map((x) => ({ genre: 'piste' as const, cle: `t${x.id}`, r: x })),
        ]
        : [], [r]);
    useEffect(() => {
        liste.current?.querySelector(`[data-index="${actif}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [actif]);
    const clavier = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape')
            fermer();
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActif((a) => Math.min(a + 1, lignes.length - 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActif((a) => Math.max(a - 1, 0));
        }
        else if (e.key === 'Enter' && lignes[actif])
            agir(lignes[actif]);
    };
    const groupe = (titre: string, enTout: number, montres: number) => (<div className="px-3 pt-3 pb-1 text-[10.5px] tracking-[.12em] uppercase text-encre-3">
            {titre} · {enTout}
            {enTout > montres ? ` (${montres} premiers)` : ''}
        </div>);
    let index = -1;
    const ligne = (l: Ligne, contenu: React.ReactNode) => {
        index++;
        const i = index;
        return (<button key={l.cle} data-index={i} data-genre={l.genre} onMouseEnter={() => setActif(i)} onClick={() => agir(l)} className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-[10px] ${actif === i ? 'bg-sepia-tint' : ''}`}>
                {contenu}
            </button>);
    };
    return (<div className="fixed inset-0 z-[60] bg-black/40 grid place-items-start justify-center pt-[12vh] px-4" onMouseDown={fermer} data-bloc="recherche-globale">
            <div className="w-[640px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[70vh]" onMouseDown={(e) => e.stopPropagation()}>
                <label className="flex items-center gap-3 h-14 px-4 border-b border-trait-leger">
                    <MagnifyingGlass size={20} className="text-sepia"/>
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={clavier} placeholder="Une personne, un nom, un lieu, un mot des notes ou des archives…" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[17px] text-encre placeholder:text-encre-3"/>
                    <span className="font-mono text-[10.5px] text-encre-3 border border-trait rounded-md px-1.5 py-px">Échap</span>
                </label>

                <AssistantIA question={q} onFermer={fermer}/>
                <div ref={liste} className="overflow-y-auto p-1.5">
                    {q.trim().length < 2 && <div className="px-3 py-6 text-sm text-encre-3">Tapez au moins deux lettres. Tous les mots doivent se trouver ; accents et majuscules n'y changent rien.</div>}
                    {erreur && <div className="px-3 py-3 text-sm" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
                    {r && lignes.length === 0 && <div className="px-3 py-6 text-sm text-encre-3">Rien ne correspond à « {q.trim()} ».</div>}

                    {r && r.personnes.length > 0 && groupe('Personnes de votre arbre', r.personnesEnTout, r.personnes.length)}
                    {r?.personnes.map((x) => ligne({ genre: 'personne', cle: `p${x.id}`, r: x }, <>
                                <User size={16} className="mt-0.5 text-sepia flex-none"/>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-[14px] text-encre">
                                        <span className="font-medium">{x.prenom}</span> {nomLisible(x.nom)}
                                        <span className="font-mono text-[11.5px] text-encre-3 ml-2">
                                            {[x.naissance || x.deces ? `${x.naissance ?? ''} – ${x.deces ?? ''}` : null, x.lieu].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    {x.extrait && <span className="text-[12px] text-encre-3 truncate">notes : {x.extrait}</span>}
                                </span>
                            </>))}

                    {r && r.patronymes.length > 0 && groupe('Noms du répertoire', r.patronymesEnTout, r.patronymes.length)}
                    {r?.patronymes.map((x) => ligne({ genre: 'nom', cle: `n${x.id}`, r: x }, <>
                                <TextAa size={16} className="mt-0.5 flex-none" style={{ color: teinteDe(origineAMontrer(x.nom, usePatronymeStore.getState().patronymes)).c }}/>
                                <span className="flex flex-col min-w-0">
                                    <span className="font-display text-[18px] leading-tight text-encre">{nomLisible(x.nom)}</span>
                                    <span className="text-[12px] text-encre-3 truncate">
                                        {teinteDe(origineAMontrer(x.nom, usePatronymeStore.getState().patronymes)).court}
                                        {x.rang ? ` · ${x.rang}ᵉ patronyme de l'île` : ''}
                                        {x.extrait ? ` · ${x.extrait}` : ''}
                                    </span>
                                </span>
                            </>))}

                    {r && r.pistes.length > 0 && groupe('Archives (pistes de la Traque)', r.pistesEnTout, r.pistes.length)}
                    {r?.pistes.map((x) => ligne({ genre: 'piste', cle: `t${x.id}`, r: x }, <>
                                <Binoculars size={16} className="mt-0.5 text-encre-2 flex-none"/>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-[13.5px] text-encre leading-snug">{x.titre.length > 120 ? `${x.titre.slice(0, 120)}…` : x.titre}</span>
                                    <span className="text-[12px] text-encre-3 truncate">
                                        {[x.source, x.dateSource].filter(Boolean).join(' · ')}
                                        {x.personnes.length > 0
                ? ` · rattachée à ${x.personnes.map((p) => `${p.prenom} ${nomLisible(p.nom)}`).join(', ')}`
                : ' · non rattachée : ouvre la source'}
                                        {x.extrait ? ` · ${x.extrait}` : ''}
                                    </span>
                                </span>
                                {x.personnes.length === 0 && <ArrowSquareOut size={13} className="mt-1 text-encre-3 flex-none ml-auto"/>}
                            </>))}
                </div>

                {r && (<div className="px-4 py-2 border-t border-trait-leger text-[11px] text-encre-3 flex gap-4">
                        <span>↑ ↓ choisir · Entrée ouvrir · Échap fermer</span>
                        <span className="ml-auto font-mono" data-duree>{r.dureeMs} ms</span>
                    </div>)}
            </div>
        </div>);
};
