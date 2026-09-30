// ---- RELIER : parent, enfant, conjoint (personne existante ou nouvelle) ----
// La liste des personnes existantes ne propose JAMAIS un lien impossible
// (boucle, doublon) ; tout lien est contrôlé ici comme dans la base avant
// l'envoi, puis par la base elle-même.

import { useMemo, useState } from 'react';
import { Alerte, Bouton, Champ, Choix } from '../ui/ui';
import { ChampsIndividu } from './FormulaireIndividu';
import { ascendants, controlerFiliation, controlerFrereSoeur, controlerUnion, descendants, enfantsPossibles, fratrie, incoherenceDates, parentsPossibles, type LienFratrie } from '../domaine/coherence';
import { NATURE_FILIATION, NATURE_UNION, STATUT_UNION, nomAffiche } from '../domaine/libelles';
import { annee } from '../domaine/dates';
import { SAISIE_INDIVIDU_VIDE, validerIndividu, validerUnion, type Erreurs, type SaisieIndividu, type SaisieUnion } from '../domaine/validation';
import { NATURES_FILIATION, NATURES_UNION, STATUTS_UNION, type DonneesArbre, type Individu, type NatureFiliation } from '../domaine/types';
import { ajouterFrereSoeur, ajouterIndividu, lier, unir } from '../donnees/actions';

export type ModeLien = 'parent' | 'enfant' | 'conjoint' | 'frere_soeur';

const TITRES: Record<ModeLien, string> = { parent: 'un parent', enfant: 'un enfant', conjoint: 'un conjoint ou une conjointe', frere_soeur: 'un frère ou une sœur' };
const OPTIONS_NATURE = NATURES_FILIATION.map((n) => [n, NATURE_FILIATION[n]] as const);
const OPTIONS_NATURE_UNION = NATURES_UNION.map((n) => [n, NATURE_UNION[n]] as const);
const OPTIONS_STATUT = STATUTS_UNION.map((n) => [n, STATUT_UNION[n]] as const);
const OPTIONS_FRATRIE = [
    ['germain', 'Frère / sœur germain·e (mêmes parents)'],
    ['demi', 'Demi-frère / demi-sœur (un parent en commun)'],
    ['adoptif', 'Par adoption (adopté·e par les mêmes parents)'],
] as const;

