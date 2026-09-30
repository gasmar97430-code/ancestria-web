import { useCallback, useEffect, useState } from 'react';
import { DeviceMobile, X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { IndiceSexe, useSexePropose } from '../tree/IndiceSexe';
import { decouperNom, dejaDansLArbre, notesDeLaPersonne } from './noteVersPersonne';
import { NoteCiblee } from './NoteCiblee';
export interface NoteTerrain {
    id: number;
    texte: string;
    precisions: string | null;
    noteeLe: string;
    recueLe: string;
    statut: 'nouvelle' | 'versee' | 'ecartee';
    individuId: number | null;
    traiteeLe: string | null;
}
interface EtatCarnet {
    actif: boolean;
    enEcoute: boolean;
    erreur: string | null;
    adresse: string | null;
    adresses: {
        adresse: string;
        carte: string;
        reseauMaison: boolean;
    }[];
    code: string;
    urlCarnet: string;
    urlInstallation: string;
    lienCarnet: string;
    qrCarnet: string;
    qrInstallation: string;
    dernierContact: string | null;
    empreinte: string | null;
    nouvelles: number;
}
const champ = 'w-full h-10 px-3 bg-blanc border border-trait rounded-[10px] text-sm text-encre outline-none focus:border-sepia';
const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1';
const bouton = 'h-9 px-3.5 rounded-[10px] text-[13px] font-medium disabled:opacity-50';
const quand = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};
const ilYa = (iso: string | null) => {
    if (!iso)
        return 'jamais encore';
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60)
        return "à l'instant";
    if (s < 3600)
        return `il y a ${Math.round(s / 60)} min`;
    return `le ${quand(iso)}`;
};
const messageErreur = (err: any) => {
    const d = err?.response?.data;
    return d?.details?.map((x: any) => x.message).join(' · ') ?? d?.error ?? err.message;
};
const NoteARelire = ({ note, apres }: {
    note: NoteTerrain;
    apres: () => void;
}) => {
    const people = useTreeStore((s) => s.people);
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const [f, setF] = useState(() => ({ ...decouperNom(note.texte), genre: 'Unknown', notes: notesDeLaPersonne(note) }));
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const sexe = useSexePropose(f.prenom, f.genre, (g) => setF((x) => ({ ...x, genre: g })));
    const semblables = dejaDansLArbre(people, f.prenom, f.nom);
    const agir = async (chemin: string, corps?: unknown) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post(`/carnet/notes/${note.id}/${chemin}`, corps ?? {});
            if (chemin !== 'ecarter')
                await fetchTree();
            apres();
        }
        catch (err: any) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="border border-trait-leger rounded-[14px] p-4 flex flex-col gap-3 bg-blanc/40">
            <div>
                <div className="font-display text-[24px] leading-tight text-encre">{note.texte}</div>
                {note.precisions && <div className="text-[13px] text-encre-2 whitespace-pre-wrap mt-0.5">{note.precisions}</div>}
                <div className="text-[11px] text-encre-3 mt-1">
                    Notée le {quand(note.noteeLe)} · reçue le {quand(note.recueLe)}
                </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr_150px] gap-2.5">
                <div>
                    <label className={etiquette}>Prénom(s) *</label>
                    <input className={champ} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })}/>
                </div>
                <div>
                    <label className={etiquette}>Nom *</label>
                    <input className={champ} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })}/>
                </div>
                <div>
                    <label className={etiquette}>Sexe</label>
                    <select className={champ} value={f.genre} onChange={(e) => {
            sexe.manuel();
            setF({ ...f, genre: e.target.value });
        }}>
                        <option value="Unknown">Inconnu</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="Other">Autre</option>
                    </select>
                </div>
            </div>
            <IndiceSexe prenom={f.prenom} genre={f.genre}/>
            <div>
                <label className={etiquette}>Notes de la personne</label>
                <textarea className={`${champ} h-auto min-h-[64px] py-2 leading-snug`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}/>
            </div>

            <NoteCiblee note={note as never} envoi={envoi} onAjouter={(id) => void agir('ajouter-a-la-fiche', { individuId: id })}/>
            {semblables.length > 0 && (<div className="text-[12.5px] text-encre-2 flex flex-wrap items-center gap-2">
                    <span>Déjà dans l'arbre ?</span>
                    {semblables.map((p) => (<button key={p.id} disabled={envoi} onClick={() => void agir('ajouter-a-la-fiche', { individuId: p.id })} className={`${bouton} border border-trait text-encre hover:bg-sepia-tint`} title="Ne crée personne : la note est rangée avec cette personne">
                            C'est {p.prenom} {p.nom}
                        </button>))}
                </div>)}

            {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}

            <div className="flex gap-2 justify-end">
                <button disabled={envoi} onClick={() => void agir('ecarter')} className={`${bouton} text-encre-2 hover:bg-papier`} title="La note est gardée à part, jamais effacée">
                    Écarter
                </button>
                <button disabled={envoi || !f.prenom.trim()} onClick={() => void agir('verser', {
            prenom: f.prenom.trim(),
            nom: f.nom.trim(),
            genre: f.genre,
            ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
        })} className={`${bouton} border border-sepia text-sepia-deep hover:bg-sepia-tint`}>
                    Créer la personne
                </button>
            </div>
        </div>);
};
const QR = ({ svg, titre }: {
    svg: string;
    titre: string;
}) => (<div className="flex flex-col items-center gap-1.5 text-center w-[152px]">
        <div className="text-[12.5px] font-medium text-encre">{titre}</div>
        <div className="w-[152px] h-[152px] bg-white p-1.5 rounded-[10px] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }}/>
    </div>);
