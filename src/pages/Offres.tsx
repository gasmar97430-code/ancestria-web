import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { OFFRES } from '../offres/offres';
import { allerAuPaiement, paiementActif } from '../offres/stripe';
import type { Offre } from '../domaine/types';
import { LienRetour, Alerte, Bouton, EnTetePage } from '../ui/ui';

export function Offres() {
    const { session } = useSession();
    const [actuelle, setActuelle] = useState<Offre>('gratuit');
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);

    useEffect(() => {
        if (!session) return;
        // sa propre ligne seulement (sécurité par ligne) ; même règle que public.offre_de
        void supabase.from('abonnements').select('offre, statut, fin_periode').maybeSingle().then(({ data }) => {
            const a = data as { offre: Offre; statut: string; fin_periode: string | null } | null;
            const valide = a && (a.statut === 'actif' || a.statut === 'en_retard') && (!a.fin_periode || new Date(a.fin_periode) > new Date());
            setActuelle(valide ? a.offre : 'gratuit');
        });
    }, [session]);

    const payer = async () => {
        setErreur(null);
        setEnvoi(true);
        try {
            await allerAuPaiement('famille');
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
            setEnvoi(false);
        }
    };

    return (
        <main className="max-w-5xl mx-auto p-5 sm:p-8">
            <EnTetePage titre="Offres" sousTitre={<LienRetour vers="/">mes arbres</LienRetour>} />
            {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
            <ul className="grid gap-4 md:grid-cols-3">
                {OFFRES.map((o) => (
                    <li key={o.id} className={`rounded-3xl border p-5 flex flex-col gap-3 bg-carte ${o.id === actuelle ? 'border-sepia' : 'border-trait'}`}>
                        <div className="text-xs uppercase tracking-wider text-encre-3">{o.pour}</div>
                        <h2 className="font-display text-3xl">{o.nom}</h2>
                        <div className="text-sepia">{o.prix}</div>
                        <ul className="text-sm text-encre-2 flex flex-col gap-1.5 flex-1">{o.points.map((p) => <li key={p}>✓ {p}</li>)}</ul>
                        {o.id === actuelle ? <div className="text-sm text-sepia">Votre offre actuelle</div>
                            : o.id === 'famille' ? (paiementActif()
                                ? <Bouton variante="principal" enCours={envoi} onClick={() => void payer()}>Passer à l’offre Famille</Bouton>
                                : <div className="text-sm text-encre-3">Bientôt disponible.</div>)
                            : o.id === 'institution' ? <div className="text-sm text-encre-3">Licence sur devis : contactez l’équipe Ancestria.</div> : null}
                    </li>
                ))}
            </ul>
        </main>
    );
}
