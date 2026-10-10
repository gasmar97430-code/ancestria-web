import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, X } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { usePortesDuSite } from './portesDuSite';
type Statut = 'en_attente' | 'acceptee' | 'refusee';
type Onglet = Statut | 'journal';
interface PersonneProposee {
    prenom: string;
    nom?: string;
    naissance_annee?: string | null;
    vivant?: boolean;
    relation?: string;
}
interface Proposition {
    id: string;
    contenu: {
        famille?: string;
        contributeur: PersonneProposee;
        lien: {
            relation: string;
            individu_id: string | null;
            texte?: string;
        };
        proches?: PersonneProposee[];
        message?: string;
        inscrit?: {
            nom: string;
            prenom: string;
            charte?: string;
        };
    };
    contact: string | null;
    statut: Statut;
    motif: string | null;
    cree_le: string;
}
interface LigneJournal {
    le: string;
    acteur: string;
    action: string;
    table_visee: string;
    fiche: string | null;
    avant: Record<string, unknown> | null;
    apres: Record<string, unknown> | null;
    pourquoi: string | null;
}
const RELATION: Record<string, string> = {
    enfant: 'se dit enfant de', petit_enfant: 'se dit petit-enfant de', parent: 'se dit parent de',
    conjoint: 'se dit conjoint de', frere_soeur: 'se dit frère ou sœur de', inconnu: 'sans lien avec une fiche de l’arbre',
};
const PROCHE: Record<string, string> = { parent: 'père / mère', enfant: 'enfant', conjoint: 'conjoint' };
const ONGLETS: [
    Onglet,
    string
][] = [['en_attente', 'À traiter'], ['acceptee', 'Acceptées'], ['refusee', 'Refusées'], ['journal', 'Journal d’audit']];
const TABLES: Record<string, string> = {
    individus: 'fiche', unions: 'couple', filiations: 'lien parent-enfant', foyers: 'foyer', foyer_parents: 'parent du foyer',
    contributions: 'proposition', invitations: 'lien de partage', arbres: 'arbre', membres: 'membre', documents: 'document',
    document_individus: 'document d’une fiche', familles_historiques: 'famille historique',
};
const ACTEUR: Record<string, string> = { proprietaire: 'vous', editeur: 'un éditeur', ia: 'l’IA', serveur: 'le serveur', base: 'la base', compte: 'un compte' };
const nomDe = (p: PersonneProposee) => `${p.prenom}${p.nom ? ` ${p.nom}` : ''}`;
const quand = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const message = (e: unknown) => (e as {
    response?: {
        data?: {
            message?: string;
        };
    };
}).response?.data?.message ?? (e instanceof Error ? e.message : String(e));
const surQuoi = (l: LigneJournal) => {
    const r = l.apres ?? l.avant ?? {};
    if (r.protegee)
        return 'fiche protégée (personne vivante)';
    if (typeof r.prenom === 'string')
        return `${r.prenom} ${typeof r.nom === 'string' ? r.nom : ''}`.trim();
    if (l.table_visee === 'contributions' && typeof r.statut === 'string')
        return `${({ en_attente: 'en attente', acceptee: 'acceptée', refusee: 'refusée' } as Record<string, string>)[r.statut] ?? r.statut}${r.motif ? ` — ${r.motif}` : ''}`;
    return '';
};
export const BoutonAdministration = ({ rail }: {
    rail: boolean;
}) => {
    const [etat, setEtat] = useState<{
        connecte: boolean;
        n: number;
    } | null>(null);
    const [ouverte, setOuverte] = useState(false);
    const [v, setV] = useState(0);
    useEffect(() => {
        let vivant = true;
        const relire = () => apiClient.get<{
            connecte: boolean;
            n: number;
        }>('/admin/a-traiter').then((r) => vivant && setEtat(r.data)).catch(() => vivant && setEtat(null));
        void relire();
        const t = window.setInterval(relire, 120000);
        return () => { vivant = false; window.clearInterval(t); };
    }, [v]);
    if (!etat?.connecte)
        return null;
    const titre = `Administration${etat.n ? ` (${etat.n} à traiter)` : ''}`;
    return (<>
            {rail ? (<button onClick={() => setOuverte(true)} title={titre} className="relative w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="administration">
                    <ShieldCheck />
                    {etat.n ? <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-blanc font-medium bg-sepia" data-bulle="administration">{etat.n}</span> : null}
                </button>) : (<button onClick={() => setOuverte(true)} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="administration">
                    <ShieldCheck size={18}/>
                    <span className="flex-1">Administration</span>
                    <span className={`text-[12px] font-medium ${etat.n ? 'text-sepia-deep' : 'text-encre-3'}`} data-bulle="administration">{etat.n}</span>
                </button>)}
            {ouverte && <Fenetre onFermer={() => setOuverte(false)} onChange={() => setV((x) => x + 1)}/>}
        </>);
};
const Fenetre = ({ onFermer, onChange }: {
    onFermer: () => void;
    onChange: () => void;
}) => {
    const [onglet, setOnglet] = useState<Onglet>('en_attente');
    const [liste, setListe] = useState<Proposition[] | null>(null);
    const [noms, setNoms] = useState<Record<string, string>>({});
    const [journal, setJournal] = useState<{
        enPlace: boolean;
        lignes: LigneJournal[];
    } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [annonce, setAnnonce] = useState<string | null>(null);
    const [enCours, setEnCours] = useState<string | null>(null);
    const [refus, setRefus] = useState<{
        id: string;
        motif: string;
    } | null>(null);
    const charger = useCallback(async () => {
        setErreur(null);
        try {
            if (onglet === 'journal') {
                setJournal((await apiClient.get<{
                    enPlace: boolean;
                    lignes: LigneJournal[];
                }>('/admin/journal')).data);
            }
            else {
                const r = (await apiClient.get<{
                    liste: Proposition[];
                    noms: Record<string, string>;
                }>('/admin/propositions', { params: { statut: onglet } })).data;
                setListe(r.liste);
                setNoms(r.noms);
            }
        }
        catch (e) {
            setListe([]);
            setJournal({ enPlace: true, lignes: [] });
            setErreur(`Lecture impossible : ${message(e)}`);
        }
    }, [onglet]);
    useEffect(() => { void charger(); }, [charger]);
    useEffect(() => {
        const t = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
        window.addEventListener('keydown', t);
        return () => window.removeEventListener('keydown', t);
    }, [onFermer]);
    const decider = async (p: Proposition, accepter: boolean, motif?: string) => {
        setErreur(null);
        setAnnonce(null);
        setEnCours(p.id);
        try {
            const r = (await apiClient.post<{
                individus_crees?: number;
            }>('/admin/decider', { id: p.id, accepter, motif })).data;
            const n = r.individus_crees ?? 0;
            setAnnonce(accepter ? `Proposition acceptée : ${n} fiche${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} à l’arbre du site.` : 'Proposition refusée (gardée pour mémoire).');
            setRefus(null);
            onChange();
            await charger();
        }
        catch (e) {
            setErreur(`${message(e)} — rien n’a été ajouté à l’arbre.`);
        }
        finally {
            setEnCours(null);
        }
    };
    return (<div className="fixed inset-0 z-[60] bg-black/40 grid place-items-start justify-center pt-[6vh] px-4" onMouseDown={onFermer} data-bloc="administration">
            <div className="w-[820px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[88vh]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-trait-leger">
                    <h2 className="font-display text-2xl m-0 flex-1">Administration</h2>
                    <button onClick={onFermer} title="Fermer" className="w-10 h-10 rounded-[10px] grid place-items-center text-encre-2 hover:bg-papier"><X /></button>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pt-3" role="tablist">
                    {ONGLETS.map(([s, t]) => (<button key={s} role="tab" aria-selected={onglet === s} onClick={() => { setOnglet(s); setListe(null); setJournal(null); setAnnonce(null); }} className={`min-h-10 px-4 rounded-[10px] border text-sm ${onglet === s ? 'bg-sepia-tint border-sepia text-encre' : 'bg-blanc border-trait text-encre-2'}`} data-onglet={s}>{t}</button>))}
                </div>
                <div className="px-5 py-3 flex flex-col gap-3 overflow-auto">
                    {annonce && <p className="text-[14px] text-encre m-0" data-message="decision">{annonce}</p>}
                    {erreur && <p className="text-[14px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="administration">{erreur}</p>}
                    {onglet === 'journal' ? (!journal ? <p className="text-encre-3 text-sm m-0">Lecture…</p>
            : !journal.enPlace ? <p className="text-encre-2 text-sm m-0" data-journal="absent">Le journal d’audit n’est pas encore en place dans la base du site : dans Supabase, SQL Editor, collez tout <b>supabase/schema.sql</b> puis Run.</p>
                : journal.lignes.length === 0 ? <p className="text-encre-2 text-sm m-0" data-vide>Aucune action écrite pour l’instant.</p>
                    : <>
                            <p className="text-[12.5px] text-encre-3 m-0">Chaque ajout, modification ou suppression dans la base du site, la plus récente en haut (200 au plus). Ces lignes ne se modifient pas et ne s’effacent pas.</p>
                            <table className="w-full text-[13px] border-collapse" data-journal="lignes">
                                <tbody>
                                    {journal.lignes.map((l, i) => (<tr key={i} className="border-t border-trait-leger align-top">
                                            <td className="py-1.5 pr-3 whitespace-nowrap text-encre-3">{quand(l.le)}</td>
                                            <td className="py-1.5 pr-3 whitespace-nowrap">{ACTEUR[l.acteur] ?? l.acteur}</td>
                                            <td className="py-1.5 pr-3">{l.action} · {TABLES[l.table_visee] ?? l.table_visee}{surQuoi(l) ? <> · <b>{surQuoi(l)}</b></> : null}</td>
                                            <td className="py-1.5 text-encre-2">{l.pourquoi ?? ''}</td>
                                        </tr>))}
                                </tbody>
                            </table>
                        </>) : <>
                        <p className="text-[12.5px] text-encre-3 m-0">Les propositions des visiteurs du site. Rien n’entre dans l’arbre sans votre accord. Accepter verse la proposition dans l’arbre du site en une seule fois, avec les contrôles de cohérence de la base.</p>
                        {!liste ? <p className="text-encre-3 text-sm m-0">Lecture…</p> : liste.length === 0 ? <p className="text-encre-2 text-sm m-0" data-vide>Rien ici pour l’instant.</p> : liste.map((p) => {
                const k = p.contenu;
                const cible = k.lien?.individu_id ? noms[k.lien.individu_id] ?? 'une personne retirée depuis' : null;
                return (<article key={p.id} className="rounded-[12px] border border-trait bg-blanc px-4 py-3 flex flex-col gap-1.5 text-[13.5px]" data-proposition={p.id}>
                                    <div className="flex flex-wrap justify-between gap-2">
                                        <b className="font-display text-xl">{k.famille ? `Famille ${k.famille}` : nomDe(k.contributeur)}</b>
                                        <span className="text-xs text-encre-3">{quand(p.cree_le)}</span>
                                    </div>
                                    <div><b>{nomDe(k.contributeur)}</b>{k.contributeur.naissance_annee ? ` (né·e en ${k.contributeur.naissance_annee})` : ''} — {RELATION[k.lien?.relation] ?? k.lien?.relation}{cible ? <> <b>{cible}</b></> : ''}</div>
                                    {k.lien?.texte && <div className="text-encre-2">« {k.lien.texte} »</div>}
                                    {!!k.proches?.length && (<div className="text-encre-2">Proches : {k.proches.map((x) => `${nomDe(x)}${x.naissance_annee ? ` (${x.naissance_annee})` : ''}, ${PROCHE[x.relation ?? ''] ?? x.relation}${x.vivant === false ? ', décédé(e)' : ''}`).join(' ; ')}</div>)}
                                    {k.message && <div className="text-encre-2 whitespace-pre-line">{k.message}</div>}
                                    <div className="text-xs text-encre-2">Inscrit : <b>{k.inscrit ? `${k.inscrit.prenom} ${k.inscrit.nom}` : '—'}</b>{p.contact ? ` · ${p.contact}` : ''}{k.inscrit?.charte ? ` · charte du ${k.inscrit.charte}` : ''}</div>
                                    {p.motif && <div className="text-xs text-encre-3">Motif du refus : {p.motif}</div>}
                                    {p.statut === 'en_attente' && (refus?.id === p.id ? (<div className="flex flex-col gap-2 mt-1">
                                            <label className="flex flex-col gap-1 text-[13px] text-encre-2">Motif du refus (facultatif, gardé pour mémoire)
                                                <input className="h-10 px-3 rounded-[10px] bg-blanc border border-trait text-encre outline-none focus:border-sepia" value={refus.motif} maxLength={500} autoFocus onChange={(e) => setRefus({ id: p.id, motif: e.target.value })} data-champ="motif"/>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <button disabled={enCours === p.id} onClick={() => void decider(p, false, refus.motif)} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm" style={{ color: 'var(--o-afrique)' }} data-bouton="confirmer-refus">Confirmer le refus</button>
                                                <button onClick={() => setRefus(null)} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm text-encre-2">Annuler</button>
                                            </div>
                                        </div>) : (<div className="flex flex-wrap gap-2 mt-1">
                                            <button disabled={enCours === p.id} onClick={() => void decider(p, true)} className="min-h-10 px-4 rounded-[10px] border border-sepia bg-sepia text-blanc text-sm font-medium disabled:opacity-60" data-bouton="accepter">{enCours === p.id ? 'Ajout…' : 'Accepter et ajouter à l’arbre'}</button>
                                            <button disabled={enCours === p.id} onClick={() => setRefus({ id: p.id, motif: '' })} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm text-encre-2" data-bouton="refuser">Refuser</button>
                                        </div>))}
                                </article>);
            })}
                    </>}
                </div>
            </div>
        </div>);
};
if (typeof window !== 'undefined' && /^(127\.0\.0\.1|localhost|\[::1\])$/.test(window.location.hostname)) {
    const portes = usePortesDuSite.getState().portes;
    if (!portes.includes(BoutonAdministration))
        usePortesDuSite.setState({ portes: [...portes, BoutonAdministration] });
}
