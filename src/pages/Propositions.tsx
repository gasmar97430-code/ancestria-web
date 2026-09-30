// ---- MODÉRATION DES PROPOSITIONS ----
// Chaque proposition du public est montrée en clair (qui, relié à qui,
// comment, ses proches) ; « Accepter » la verse dans l'arbre en une seule
// transaction (règles de cohérence comprises), « Refuser » garde une trace.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ecrire, toutLire } from '../donnees/arbre';
import { messageErreur } from '../domaine/erreurs';
import { RELATION_DECLAREE, nomAffiche } from '../domaine/libelles';
import type { Contribution, Individu } from '../domaine/types';
import { LienRetour, Alerte, Bouton, Chargement, EnTetePage } from '../ui/ui';

const RELATION_PROCHE = { parent: 'parent', enfant: 'enfant', conjoint: 'conjoint·e' } as const;

export function Propositions() {
    const { id = '' } = useParams();
    const [filtre, setFiltre] = useState<'en_attente' | 'acceptee' | 'refusee'>('en_attente');
    const [liste, setListe] = useState<Contribution[] | null>(null);
    const [noms, setNoms] = useState<Map<string, string>>(new Map());
    const [erreur, setErreur] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [enCours, setEnCours] = useState<string | null>(null);

    const charger = useCallback(async () => {
        const { data, error } = await supabase.from('contributions')
            .select('id, arbre_id, invitation_id, contenu, contact, statut, motif, cree_le, traitee_le')
            .eq('arbre_id', id).eq('statut', filtre).order('cree_le', { ascending: filtre === 'en_attente' }).limit(200);
        if (error) setErreur(messageErreur(error));
        setListe((data ?? []) as Contribution[]);
        const individus = await toutLire<Pick<Individu, 'id' | 'prenom' | 'nom'>>('individus', id, 'id, prenom, nom');
        setNoms(new Map(individus.map((i) => [i.id, nomAffiche(i)])));
    }, [id, filtre]);
    useEffect(() => {
        void charger();
    }, [charger]);

    // Temps réel : une nouvelle proposition apparaît sans recharger.
    useEffect(() => {
        const canal = supabase.channel(`propositions:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `arbre_id=eq.${id}` }, () => void charger())
            .subscribe();
        return () => {
            void supabase.removeChannel(canal);
        };
    }, [id, charger]);

    const traiter = async (c: Contribution, accepter: boolean) => {
        setErreur(null);
        setMessage(null);
        let motif: string | null = null;
        if (!accepter) {
            motif = window.prompt('Motif du refus (facultatif, gardé pour mémoire) :', '');
            if (motif === null) return;
        }
        setEnCours(c.id);
        try {
            if (accepter) {
                const r = (await ecrire(supabase.rpc('accepter_contribution', { p_contribution: c.id }))) as { individus_crees: number };
                setMessage(`Proposition acceptée : ${r.individus_crees} fiche(s) ajoutée(s) à l’arbre.`);
            } else {
                await ecrire(supabase.rpc('refuser_contribution', { p_contribution: c.id, p_motif: motif }));
                setMessage('Proposition refusée.');
            }
            await charger();
        } catch (e) {
            setErreur(`${e instanceof Error ? e.message : String(e)} — rien n’a été ajouté à l’arbre.`);
        } finally {
            setEnCours(null);
        }
    };

    return (
        <main className="max-w-3xl mx-auto p-5 sm:p-8">
            <EnTetePage titre="Propositions" sousTitre={<LienRetour vers={`/arbres/${id}`}>retour à l’arbre</LienRetour>} />
            <div className="flex gap-2 mb-4" role="tablist">
                {(['en_attente', 'acceptee', 'refusee'] as const).map((f) => (
                    <button key={f} type="button" role="tab" aria-selected={filtre === f} onClick={() => setFiltre(f)}
                        className={`min-h-11 px-4 rounded-xl border text-sm ${filtre === f ? 'border-sepia text-sepia' : 'border-trait text-encre-2'}`}>
                        {f === 'en_attente' ? 'À traiter' : f === 'acceptee' ? 'Acceptées' : 'Refusées'}
                    </button>
                ))}
            </div>
            {message && <div className="mb-3"><Alerte genre="succes">{message}</Alerte></div>}
            {erreur && <div className="mb-3"><Alerte>{erreur}</Alerte></div>}
            {!liste ? <Chargement /> : liste.length === 0 ? <p className="text-encre-2">Rien ici pour l’instant.</p> : (
                <ul className="flex flex-col gap-3">
                    {liste.map((c) => {
                        const k = c.contenu;
                        const cible = k.lien.individu_id ? noms.get(k.lien.individu_id) ?? 'une personne retirée depuis' : null;
                        return (
                            <li key={c.id} className="rounded-2xl border border-trait bg-carte p-4 flex flex-col gap-2">
                                <div className="flex flex-wrap justify-between gap-2">
                                    <b className="text-lg">{nomAffiche(k.contributeur)}{k.contributeur.naissance_annee ? ` (né·e en ${k.contributeur.naissance_annee})` : ''}</b>
                                    <span className="text-xs text-encre-3">{new Date(c.cree_le).toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="text-sm">{RELATION_DECLAREE[k.lien.relation]}{cible ? <> <b>{cible}</b></> : ''}</div>
                                {k.lien.texte && <div className="text-sm text-encre-2">« {k.lien.texte} »</div>}
                                {k.proches?.length > 0 && (
                                    <div className="text-sm text-encre-2">Proches : {k.proches.map((p) => `${nomAffiche(p)} (${RELATION_PROCHE[p.relation]})`).join(', ')}</div>
                                )}
                                {k.message && <div className="text-sm text-encre-2 whitespace-pre-line">{k.message}</div>}
                                {k.inscrit && <div className="text-xs text-encre-2">Inscrit : <b>{k.inscrit.prenom} {k.inscrit.nom}</b></div>}{/* règle du 30/09 : qui a fait l'envoi */}
                                {c.contact && <div className="text-xs text-encre-3">Contact : {c.contact}</div>}
                                {c.motif && <div className="text-xs text-encre-3">Motif du refus : {c.motif}</div>}
                                {c.statut === 'en_attente' && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <Bouton variante="principal" enCours={enCours === c.id} onClick={() => void traiter(c, true)}>Accepter et ajouter à l’arbre</Bouton>
                                        <Bouton variante="danger" disabled={enCours === c.id} onClick={() => void traiter(c, false)}>Refuser</Bouton>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}

// ---- FIN MODÉRATION DES PROPOSITIONS ----
