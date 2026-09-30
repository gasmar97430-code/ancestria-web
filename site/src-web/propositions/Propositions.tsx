// ---- PROPOSITIONS DES VISITEURS (lui seul, connecté) ----
//
// Ses textes du 30/09/2026 : les visiteurs proposent (« Ajouter cette famille ») « pour que rien
// n'entre dans l'arbre sans ton accord direct ». Ici il voit chaque proposition en clair (qui,
// inscrit avec quel contact, la famille, les proches, ce qu'il sait) et décide :
//   - « Accepter et ajouter à l'arbre » : accepter_contribution (la base verse tout en une seule
//     transaction, avec ses contrôles de cohérence ; rien de partiel) ;
//   - « Refuser » : refuser_contribution, motif facultatif gardé pour mémoire.
// Même porte que « Incohérences » au PC (barre de gauche, nombre à traiter, fenêtre).
// Fonctions de la base existantes (supabase/schema.sql) : aucune table ni fonction nouvelle.
// Porte posée dans l'emplacement vide du PC (src/lib/portesDuSite.tsx) pour le propriétaire
// seulement : ligne d'appel dans Porte.tsx. Un visiteur ne la voit jamais.

import { useCallback, useEffect, useState } from 'react';
import { Tray, X } from '@phosphor-icons/react';
import { supabase } from '../prise/supabase';
import { arbreCourant } from '../prise/donnees';
import { usePortesDuSite } from '../../src/lib/portesDuSite';
import { useTreeStore } from '../../src/store/useTreeStore';
import { jetonVisiteur } from '../visiteur/visiteur';

type Statut = 'en_attente' | 'acceptee' | 'refusee';

interface PersonneProposee { prenom: string; nom?: string; naissance_annee?: string | null; vivant?: boolean; relation?: string }
interface Proposition {
    id: string;
    contenu: {
        famille?: string;
        contributeur: PersonneProposee;
        lien: { relation: string; individu_id: string | null; texte?: string };
        proches?: PersonneProposee[];
        message?: string;
        inscrit?: { nom: string; prenom: string; charte?: string };
    };
    contact: string | null;
    statut: Statut;
    motif: string | null;
    cree_le: string;
}

const RELATION: Record<string, string> = {
    enfant: 'se dit enfant de',
    petit_enfant: 'se dit petit-enfant de',
    parent: 'se dit parent de',
    conjoint: 'se dit conjoint de',
    frere_soeur: 'se dit frère ou sœur de',
    inconnu: 'sans lien avec une fiche de l’arbre',
};
const PROCHE: Record<string, string> = { parent: 'père / mère', enfant: 'enfant', conjoint: 'conjoint' };
const ONGLETS: [Statut, string][] = [['en_attente', 'À traiter'], ['acceptee', 'Acceptées'], ['refusee', 'Refusées']];

const nomDe = (p: PersonneProposee) => `${p.prenom}${p.nom ? ` ${p.nom}` : ''}`;
const quand = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

async function lire(statut: Statut): Promise<Proposition[]> {
    const id = await arbreCourant();
    const { data, error } = await supabase.from('contributions')
        .select('id, contenu, contact, statut, motif, cree_le')
        .eq('arbre_id', id).eq('statut', statut).order('cree_le', { ascending: statut === 'en_attente' }).range(0, 199);
    if (error) throw new Error(error.message);
    return (data ?? []) as Proposition[];
}

/** Nombre de propositions à traiter, relu à l'ouverture et après chaque décision. */
function useATraiter(v: number) {
    const [n, setN] = useState<number | null>(null);
    useEffect(() => {
        let vivant = true;
        lire('en_attente').then((l) => vivant && setN(l.length)).catch(() => vivant && setN(null));
        return () => { vivant = false; };
    }, [v]);
    return n;
}

