import { useCallback, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { ArrowsLeftRight, Warning, TreeStructure } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { useTreeStore } from '../store/useTreeStore';
import { allerALaPersonne } from '../store/versPersonne';
import { nomLisible } from '../lib/origins';
import type { Id } from '../types';
import { accorde } from '../lib/accord';
import { TrancherFusion, versionFusion } from './TrancherFusion';
type Genre = 'doublon' | 'un-seul-parent' | 'parents-sans-couple' | 'enfant-hors-couple' | 'sexe-inconnu' | 'dates' | 'trois-parents';
interface Cas {
    genre: Genre;
    texte: string;
    personnes: Id[];
    cle: string;
    geste?: {
        type: 'fusionner';
        garder: Id;
        retirer: Id;
    } | {
        type: 'rattacher-au-couple';
        enfantId: Id;
        unionId: Id;
    } | {
        type: 'creer-couple';
        a: Id;
        b: Id;
    };
}
interface Reponse {
    incoherences: Cas[];
    ignorees: number;
    dureeMs: number;
}
const TITRES: Record<Genre, [
    string,
    string
]> = {
    doublon: ['Personnes saisies deux fois ?', 'Même nom, même prénom, ET un proche en commun ou la même année de naissance (un nom seul ne prouve rien : à La Réunion beaucoup de familles portent les mêmes noms). Comparez les deux fiches : fusionnez si c\'est la même personne, sinon dites-le, le cas ne reviendra plus.'],
    'un-seul-parent': ['Enfant rattaché à un seul parent', 'Le parent vit en couple : l\'autre membre du couple est-il aussi son parent ?'],
    'parents-sans-couple': ['Parents sans couple', 'L\'enfant a ses deux parents, mais aucun couple ne les relie : l\'arbre ne peut pas le ranger.'],
    'enfant-hors-couple': ['Enfant pas rangé sous le couple de ses parents', 'Ses deux parents et leur couple existent déjà : le ranger ne change aucun fait, seulement la place dans l\'arbre (et le compteur « + enfant » de la fiche).'],
    'sexe-inconnu': ['Sexe non renseigné', 'Sans lui, Paternelle / Maternelle et « fils de / fille de » ne savent pas le placer.'],
    dates: ['Dates impossibles', 'Ouvrez la fiche pour corriger la date.'],
    'trois-parents': ['Plus de deux parents biologiques', 'Ouvrez la fiche : « Ses parents → Changer de parents… ».'],
};
const ORDRE: Genre[] = ['doublon', 'un-seul-parent', 'parents-sans-couple', 'trois-parents', 'dates', 'sexe-inconnu', 'enfant-hors-couple'];
export const A_VERIFIER: Genre[] = ['doublon', 'trois-parents', 'dates'];
const aVerifier = (c: {
    genre: Genre;
}) => A_VERIFIER.includes(c.genre);
const useVersion = create<{
    v: number;
}>(() => ({ v: 0 }));
const signaler = () => useVersion.setState((s) => ({ v: s.v + 1 }));
function useIncoherences() {
    const v = useVersion((s) => s.v);
    const nbPersonnes = useTreeStore((s) => s.people.length);
    const [r, setR] = useState<Reponse | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const charger = useCallback(() => {
        apiClient.get('/incoherences').then((x) => { setR(x.data as Reponse); setErreur(null); }).catch((e) => setErreur(e?.response?.data?.error ?? e.message));
    }, []);
    useEffect(() => charger(), [charger, v, nbPersonnes]);
    return { r, erreur };
}
export const BoutonIncoherences = ({ rail }: {
    rail: boolean;
}) => {
    const { r } = useIncoherences();
    const [ouverte, setOuverte] = useState(false);
    const n = r ? r.incoherences.filter(aVerifier).length : null;
    return (<>
            {rail ? (<button onClick={() => setOuverte(true)} title={`Incohérences de l'arbre${n !== null ? ` (${n})` : ''}`} className="relative w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="incoherences">
                    <Warning />
                    {n ? <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-blanc font-medium" style={{ background: 'var(--o-afrique)' }}>{n}</span> : null}
                </button>) : (<button onClick={() => setOuverte(true)} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="incoherences">
                    <Warning size={18}/>
                    <span className="flex-1">Incohérences</span>
                    {n !== null && <span className="text-[12px] font-medium" style={{ color: n ? 'var(--o-afrique)' : 'var(--encre-3)' }}>{n}</span>}
                </button>)}
            {ouverte && <Fenetre onFermer={() => setOuverte(false)}/>}
        </>);
};
const Fenetre = ({ onFermer }: {
    onFermer: () => void;
}) => {
    const { r, erreur } = useIncoherences();
    const tree = useTreeStore();
    const [erreurGeste, setErreurGeste] = useState<string | null>(null);
    const [enCours, setEnCours] = useState(false);
    const [comparer, setComparer] = useState<{
        garder: Id;
        retirer: Id;
    } | null>(null);
    const [completerOuvert, setCompleterOuvert] = useState(false);
    useEffect(() => {
        const t = (e: KeyboardEvent) => e.key === 'Escape' && (comparer ? setComparer(null) : onFermer());
        window.addEventListener('keydown', t);
        return () => window.removeEventListener('keydown', t);
    }, [onFermer, comparer]);
    const geste = async (f: () => Promise<unknown>) => {
        setErreurGeste(null);
        setEnCours(true);
        try {
            await f();
            await tree.fetchTree();
            signaler();
        }
        catch (e: any) {
            setErreurGeste(e?.response?.data?.error ?? e.message);
        }
        finally {
            setEnCours(false);
        }
    };
    const ignorer = (c: Cas) => geste(() => apiClient.post('/incoherences/ignorer', { cle: c.cle }));
    const ranger = (enfantId: Id, unionId: Id) => apiClient.post('/deplacer-enfants', { enfants: [enfantId], versUnionId: unionId });
    const voir = (id: Id) => { const p = tree.people.find((x) => x.id === id); onFermer(); allerALaPersonne(id, p?.nom ?? ''); };
    const autreDuCouple = (unionId: Id, parent: Id) => { const u = tree.unions.find((x) => x.id === unionId); return u ? (u.partenaire1Id === parent ? u.partenaire2Id : u.partenaire1Id) : 0; };
    const qui = (id: Id) => { const p = tree.people.find((x) => x.id === id); return p ? `${p.prenom} ${nomLisible(p.nom)}` : `n° ${id}`; };
    const parGenre = useMemo(() => {
        const m = new Map<Genre, Cas[]>();
        for (const c of r?.incoherences ?? [])
            m.set(c.genre, [...(m.get(c.genre) ?? []), c]);
        return ORDRE.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
    }, [r]);
    const toutRanger = (cas: Cas[]) => geste(async () => {
        const parCouple = new Map<Id, Id[]>();
        for (const c of cas)
            if (c.geste?.type === 'rattacher-au-couple')
                parCouple.set(c.geste.unionId, [...(parCouple.get(c.geste.unionId) ?? []), c.geste.enfantId]);
        for (const [unionId, enfants] of parCouple)
            await apiClient.post('/deplacer-enfants', { enfants, versUnionId: unionId });
    });
    const bouton = 'h-7 px-2.5 rounded-lg border text-[12px] disabled:opacity-40';
    const rendre = (g: Genre, cas: Cas[]) => (<section key={g} className="flex flex-col gap-2" data-genre={g}>
                                <div className="flex items-baseline gap-3">
                                    <div className="text-[15px] text-encre font-medium">{TITRES[g][0]} · {cas.length}</div>
                                    {g === 'enfant-hors-couple' && (<button disabled={enCours} onClick={() => toutRanger(cas)} className={`${bouton} border-sepia text-sepia-deep hover:bg-sepia-tint`} data-action="tout-ranger">
                                            Ranger les {cas.length} sous leur couple
                                        </button>)}
                                </div>
                                <div className="text-[12px] text-encre-3 -mt-1">{TITRES[g][1]}</div>
                                {cas.map((c) => (<div key={c.cle} className="rounded-[10px] border border-trait bg-papier px-3 py-2 flex flex-col gap-1.5 text-[12.5px]" data-cas={c.cle}>
                                        <div className="text-encre-2">{c.texte}</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {c.geste?.type === 'fusionner' && (<button onClick={() => setComparer({ garder: c.geste!.type === 'fusionner' ? (c.geste as {
                    garder: Id;
                }).garder : 0, retirer: (c.geste as {
                    retirer: Id;
                }).retirer })} className={`${bouton} border-sepia text-sepia-deep hover:bg-sepia-tint`} data-action="comparer">
                                                    Comparer et fusionner…
                                                </button>)}
                                            {c.genre === 'un-seul-parent' && c.geste?.type === 'rattacher-au-couple' && (<button disabled={enCours} onClick={() => geste(() => ranger((c.geste as {
                enfantId: Id;
            }).enfantId, (c.geste as {
                unionId: Id;
            }).unionId))} className={`${bouton} border-sepia text-sepia-deep hover:bg-sepia-tint`} data-action="oui-parent">
                                                    Oui, {qui(autreDuCouple((c.geste as {
                unionId: Id;
            }).unionId, c.personnes[1]))} est aussi son parent
                                                </button>)}
                                            {c.genre === 'enfant-hors-couple' && c.geste?.type === 'rattacher-au-couple' && (<button disabled={enCours} onClick={() => geste(() => ranger((c.geste as {
                enfantId: Id;
            }).enfantId, (c.geste as {
                unionId: Id;
            }).unionId))} className={`${bouton} border-trait text-encre hover:bg-sepia-tint`} data-action="ranger">
                                                    Ranger sous le couple
                                                </button>)}
                                            {c.geste?.type === 'creer-couple' && (<button disabled={enCours} onClick={() => geste(async () => {
                    const g2 = c.geste as {
                        a: Id;
                        b: Id;
                    };
                    const u = await apiClient.post('/unions', { partner1Id: g2.a, partner2Id: g2.b });
                    await ranger(c.personnes[0], (u.data as {
                        id: Id;
                    }).id);
                })} className={`${bouton} border-sepia text-sepia-deep hover:bg-sepia-tint`} data-action="creer-couple">
                                                    Créer leur couple et y ranger l'enfant
                                                </button>)}
                                            {c.genre === 'sexe-inconnu' && (<>
                                                    <button disabled={enCours} onClick={() => geste(() => apiClient.patch(`/people/${c.personnes[0]}`, { genre: 'M' }))} className={`${bouton} border-trait hover:bg-sepia-tint`} data-action="homme">Homme</button>
                                                    <button disabled={enCours} onClick={() => geste(() => apiClient.patch(`/people/${c.personnes[0]}`, { genre: 'F' }))} className={`${bouton} border-trait hover:bg-sepia-tint`} data-action="femme">Femme</button>
                                                </>)}
                                            <button onClick={() => voir(c.personnes[0])} className="flex items-center gap-1 text-[12px] text-encre-3 hover:text-encre">
                                                <TreeStructure size={12}/> voir {qui(c.personnes[0])}
                                            </button>
                                            {c.genre !== 'enfant-hors-couple' && (<button disabled={enCours} onClick={() => ignorer(c)} className="ml-auto text-[12px] text-encre-3 hover:text-encre" data-action="ignorer">
                                                    {c.genre === 'doublon' ? 'Ce sont deux personnes' : c.genre === 'un-seul-parent' ? 'Non, pas son parent' : 'C\'est voulu'}
                                                </button>)}
                                        </div>
                                    </div>))}
                            </section>);
    return (<div className="fixed inset-0 z-[60] bg-black/40 grid place-items-start justify-center pt-[6vh] px-4" onMouseDown={onFermer} data-bloc="incoherences">
            <div className="w-[820px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[88vh]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-trait-leger">
                    <div className="font-display text-[26px] leading-none">Incohérences de l'arbre</div>
                    <div className="text-[12.5px] text-encre-3 mt-1">Seulement ce qui se contredit vraiment (fiche peut-être saisie deux fois, dates impossibles, plus de deux parents). Rien n'est corrigé sans votre clic ; copie de sécurité avant chaque fusion.</div>
                </div>

                {comparer ? (<Comparaison key={versionFusion()} garder={comparer.garder} retirer={comparer.retirer} onInverser={() => setComparer({ garder: comparer.retirer, retirer: comparer.garder })} onRetour={() => setComparer(null)} enCours={enCours} onFusionner={() => geste(() => apiClient.post('/fusion', comparer)).then(() => setComparer(null))} erreur={erreurGeste}/>) : (<div className="overflow-y-auto px-4 py-3 flex flex-col gap-5">
                        {!r && !erreur && <div className="text-sm text-encre-3">Vérification…</div>}
                        {erreur && <div className="text-sm" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
                        {r && r.incoherences.filter(aVerifier).length === 0 && <div className="text-sm text-encre-2" data-aucune>Aucune incohérence : rien ne se contredit dans votre arbre.</div>}
                        {parGenre.filter(([g]) => A_VERIFIER.includes(g)).map(([g, cas]) => rendre(g, cas))}
                        {parGenre.some(([g]) => !A_VERIFIER.includes(g) && g !== 'enfant-hors-couple') && (<div className="flex flex-col gap-3 border-t border-trait-leger pt-3" data-bloc="a-completer" data-etat={completerOuvert ? 'ouvert' : 'ferme'}>
                                <button type="button" onClick={() => setCompleterOuvert((o) => !o)} aria-expanded={completerOuvert} className="flex items-center gap-2 text-left text-[14px] text-encre-2 hover:text-encre" data-bouton="a-completer">
                                    <span>{completerOuvert ? '▾' : '▸'}</span>
                                    <span className="font-medium">À compléter</span>
                                    <span className="text-encre-3">· {parGenre.filter(([g]) => !A_VERIFIER.includes(g) && g !== 'enfant-hors-couple').reduce((s, [, c]) => s + c.length, 0)}</span>
                                    <span className="text-[12px] text-encre-3 font-normal">— pas des erreurs : des informations qui manquent, à remplir quand vous les connaissez</span>
                                </button>
                                {completerOuvert && parGenre.filter(([g]) => !A_VERIFIER.includes(g)).map(([g, cas]) => rendre(g, cas))}
                            </div>)}
                        {erreurGeste && <div className="text-[12.5px]" style={{ color: 'var(--o-afrique)' }} data-erreur>{erreurGeste}</div>}
                    </div>)}

                <div className="px-5 py-2.5 border-t border-trait-leger text-[11.5px] text-encre-3 flex gap-4 items-center">
                    {r && r.ignorees > 0 && <span>{r.ignorees} déclarée{r.ignorees > 1 ? 's' : ''} correcte{r.ignorees > 1 ? 's' : ''} par vous (ne reviennent plus)</span>}
                    {r && <span className="ml-auto font-mono">{r.dureeMs} ms</span>}
                    <button onClick={onFermer} className="underline">Fermer</button>
                </div>
            </div>
        </div>);
};
interface Apercu {
    garder: Fiche;
    retirer: Fiche;
    refus: string[];
    repris: string[];
    deplaces: {
        liensDeParente: number;
        couples: number;
        couplesFusionnes: number;
        pistes: number;
    };
}
interface Fiche {
    id: Id;
    nom: string;
    prenom: string;
    genre: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    dateDeces: string | null;
    lieuDeces: string | null;
    decede: boolean | null;
    notes: string | null;
}
export const Comparaison = ({ garder, retirer, onInverser, onRetour, onFusionner, enCours, erreur }: {
    garder: Id;
    retirer: Id;
    onInverser: () => void;
    onRetour: () => void;
    onFusionner: () => void;
    enCours: boolean;
    erreur: string | null;
}) => {
    const tree = useTreeStore();
    const [a, setA] = useState<Apercu | null>(null);
    const [err, setErr] = useState<string | null>(null);
    useEffect(() => {
        setA(null);
        apiClient.get('/fusion/apercu', { params: { garder, retirer } }).then((x) => setA(x.data as Apercu)).catch((e) => setErr(e?.response?.data?.error ?? e.message));
    }, [garder, retirer]);
    const nomDe = (id: Id) => { const p = tree.people.find((x) => x.id === id); return p ? `${p.prenom} ${nomLisible(p.nom)}` : `n° ${id}`; };
    const famille = (id: Id) => {
        const parents = tree.relationships.filter((l) => l.enfantId === id).map((l) => nomDe(l.parentId));
        const conjoints = tree.unions.filter((u) => u.partenaire1Id === id || u.partenaire2Id === id).map((u) => nomDe(u.partenaire1Id === id ? u.partenaire2Id : u.partenaire1Id));
        const enfants = tree.relationships.filter((l) => l.parentId === id).map((l) => nomDe(l.enfantId));
        return { parents, conjoints, enfants };
    };
    const an = (d: string | null) => (d ? new Date(d).getUTCFullYear() : '—');
    const colonne = (f: Fiche, titre: string) => {
        const fam = famille(f.id);
        return (<div className="flex-1 min-w-0 rounded-[10px] border border-trait bg-papier px-3 py-2.5 flex flex-col gap-1 text-[12.5px]" data-fiche={f.id}>
                <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">{titre}</div>
                <div className="text-[15px] text-encre"><span className="font-medium">{f.prenom}</span> {nomLisible(f.nom)} <span className="text-encre-3 text-[12px]">n° {f.id}</span></div>
                <div className="text-encre-2">Sexe : {f.genre === 'M' ? 'homme' : f.genre === 'F' ? 'femme' : 'non renseigné'} · {f.decede === true ? accorde(f.genre, 'décédé', 'décédée', 'décédé(e)') : f.decede === false ? accorde(f.genre, 'vivant', 'vivante', 'vivant(e)') : 'vivant ou décédé : ?'}</div>
                <div className="text-encre-2">Naissance : {an(f.dateNaissance)}{f.lieuNaissance ? ` · ${f.lieuNaissance}` : ''} — Décès : {an(f.dateDeces)}{f.lieuDeces ? ` · ${f.lieuDeces}` : ''}</div>
                <div className="text-encre-2">Parents : {fam.parents.join(', ') || '—'}</div>
                <div className="text-encre-2">Conjoints : {fam.conjoints.join(', ') || '—'}</div>
                <div className="text-encre-2">Enfants : {fam.enfants.join(', ') || '—'}</div>
                {f.notes && <div className="text-encre-3 italic truncate" title={f.notes}>Notes : {f.notes}</div>}
            </div>);
    };
    return (<div className="overflow-y-auto px-4 py-3 flex flex-col gap-3" data-bloc="comparaison">
            {!a && !err && <div className="text-sm text-encre-3">Lecture des deux fiches…</div>}
            {err && <div className="text-sm" style={{ color: 'var(--o-afrique)' }}>{err}</div>}
            {a && (<>
                    <div className="flex gap-3 items-stretch">
                        {colonne(a.garder, 'Fiche gardée')}
                        <button onClick={onInverser} title="Garder l'autre fiche" className="self-center w-9 h-9 rounded-full border border-trait grid place-items-center hover:bg-sepia-tint flex-none" data-action="inverser">
                            <ArrowsLeftRight size={16}/>
                        </button>
                        {colonne(a.retirer, 'Fiche retirée')}
                    </div>
                    {a.refus.length > 0 ? (<div className="text-[12.5px] rounded-[10px] border px-3 py-2" style={{ color: 'var(--o-afrique)', borderColor: 'var(--o-afrique)' }} data-refus>
                            Fusion impossible : {a.refus.join(' ; ')}. Corrigez d'abord l'une des deux fiches, ou dites que ce sont deux personnes.
                            <TrancherFusion a={a}/>
                            {a.refus.some((x) => x.includes('parents biologiques')) && " Si l'un de ses parents est lui-même en double dans la liste, fusionnez d'abord ce parent : la fusion se débloquera."}
                        </div>) : (<div className="text-[12.5px] text-encre-2" data-resume>
                            En fusionnant : {a.deplaces.liensDeParente} lien{a.deplaces.liensDeParente > 1 ? 's' : ''} de parenté et {a.deplaces.couples + a.deplaces.couplesFusionnes} couple{a.deplaces.couples + a.deplaces.couplesFusionnes > 1 ? 's' : ''} passent à la fiche gardée
                            {a.deplaces.couplesFusionnes > 0 ? ` (dont ${a.deplaces.couplesFusionnes} déjà présent${a.deplaces.couplesFusionnes > 1 ? 's' : ''} : les enfants y sont réunis)` : ''}
                            {a.deplaces.pistes > 0 ? `, ${a.deplaces.pistes} piste(s) aussi` : ''}
                            {a.repris.length > 0 ? ` ; repris de la fiche retirée : ${a.repris.join(', ')}` : ''}. La fiche retirée disparaît. Copie de sécurité avant.
                        </div>)}
                    <div className="flex gap-2 items-center">
                        <button disabled={enCours || a.refus.length > 0} onClick={onFusionner} className="h-8 px-3 rounded-lg border border-sepia text-sepia-deep text-[12.5px] hover:bg-sepia-tint disabled:opacity-40" data-action="fusionner">
                            Fusionner : garder n° {a.garder.id}
                        </button>
                        <button onClick={onRetour} className="text-[12.5px] text-encre-3 underline">Retour à la liste</button>
                    </div>
                    {erreur && <div className="text-[12.5px]" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}
                </>)}
        </div>);
};