const RelierTelephone = ({ etat, recharger }: {
    etat: EtatCarnet | null;
    recharger: () => Promise<void>;
}) => {
    const [adresse, setAdresse] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const poster = async (chemin: string, corps?: unknown) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.post(`/carnet/${chemin}`, corps ?? {});
            await recharger();
        }
        catch (err: any) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    if (!etat)
        return <div className="text-sm text-encre-3">Lecture de l'état…</div>;
    if (!etat.enEcoute) {
        const choix = adresse ?? etat.adresse ?? etat.adresses[0]?.adresse ?? null;
        return (<div className="flex flex-col gap-3 text-[13px] text-encre-2 leading-relaxed">
                <p className="m-0">
                    Un bloc-notes sur votre téléphone, qui marche <b>sans réseau</b> sur la route. En arrivant à la maison, le téléphone
                    retrouve le Wi-Fi et envoie seul les noms ici, dès que vous ouvrez le carnet — si Ancestria est ouverte sur ce PC.
                </p>
                {etat.adresses.length > 1 && (<div>
                        <label className={etiquette}>Adresse de ce PC sur le réseau</label>
                        <select className={champ} value={choix ?? ''} onChange={(e) => setAdresse(e.target.value)}>
                            {etat.adresses.map((a) => (<option key={a.adresse} value={a.adresse}>
                                    {a.adresse} — {a.carte}
                                    {a.reseauMaison ? ' (réseau de la maison)' : ''}
                                </option>))}
                        </select>
                    </div>)}
                {etat.adresses.length === 0 && <p className="m-0" style={{ color: 'var(--o-afrique)' }}>Ce PC n'est relié à aucun réseau local.</p>}
                <p className="m-0 text-encre-3 text-[12px]">
                    Au premier lancement, Windows demandera l'autorisation du pare-feu pour Ancestria : cochez « Réseaux privés » puis
                    « Autoriser ». C'est ce qui laisse le téléphone joindre ce PC.
                </p>
                {(erreur || etat.erreur) && <p className="m-0" style={{ color: 'var(--o-afrique)' }}>{erreur ?? etat.erreur}</p>}
                <div>
                    <button disabled={envoi || !choix} onClick={() => void poster('activer', { adresse: choix })} className={`${bouton} border border-sepia text-sepia-deep hover:bg-sepia-tint`}>
                        {envoi ? 'Démarrage…' : 'Activer le carnet'}
                    </button>
                </div>
            </div>);
    }
    return (<div className="flex flex-col gap-4">
            <div className="flex gap-4 justify-center">
                <QR svg={etat.qrInstallation} titre="1. Une fois : le certificat"/>
                <QR svg={etat.qrCarnet} titre="2. Ouvrir le carnet"/>
            </div>
            <div className="flex flex-col items-center gap-1 text-[13px] text-encre-2">
                <span>
                    Code d'appairage : <b className="font-mono text-[17px] text-encre tracking-[.15em]">{etat.code}</b>
                </span>
                <span>
                    Dernier contact du téléphone : <b className="text-encre">{ilYa(etat.dernierContact)}</b>
                </span>
            </div>
            <div className="font-mono text-[11px] text-encre-3 text-center leading-relaxed">
                <div>1. {etat.urlInstallation}</div>
                <div>2. {etat.urlCarnet}</div>
            </div>
            <p className="m-0 text-[12px] text-encre-3 text-center leading-relaxed">
                Scannez le 1 avec l'appareil photo, installez le certificat en suivant la page, puis scannez le 2. Sur iPhone, utilisez
                Safari. Astuce : « Ajouter à l'écran d'accueil » pour l'ouvrir comme une appli (elle demandera le code une fois).
            </p>
            {(erreur || etat.erreur) && <p className="m-0 text-center" style={{ color: 'var(--o-afrique)' }}>{erreur ?? etat.erreur}</p>}
            <div className="flex gap-2 justify-center">
                <button disabled={envoi} onClick={() => void poster('nouveau-code')} className={`${bouton} border border-trait text-encre hover:bg-papier`} title="L'ancien code ne sera plus accepté : le téléphone demandera le nouveau">
                    Changer le code
                </button>
                <button disabled={envoi} onClick={() => void poster('desactiver')} className={`${bouton} text-encre-2 hover:bg-papier`}>
                    Désactiver
                </button>
            </div>
        </div>);
};
export const CarnetTelephone = ({ onFermer, onCompte }: {
    onFermer: () => void;
    onCompte: (n: number) => void;
}) => {
    const [notes, setNotes] = useState<NoteTerrain[] | null>(null);
    const [traitees, setTraitees] = useState<NoteTerrain[] | null>(null);
    const [etat, setEtat] = useState<EtatCarnet | null>(null);
    const chargerNotes = useCallback(async () => {
        const n = (await apiClient.get('/carnet/notes')).data as NoteTerrain[];
        setNotes((avant) => {
            if (!avant)
                return n;
            const restantes = avant.filter((a) => n.some((x) => x.id === a.id));
            return [...restantes, ...n.filter((x) => !restantes.some((a) => a.id === x.id))];
        });
        onCompte(n.length);
    }, [onCompte]);
    const chargerEtat = useCallback(async () => {
        setEtat((await apiClient.get('/carnet/etat')).data);
    }, []);
    useEffect(() => {
        void chargerNotes();
        void chargerEtat();
        const t = setInterval(() => {
            void chargerNotes();
            void chargerEtat();
        }, 5000);
        return () => clearInterval(t);
    }, [chargerNotes, chargerEtat]);
    return (<div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onFermer}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[980px] max-h-[92vh] bg-carte border border-trait-leger rounded-[20px] shadow-carte flex flex-col">
                <div className="flex items-center gap-3 px-8 pt-7 pb-4">
                    <DeviceMobile size={26} className="text-sepia"/>
                    <h2 className="font-display text-[34px] font-medium leading-none m-0">Carnet du téléphone</h2>
                    <button onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                        <X size={20}/>
                    </button>
                </div>

                <div className="grid grid-cols-[1fr_380px] gap-6 px-8 pb-8 min-h-0 overflow-hidden">
                    <section className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                        <div className="text-[10.5px] tracking-[.12em] uppercase text-encre-3">
                            Notes reçues{notes ? ` (${notes.length})` : ''}
                        </div>
                        {notes === null && <div className="text-sm text-encre-3">Lecture…</div>}
                        {notes?.length === 0 && (<div className="text-sm text-encre-3">Aucune note en attente. Celles du téléphone arriveront ici.</div>)}
                        {notes?.map((n) => (<NoteARelire key={n.id} note={n} apres={() => void chargerNotes()}/>))}
                        <button className="self-start text-[12px] text-encre-3 underline underline-offset-2 mt-1" onClick={async () => setTraitees(traitees ? null : (await apiClient.get('/carnet/notes?statut=traitees')).data)}>
                            {traitees ? 'Masquer les notes déjà traitées' : 'Voir les notes déjà traitées'}
                        </button>
                        {traitees?.map((n) => (<div key={n.id} className="text-[12.5px] text-encre-2 flex gap-2">
                                <span className="text-encre">{n.texte}</span>
                                <span className="text-encre-3">
                                    — {n.statut === 'versee' ? 'dans l’arbre' : 'écartée'} le {quand(n.traiteeLe ?? n.recueLe)}
                                </span>
                            </div>))}
                    </section>

                    <section className="flex flex-col gap-3 border-l border-trait-leger pl-6 overflow-y-auto">
                        <div className="text-[10.5px] tracking-[.12em] uppercase text-encre-3">Relier le téléphone</div>
                        <RelierTelephone etat={etat} recharger={chargerEtat}/>
                    </section>
                </div>
            </div>
        </div>);
};