const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function FormulaireLien({ mode, depuis, donnees, arbreId, onFini }: { mode: ModeLien; depuis: Individu; donnees: DonneesArbre; arbreId: string; onFini: () => void }) {
    const [origine, setOrigine] = useState<'nouveau' | 'existant'>('nouveau');
    const [recherche, setRecherche] = useState('');
    const [choisi, setChoisi] = useState<string>('');
    const [nature, setNature] = useState<NatureFiliation>('biologique');
    const [u, setU] = useState<SaisieUnion>({ nature: 'mariage', statut: 'en_cours', debut: '', fin: '' });
    const [s, setS] = useState<SaisieIndividu>({ ...SAISIE_INDIVIDU_VIDE, nom: mode === 'enfant' ? depuis.nom : '' });
    const [erreurs, setErreurs] = useState<Erreurs>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [lienFratrie, setLienFratrie] = useState<LienFratrie>('germain');
    const [parentCommun, setParentCommun] = useState<string>('');
    // parents connus de la personne (et de l'autre, s'il est déjà dans l'arbre) : candidats au parent commun
    const parentsConnus = useMemo(() => {
        const enfants = new Set([depuis.id, ...(origine === 'existant' && choisi ? [choisi] : [])]);
        const ids = new Set(donnees.filiations.filter((f) => enfants.has(f.enfant_id)).map((f) => f.parent_id));
        return donnees.individus.filter((i) => ids.has(i.id));
    }, [donnees, depuis.id, origine, choisi]);

    const candidats = useMemo(() => {
        let base: Individu[];
        // les dates écartent aussi l'impossible (ex. une enfant de 2012 proposée comme parent d'un homme de 1940)
        if (mode === 'parent') base = parentsPossibles(donnees, depuis.id).filter((i) => incoherenceDates(i, depuis, nature) === null);
        else if (mode === 'enfant') base = enfantsPossibles(donnees, depuis.id).filter((i) => incoherenceDates(depuis, i, nature) === null);
        else if (mode === 'frere_soeur') {
            // ni soi, ni un ascendant, ni un descendant, ni un frère ou une sœur déjà relié
            const interdits = new Set([...descendants(donnees.filiations, depuis.id), ...ascendants(donnees.filiations, depuis.id), ...fratrie(donnees, depuis.id).map((f) => f.individu.id)]);
            base = donnees.individus.filter((i) => !interdits.has(i.id));
        } else {
            // une seule passe : ni la ligne directe, ni un couple déjà enregistré
            const interdits = new Set([...descendants(donnees.filiations, depuis.id), ...ascendants(donnees.filiations, depuis.id)]);
            for (const x of donnees.unions) {
                if (x.partenaire_a === depuis.id) interdits.add(x.partenaire_b);
                if (x.partenaire_b === depuis.id) interdits.add(x.partenaire_a);
            }
            base = donnees.individus.filter((i) => !interdits.has(i.id));
        }
        const q = plat(recherche.trim());
        return base.filter((i) => !q || plat(`${i.prenom} ${i.nom}`).includes(q) || plat(`${i.nom} ${i.prenom}`).includes(q)).slice(0, 60);
    }, [mode, depuis, donnees, recherche, nature]);

    const envoyer = async () => {
        setErreur(null);
        setErreurs({});
        const union = mode === 'conjoint' ? validerUnion(u) : null;
        if (union && !union.ok) {
            setErreurs(union.erreurs);
            return;
        }
        setEnvoi(true);
        try {
            if (origine === 'existant') {
                if (!choisi) {
                    setErreurs({ choisi: 'Choisissez une personne dans la liste.' });
                    return;
                }
                const autre = donnees.individus.find((i) => i.id === choisi)!;
                const motif = mode === 'conjoint'
                    ? controlerUnion(donnees, depuis.id, choisi, union && union.ok ? union.donnees.debut : null)
                    : mode === 'frere_soeur' ? controlerFrereSoeur(donnees, depuis.id, autre, lienFratrie, parentCommun || null)
                    : controlerFiliation(donnees, mode === 'parent' ? { parent: choisi, enfant: depuis.id, nature } : { parent: depuis.id, enfant: choisi, nature });
                if (motif) {
                    setErreur(motif);
                    return;
                }
                if (mode === 'frere_soeur') await ajouterFrereSoeur(arbreId, depuis.id, null, choisi, lienFratrie, parentCommun || null);
                else if (mode === 'conjoint' && union && union.ok) await unir(arbreId, depuis.id, choisi, union.donnees);
                else if (mode === 'parent') await lier(arbreId, choisi, depuis.id, nature);
                else await lier(arbreId, depuis.id, choisi, nature);
            } else {
                const r = validerIndividu(s);
                if (!r.ok) {
                    setErreurs(r.erreurs);
                    return;
                }
                // contrôle avec la future fiche (elle n'a encore aucun lien : seules les dates comptent)
                const provisoire: Individu = { ...depuis, ...r.donnees, id: '__nouveau__', cree_le: '', maj_le: '' };
                const avecNouveau: DonneesArbre = { ...donnees, individus: [...donnees.individus, provisoire] };
                const motif = mode === 'conjoint'
                    ? controlerUnion(avecNouveau, depuis.id, provisoire.id, union && union.ok ? union.donnees.debut : null)
                    : mode === 'frere_soeur' ? controlerFrereSoeur(donnees, depuis.id, provisoire, lienFratrie, parentCommun || null)
                    : controlerFiliation(avecNouveau, mode === 'parent' ? { parent: provisoire.id, enfant: depuis.id, nature } : { parent: depuis.id, enfant: provisoire.id, nature });
                if (motif) {
                    setErreur(motif);
                    return;
                }
                if (mode === 'frere_soeur') await ajouterFrereSoeur(arbreId, depuis.id, r.donnees, null, lienFratrie, parentCommun || null);
                else await ajouterIndividu(arbreId, r.donnees, mode, depuis.id, nature, union && union.ok ? union.donnees : null);
            }
            onFini();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <p className="text-sm text-encre-2">Ajouter {TITRES[mode]} à <b className="text-encre">{nomAffiche(depuis)}</b>.</p>
            <div className="grid grid-cols-2 gap-2" role="tablist">
                {(['nouveau', 'existant'] as const).map((o) => (
                    <button key={o} type="button" role="tab" aria-selected={origine === o} onClick={() => setOrigine(o)}
                        className={`min-h-11 rounded-xl border text-sm ${origine === o ? 'border-sepia text-sepia bg-sepia/10' : 'border-trait text-encre-2'}`}>
                        {o === 'nouveau' ? 'Nouvelle personne' : 'Déjà dans l’arbre'}
                    </button>
                ))}
            </div>

            {origine === 'existant' ? (
                <div className="flex flex-col gap-2">
                    <Champ libelle="Chercher" valeur={recherche} onChange={setRecherche} placeholder="prénom ou nom" autoComplete="off" />
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-trait divide-y divide-trait-leger" role="listbox" aria-label="Personnes possibles">
                        {candidats.length === 0 && <div className="p-3 text-sm text-encre-3">Personne ne peut être relié ainsi (les liens impossibles sont écartés).</div>}
                        {candidats.map((i) => (
                            <button key={i.id} type="button" role="option" aria-selected={choisi === i.id} onClick={() => setChoisi(i.id)}
                                className={`w-full text-left px-3 min-h-11 text-[15px] ${choisi === i.id ? 'bg-sepia/15 text-sepia' : 'hover:bg-carte-2'}`}>
                                {nomAffiche(i)} <span className="text-encre-3 text-xs">{annee(i.naissance) ?? ''}{i.vivant ? '' : ' †'}</span>
                            </button>
                        ))}
                    </div>
                    {erreurs.choisi && <div className="text-xs text-rouge">{erreurs.choisi}</div>}
                </div>
            ) : (
                <ChampsIndividu s={s} maj={(c) => setS((x) => ({ ...x, ...c }))} erreurs={erreurs} complet={false} />
            )}

            {mode === 'conjoint' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Choix libelle="Nature de l’union" valeur={u.nature as (typeof NATURES_UNION)[number]} onChange={(v) => setU({ ...u, nature: v })} options={OPTIONS_NATURE_UNION} />
                    <Choix libelle="Statut" valeur={u.statut as (typeof STATUTS_UNION)[number]} onChange={(v) => setU({ ...u, statut: v })} options={OPTIONS_STATUT} />
                    <Champ libelle="Début" valeur={u.debut} onChange={(v) => setU({ ...u, debut: v })} erreur={erreurs.debut} placeholder="facultatif" mode="numeric" />
                    <Champ libelle="Fin" valeur={u.fin} onChange={(v) => setU({ ...u, fin: v })} erreur={erreurs.fin} placeholder="facultatif" mode="numeric" />
                </div>
            ) : mode === 'frere_soeur' ? (
                <div className="flex flex-col gap-3">
                    <Choix libelle="Lien" valeur={lienFratrie} onChange={(v) => { setLienFratrie(v); setParentCommun(''); }} options={OPTIONS_FRATRIE} />
                    {lienFratrie === 'demi' && (
                        <Choix libelle="Parent en commun" valeur={parentCommun} onChange={setParentCommun}
                            options={[['', 'Inconnu : poser un parent « à trouver »'] as const, ...parentsConnus.map((p) => [p.id, nomAffiche(p)] as const)]} />
                    )}
                    <p className="text-xs text-encre-3">
                        Pas besoin de connaître les parents : s’ils sont dans l’arbre, ils sont repris ; sinon un parent « à trouver » est posé,
                        à compléter le jour où vous trouvez son nom (ou à remplacer par une personne déjà dans l’arbre).
                    </p>
                </div>
            ) : (
                <Choix libelle="Nature du lien" valeur={nature} onChange={setNature} options={OPTIONS_NATURE} />
            )}

            {erreur && <Alerte>{erreur}</Alerte>}
            <Bouton variante="principal" type="submit" enCours={envoi}>Relier</Bouton>
        </form>
    );
}

// ---- FIN RELIER ----
