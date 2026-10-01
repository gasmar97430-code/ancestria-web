import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { nomLisible, normaliser } from '../../lib/origins';
import type { Id } from '../../types';
import { Individu, periode } from './graphe';
import { useNomCherche } from './titreFamille';
const MAX = 8;
export const sansLibelle = (saisie: string) => normaliser(saisie).replace(/^FAMILLE\s+/, '');
export function chercherPersonnes(people: Individu[], saisie: string): Individu[] {
    const mots = sansLibelle(saisie).split(/\s+/).filter(Boolean);
    if (mots.length === 0)
        return [];
    const texte = (p: Individu) => normaliser(`${p.prenom} ${p.nom}`);
    const exacts = people
        .filter((p) => mots.every((m) => texte(p).includes(m)))
        .sort((a, b) => {
        const entiers = (p: Individu) => {
            const ses = texte(p).split(/[\s-]+/);
            return mots.filter((m) => ses.includes(m)).length === mots.length && ses.length === mots.length ? 0 : 1;
        };
        const debut = (p: Individu) => (normaliser(p.nom).startsWith(mots[0]) || normaliser(p.prenom).startsWith(mots[0]) ? 0 : 1);
        return entiers(a) - entiers(b) || debut(a) - debut(b) || texte(a).localeCompare(texte(b));
    });
    if (exacts.length > 0)
        return exacts.slice(0, MAX);
    const fuse = new Fuse(people.map((p) => ({ p, t: texte(p) })), { keys: ['t'], threshold: 0.34, ignoreLocation: true });
    return fuse.search(mots.join(' ')).slice(0, MAX).map((r) => r.item.p);
}
export interface Famille {
    nom: string;
    porteurs: number;
    souche: Individu;
}
export function chercherFamilles(people: Individu[], saisie: string, parentsDe?: Map<Id, Set<Id>>): Famille[] {
    const s = sansLibelle(saisie).replace(/\s+/g, ' ');
    if (s.length < 2)
        return [];
    const parNom = new Map<string, Individu[]>();
    for (const p of people) {
        const n = normaliser(p.nom);
        if (!n.includes(s))
            continue;
        const l = parNom.get(n);
        if (l)
            l.push(p);
        else
            parNom.set(n, [p]);
    }
    const an = (p: Individu) => (p.dateNaissance ? new Date(p.dateNaissance).getTime() : Number.POSITIVE_INFINITY);
    const familles: Famille[] = [];
    for (const porteurs of parNom.values()) {
        const ids = new Set(porteurs.map((p) => p.id));
        const chef = new Map<Id, Id>(porteurs.map((p) => [p.id, p.id]));
        const trouver = (x: Id): Id => (chef.get(x) === x ? x : (chef.set(x, trouver(chef.get(x)!)), chef.get(x)!));
        for (const p of porteurs)
            for (const par of parentsDe?.get(p.id) ?? [])
                if (ids.has(par))
                    chef.set(trouver(p.id), trouver(par));
        const branches = new Map<Id, Individu[]>();
        for (const p of porteurs) {
            const c = parentsDe ? trouver(p.id) : 0;
            const l = branches.get(c);
            if (l)
                l.push(p);
            else
                branches.set(c, [p]);
        }
        for (const membres of branches.values()) {
            const dans = new Set(membres.map((m) => m.id));
            const enfantsDe = new Map<Id, Id[]>();
            for (const m of membres)
                for (const par of parentsDe?.get(m.id) ?? [])
                    if (dans.has(par))
                        enfantsDe.set(par, [...(enfantsDe.get(par) ?? []), m.id]);
            const descendants = (id: Id): number => (enfantsDe.get(id) ?? []).reduce((t, e) => t + 1 + descendants(e), 0);
            const racines = membres.filter((m) => ![...(parentsDe?.get(m.id) ?? [])].some((par) => dans.has(par)));
            const souche = [...(racines.length ? racines : membres)].sort((a, b) => descendants(b.id) - descendants(a.id) || an(a) - an(b) || a.id - b.id)[0];
            familles.push({ nom: souche.nom, porteurs: membres.length, souche });
        }
    }
    return familles.sort((a, b) => b.porteurs - a.porteurs).slice(0, 5);
}
export const RechercheArbre = ({ people, onChoisir, parentsDe }: {
    people: Individu[];
    onChoisir: (id: Id) => void;
    parentsDe?: Map<Id, Set<Id>>;
}) => {
    const [saisie, setSaisie] = useState('');
    const [ouvert, setOuvert] = useState(false);
    const [actif, setActif] = useState(0);
    const champ = useRef<HTMLInputElement>(null);
    const personnes = useMemo(() => chercherPersonnes(people, saisie), [people, saisie]);
    const familles = useMemo(() => chercherFamilles(people, saisie, parentsDe), [people, saisie, parentsDe]);
    const resultats = useMemo(() => [...familles.map((f) => ({ famille: f, p: f.souche })), ...personnes.map((p) => ({ famille: null as Famille | null, p }))], [familles, personnes]);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                champ.current?.focus();
                champ.current?.select();
            }
        };
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    }, []);
    const choisir = ({ famille, p }: {
        famille: Famille | null;
        p: Individu;
    }) => {
        onChoisir(p.id);
        useNomCherche.getState().poser(famille ? famille.nom : p.nom);
        setSaisie(famille ? `Famille ${nomLisible(famille.nom)}` : `${p.prenom} ${nomLisible(p.nom)}`);
        setOuvert(false);
        champ.current?.blur();
    };
    return (<div className="relative ml-3 flex-none">
            <label className="flex items-center gap-2 h-9 w-[290px] px-3 bg-blanc border border-trait rounded-[10px] transition-colors focus-within:border-sepia">
                <MagnifyingGlass size={16} className="text-sepia flex-none"/>
                <input ref={champ} value={saisie} onChange={(e) => {
            setSaisie(e.target.value);
            if (!e.target.value.trim())
                useNomCherche.getState().poser(null);
            setOuvert(true);
            setActif(0);
        }} onFocus={() => setOuvert(true)} onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) {
                e.preventDefault();
                e.currentTarget.focus();
                e.currentTarget.select();
            }
        }} onBlur={() => setTimeout(() => setOuvert(false), 150)} onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActif((a) => Math.min(a + 1, resultats.length - 1));
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActif((a) => Math.max(a - 1, 0));
            }
            else if (e.key === 'Enter' && resultats[actif]) {
                choisir(resultats[actif]);
            }
            else if (e.key === 'Escape') {
                setOuvert(false);
                champ.current?.blur();
            }
        }} placeholder="Nom de famille ou personne…" className="flex-1 min-w-0 border-0 bg-transparent text-[13px] text-encre outline-none focus-visible:outline-none placeholder:text-encre-3"/>
                <span className="font-mono text-[10px] text-encre-3 border border-trait rounded px-1 py-px flex-none">Ctrl F</span>
            </label>
            {ouvert && saisie.trim() !== '' && (<div className="absolute left-0 top-[42px] z-30 w-[300px] bg-carte border border-trait rounded-xl shadow-carte overflow-hidden">
                    {resultats.length === 0 ? (<div className="px-3 py-2.5 text-[12.5px] text-encre-3">Personne de ce nom dans l'arbre.</div>) : (resultats.map((r, k) => (<button key={(r.famille ? 'f-' : 'p-') + r.p.id + (r.famille?.nom ?? '')} onMouseDown={(e) => e.preventDefault()} onClick={() => choisir(r)} onMouseEnter={() => setActif(k)} className={`w-full text-left px-3 py-2 flex items-baseline gap-2 ${k === actif ? 'bg-sepia-tint' : ''} ${r.famille && !resultats[k + 1]?.famille ? 'border-b border-trait-leger' : ''}`}>
                                {r.famille ? (<>
                                        <span className="text-[13px] text-encre truncate">
                                            Famille <span className="font-semibold">{nomLisible(r.famille.nom)}</span>
                                        </span>
                                        <span className="ml-auto text-[10.5px] text-encre-3 flex-none">
                                            {r.famille.porteurs} pers. · depuis {r.p.prenom}
                                            {periode(r.p) ? ` (${periode(r.p)!.split(' ')[0]})` : ''}
                                        </span>
                                    </>) : (<>
                                        <span className="text-[13px] text-encre truncate">
                                            {r.p.prenom} <span className="font-semibold">{nomLisible(r.p.nom)}</span>
                                        </span>
                                        <span className="ml-auto font-mono text-[10.5px] text-encre-3 flex-none">{periode(r.p) ?? ''}</span>
                                    </>)}
                            </button>)))}
                </div>)}
        </div>);
};
