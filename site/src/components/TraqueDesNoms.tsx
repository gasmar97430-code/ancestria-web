import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, History, Loader2, Search, ShieldCheck, X, XCircle, } from 'lucide-react';
import apiClient from '../api/client';
import { usePatronymeStore } from '../store/usePatronymeStore';
type Certitude = 'prouve' | 'probable' | 'hypothese';
type Statut = 'proposee' | 'gardee' | 'ecartee';
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
interface Variante {
    nom: string;
    origine: string;
}
interface Zone {
    cle: string;
    libelle: string;
}
interface SourceInfo {
    cle: string;
    titre: string;
    apport: string;
}
const NIVEAUX: Record<Certitude, {
    libelle: string;
    classe: string;
    aide: string;
}> = {
    prouve: {
        libelle: 'Prouvé',
        classe: 'bg-emerald-600 text-white',
        aide: 'Pièce primaire liée, validée avec son motif',
    },
    probable: {
        libelle: 'Probable',
        classe: 'bg-amber-100 text-amber-900 border border-amber-300',
        aide: 'Indice indirect : le nom est au titre, dans le bon lieu',
    },
    hypothese: {
        libelle: 'Hypothèse',
        classe: 'bg-gray-100 text-gray-600 border border-gray-300',
        aide: 'Aucune pièce : une piste à vérifier',
    },
};
const ETATS: Record<EtatSource['etat'], {
    libelle: string;
    classe: string;
}> = {
    reussi: { libelle: 'répond', classe: 'text-emerald-700' },
    vide: { libelle: 'rien trouvé', classe: 'text-gray-500' },
    indisponible: { libelle: 'indisponible', classe: 'text-red-700' },
};
const DUREE_HABITUELLE_S = 10;
const DUREE_MAX_S = 60;
const FORMULAIRE_VIDE = {
    nom: '',
    prenom: '',
    commune: '',
    anneeDebut: '',
    anneeFin: '',
    zone: 'reunion',
};
function lireVariantes(json: string): Variante[] {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v : [];
    }
    catch {
        return [];
    }
}
function messageErreur(e: any): string {
    const donnees = e?.response?.data;
    if (donnees?.details?.length)
        return donnees.details.map((d: any) => d.message).join(' · ');
    if (donnees?.error)
        return donnees.error;
    return e?.message ?? 'Erreur inconnue';
}
export const BoutonTraque = () => {
    const [ouvert, setOuvert] = useState(false);
    return (<>
            <button onClick={() => setOuvert(true)} className="mt-3 flex items-center justify-center gap-2 w-full py-3 px-4 bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-400 rounded-xl font-medium transition-all shrink-0">
                <Search size={20}/>
                Traque des noms
            </button>
            {ouvert && <TraqueDesNoms onFermer={() => setOuvert(false)}/>}
        </>);
};
export const TraqueDesNoms = ({ onFermer }: {
    onFermer: () => void;
}) => {
    const { patronymes, charger: chargerPatronymes } = usePatronymeStore();
    const [zones, setZones] = useState<Zone[]>([]);
    const [sourcesInfo, setSourcesInfo] = useState<SourceInfo[]>([]);
    const [historique, setHistorique] = useState<Recherche[]>([]);
    const [form, setForm] = useState(FORMULAIRE_VIDE);
    const [enCours, setEnCours] = useState(false);
    const [ecoule, setEcoule] = useState(0);
    const [erreur, setErreur] = useState<string | null>(null);
    const [recherche, setRecherche] = useState<Recherche | null>(null);
    const [etats, setEtats] = useState<EtatSource[] | null>(null);
    const [dureeMs, setDureeMs] = useState<number | null>(null);
    const [filtreNiveau, setFiltreNiveau] = useState<'tous' | Certitude>('tous');
    const [cacherEcartees, setCacherEcartees] = useState(true);
    const annulation = useRef<AbortController | null>(null);
    const chargerHistorique = useCallback(async () => {
        try {
            const r = await apiClient.get('/traque/recherches');
            setHistorique(r.data);
        }
        catch {
        }
    }, []);
    useEffect(() => {
        chargerPatronymes();
        apiClient.get('/traque/zones').then((r) => setZones(r.data)).catch(() => undefined);
        apiClient.get('/traque/sources').then((r) => setSourcesInfo(r.data)).catch(() => undefined);
        chargerHistorique();
    }, [chargerPatronymes, chargerHistorique]);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onFermer();
        };
        window.addEventListener('keydown', touche);
        return () => {
            window.removeEventListener('keydown', touche);
            annulation.current?.abort();
        };
    }, [onFermer]);
    useEffect(() => {
        if (!enCours)
            return;
        const depart = Date.now();
        setEcoule(0);
        const t = setInterval(() => setEcoule(Math.floor((Date.now() - depart) / 1000)), 250);
        return () => clearInterval(t);
    }, [enCours]);
    const lancer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (enCours)
            return;
        setErreur(null);
        setEnCours(true);
        const controleur = new AbortController();
        annulation.current = controleur;
        try {
            const corps = {
                nom: form.nom,
                prenom: form.prenom,
                commune: form.commune,
                anneeDebut: form.anneeDebut === '' ? null : Number(form.anneeDebut),
                anneeFin: form.anneeFin === '' ? null : Number(form.anneeFin),
                zone: form.zone,
            };
            const r = await apiClient.post('/traque/recherches', corps, {
                signal: controleur.signal,
                timeout: (DUREE_MAX_S + 15) * 1000,
            });
            setRecherche(r.data.recherche);
            setEtats(r.data.sources);
            setDureeMs(r.data.dureeMs);
            chargerHistorique();
        }
        catch (err: any) {
            if (err?.code !== 'ERR_CANCELED')
                setErreur(messageErreur(err));
        }
        finally {
            setEnCours(false);
            annulation.current = null;
        }
    };
    const rouvrir = async (id: number) => {
        setErreur(null);
        try {
            const r = await apiClient.get(`/traque/recherches/${id}`);
            const rec: Recherche = r.data;
            setRecherche(rec);
            setEtats(null);
            setDureeMs(null);
            setForm({
                nom: rec.nom,
                prenom: rec.prenom ?? '',
                commune: rec.commune ?? '',
                anneeDebut: rec.anneeDebut?.toString() ?? '',
                anneeFin: rec.anneeFin?.toString() ?? '',
                zone: rec.zone ?? 'reunion',
            });
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
    };
    const majPiste = (maj: Piste) => setRecherche((r) => r ? { ...r, pistes: r.pistes?.map((p) => (p.id === maj.id ? maj : p)) } : r);
    const pistes = recherche?.pistes ?? [];
    const variantes = recherche ? lireVariantes(recherche.variantes) : [];
    const origineDe = (nom: string) => variantes.find((v) => v.nom === nom)?.origine ?? '';
    const compte = useMemo(() => {
        const c = { prouve: 0, probable: 0, hypothese: 0, gardee: 0, ecartee: 0 };
        for (const p of pistes) {
            c[p.certitude]++;
            if (p.statut === 'gardee')
                c.gardee++;
            if (p.statut === 'ecartee')
                c.ecartee++;
        }
        return c;
    }, [pistes]);
    const visibles = pistes.filter((p) => (filtreNiveau === 'tous' || p.certitude === filtreNiveau) &&
        !(cacherEcartees && p.statut === 'ecartee'));
    const ordre = sourcesInfo.map((s) => s.cle);
    const parSource = new Map<string, Piste[]>();
    for (const p of visibles) {
        const l = parSource.get(p.source);
        if (l)
            l.push(p);
        else
            parSource.set(p.source, [p]);
    }
    const groupes = [...parSource.entries()].sort(([a], [b]) => (ordre.indexOf(a) + 1 || 99) - (ordre.indexOf(b) + 1 || 99));
    const titreSource = (cle: string) => sourcesInfo.find((s) => s.cle === cle)?.titre ?? cle;
    const libelleZone = (cle: string | null) => zones.find((z) => z.cle === (cle ?? 'reunion'))?.libelle ?? cle ?? 'La Réunion';
    const champ = 'w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm';
    return (<div className="fixed inset-0 z-50 bg-stone-50 flex flex-col font-sans text-gray-900">
            
            <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">La Traque des Noms Manquants</h1>
                    <p className="text-xs text-gray-500">
                        La Traque <strong>propose</strong> des pistes. Aucune n’entre dans l’arbre toute seule.
                    </p>
                </div>
                <button onClick={onFermer} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Fermer (Échap)">
                    <X size={20}/> Fermer
                </button>
            </header>

            <div className="flex flex-1 min-h-0">
                
                <aside className="w-80 shrink-0 bg-white border-r border-gray-200 p-5 overflow-y-auto">
                    <form onSubmit={lancer} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                            <input className={champ} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} list="traque-patronymes" required autoFocus/>
                            <datalist id="traque-patronymes">
                                {patronymes.map((p) => (<option key={p.id} value={p.nom}/>))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom</label>
                            <input className={champ} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}/>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Commune <span className="font-normal text-gray-400">(ouvre les registres ANOM)</span>
                            </label>
                            <input className={champ} value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} placeholder="ex. Saint-Paul, Cilaos"/>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">De</label>
                                <input className={champ} type="number" min={1600} max={2100} value={form.anneeDebut} onChange={(e) => setForm({ ...form, anneeDebut: e.target.value })} placeholder="1848"/>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">À</label>
                                <input className={champ} type="number" min={1600} max={2100} value={form.anneeFin} onChange={(e) => setForm({ ...form, anneeFin: e.target.value })} placeholder="1860"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Zone d’origine</label>
                            <select className={champ} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                                {zones.map((z) => (<option key={z.cle} value={z.cle}>
                                        {z.libelle}
                                    </option>))}
                            </select>
                        </div>

                        <button type="submit" disabled={enCours || form.nom.trim() === ''} className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-sm transition-all">
                            {enCours ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
                            {enCours ? 'Traque en cours…' : 'Lancer la traque'}
                        </button>

                        {enCours && (<div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                {sourcesInfo.length} sources interrogées · {ecoule} s écoulées
                                <br />
                                {ecoule < DUREE_HABITUELLE_S
                ? `Reste environ ${DUREE_HABITUELLE_S - ecoule} s (durée habituelle ${DUREE_HABITUELLE_S} s)`
                : `Plus long que d’habitude — au plus ${Math.max(0, DUREE_MAX_S - ecoule)} s encore`}
                            </div>)}
                        {erreur && (<div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-2">
                                {erreur}
                            </div>)}
                    </form>

                    <div className="mt-6">
                        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            <History size={14}/> Traques précédentes
                        </h2>
                        {historique.length === 0 && <p className="text-xs text-gray-400">Aucune pour l’instant.</p>}
                        <ul className="space-y-1">
                            {historique.map((h) => (<li key={h.id}>
                                    <button onClick={() => rouvrir(h.id)} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-amber-50 ${recherche?.id === h.id ? 'bg-amber-100' : ''}`}>
                                        <span className="font-semibold">{h.nom}</span>
                                        {h.prenom && <span className="text-gray-600"> {h.prenom}</span>}
                                        <span className="block text-xs text-gray-500">
                                            {[h.commune, libelleZone(h.zone), h.anneeDebut && `${h.anneeDebut}–${h.anneeFin ?? ''}`]
                .filter(Boolean)
                .join(' · ')}{' '}
                                            · {h._count?.pistes ?? 0} pistes ·{' '}
                                            {new Date(h.lanceeLe).toLocaleDateString('fr-FR')}
                                        </span>
                                    </button>
                                </li>))}
                        </ul>
                    </div>
                </aside>

                
                <main className="flex-1 min-w-0 overflow-y-auto p-6">
                    {!recherche && !enCours && <Accueil sources={sourcesInfo}/>}

                    {recherche && (<>
                            <section className="mb-4">
                                <h2 className="text-lg font-bold">
                                    {recherche.nom}
                                    {recherche.prenom ? ` ${recherche.prenom}` : ''}
                                    <span className="font-normal text-gray-500">
                                        {' '}
                                        — {[recherche.commune, libelleZone(recherche.zone)].filter(Boolean).join(', ')}
                                        {recherche.anneeDebut ? `, ${recherche.anneeDebut}–${recherche.anneeFin ?? ''}` : ''}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {pistes.length} pistes
                                    {dureeMs !== null && ` en ${(dureeMs / 1000).toFixed(1)} s`} · {compte.probable} probables ·{' '}
                                    {compte.hypothese} hypothèses · {compte.prouve} prouvées · {compte.gardee} gardées ·{' '}
                                    {compte.ecartee} écartées
                                </p>
                            </section>

                            
                            <section className="mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Graphies interrogées
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {variantes.map((v) => (<span key={v.nom} title={v.origine === 'saisie' ? 'Le nom saisi' : `Confusion : ${v.origine}`} className={`px-2 py-1 rounded-md text-sm ${v.origine === 'saisie'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-300'}`}>
                                            {v.nom}
                                            {v.origine !== 'saisie' && (<span className="ml-1 text-xs text-gray-500">({v.origine})</span>)}
                                        </span>))}
                                </div>
                            </section>

                            
                            {etats && (<section className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                                    {etats.map((s) => (<div key={s.cle} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" title={s.raison ?? ''}>
                                            <div className="font-semibold truncate">{s.titre}</div>
                                            <div className={`text-xs ${ETATS[s.etat].classe}`}>
                                                {ETATS[s.etat].libelle} · {s.nombre} · {(s.dureeMs / 1000).toFixed(1)} s
                                            </div>
                                            {s.raison && <div className="text-xs text-red-700 truncate">{s.raison}</div>}
                                        </div>))}
                                </section>)}

                            
                            <section className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                                {(['tous', 'prouve', 'probable', 'hypothese'] as const).map((n) => (<button key={n} onClick={() => setFiltreNiveau(n)} className={`px-3 py-1 rounded-full border ${filtreNiveau === n
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white border-gray-300 hover:bg-gray-100'}`}>
                                        {n === 'tous' ? 'Tous les niveaux' : NIVEAUX[n].libelle}
                                    </button>))}
                                <label className="ml-2 flex items-center gap-1 text-gray-600">
                                    <input type="checkbox" checked={cacherEcartees} onChange={(e) => setCacherEcartees(e.target.checked)}/>
                                    cacher les pistes écartées
                                </label>
                            </section>

                            {groupes.length === 0 && (<p className="text-gray-500 text-sm">Aucune piste avec ces filtres.</p>)}

                            {groupes.map(([cle, liste]) => (<section key={cle} className="mb-6">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">
                                        {titreSource(cle)} <span className="font-normal text-gray-500">· {liste.length}</span>
                                    </h3>
                                    <ul className="space-y-2">
                                        {liste.map((p) => (<CartePiste key={p.id} piste={p} origineVariante={origineDe(p.variante)} onMaj={majPiste}/>))}
                                    </ul>
                                </section>))}
                        </>)}
                </main>
            </div>
        </div>);
};
const Accueil = ({ sources }: {
    sources: SourceInfo[];
}) => (<div className="max-w-2xl text-sm text-gray-700 space-y-4">
        <p>
            Saisis un nom : la Traque interroge les fonds publics gratuits, essaie aussi les graphies proches (les
            confusions des officiers d’état civil) et te propose des <strong>pistes</strong>. Chacune dit d’où elle
            vient, par quelle graphie elle a été trouvée, et son niveau de certitude.
        </p>
        <div className="grid grid-cols-3 gap-2">
            {(Object.keys(NIVEAUX) as Certitude[]).map((n) => (<div key={n} className="bg-white border border-gray-200 rounded-lg p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${NIVEAUX[n].classe}`}>
                        {NIVEAUX[n].libelle}
                    </span>
                    <p className="mt-1 text-xs text-gray-600">{NIVEAUX[n].aide}</p>
                </div>))}
        </div>
        <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Sources branchées ({sources.length})
            </h3>
            <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                {sources.map((s) => (<li key={s.cle} className="px-3 py-2">
                        <span className="font-semibold">{s.titre}</span>
                        <span className="text-gray-500"> — {s.apport}</span>
                    </li>))}
            </ul>
        </div>
    </div>);
