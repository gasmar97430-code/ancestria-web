import { useEffect, useRef, useState } from 'react';
import { ArrowsLeftRight, X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
interface Apercu {
    encodage: string;
    logiciel: string | null;
    version: string | null;
    individus: number;
    familles: number;
    couples: number;
    liensParentEnfant: number;
    datesGardeesEnNotes: number;
    reconnus: number;
    exemplesReconnus: {
        nom: string;
        naissance: string;
    }[];
    homonymes: number;
    exemplesHomonymes: {
        nom: string;
        naissance: string;
    }[];
    nonRepris: Record<string, number>;
    lignesIllisibles: number;
    referencesBrisees: number;
    exemples: {
        nom: string;
        naissance: string;
    }[];
    personnesDejaDansLaBase: number;
}
interface Resultat {
    copieDeSecurite: string | null;
    journal: string;
    crees: {
        individus: number;
        unions: number;
        parentes: number;
        enfantsUnions: number;
    };
    reconnus: number;
    dejaPresents: number;
    refus: {
        quoi: string;
        motif: string;
    }[];
}
interface EtatTache {
    enCours: boolean;
    fait: number;
    total: number;
    etape: string;
    compteur: string;
    ecouleSecondes: number;
    resteSecondes: number | null;
    resultat: Resultat | null;
    erreur: string | null;
}
const ETIQUETTES: Record<string, string> = {
    SOUR: 'citations de sources',
    OBJE: 'médias (photos, documents)',
    ADDR: 'adresses',
    PHON: 'téléphones',
    EMAIL: 'courriels',
    WWW: 'sites web',
    ALIA: 'renvois « alias »',
    ASSO: 'relations (parrain, témoin…)',
    RESN: 'restrictions',
    REPO: 'dépôts d’archives',
    'FAM EVEN': 'événements de couple',
    'FAM SOUR': 'sources de couple',
};
const champ = 'h-9 px-3 rounded-[10px] text-[13px] font-medium disabled:opacity-50';
const titre = 'text-[10.5px] tracking-[.12em] uppercase text-encre-3';
const duree = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);
const erreurDe = (err: any) => err?.response?.data?.error ?? err.message;
const Chiffre = ({ n, libelle }: {
    n: number;
    libelle: string;
}) => (<div className="flex flex-col">
        <span className="font-display text-[26px] leading-none text-encre">{n.toLocaleString('fr-FR')}</span>
        <span className="text-[11px] text-encre-3 mt-1">{libelle}</span>
    </div>);