export const BoutonPropositions = ({ rail }: { rail: boolean }) => {
    const [ouverte, setOuverte] = useState(false);
    const [v, setV] = useState(0);
    const n = useATraiter(v);
    return (
        <>
            {rail ? (
                <button onClick={() => setOuverte(true)} title={`Propositions des visiteurs${n !== null ? ` (${n} à traiter)` : ''}`} className="relative w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="propositions">
                    <Tray />
                    {n ? <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-blanc font-medium bg-sepia">{n}</span> : null}
                </button>
            ) : (
                <button onClick={() => setOuverte(true)} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="propositions">
                    <Tray size={18} />
                    <span className="flex-1">Propositions</span>
                    {n !== null && <span className={`text-[12px] font-medium ${n ? 'text-sepia-deep' : 'text-encre-3'}`}>{n}</span>}
                </button>
            )}
            {ouverte && <Fenetre onFermer={() => setOuverte(false)} onChange={() => setV((x) => x + 1)} />}
        </>
    );
};

const Fenetre = ({ onFermer, onChange }: { onFermer: () => void; onChange: () => void }) => {
    const [onglet, setOnglet] = useState<Statut>('en_attente');
    const [liste, setListe] = useState<Proposition[] | null>(null);
    const [noms, setNoms] = useState<Map<string, string>>(new Map());
    const [erreur, setErreur] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [enCours, setEnCours] = useState<string | null>(null);
    const [refus, setRefus] = useState<{ id: string; motif: string } | null>(null);

    const charger = useCallback(async () => {
        setErreur(null);
        try {
            const l = await lire(onglet);
            setListe(l);
            const cibles = [...new Set(l.map((p) => p.contenu.lien?.individu_id).filter((x): x is string => !!x))];
            if (cibles.length) {
                const { data } = await supabase.from('individus').select('id, prenom, nom').eq('arbre_id', await arbreCourant()).range(0, 9999);
                setNoms(new Map(((data ?? []) as { id: string; prenom: string; nom: string }[]).map((i) => [i.id, `${i.prenom} ${i.nom}`.trim()])));
            }
        } catch (e) {
            setListe([]);
            setErreur(`Lecture impossible : ${e instanceof Error ? e.message : String(e)}`);
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
        setMessage(null);
        setEnCours(p.id);
        try {
            if (accepter) {
                const { data, error } = await supabase.rpc('accepter_contribution', { p_contribution: p.id });
                if (error) throw new Error(error.message);
                const n = (data as { individus_crees?: number } | null)?.individus_crees ?? 0;
                setMessage(`Proposition acceptée : ${n} fiche${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} à l’arbre.`);
                void useTreeStore.getState().fetchTree(); // l'arbre montre aussitôt les nouvelles fiches
            } else {
                const { error } = await supabase.rpc('refuser_contribution', { p_contribution: p.id, p_motif: motif?.trim() || null });
                if (error) throw new Error(error.message);
                setMessage('Proposition refusée (gardée pour mémoire).');
            }
            setRefus(null);
            onChange();
            await charger();
        } catch (e) {
            setErreur(`${e instanceof Error ? e.message : String(e)} — rien n’a été ajouté à l’arbre.`);
        } finally {
            setEnCours(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-start justify-center pt-[6vh] px-4" onMouseDown={onFermer} data-bloc="propositions">
            <div className="w-[820px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[88vh]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-trait-leger">
                    <h2 className="font-display text-2xl m-0 flex-1">Propositions des visiteurs</h2>
                    <button onClick={onFermer} title="Fermer" className="w-10 h-10 rounded-[10px] grid place-items-center text-encre-2 hover:bg-papier"><X /></button>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pt-3" role="tablist">
                    {ONGLETS.map(([s, t]) => (
                        <button key={s} role="tab" aria-selected={onglet === s} onClick={() => { setOnglet(s); setListe(null); setMessage(null); }}
                            className={`min-h-10 px-4 rounded-[10px] border text-sm ${onglet === s ? 'bg-sepia-tint border-sepia text-encre' : 'bg-blanc border-trait text-encre-2'}`} data-onglet={s}>{t}</button>
                    ))}
                </div>
                <div className="px-5 py-3 flex flex-col gap-3 overflow-auto">
                    <p className="text-[12.5px] text-encre-3 m-0">Rien n’entre dans l’arbre sans votre accord. Accepter verse la proposition en une seule fois, avec les contrôles de cohérence de la base.</p>
                    {message && <p className="text-[14px] text-encre m-0" data-message="decision">{message}</p>}
                    {erreur && <p className="text-[14px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="propositions">{erreur}</p>}
                    {!liste ? <p className="text-encre-3 text-sm m-0">Lecture…</p> : liste.length === 0 ? <p className="text-encre-2 text-sm m-0" data-vide>Rien ici pour l’instant.</p> : liste.map((p) => {
                        const k = p.contenu;
                        const cible = k.lien?.individu_id ? noms.get(k.lien.individu_id) ?? 'une personne retirée depuis' : null;
                        return (
                            <article key={p.id} className="rounded-[12px] border border-trait bg-blanc px-4 py-3 flex flex-col gap-1.5 text-[13.5px]" data-proposition={p.id}>
                                <div className="flex flex-wrap justify-between gap-2">
                                    <b className="font-display text-xl">{k.famille ? `Famille ${k.famille}` : nomDe(k.contributeur)}</b>
                                    <span className="text-xs text-encre-3">{quand(p.cree_le)}</span>
                                </div>
                                <div><b>{nomDe(k.contributeur)}</b>{k.contributeur.naissance_annee ? ` (né·e en ${k.contributeur.naissance_annee})` : ''} — {RELATION[k.lien?.relation] ?? k.lien?.relation}{cible ? <> <b>{cible}</b></> : ''}</div>
                                {k.lien?.texte && <div className="text-encre-2">« {k.lien.texte} »</div>}
                                {!!k.proches?.length && (
                                    <div className="text-encre-2">Proches : {k.proches.map((x) => `${nomDe(x)}${x.naissance_annee ? ` (${x.naissance_annee})` : ''}, ${PROCHE[x.relation ?? ''] ?? x.relation}${x.vivant === false ? ', décédé(e)' : ''}`).join(' ; ')}</div>
                                )}
                                {k.message && <div className="text-encre-2 whitespace-pre-line">{k.message}</div>}
                                <div className="text-xs text-encre-2">Inscrit : <b>{k.inscrit ? `${k.inscrit.prenom} ${k.inscrit.nom}` : '—'}</b>{p.contact ? ` · ${p.contact}` : ''}{k.inscrit?.charte ? ` · charte du ${k.inscrit.charte}` : ''}</div>
                                {p.motif && <div className="text-xs text-encre-3">Motif du refus : {p.motif}</div>}
                                {p.statut === 'en_attente' && (refus?.id === p.id ? (
                                    <div className="flex flex-col gap-2 mt-1">
                                        <label className="flex flex-col gap-1 text-[13px] text-encre-2">Motif du refus (facultatif, gardé pour mémoire)
                                            <input className="h-10 px-3 rounded-[10px] bg-blanc border border-trait text-encre outline-none focus:border-sepia" value={refus.motif} maxLength={500} autoFocus onChange={(e) => setRefus({ id: p.id, motif: e.target.value })} data-champ="motif" />
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button disabled={enCours === p.id} onClick={() => void decider(p, false, refus.motif)} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm" style={{ color: 'var(--o-afrique)' }} data-bouton="confirmer-refus">Confirmer le refus</button>
                                            <button onClick={() => setRefus(null)} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm text-encre-2">Annuler</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <button disabled={enCours === p.id} onClick={() => void decider(p, true)} className="min-h-10 px-4 rounded-[10px] border border-sepia bg-sepia text-blanc text-sm font-medium disabled:opacity-60" data-bouton="accepter">{enCours === p.id ? 'Ajout…' : 'Accepter et ajouter à l’arbre'}</button>
                                        <button disabled={enCours === p.id} onClick={() => setRefus({ id: p.id, motif: '' })} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm text-encre-2" data-bouton="refuser">Refuser</button>
                                    </div>
                                ))}
                            </article>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/** À l'arrivée du propriétaire connecté : sa porte « Propositions » dans la barre de gauche. */
export function entrerEnProprietaire(): void {
    if (jetonVisiteur()) return; // jamais pour un visiteur
    if (!usePortesDuSite.getState().portes.includes(BoutonPropositions)) usePortesDuSite.setState({ portes: [BoutonPropositions] });
}

// ---- FIN PROPOSITIONS DES VISITEURS ----
