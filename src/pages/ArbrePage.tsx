// ---- PAGE DE L'ARBRE ----
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chargerArbre, ErreurDonnees } from '../donnees/arbre';
import { useTempsReel } from '../donnees/tempsReel';
import { ajouterIndividu } from '../donnees/actions';
import { VueArbreBureau } from '../arbre-bureau/VueArbreBureau';
import { ChoixPalette } from '../arbre-bureau/ChoixPalette';
import { Signature } from '../arbre-bureau/Signature';
import { FicheIndividu } from '../composants/FicheIndividu';
import { FormulaireIndividu } from '../composants/FormulaireIndividu';
import { BoutonImportGedcom } from '../import-gedcom/ImportGedcom';
import { Alerte, Bouton, Chargement, Fenetre } from '../ui/ui';
import { nomAffiche } from '../domaine/libelles';
import type { Arbre, DonneesArbre, Id, Role } from '../domaine/types';

const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ArbrePage() {
    const { id = '' } = useParams();
    const [arbre, setArbre] = useState<Arbre | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [donnees, setDonnees] = useState<DonneesArbre | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [introuvable, setIntrouvable] = useState(false);
    const [choisi, setChoisi] = useState<Id | null>(null);
    const [ajout, setAjout] = useState(false);
    const [recherche, setRecherche] = useState('');
    const [propositions, setPropositions] = useState(0);
    const sequence = useRef(0);

    const recharger = useCallback(async () => {
        const n = ++sequence.current;
        try {
            const d = await chargerArbre(id);
            if (n === sequence.current) {
                setDonnees(d);
                setErreur(null);
            }
        } catch (e) {
            if (n === sequence.current) setErreur(e instanceof ErreurDonnees ? e.message : String(e));
        }
    }, [id]);

    useEffect(() => {
        let vivant = true;
        setArbre(null);
        setDonnees(null);
        setChoisi(null);
        (async () => {
            const [a, r] = await Promise.all([
                supabase.from('arbres').select('id, nom, proprietaire, slug, public_patrimoine, territoire, description, centre_lat, centre_lng, cree_le').eq('id', id).maybeSingle(),
                supabase.rpc('role_dans', { p_arbre: id }),
            ]);
            if (!vivant) return;
            if (a.error || !a.data || !r.data) {
                setIntrouvable(true);
                return;
            }
            setArbre(a.data as Arbre);
            setRole(r.data as Role);
            await recharger();
        })().catch((e) => vivant && setErreur(String(e)));
        return () => {
            vivant = false;
        };
    }, [id, recharger]);

    const peutEcrire = role === 'proprietaire' || role === 'editeur';

    // Nombre de propositions en attente (éditeurs seulement).
    useEffect(() => {
        if (!peutEcrire) return;
        void supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('arbre_id', id).eq('statut', 'en_attente')
            .then(({ count }) => setPropositions(count ?? 0));
    }, [id, peutEcrire, donnees]);

    const idsConnus = useCallback(() => {
        const s = new Set<string>();
        if (donnees) {
            for (const x of donnees.individus) s.add(x.id);
            for (const x of donnees.unions) s.add(x.id);
            for (const x of donnees.filiations) s.add(x.id);
            for (const x of donnees.foyers) s.add(x.id);
        }
        return s;
    }, [donnees]);
    const direct = useTempsReel(arbre ? id : undefined, () => void recharger(), idsConnus);

    const choisiIndividu = donnees?.individus.find((i) => i.id === choisi) ?? null;
    useEffect(() => {
        // la personne choisie a été supprimée (ici ou par un autre membre) : on ferme sa fiche
        if (choisi && donnees && !choisiIndividu) setChoisi(null);
    }, [choisi, donnees, choisiIndividu]);

    const trouves = useMemo(() => {
        const q = plat(recherche.trim());
        if (!donnees || q.length < 2) return [];
        return donnees.individus.filter((i) => plat(`${i.prenom} ${i.nom}`).includes(q) || plat(`${i.nom} ${i.prenom}`).includes(q)).slice(0, 8);
    }, [recherche, donnees]);

    if (introuvable) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <Alerte>Cet arbre n’existe pas, ou vous n’en êtes pas membre.</Alerte>
                <Link to="/" className="inline-block mt-4 text-sepia underline">Revenir à mes arbres</Link>
            </main>
        );
    }
    if (!arbre || !donnees) return erreur ? <main className="p-6"><Alerte>{erreur}</Alerte></main> : <Chargement texte="Chargement de l’arbre…" />;

    return (
        <div className="h-dvh flex flex-col">
            {/* téléphone : trois lignes empilées (titre, boutons, recherche) ; ordinateur : une ligne */}
            <header className="shrink-0 border-b border-trait-leger bg-carte px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                <div className="shrink-0 sm:pr-3 sm:border-r sm:border-trait-leger"><Signature lien /></div>
                <div className="flex items-center gap-3 min-w-0 sm:flex-1 sm:min-w-[300px]">
                <Link to="/" className="text-encre-3 hover:text-encre min-h-11 min-w-8 flex items-center" aria-label="Mes arbres">←</Link>
                <div className="min-w-0 flex-1">
                    <h1 className="font-display text-2xl leading-tight truncate">{arbre.nom}</h1>
                    <div className="text-xs text-encre-3 flex items-center gap-2">
                        {donnees.individus.length} individu{donnees.individus.length > 1 ? 's' : ''}
                        <span aria-live="polite" className={direct === 'direct' ? 'text-vert' : direct === 'coupe' ? 'text-rouge' : ''}>
                            · {direct === 'direct' ? '● en direct' : direct === 'coupe' ? '● hors ligne (reconnexion…)' : '○ connexion…'}
                        </span>
                    </div>
                </div>
                </div>
                <div className="relative w-full sm:w-64 order-last sm:order-none">
                    <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher une personne" aria-label="Chercher une personne"
                        className="w-full min-h-11 rounded-xl bg-nuit border border-trait px-3 text-[15px]" />
                    {trouves.length > 0 && (
                        <ul className="absolute z-30 mt-1 w-full rounded-xl border border-trait bg-carte-2 shadow-xl">
                            {trouves.map((i) => (
                                <li key={i.id}>
                                    <button type="button" className="w-full text-left px-3 min-h-11 hover:bg-trait" onClick={() => { setChoisi(i.id); setRecherche(''); }}>{nomAffiche(i)}</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {/* téléphone : une seule ligne qui défile au doigt (sur trois lignes, elle mangeait un tiers de l'écran) */}
                <nav className="flex gap-2 overflow-x-auto sm:overflow-visible flex-nowrap sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]" aria-label="Outils de l’arbre">
                    {peutEcrire && <Bouton variante="principal" className="shrink-0 whitespace-nowrap" onClick={() => setAjout(true)}>+ Personne</Bouton>}
                    {peutEcrire && <Link className="shrink-0" to={`/arbres/${id}/partage`}><Bouton variante="secondaire" className="whitespace-nowrap">Partager (QR)</Bouton></Link>}
                    {peutEcrire && (
                        <Link className="shrink-0" to={`/arbres/${id}/propositions`}>
                            <Bouton variante="secondaire" className="whitespace-nowrap">Propositions{propositions > 0 && <span className="rounded-full bg-sepia text-nuit text-xs px-2">{propositions}</span>}</Bouton>
                        </Link>
                    )}
                    <Link className="shrink-0" to={`/arbres/${id}/patrimoine`}><Bouton variante="discret" className="whitespace-nowrap">Patrimoine</Bouton></Link>
                    <div className="shrink-0 self-center w-[230px]"><ChoixPalette compact /></div>
                </nav>
            </header>
            {erreur && <div className="p-3"><Alerte>{erreur}</Alerte></div>}
            <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 relative">
                    {donnees.individus.length === 0 ? (
                        <div className="h-full grid place-items-center p-6 text-center">
                            <div className="max-w-sm flex flex-col gap-4 items-center">
                                <p className="font-display text-2xl">L’arbre est vide.</p>
                                <p className="text-encre-2">Commencez par vous-même ou par l’ancêtre le plus ancien que vous connaissez.</p>
                                {peutEcrire && <Bouton variante="principal" onClick={() => setAjout(true)}>Ajouter la première personne</Bouton>}
                                {peutEcrire && <BoutonImportGedcom arbreId={id} arbreNom={arbre?.nom ?? ''} onFini={() => void recharger()} />}{/* import-gedcom/ : son arbre du PC (30/09) */}
                            </div>
                        </div>
                    ) : (
                        <VueArbreBureau donnees={donnees} choisi={choisi} onChoisir={setChoisi} />
                    )}
                </div>
                {choisiIndividu && (
                    <FicheIndividu individu={choisiIndividu} donnees={donnees} arbreId={id} peutEcrire={peutEcrire}
                        onFermer={() => setChoisi(null)} onChoisir={setChoisi} onChange={() => void recharger()} />
                )}
            </div>
            {ajout && (
                <Fenetre titre="Ajouter une personne" onFermer={() => setAjout(false)} large>
                    <FormulaireIndividu donnees={donnees} libelleBouton="Ajouter à l’arbre"
                        onValider={async (v) => { const n = await ajouterIndividu(id, v); setAjout(false); await recharger(); setChoisi(n); }} />
                </Fenetre>
            )}
        </div>
    );
}

// ---- FIN PAGE DE L'ARBRE ----
