import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowSquareOut, Binoculars, CheckCircle, CircleNotch, Link as Lien, ShieldCheck, X, } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useAtelierStore } from '../../store/useAtelierStore';
import { useTreeStore } from '../../store/useTreeStore';
import { usePatronymeStore } from '../../store/usePatronymeStore';
import { nomLisible, normaliser } from '../../lib/origins';
import type { Person } from '../../types';
import { communicabilite } from './communicabilite';
import { BandeauCache } from './BandeauCache';
type Certitude = 'prouve' | 'probable' | 'hypothese';
type Statut = 'proposee' | 'gardee' | 'ecartee';
interface Rattachement {
    individuId: number;
    role: string;
    individu: {
        id: number;
        nom: string;
        prenom: string;
        dateNaissance?: string | null;
        dateDeces?: string | null;
        decede?: boolean | null;
    };
}
interface Piste {
    id: number;
    source: string;
    titre: string;
    url: string;
    extrait: string;
    cote: string | null;
    dateSource: string | null;
    variante: string;
    certitude: Certitude;
    statut: Statut;
    motifStatut: string | null;
    individus?: Rattachement[];
}
interface Recherche {
    id: number;
    nom: string;
    prenom: string | null;
    commune: string | null;
    anneeDebut: number | null;
    anneeFin: number | null;
    zone: string | null;
    variantes: string;
    lanceeLe: string;
    pistes?: Piste[];
    _count?: {
        pistes: number;
    };
}
interface EtatSource {
    cle: string;
    titre: string;
    etat: 'reussi' | 'indisponible' | 'vide';
    dureeMs: number;
    raison: string | null;
    nombre: number;
}
const COLONNES: {
    cle: Certitude;
    libelle: string;
    desc: string;
    couleur: string;
    fond: string;
    pointille: boolean;
    ombre: string;
}[] = [
    {
        cle: 'prouve',
        libelle: 'Prouvé',
        desc: 'Pièce vue et validée, avec son motif.',
        couleur: 'var(--c-prouve)',
        fond: 'var(--c-prouve-t)',
        pointille: false,
        ombre: 'var(--ombre-piste)',
    },
    {
        cle: 'probable',
        libelle: 'Probable',
        desc: 'Le nom est au titre, dans le bon lieu — sans acte direct.',
        couleur: 'var(--c-probable)',
        fond: 'var(--c-probable-t)',
        pointille: false,
        ombre: 'var(--ombre-piste-probable)',
    },
    {
        cle: 'hypothese',
        libelle: 'Hypothèse',
        desc: 'À vérifier : homonymie, registre à parcourir.',
        couleur: 'var(--c-hypothese)',
        fond: 'var(--c-hypothese-t)',
        pointille: true,
        ombre: 'none',
    },
];
const DUREE_HABITUELLE_S = 10;
const DUREE_MAX_S = 60;
const FORM_VIDE = { nom: '', prenom: '', commune: '', anneeDebut: '', anneeFin: '', zone: 'reunion' };
const lireVariantes = (json: string): {
    nom: string;
    origine: string;
}[] => {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v : [];
    }
    catch {
        return [];
    }
};
const messageErreur = (e: any): string => {
    const d = e?.response?.data;
    if (d?.details?.length)
        return d.details.map((x: any) => x.message).join(' · ');
    return d?.error ?? e?.message ?? 'Erreur inconnue';
};
export const TraqueBoard = () => {
    const consommerNomATraquer = useAtelierStore((s) => s.consommerNomATraquer);
    const { patronymes } = usePatronymeStore();
    const [zones, setZones] = useState<{
        cle: string;
        libelle: string;
    }[]>([]);
    const [historique, setHistorique] = useState<Recherche[]>([]);
    const [form, setForm] = useState(FORM_VIDE);
    const [recherche, setRecherche] = useState<Recherche | null>(null);
    const [etats, setEtats] = useState<EtatSource[] | null>(null);
    const [dureeMs, setDureeMs] = useState<number | null>(null);
    const [enCours, setEnCours] = useState(false);
    const [ecoule, setEcoule] = useState(0);
    const [erreur, setErreur] = useState<string | null>(null);
    const [sourcesEteintes, setSourcesEteintes] = useState<Set<string>>(new Set());
    const [voirEcartees, setVoirEcartees] = useState(false);
    const [voirMasquees, setVoirMasquees] = useState(false);
    const annulation = useRef<AbortController | null>(null);
    const chargerHistorique = useCallback(async () => {
        try {
            const r = await apiClient.get('/traque/recherches');
            setHistorique(r.data);
            return r.data as Recherche[];
        }
        catch {
            return [];
        }
    }, []);
    const rouvrir = useCallback(async (id: number) => {
        setErreur(null);
        try {
            const r = await apiClient.get(`/traque/recherches/${id}`);
            const rec: Recherche = r.data;
            setRecherche(rec);
            setEtats(null);
            setDureeMs(null);
            setSourcesEteintes(new Set());
            setForm({
                nom: rec.nom,
                prenom: rec.prenom ?? '',
                commune: rec.commune ?? '',
                anneeDebut: rec.anneeDebut?.toString() ?? '',
                anneeFin: rec.anneeFin?.toString() ?? '',
                zone: rec.zone ?? 'reunion',
            });
        }
        catch (e) {
            setErreur(messageErreur(e));
        }
    }, []);
    const lancer = useCallback(async (demande: typeof FORM_VIDE) => {
        setErreur(null);
        setEnCours(true);
        const controleur = new AbortController();
        annulation.current = controleur;
        try {
            const r = await apiClient.post('/traque/recherches', {
                nom: demande.nom,
                prenom: demande.prenom,
                commune: demande.commune,
                anneeDebut: demande.anneeDebut === '' ? null : Number(demande.anneeDebut),
                anneeFin: demande.anneeFin === '' ? null : Number(demande.anneeFin),
                zone: demande.zone,
            }, { signal: controleur.signal, timeout: (DUREE_MAX_S + 15) * 1000 });
            setRecherche(r.data.recherche);
            setEtats(r.data.sources);
            setDureeMs(r.data.dureeMs);
            setSourcesEteintes(new Set());
            chargerHistorique();
        }
        catch (e: any) {
            if (e?.code !== 'ERR_CANCELED')
                setErreur(messageErreur(e));
        }
        finally {
            setEnCours(false);
            annulation.current = null;
        }
    }, [chargerHistorique]);
    useEffect(() => {
        apiClient.get('/traque/zones').then((r) => setZones(r.data)).catch(() => undefined);
        const nom = consommerNomATraquer();
        chargerHistorique().then((h) => {
            if (nom) {
                const demande = { ...FORM_VIDE, nom };
                setForm(demande);
                lancer(demande);
            }
            else if (h[0]) {
                rouvrir(h[0].id);
            }
        });
        return () => annulation.current?.abort();
    }, []);
    useEffect(() => {
        if (!enCours)
            return;
        const depart = Date.now();
        setEcoule(0);
        const t = setInterval(() => setEcoule(Math.floor((Date.now() - depart) / 1000)), 250);
        return () => clearInterval(t);
    }, [enCours]);
    const majPiste = (maj: Piste) => setRecherche((r) => (r ? { ...r, pistes: r.pistes?.map((p) => (p.id === maj.id ? maj : p)) } : r));
    const pistes = recherche?.pistes ?? [];
    const variantes = recherche ? lireVariantes(recherche.variantes) : [];
    const origineDe = (nom: string) => variantes.find((v) => v.nom === nom)?.origine ?? '';
    const sourcesPresentes = useMemo(() => [...new Set(pistes.map((p) => p.source))], [pistes]);
    const visibles = pistes.filter((p) => !sourcesEteintes.has(p.source) && (voirEcartees || p.statut !== 'ecartee') && (voirMasquees || !communicabilite(p)));
    const masquees = pistes.filter((p) => communicabilite(p)).length;
    const rattachees = pistes.filter((p) => (p.individus?.length ?? 0) > 0).length;
    const ecartees = pistes.filter((p) => p.statut === 'ecartee').length;
    const libelleZone = zones.find((z) => z.cle === (recherche?.zone ?? 'reunion'))?.libelle ?? 'La Réunion';
    const champ = 'h-9 px-2.5 bg-blanc border border-trait rounded-[9px] text-[13px] text-encre outline-none focus:border-sepia';
    return (<main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            
            <form onSubmit={(e) => {
            e.preventDefault();
            if (!enCours && form.nom.trim())
                lancer(form);
        }} className="flex-none flex items-center gap-2 px-12 py-3 border-b border-trait-leger bg-carte flex-wrap">
                <input className={`${champ} w-44 font-display text-[17px]`} placeholder="Nom *" value={form.nom} list="traque-noms" required onChange={(e) => setForm({ ...form, nom: e.target.value })}/>
                <datalist id="traque-noms">
                    {patronymes.map((p) => (<option key={p.id} value={p.nom}/>))}
                </datalist>
                <input className={`${champ} w-32`} placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}/>
                <input className={`${champ} w-36`} placeholder="Commune" title="Ouvre les registres ANOM" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })}/>
                <input className={`${champ} w-20`} type="number" min={1600} max={2100} placeholder="De" value={form.anneeDebut} onChange={(e) => setForm({ ...form, anneeDebut: e.target.value })}/>
                <input className={`${champ} w-20`} type="number" min={1600} max={2100} placeholder="À" value={form.anneeFin} onChange={(e) => setForm({ ...form, anneeFin: e.target.value })}/>
                <select className={`${champ} w-52`} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} title="Zone d'origine">
                    {zones.map((z) => (<option key={z.cle} value={z.cle}>
                            {z.libelle}
                        </option>))}
                </select>
                <button type="submit" disabled={enCours || !form.nom.trim()} className="flex items-center gap-2 h-9 px-4 rounded-[9px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint disabled:opacity-50">
                    {enCours ? <CircleNotch className="animate-spin"/> : <Binoculars />}
                    {enCours ? 'Traque en cours…' : 'Lancer la traque'}
                </button>
                <select className={`${champ} ml-auto w-56`} value={recherche?.id ?? ''} onChange={(e) => e.target.value && rouvrir(Number(e.target.value))} title="Traques précédentes">
                    <option value="">Traques précédentes ({historique.length})</option>
                    {historique.map((h) => (<option key={h.id} value={h.id}>
                            {nomLisible(h.nom)}
                            {h.commune ? ` · ${h.commune}` : ''} · {h._count?.pistes ?? 0} pistes ·{' '}
                            {new Date(h.lanceeLe).toLocaleDateString('fr-FR')}
                        </option>))}
                </select>
            </form>

            <div className="flex-1 min-h-0 overflow-y-auto px-12 py-9 flex flex-col gap-6">
                {enCours && (<div className="text-[13px] text-encre-2 flex items-center gap-2">
                        <CircleNotch className="animate-spin text-sepia"/>
                        8 sources interrogées · {ecoule} s écoulées ·{' '}
                        {ecoule < DUREE_HABITUELLE_S
                ? `reste environ ${DUREE_HABITUELLE_S - ecoule} s (durée habituelle ${DUREE_HABITUELLE_S} s)`
                : `plus long que d'habitude — au plus ${Math.max(0, DUREE_MAX_S - ecoule)} s encore`}
                    </div>)}
                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}

                {!recherche && !enCours && <Intro />}

                {recherche && (<>
                        <header className="flex items-end gap-8">
                            <div className="flex flex-col gap-2 min-w-0">
                                <div className="text-[11px] tracking-[.14em] uppercase text-sepia">Traque des Noms</div>
                                <h1 className="font-display text-[56px] leading-none font-medium m-0">
                                    {nomLisible(recherche.nom)}
                                    {recherche.prenom && <span className="text-encre-2"> {recherche.prenom}</span>}
                                </h1>
                                <div className="text-sm text-encre-2">
                                    {visibles.length} piste{visibles.length > 1 ? 's' : ''} affichée{visibles.length > 1 ? 's' : ''} ·{' '}
                                    {rattachees} rattachée{rattachees > 1 ? 's' : ''} à l'arbre · {ecartees} écartée{ecartees > 1 ? 's' : ''} ·{' '}
                                    {[recherche.commune, libelleZone, recherche.anneeDebut && `${recherche.anneeDebut}–${recherche.anneeFin ?? ''}`]
                .filter(Boolean)
                .join(', ')}
                                    {dureeMs !== null && ` · ${(dureeMs / 1000).toFixed(1)} s`}
                                    <BandeauCache etats={etats} recherche={recherche} enCours={enCours} lancer={lancer}/>
                                </div>
                            </div>
                            <div className="ml-auto flex gap-1.5 flex-wrap justify-end">
                                {sourcesPresentes.map((s) => {
                const on = !sourcesEteintes.has(s);
                return (<button key={s} onClick={() => setSourcesEteintes((x) => {
                        const n = new Set(x);
                        if (on)
                            n.add(s);
                        else
                            n.delete(s);
                        return n;
                    })} className={`h-[30px] px-3 rounded-lg border font-mono text-xs font-medium text-encre transition-all ${on ? 'bg-blanc border-sepia' : 'bg-transparent border-trait text-encre-3'}`}>
                                            {s.toUpperCase()}
                                        </button>);
            })}
                                <button onClick={() => setVoirEcartees((v) => !v)} className={`h-[30px] px-3 rounded-lg border text-xs font-medium ${voirEcartees ? 'bg-sepia-tint border-sepia text-sepia-deep' : 'border-trait text-encre-3'}`}>
                                    écartées ({ecartees})
                                </button>
                                {masquees > 0 && (<button onClick={() => setVoirMasquees((v) => !v)} title="Actes d'état civil de moins de 75 ans (naissances, mariages) et pistes liées à une personne vivante : masqués par défaut (Code du patrimoine, art. L213-2). Les décès sont communicables." className={`h-[30px] px-3 rounded-lg border text-xs font-medium ${voirMasquees ? 'bg-sepia-tint border-sepia text-sepia-deep' : 'border-trait text-encre-3'}`}>
                                        {voirMasquees ? 'cacher' : 'voir'} les pistes protégées ({masquees})
                                    </button>)}
                            </div>
                        </header>

                        
                        <div className="flex flex-wrap items-center gap-2 text-xs text-encre-3">
                            <span className="tracking-[.1em] uppercase text-[10.5px]">Graphies</span>
                            {variantes.map((v) => (<span key={v.nom} title={v.origine === 'saisie' ? 'Le nom saisi' : `Confusion : ${v.origine}`} className={`font-display text-[15px] px-2 py-px rounded-md border ${v.origine === 'saisie' ? 'border-sepia text-encre' : 'border-trait text-encre-2'}`}>
                                    {nomLisible(v.nom)}
                                </span>))}
                            {etats && (<>
                                    <span className="ml-3 tracking-[.1em] uppercase text-[10.5px]">Sources</span>
                                    {etats.map((s) => (<span key={s.cle} title={s.raison ?? `${s.titre} : ${s.nombre} piste(s) en ${(s.dureeMs / 1000).toFixed(1)} s`} className="font-mono text-[11px]" style={{ color: s.etat === 'indisponible' ? 'var(--o-afrique)' : s.etat === 'vide' ? 'var(--encre-3)' : 'var(--encre-2)' }}>
                                            {s.cle} {s.etat === 'indisponible' ? '✕' : s.nombre}
                                        </span>))}
                                </>)}
                        </div>

                        <div className="grid grid-cols-3 gap-[22px] items-start">
                            {COLONNES.map((col) => {
                const cartes = visibles.filter((p) => p.certitude === col.cle);
                return (<section key={col.cle} className="flex flex-col gap-3.5 min-w-0">
                                        <div className="flex flex-col gap-1 px-1 pb-1.5">
                                            <div className="flex items-center gap-[9px]">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{
                        background: col.cle === 'prouve' ? col.couleur : col.cle === 'probable' ? col.fond : 'transparent',
                        border: `1.5px ${col.pointille ? 'dashed' : 'solid'} ${col.couleur}`,
                    }}/>
                                                <span className="font-display text-[26px] font-medium">{col.libelle}</span>
                                                <span className="font-mono text-[11px] px-[7px] py-0.5 rounded-md" style={{ color: col.couleur, background: col.fond }}>
                                                    {cartes.length}
                                                </span>
                                            </div>
                                            <div className="text-[12.5px] text-encre-3">{col.desc}</div>
                                        </div>
                                        {cartes.map((p) => (<PisteCard key={p.id} piste={p} col={col} origineVariante={origineDe(p.variante)} variantes={variantes.map((v) => v.nom)} onMaj={majPiste}/>))}
                                    </section>);
            })}
                        </div>
                    </>)}
            </div>
        </main>);
};
const Intro = () => (<div className="max-w-2xl flex flex-col gap-3 text-sm text-encre-2">
        <div className="text-[11px] tracking-[.14em] uppercase text-sepia">Traque des Noms</div>
        <h1 className="font-display text-[56px] leading-none font-medium text-encre m-0">Retrouver une lignée</h1>
        <p className="m-0">
            Saisissez un nom : la Traque interroge les fonds publics gratuits, essaie aussi les graphies proches (les
            confusions des officiers d'état civil) et propose des <strong>pistes</strong>, rangées par certitude. Aucune
            n'entre dans l'arbre toute seule : c'est vous qui la rattachez à une personne.
        </p>
    </div>);
const PisteCard = ({ piste: p, col, origineVariante, variantes, onMaj, }: {
    piste: Piste;
    col: (typeof COLONNES)[number];
    origineVariante: string;
    variantes: string[];
    onMaj: (p: Piste) => void;
}) => {
    const [mode, setMode] = useState<'rien' | 'rattacher' | 'prouver'>('rien');
    const [motif, setMotif] = useState('');
    const [occupe, setOccupe] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const rattachement = p.individus?.[0];
    const masque = communicabilite(p);
    const ecartee = p.statut === 'ecartee';
    const appel = async (fn: () => Promise<{
        data: Piste;
    }>) => {
        setOccupe(true);
        setErreur(null);
        try {
            const r = await fn();
            onMaj(r.data);
            setMode('rien');
            useTreeStore.getState().fetchTree();
        }
        catch (e) {
            setErreur(messageErreur(e));
        }
        finally {
            setOccupe(false);
        }
    };
    const surface = rattachement ? 'var(--c-prouve-surface)' : col.cle === 'hypothese' ? 'var(--c-hypothese-surface)' : 'var(--blanc)';
    const bord = rattachement ? 'var(--c-prouve)' : col.cle === 'hypothese' ? 'var(--c-hypothese-bord)' : 'var(--trait-carte)';
    const bouton = 'flex items-center gap-1.5 h-8 px-2.5 rounded-[9px] text-[12.5px] font-medium';
    return (<article className="rounded-[14px] px-[18px] pt-[18px] pb-3.5 flex flex-col gap-[11px] transition-transform duration-200 hover:-translate-y-0.5" style={{
            background: surface,
            border: `1px ${col.pointille && !rattachement ? 'dashed' : 'solid'} ${bord}`,
            boxShadow: col.ombre,
            opacity: ecartee ? 0.55 : 1,
        }}>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] font-medium tracking-[.04em] px-[7px] py-[3px] rounded-md bg-papier text-encre-2">
                    {p.source.toUpperCase()}
                </span>
                <span className="text-[11.5px] text-encre-3 truncate">{p.dateSource ?? '—'}</span>
                <span className="ml-auto text-[11px] font-semibold px-2 py-[3px] rounded-[10px] whitespace-nowrap" style={{ color: col.couleur, background: col.fond }}>
                    {col.libelle}
                </span>
            </div>
            <a href={p.url} target="_blank" rel="noreferrer" className="font-display text-[21px] leading-[1.15] font-medium text-encre hover:text-sepia-deep break-words">
                {p.titre}
            </a>
            {p.extrait && <p className="text-[13px] leading-normal text-encre-2 m-0 break-words">{p.extrait}</p>}
            <div className="font-mono text-[10.5px] text-encre-3">
                {p.cote ? `cote ${p.cote}` : 'cote à trouver'} · par {nomLisible(p.variante)}
                {origineVariante && origineVariante !== 'saisie' ? ` (${origineVariante})` : ''}
            </div>
            {p.motifStatut && <div className="text-xs" style={{ color: 'var(--c-prouve)' }}>Motif : {p.motifStatut}</div>}
            {masque && (<div className="text-xs leading-snug" style={{ color: 'var(--o-afrique)' }}>
                    {masque.motif}
                    {masque.communicableLe ? ` — communicable le ${masque.communicableLe}.` : '.'}
                </div>)}
            {erreur && <div className="text-xs" style={{ color: 'var(--o-afrique)' }}>{erreur}</div>}

            {rattachement ? (<div className="flex gap-2 items-center min-h-8 text-[12.5px]" style={{ color: 'var(--c-prouve)' }}>
                    <CheckCircle size={16}/>
                    Rattachée à {rattachement.individu.prenom} {nomLisible(rattachement.individu.nom)}
                    <span className="ml-auto flex gap-2">
                        {p.certitude !== 'prouve' && (<button disabled={occupe} onClick={() => setMode('prouver')} className="text-encre-2 underline text-xs">
                                Prouver
                            </button>)}
                        <button disabled={occupe} onClick={() => appel(() => apiClient.delete(`/traque/pistes/${p.id}/rattacher/${rattachement.individuId}`))} className="text-encre-3 underline text-xs">
                            Annuler
                        </button>
                    </span>
                </div>) : ecartee ? (<div className="flex items-center h-8 text-[12.5px] text-encre-3">
                    Écartée
                    <button disabled={occupe} onClick={() => appel(() => apiClient.patch(`/traque/pistes/${p.id}`, { statut: 'proposee' }))} className="ml-auto underline text-xs">
                        Reprendre
                    </button>
                </div>) : (<div className="flex gap-1.5 items-center">
                    <button disabled={occupe} onClick={() => setMode(mode === 'rattacher' ? 'rien' : 'rattacher')} className={`${bouton} px-3 border border-sepia text-sepia-deep hover:bg-sepia-tint`}>
                        <Lien />
                        Rattacher
                    </button>
                    <a href={p.url} target="_blank" rel="noreferrer" className={`${bouton} text-encre-2 hover:bg-papier`}>
                        <ArrowSquareOut />
                        Source
                    </a>
                    {p.statut === 'gardee' && p.certitude !== 'prouve' && (<button disabled={occupe} onClick={() => setMode('prouver')} className={`${bouton} text-encre-2 hover:bg-papier`}>
                            <ShieldCheck />
                            Prouver
                        </button>)}
                    <button disabled={occupe} onClick={() => appel(() => apiClient.patch(`/traque/pistes/${p.id}`, { statut: 'ecartee' }))} className={`${bouton} ml-auto text-encre-3 hover:bg-papier`}>
                        <X />
                        Écarter
                    </button>
                </div>)}

            {mode === 'rattacher' && (<ChoixIndividu variantes={variantes} onChoisir={(id) => appel(() => apiClient.post(`/traque/pistes/${p.id}/rattacher`, { individuId: id }))} onAnnuler={() => setMode('rien')}/>)}
            {mode === 'prouver' && (<div className="flex gap-2">
                    <input className="flex-1 h-8 px-2.5 bg-blanc border border-trait rounded-lg text-xs outline-none focus:border-sepia" placeholder="Motif (ex. acte vu, registre 1852 page 14)" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus/>
                    <button disabled={occupe || !motif.trim()} onClick={() => appel(() => apiClient.patch(`/traque/pistes/${p.id}`, { statut: 'gardee', prouvee: true, motif }))} className="h-8 px-3 rounded-lg text-xs font-medium text-white disabled:opacity-40" style={{ background: 'var(--c-prouve)' }}>
                        Valider
                    </button>
                    <button onClick={() => setMode('rien')} className="h-8 px-2 text-xs text-encre-3">
                        Annuler
                    </button>
                </div>)}
        </article>);
};
const ChoixIndividu = ({ variantes, onChoisir, onAnnuler, }: {
    variantes: string[];
    onChoisir: (id: number) => void;
    onAnnuler: () => void;
}) => {
    const { people } = useTreeStore();
    const [filtre, setFiltre] = useState('');
    const graphies = new Set(variantes.map(normaliser));
    const f = normaliser(filtre);
    const tries = [...people].sort((a, b) => Number(graphies.has(normaliser(b.nom))) - Number(graphies.has(normaliser(a.nom))));
    const liste: Person[] = tries.filter((p) => !f || normaliser(`${p.prenom} ${p.nom}`).includes(f)).slice(0, 8);
    return (<div className="flex flex-col gap-1.5 p-2 rounded-[10px] border border-trait bg-carte">
            {people.length === 0 ? (<div className="text-xs text-encre-3 px-1 py-1">
                    L'arbre est vide : ajoutez d'abord la personne depuis l'écran Arbre.
                    <button onClick={onAnnuler} className="ml-2 underline">Fermer</button>
                </div>) : (<>
                    <input className="h-8 px-2.5 bg-blanc border border-trait rounded-lg text-xs outline-none focus:border-sepia" placeholder="Rattacher à… (prénom ou nom)" value={filtre} onChange={(e) => setFiltre(e.target.value)} autoFocus/>
                    {liste.map((p) => (<button key={p.id} onClick={() => onChoisir(p.id)} className="text-left px-2 py-1 rounded-md text-[13px] hover:bg-sepia-tint flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: graphies.has(normaliser(p.nom)) ? 'var(--sepia)' : 'transparent' }} title="Porte une des graphies interrogées"/>
                            {p.prenom} <span className="font-display text-[15px] font-semibold">{nomLisible(p.nom)}</span>
                        </button>))}
                    {liste.length === 0 && <div className="text-xs text-encre-3 px-1">Personne ne correspond.</div>}
                    <button onClick={onAnnuler} className="self-end text-xs text-encre-3 underline">
                        Annuler
                    </button>
                </>)}
        </div>);
};