const CartePiste = ({ piste, origineVariante, onMaj, }: {
    piste: Piste;
    origineVariante: string;
    onMaj: (p: Piste) => void;
}) => {
    const [motif, setMotif] = useState(piste.motifStatut ?? '');
    const [demandePreuve, setDemandePreuve] = useState(false);
    const [occupe, setOccupe] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const envoyer = async (corps: {
        statut: Statut;
        motif?: string;
        prouvee?: boolean;
    }) => {
        setOccupe(true);
        setErreur(null);
        try {
            const r = await apiClient.patch(`/traque/pistes/${piste.id}`, corps);
            onMaj(r.data);
            setDemandePreuve(false);
        }
        catch (e) {
            setErreur(messageErreur(e));
        }
        finally {
            setOccupe(false);
        }
    };
    const niveau = NIVEAUX[piste.certitude];
    const bord = piste.statut === 'gardee'
        ? 'border-l-4 border-l-emerald-500'
        : piste.statut === 'ecartee'
            ? 'opacity-60'
            : '';
    return (<li className={`bg-white border border-gray-200 rounded-lg p-3 ${bord}`}>
            <div className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${niveau.classe}`} title={niveau.aide}>
                    {niveau.libelle}
                </span>
                <div className="min-w-0 flex-1">
                    <a href={piste.url} target="_blank" rel="noreferrer" className="font-medium text-blue-800 hover:underline break-words">
                        {piste.titre} <ExternalLink size={12} className="inline"/>
                    </a>
                    {piste.extrait && <p className="text-xs text-gray-600 mt-1 break-words">{piste.extrait}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                        {piste.dateSource && <span>{piste.dateSource} · </span>}
                        {piste.cote ? (<span>cote {piste.cote}</span>) : (<span className="italic">cote à trouver</span>)}
                        {' · '}trouvée par <strong>{piste.variante}</strong>
                        {origineVariante && origineVariante !== 'saisie' && (<span> ({origineVariante})</span>)}
                    </p>
                    {piste.motifStatut && (<p className="text-xs text-emerald-800 mt-1">Motif : {piste.motifStatut}</p>)}
                    {erreur && <p className="text-xs text-red-700 mt-1">{erreur}</p>}

                    {demandePreuve && (<div className="mt-2 flex gap-2">
                            <input className="flex-1 p-1.5 border border-gray-300 rounded text-xs" placeholder="Motif de la preuve (ex. acte vu, registre 1852 page 14)" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus/>
                            <button disabled={occupe || motif.trim() === ''} onClick={() => envoyer({ statut: 'gardee', prouvee: true, motif })} className="px-2 py-1 bg-emerald-600 disabled:bg-gray-300 text-white rounded text-xs">
                                Valider la preuve
                            </button>
                            <button onClick={() => setDemandePreuve(false)} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-xs">
                                Annuler
                            </button>
                        </div>)}
                </div>

                <div className="shrink-0 flex flex-col gap-1">
                    {piste.statut !== 'gardee' ? (<button disabled={occupe} onClick={() => envoyer({ statut: 'gardee' })} className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                            <Check size={12}/> Garder
                        </button>) : (<button disabled={occupe} onClick={() => envoyer({ statut: 'proposee' })} className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                            Ne plus garder
                        </button>)}
                    {piste.statut === 'gardee' && piste.certitude !== 'prouve' && (<button disabled={occupe} onClick={() => setDemandePreuve(true)} className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-emerald-600 text-white bg-emerald-600 hover:bg-emerald-700">
                            <ShieldCheck size={12}/> Prouver
                        </button>)}
                    {piste.statut !== 'ecartee' ? (<button disabled={occupe} onClick={() => envoyer({ statut: 'ecartee' })} className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                            <XCircle size={12}/> Écarter
                        </button>) : (<button disabled={occupe} onClick={() => envoyer({ statut: 'proposee' })} className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                            Reprendre
                        </button>)}
                </div>
            </div>
        </li>);
};