const Exporter = () => {
    const [masquer, setMasquer] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const [fait, setFait] = useState<{
        fichier: string;
        octets: number;
        individus: number;
        familles: number;
        masques: number;
    } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const exporter = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            setFait((await apiClient.post('/gedcom/exporter', { masquerVivants: masquer })).data);
        }
        catch (err: any) {
            setErreur(erreurDe(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<section className="flex flex-col gap-3">
            <div className={titre}>Exporter l'arbre</div>
            <p className="m-0 text-[13px] text-encre-2 leading-relaxed">
                Un fichier <b>GEDCOM 5.5.1</b> (UTF-8), lisible par Geneanet et les logiciels de généalogie : toutes les personnes,
                couples, filiations et notes.
            </p>
            <label className="flex items-start gap-2 text-[13px] text-encre-2 cursor-pointer">
                <input type="checkbox" className="mt-1 accent-[var(--sepia)]" checked={masquer} onChange={(e) => setMasquer(e.target.checked)}/>
                <span>
                    Pour partager : masquer les personnes vivantes (prénom remplacé par « Vivant », sans dates, lieux ni notes).
                </span>
            </label>
            <div>
                <button disabled={envoi} onClick={() => void exporter()} className={`${champ} border border-sepia text-sepia-deep hover:bg-sepia-tint`}>
                    {envoi ? 'Export…' : 'Exporter en GEDCOM'}
                </button>
            </div>
            {fait && (<div className="text-[12.5px] text-encre-2 leading-relaxed">
                    Écrit : <span className="text-encre break-all">{fait.fichier}</span>
                    <br />
                    {fait.individus} personnes, {fait.familles} familles, {Math.round(fait.octets / 1024)} Ko
                    {fait.masques ? ` — ${fait.masques} personnes vivantes masquées` : ''}.
                </div>)}
            {erreur && <p className="m-0 text-[13px]" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </section>);
};
const Importer = () => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const entree = useRef<HTMLInputElement>(null);
    const [fichier, setFichier] = useState<{
        nom: string;
        octets: ArrayBuffer;
    } | null>(null);
    const [apercu, setApercu] = useState<Apercu | null>(null);
    const [reconnaitre, setReconnaitre] = useState(true);
    const [etat, setEtat] = useState<EtatTache | null>(null);
    const [annule, setAnnule] = useState<string | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [attente, setAttente] = useState(false);
    const choisir = async (f: File | undefined) => {
        if (!f)
            return;
        setApercu(null);
        setEtat(null);
        setAnnule(null);
        setErreur(null);
        setAttente(true);
        try {
            const octets = await f.arrayBuffer();
            setFichier({ nom: f.name, octets });
            setApercu((await apiClient.post('/gedcom/apercu', octets, { headers: { 'Content-Type': 'application/octet-stream' } })).data);
        }
        catch (err: any) {
            setErreur(erreurDe(err));
        }
        finally {
            setAttente(false);
        }
    };
    useEffect(() => {
        if (!etat?.enCours)
            return;
        const t = setInterval(async () => {
            const e = (await apiClient.get('/gedcom/importer/etat')).data as EtatTache;
            setEtat(e);
            if (!e.enCours)
                void fetchTree();
        }, 500);
        return () => clearInterval(t);
    }, [etat?.enCours, fetchTree]);
    const importer = async () => {
        if (!fichier)
            return;
        setErreur(null);
        try {
            await apiClient.post(`/gedcom/importer?nom=${encodeURIComponent(fichier.nom)}&reconnaitre=${reconnaitre ? 1 : 0}`, fichier.octets, {
                headers: { 'Content-Type': 'application/octet-stream' },
            });
            setEtat((await apiClient.get('/gedcom/importer/etat')).data);
        }
        catch (err: any) {
            setErreur(erreurDe(err));
        }
    };
    const annuler = async () => {
        const r = etat?.resultat;
        if (!r)
            return;
        if (!confirm(`Retirer ce que cet import a créé : ${r.crees.individus} personnes, ${r.crees.unions} couples, ${r.crees.parentes} liens ? (une copie de sécurité est faite avant)`))
            return;
        try {
            await apiClient.post('/gedcom/annuler', { journal: r.journal });
            setAnnule(`Import annulé : ${r.crees.individus} personnes, ${r.crees.unions} couples et ${r.crees.parentes} liens retirés.`);
            await fetchTree();
        }
        catch (err: any) {
            setErreur(erreurDe(err));
        }
    };
    const nonRepris = apercu ? Object.entries(apercu.nonRepris).sort((a, b) => b[1] - a[1]) : [];
    const r = etat?.resultat;
    return (<section className="flex flex-col gap-3 min-h-0">
            <div className={titre}>Importer un arbre (Geneanet…)</div>
            <p className="m-0 text-[13px] text-encre-2 leading-relaxed">
                Choisissez le fichier <b>.ged</b> exporté depuis Geneanet (de préférence en UTF-8) ou un autre logiciel. Vous verrez d'abord
                ce qu'il contient : <b>rien n'est écrit</b> avant votre clic sur « Importer ».
            </p>
            <input ref={entree} type="file" accept=".ged,.gedcom" className="hidden" onChange={(e) => void choisir(e.target.files?.[0])}/>
            <div>
                <button disabled={attente || !!etat?.enCours} onClick={() => entree.current?.click()} className={`${champ} border border-trait text-encre hover:bg-papier`}>
                    {attente ? 'Lecture…' : fichier ? 'Choisir un autre fichier' : 'Choisir le fichier .ged'}
                </button>
                {fichier && <span className="ml-3 text-[12.5px] text-encre-2">{fichier.nom}</span>}
            </div>

            {apercu && !etat && (<div className="flex flex-col gap-3 border border-trait-leger rounded-[14px] p-4">
                    <div className="text-[12px] text-encre-3">
                        Fichier {apercu.logiciel ?? 'de logiciel inconnu'}
                        {apercu.version ? `, GEDCOM ${apercu.version}` : ''}, encodage {apercu.encodage}.
                    </div>
                    <div className="flex gap-7 flex-wrap">
                        <Chiffre n={apercu.individus} libelle="personnes"/>
                        <Chiffre n={apercu.couples} libelle="couples"/>
                        <Chiffre n={apercu.liensParentEnfant} libelle="liens parent-enfant"/>
                    </div>
                    <ul className="m-0 pl-4 text-[12.5px] text-encre-2 leading-relaxed">
                        {apercu.exemples.length > 0 && <li>Par exemple : {apercu.exemples.slice(0, 5).map((e) => e.nom + (e.naissance ? ` (${e.naissance})` : '')).join(' · ')}</li>}
                        <li>
                            {apercu.datesGardeesEnNotes} {apercu.datesGardeesEnNotes > 1 ? 'personnes ont' : 'personne a'} une date approchée (« vers 1900 », « avant 1850 », « entre 1850 et 1860 ») : elle est gardée <b>telle quelle dans les notes</b>, jamais transformée en date. Une année seule (« 1880 ») est gardée comme année.
                        </li>
                        {apercu.reconnus > 0 && (<li>
                                {apercu.reconnus} déjà dans votre arbre (nom, prénom et date de naissance au jour près identiques), ex. {apercu.exemplesReconnus.map((e) => e.nom).join(', ')}.
                            </li>)}
                        {apercu.homonymes > 0 && (<li>
                                {apercu.homonymes} portent le nom et le prénom de quelqu'un de votre arbre, sans date de naissance pour le confirmer : elles seront <b>créées à part</b> (ex. {apercu.exemplesHomonymes.map((e) => e.nom).join(', ')}).
                            </li>)}
                        {nonRepris.length > 0 && (<li>
                                Non repris : {nonRepris.slice(0, 8).map(([t, n]) => `${n} ${ETIQUETTES[t] ?? t}`).join(', ')}
                                {nonRepris.length > 8 ? '…' : ''}.
                            </li>)}
                        {apercu.lignesIllisibles > 0 && <li>{apercu.lignesIllisibles} lignes illisibles ignorées.</li>}
                        {apercu.referencesBrisees > 0 && <li>{apercu.referencesBrisees} renvois vers des personnes absentes du fichier.</li>}
                    </ul>
                    <label className="flex items-start gap-2 text-[13px] text-encre-2 cursor-pointer">
                        <input type="checkbox" className="mt-1 accent-[var(--sepia)]" checked={reconnaitre} onChange={(e) => setReconnaitre(e.target.checked)}/>
                        <span>Reconnaître les personnes déjà dans l'arbre (seulement si nom, prénom et date de naissance au jour près sont identiques — une année seule ne suffit pas).</span>
                    </label>
                    <p className="m-0 text-[12px] text-encre-3">
                        Une copie de sécurité de la base est faite avant. Les règles de l'arbre s'appliquent : un lien impossible (enfant né après
                        le décès d'un parent…) est refusé et vous sera montré.
                    </p>
                    <div>
                        <button onClick={() => void importer()} className={`${champ} border border-sepia text-sepia-deep hover:bg-sepia-tint`}>
                            Importer {apercu.individus - (reconnaitre ? apercu.reconnus : 0)} personnes
                        </button>
                    </div>
                </div>)}

            {etat?.enCours && (<div className="flex flex-col gap-2 border border-trait-leger rounded-[14px] p-4">
                    <div className="text-[13px] text-encre">
                        Import en cours — {etat.compteur || etat.etape}
                    </div>
                    <div className="h-2 rounded-full bg-papier overflow-hidden">
                        <div className="h-full bg-sepia transition-all" style={{ width: `${etat.total ? (100 * etat.fait) / etat.total : 0}%` }}/>
                    </div>
                    <div className="text-[12px] text-encre-3">
                        {duree(etat.ecouleSecondes)} écoulées
                        {etat.resteSecondes !== null
                ? ` · reste environ ${duree(etat.resteSecondes)} · fin vers ${new Date(Date.now() + etat.resteSecondes * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : ' · estimation du temps restant…'}
                    </div>
                </div>)}

            {r && !etat?.enCours && (<div className="flex flex-col gap-3 border border-trait-leger rounded-[14px] p-4 min-h-0">
                    <div className="text-[13px] text-encre">Import terminé en {duree(etat!.ecouleSecondes)}.</div>
                    <div className="flex gap-7 flex-wrap">
                        <Chiffre n={r.crees.individus} libelle="personnes créées"/>
                        <Chiffre n={r.crees.unions} libelle="couples"/>
                        <Chiffre n={r.crees.parentes} libelle="liens parent-enfant"/>
                        <Chiffre n={r.reconnus} libelle="déjà dans l'arbre"/>
                    </div>
                    {r.refus.length > 0 && (<div className="flex flex-col gap-1 min-h-0">
                            <div className="text-[12.5px] text-encre">{r.refus.length} points refusés par les règles de l'arbre — tout le reste est importé :</div>
                            <ul className="m-0 pl-4 text-[12px] text-encre-2 leading-snug max-h-[150px] overflow-y-auto">
                                {r.refus.map((x, i) => (<li key={i}>
                                        <span className="text-encre">{x.quoi}</span> — {x.motif}
                                    </li>))}
                            </ul>
                        </div>)}
                    {r.copieDeSecurite && <div className="text-[11.5px] text-encre-3 break-all">Copie de sécurité d'avant l'import : {r.copieDeSecurite}</div>}
                    {annule ? (<div className="text-[13px] text-encre-2">{annule}</div>) : (<div>
                            <button onClick={() => void annuler()} className={`${champ} border border-trait text-encre hover:bg-papier`}>
                                Annuler cet import
                            </button>
                        </div>)}
                </div>)}
            {etat?.erreur && <p className="m-0 text-[13px]" style={{ color: 'var(--o-afrique)' }}>Import interrompu : {etat.erreur}</p>}
            {erreur && <p className="m-0 text-[13px]" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
        </section>);
};
export const EchangesGedcom = ({ onFermer }: {
    onFermer: () => void;
}) => (<div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onFermer}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[1000px] max-h-[92vh] bg-carte border border-trait-leger rounded-[20px] shadow-carte flex flex-col">
            <div className="flex items-center gap-3 px-8 pt-7 pb-4">
                <ArrowsLeftRight size={26} className="text-sepia"/>
                <h2 className="font-display text-[34px] font-medium leading-none m-0">GEDCOM</h2>
                <span className="text-[13px] text-encre-3 mt-2">échanger l'arbre avec Geneanet et les logiciels de généalogie</span>
                <button onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                    <X size={20}/>
                </button>
            </div>
            <div className="grid grid-cols-[1fr_340px] gap-7 px-8 pb-8 min-h-0 overflow-y-auto">
                <Importer />
                <div className="border-l border-trait-leger pl-7">
                    <Exporter />
                </div>
            </div>
        </div>
    </div>);
export const BoutonGedcom = ({ rail }: {
    rail: boolean;
}) => {
    const [ouvert, setOuvert] = useState(false);
    return (<>
            {rail ? (<button onClick={() => setOuvert(true)} title="GEDCOM : importer / exporter l'arbre (Geneanet…)" className="w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier">
                    <ArrowsLeftRight />
                </button>) : (<button onClick={() => setOuvert(true)} className="flex items-center justify-center gap-2 h-9 rounded-[10px] border border-trait text-encre text-[12.5px] font-medium hover:bg-sepia-tint">
                    <ArrowsLeftRight size={15}/>
                    GEDCOM (Geneanet)
                </button>)}
            {ouvert && <EchangesGedcom onFermer={() => setOuvert(false)}/>}
        </>);
};
