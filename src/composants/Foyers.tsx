// ---- FOYERS (unités parentales) ----
// Un foyer réunit les adultes qui élèvent ensemble des enfants : 1, 2, 3
// parents ou plus, de tout genre, en couple ou non. « Rattacher un enfant »
// le relie d'un geste à CHAQUE parent du foyer (fonction de la base, tout
// ou rien) ; la nature de chaque lien reste modifiable ensuite.

import { useMemo, useState } from 'react';
import { Alerte, Bouton, Champ, Choix } from '../ui/ui';
import { FORME_FOYER, NATURE_FILIATION, nomAffiche } from '../domaine/libelles';
import { ascendants } from '../domaine/coherence';
import { validerFoyer } from '../domaine/validation';
import { FORMES_FOYER, NATURES_FILIATION, type DonneesArbre, type FormeFoyer, type Id, type Individu, type NatureFiliation } from '../domaine/types';
import { creerFoyer, rattacherAuFoyer, retirerDuFoyer, supprimerFoyer } from '../donnees/actions';

const OPTIONS_FORME = FORMES_FOYER.map((f) => [f, FORME_FOYER[f]] as const);
const OPTIONS_NATURE = NATURES_FILIATION.map((n) => [n, NATURE_FILIATION[n]] as const);

export function CreerFoyer({ depuis, donnees, arbreId, onFini }: { depuis: Individu; donnees: DonneesArbre; arbreId: Id; onFini: () => void }) {
    const conjoints = useMemo(() => {
        const ids = new Set(donnees.unions.flatMap((u) => (u.partenaire_a === depuis.id ? [u.partenaire_b] : u.partenaire_b === depuis.id ? [u.partenaire_a] : [])));
        return donnees.individus.filter((i) => ids.has(i.id));
    }, [donnees, depuis.id]);
    const [coParents, setCoParents] = useState<Id[]>(conjoints.slice(0, 1).map((c) => c.id));
    const [autre, setAutre] = useState('');
    const [libelle, setLibelle] = useState(`Foyer de ${nomAffiche(depuis)}`);
    const [forme, setForme] = useState<FormeFoyer>(conjoints.length ? 'couple' : 'monoparental');
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const autres = useMemo(() => {
        const q = plat(autre.trim());
        return q.length < 2 ? [] : donnees.individus.filter((i) => i.id !== depuis.id && !coParents.includes(i.id) && plat(nomAffiche(i)).includes(q)).slice(0, 8);
    }, [autre, donnees.individus, depuis.id, coParents]);

    const envoyer = async () => {
        setErreur(null);
        const v = validerFoyer({ libelle, forme, notes: '' });
        if (!v.ok) {
            setErreur(Object.values(v.erreurs)[0]);
            return;
        }
        setEnvoi(true);
        try {
            const parents = [depuis.id, ...coParents];
            await creerFoyer(arbreId, v.donnees.libelle, v.donnees.forme, parents, parents.map(() => ''));
            onFini();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <Champ libelle="Nom du foyer" valeur={libelle} onChange={setLibelle} max={120} />
            <Choix libelle="Forme" valeur={forme} onChange={setForme} options={OPTIONS_FORME} />
            <div className="flex flex-col gap-2">
                <div className="text-sm text-encre-2">Parents du foyer</div>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-sepia text-sepia px-3 py-1.5 text-sm">{nomAffiche(depuis)}</span>
                    {coParents.map((id) => {
                        const i = donnees.individus.find((x) => x.id === id);
                        return i && (
                            <button key={id} type="button" onClick={() => setCoParents(coParents.filter((c) => c !== id))} className="rounded-full border border-trait px-3 py-1.5 text-sm min-h-9" aria-label={`Retirer ${nomAffiche(i)}`}>
                                {nomAffiche(i)} ×
                            </button>
                        );
                    })}
                </div>
                {conjoints.filter((c) => !coParents.includes(c.id)).map((c) => (
                    <button key={c.id} type="button" onClick={() => setCoParents([...coParents, c.id])} className="self-start text-sm text-sepia min-h-9">+ {nomAffiche(c)} (conjoint·e)</button>
                ))}
                <Champ libelle="Ajouter un autre parent (co-parent, beau-parent…)" valeur={autre} onChange={setAutre} placeholder="tapez un nom" autoComplete="off" />
                {autres.map((i) => (
                    <button key={i.id} type="button" onClick={() => { setCoParents([...coParents, i.id]); setAutre(''); }} className="self-start text-sm text-sepia min-h-9">+ {nomAffiche(i)}</button>
                ))}
            </div>
            {erreur && <Alerte>{erreur}</Alerte>}
            <Bouton variante="principal" type="submit" enCours={envoi}>Créer le foyer</Bouton>
        </form>
    );
}

export function FoyersDe({ individu, donnees, peutEcrire, onChange }: { individu: Individu; donnees: DonneesArbre; peutEcrire: boolean; onChange: () => void }) {
    const foyers = donnees.foyers.filter((f) => donnees.foyerParents.some((p) => p.foyer_id === f.id && p.individu_id === individu.id));
    const [rattache, setRattache] = useState<{ foyer: Id; enfant: Id; nature: NatureFiliation } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);

    if (foyers.length === 0) return null;

    const agir = async (f: () => Promise<unknown>) => {
        setErreur(null);
        setEnvoi(true);
        try {
            await f();
            onChange();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <section className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-encre-3">Foyers</h3>
            {foyers.map((f) => {
                const parents = donnees.foyerParents.filter((p) => p.foyer_id === f.id).map((p) => donnees.individus.find((i) => i.id === p.individu_id)).filter((i): i is Individu => Boolean(i));
                const enfants = [...new Set(donnees.filiations.filter((l) => l.foyer_id === f.id).map((l) => l.enfant_id))].map((id) => donnees.individus.find((i) => i.id === id)).filter((i): i is Individu => Boolean(i));
                // calculé seulement quand on rattache : ni un parent du foyer, ni l'un de leurs ascendants (boucle), ni un enfant déjà rattaché
                let possibles: Individu[] = [];
                if (rattache?.foyer === f.id) {
                    const interdits = new Set<Id>(enfants.map((e) => e.id));
                    for (const p of parents) for (const a of ascendants(donnees.filiations, p.id)) interdits.add(a);
                    possibles = donnees.individus.filter((i) => !interdits.has(i.id));
                }
                return (
                    <div key={f.id} className="rounded-2xl border border-trait p-3 flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <b className="text-encre">{f.libelle}</b>
                            <span className="text-xs text-encre-3">{FORME_FOYER[f.forme]}</span>
                        </div>
                        <div className="text-sm text-encre-2">Parents : {parents.map(nomAffiche).join(', ')}</div>
                        <div className="text-sm text-encre-2">Enfants : {enfants.length ? enfants.map(nomAffiche).join(', ') : 'aucun pour l’instant'}</div>
                        {peutEcrire && (rattache?.foyer === f.id ? (
                            <div className="flex flex-col gap-2">
                                <Choix libelle="Enfant à rattacher" valeur={rattache.enfant} onChange={(v) => setRattache({ ...rattache, enfant: v })}
                                    options={[['', 'Choisir…'] as const, ...possibles.map((i) => [i.id, nomAffiche(i)] as const)]} />
                                <Choix libelle="Nature du lien avec chaque parent" valeur={rattache.nature} onChange={(v) => setRattache({ ...rattache, nature: v })} options={OPTIONS_NATURE} />
                                <div className="flex gap-2">
                                    <Bouton variante="principal" enCours={envoi} disabled={!rattache.enfant} onClick={() => void agir(() => rattacherAuFoyer(f.id, rattache.enfant, rattache.nature)).then(() => setRattache(null))}>Rattacher</Bouton>
                                    <Bouton variante="discret" onClick={() => setRattache(null)}>Annuler</Bouton>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <Bouton variante="secondaire" onClick={() => setRattache({ foyer: f.id, enfant: '', nature: 'biologique' })}>Rattacher un enfant</Bouton>
                                <Bouton variante="discret" enCours={envoi} onClick={() => void agir(() => retirerDuFoyer(f.id, individu.id))}>Quitter ce foyer</Bouton>
                                <Bouton variante="danger" enCours={envoi} onClick={() => window.confirm(`Supprimer le foyer « ${f.libelle} » ? Les liens parent-enfant restent.`) && void agir(() => supprimerFoyer(f.id))}>Supprimer le foyer</Bouton>
                            </div>
                        ))}
                    </div>
                );
            })}
            {erreur && <Alerte>{erreur}</Alerte>}
        </section>
    );
}

// ---- FIN FOYERS ----
