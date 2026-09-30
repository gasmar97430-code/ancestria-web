// ---- MES ARBRES (gestion multi-arbres) ----
// Grand public : ses arbres de famille. Pro / collectivités : plusieurs arbres
// (communes, fonds d'archives…) avec leurs chiffres d'un coup d'œil et ce qui
// attend (propositions à modérer).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { creerArbre, supprimerArbre } from '../donnees/actions';
import { messageErreur } from '../domaine/erreurs';
import { nombre } from '../domaine/libelles';
import { Alerte, Bouton, Champ, Chargement, EnTetePage, Fenetre } from '../ui/ui';
import { ChoixPalette } from '../arbre-bureau/ChoixPalette';
import type { Role } from '../domaine/types';

interface ArbreChiffre {
    id: string;
    nom: string;
    role: Role;
    territoire: string | null;
    public_patrimoine: boolean;
    slug: string | null;
    cree_le: string;
    individus: number;
    propositions_en_attente: number | null;
    partages_ouverts: number | null;
    documents: number;
}

const ROLE: Record<Role, string> = { proprietaire: 'Propriétaire', editeur: 'Éditeur·rice', lecteur: 'Lecteur·rice' };

export function MesArbres() {
    const { session } = useSession();
    const naviguer = useNavigate();
    const [arbres, setArbres] = useState<ArbreChiffre[] | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [creation, setCreation] = useState(false);
    const [nom, setNom] = useState('');
    const [envoi, setEnvoi] = useState(false);

    const charger = useCallback(async () => {
        const { data, error } = await supabase.rpc('mes_arbres');
        if (error) setErreur(messageErreur(error));
        // les comptes arrivent en texte (bigint) : on les remet en nombres
        else setArbres(((data ?? []) as ArbreChiffre[]).map((a) => ({
            ...a, individus: Number(a.individus), documents: Number(a.documents),
            propositions_en_attente: a.propositions_en_attente === null ? null : Number(a.propositions_en_attente),
            partages_ouverts: a.partages_ouverts === null ? null : Number(a.partages_ouverts),
        })));
    }, []);
    useEffect(() => {
        void charger();
    }, [charger]);

    const creer = async () => {
        setErreur(null);
        if (!nom.trim()) {
            setErreur('Donnez un nom à l’arbre (ex. « Famille Martin »).');
            return;
        }
        setEnvoi(true);
        try {
            const id = await creerArbre(nom.slice(0, 120));
            naviguer(`/arbres/${id}`);
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    const total = (arbres ?? []).reduce((t, a) => ({
        individus: t.individus + a.individus,
        attente: t.attente + (a.propositions_en_attente ?? 0),
        documents: t.documents + a.documents,
    }), { individus: 0, attente: 0, documents: 0 });

    return (
        <main className="max-w-4xl mx-auto p-5 sm:p-8">
            <EnTetePage titre="Mes arbres" sousTitre={session?.user.email}
                actions={<>
                    <Bouton variante="principal" onClick={() => setCreation(true)}>+ Nouvel arbre</Bouton>
                    <Link to="/offres"><Bouton variante="discret">Offres</Bouton></Link>
                    <Bouton variante="discret" onClick={() => void supabase.auth.signOut()}>Se déconnecter</Bouton>
                    <div className="w-[230px]"><ChoixPalette compact /></div>
                </>} />
            {erreur && !creation && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
            {!arbres ? <Chargement /> : arbres.length === 0 ? (
                <p className="text-encre-2">Vous n’avez encore aucun arbre. Créez le premier.</p>
            ) : (
                <>
                    {arbres.length > 1 && (
                        <div className="mb-4 rounded-2xl border border-trait bg-carte px-4 py-3 text-sm text-encre-2 flex flex-wrap gap-x-6 gap-y-1">
                            <span>{nombre(arbres.length, 'arbre', 'arbres')}</span>
                            <span>{nombre(total.individus, 'personne', 'personnes')}</span>
                            <span>{nombre(total.documents, 'document d’archives', 'documents d’archives')}</span>
                            {total.attente > 0 && <span className="text-sepia">{nombre(total.attente, 'proposition à modérer', 'propositions à modérer')}</span>}
                        </div>
                    )}
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {arbres.map((a) => (
                            <li key={a.id} className="rounded-2xl border border-trait bg-carte p-4 flex flex-col gap-2">
                                <Link to={`/arbres/${a.id}`} className="font-display text-2xl hover:text-sepia break-words">{a.nom}</Link>
                                <div className="text-xs text-encre-3">
                                    {ROLE[a.role]}{a.territoire ? ` · ${a.territoire}` : ''} · créé le {new Date(a.cree_le).toLocaleDateString('fr-FR')}
                                </div>
                                <div className="text-sm text-encre-2 flex flex-wrap gap-x-4">
                                    <span>{nombre(a.individus, 'personne', 'personnes')}</span>
                                    <span>{nombre(a.documents, 'document', 'documents')}</span>
                                    {a.partages_ouverts !== null && <span>{nombre(a.partages_ouverts, 'partage ouvert', 'partages ouverts')}</span>}
                                    {a.public_patrimoine && a.slug && <Link to={`/patrimoine/${a.slug}`} className="text-vert inline-flex items-center min-h-9">espace public en ligne</Link>}
                                </div>
                                {(a.propositions_en_attente ?? 0) > 0 && (
                                    <Link to={`/arbres/${a.id}/propositions`} className="self-start text-sm text-sepia underline underline-offset-4 min-h-9 flex items-center">
                                        {nombre(a.propositions_en_attente!, 'proposition à modérer', 'propositions à modérer')}
                                    </Link>
                                )}
                                {a.role === 'proprietaire' && (
                                    <button type="button" className="self-start text-xs text-encre-3 hover:text-rouge min-h-9"
                                        onClick={() => {
                                            const tape = window.prompt(`Supprimer DÉFINITIVEMENT l’arbre « ${a.nom} » et tout son contenu ?\nTapez son nom exact pour confirmer :`);
                                            if (tape === a.nom) void supprimerArbre(a.id).then(charger).catch((e) => setErreur(e instanceof Error ? e.message : String(e)));
                                            else if (tape !== null) setErreur('Nom différent : rien n’a été supprimé.');
                                        }}>
                                        Supprimer cet arbre…
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {creation && (
                <Fenetre titre="Nouvel arbre" onFermer={() => setCreation(false)}>
                    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void creer(); }} noValidate>
                        <Champ libelle="Nom de l’arbre" valeur={nom} onChange={setNom} max={120} placeholder="Famille Martin" autoFocus erreur={erreur ?? undefined} />
                        <Bouton variante="principal" type="submit" enCours={envoi}>Créer</Bouton>
                    </form>
                </Fenetre>
            )}
        </main>
    );
}

// ---- FIN MES ARBRES ----
