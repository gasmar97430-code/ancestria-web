// ---- LES INSCRITS DE LA PORTE (pour lui seul) ----
//
// Ordre de mission du 01/10 (point 4 : « un panneau de contrôle visuel centralise toutes les
// requêtes ») et loi 2 (zéro anonymat) : chaque personne inscrite à la porte du site
// (porte-inscription/, table inscriptions_acces) est listée ici — nom, prénom, e-mail ou
// téléphone, date, version de la Charte acceptée. La base ne laisse lire cette table qu'au
// propriétaire de l'arbre (règle « lecture par lui ») : un visiteur ne la voit jamais.
// Posé par une ligne dans l'en-tête du panneau Propositions.tsx (panneau validé, non modifié).

import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { supabase } from '../prise/supabase';

interface Inscrit { nom: string; prenom: string; contact: string; charte: string; cree_le: string }

const quand = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export const BoutonInscrits = () => {
    const [ouvert, setOuvert] = useState(false);
    const [liste, setListe] = useState<Inscrit[] | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    useEffect(() => {
        if (!ouvert) return;
        setListe(null);
        setErreur(null);
        void (async () => {
            const { data, error } = await supabase.from('inscriptions_acces').select('nom, prenom, contact, charte, cree_le')
                .order('cree_le', { ascending: false }).range(0, 999);
            if (error) setErreur('La liste n’a pas pu être lue : ' + error.message);
            else setListe((data ?? []) as Inscrit[]);
        })();
    }, [ouvert]);
    return (
        <>
            <button onClick={() => setOuvert(true)} className="min-h-10 px-4 rounded-[10px] border border-trait bg-blanc text-sm text-encre-2 hover:bg-sepia-tint" data-bouton="inscrits">
                Inscrits
            </button>
            {ouvert && (
                <div className="fixed inset-0 z-[70] bg-black/40 grid place-items-start justify-center pt-[8vh] px-4" onMouseDown={() => setOuvert(false)} data-bloc="inscrits">
                    <div className="w-[760px] max-w-full bg-carte border border-trait rounded-2xl shadow-carte flex flex-col max-h-[84vh]" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-trait-leger">
                            <h2 className="font-display text-2xl m-0 flex-1">Inscrits à la porte du site{liste ? ` (${liste.length})` : ''}</h2>
                            <button onClick={() => setOuvert(false)} title="Fermer" className="w-10 h-10 rounded-[10px] grid place-items-center text-encre-2 hover:bg-papier"><X /></button>
                        </div>
                        <div className="px-5 py-3 flex flex-col gap-2 overflow-auto">
                            <p className="text-[12.5px] text-encre-3 m-0">Ces informations ne sont vues que par vous. Une correction ou un effacement se demande à l’administrateur (avis « Vos données »).</p>
                            {erreur && <p className="text-[14px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                            {!erreur && (!liste ? <p className="text-encre-3 text-sm m-0">Lecture…</p> : liste.length === 0 ? <p className="text-encre-2 text-sm m-0" data-vide>Personne ne s’est encore inscrit.</p> : (
                                <table className="w-full text-[13.5px] border-collapse" data-liste="inscrits">
                                    <thead>
                                        <tr className="text-left text-xs text-encre-3 uppercase tracking-[.08em]">
                                            <th className="py-1.5 pr-3 font-medium">Nom</th><th className="py-1.5 pr-3 font-medium">Prénom</th><th className="py-1.5 pr-3 font-medium">E-mail ou téléphone</th><th className="py-1.5 pr-3 font-medium">Inscrit le</th><th className="py-1.5 font-medium">Charte</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {liste.map((i, n) => (
                                            <tr key={n} className="border-t border-trait-leger" data-inscrit>
                                                <td className="py-1.5 pr-3">{i.nom}</td><td className="py-1.5 pr-3">{i.prenom}</td><td className="py-1.5 pr-3">{i.contact}</td><td className="py-1.5 pr-3 whitespace-nowrap">{quand(i.cree_le)}</td><td className="py-1.5 text-encre-3">{i.charte}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ---- FIN LES INSCRITS DE LA PORTE ----
