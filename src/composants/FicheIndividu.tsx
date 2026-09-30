// ---- FICHE D'UN INDIVIDU ----
// Panneau latéral sur ordinateur, panneau qui monte du bas sur téléphone.
// Tout ce qu'on peut faire d'une personne part d'ici.

import { useState } from 'react';
import { Alerte, Bouton, Choix, Fenetre } from '../ui/ui';
import { FormulaireIndividu, saisieDepuis } from './FormulaireIndividu';
import { FormulaireLien, type ModeLien } from './FormulaireLien';
import { CreerFoyer, FoyersDe } from './Foyers';
import { ParentATrouver } from './ParentATrouver';
import { Portrait } from '../ui/Portrait';
import { accord, GENRE, NATURE_FILIATION, NATURE_UNION, PARENT_A_TROUVER, STATUT_UNION, nomAffiche } from '../domaine/libelles';
import { dateLisible } from '../domaine/dates';
import { controlerFiliation, fratrie } from '../domaine/coherence';
import { NATURES_FILIATION, type DonneesArbre, type Filiation, type Id, type Individu, type NatureFiliation } from '../domaine/types';
import { changerNature, delier, modifierIndividu, supprimerIndividu, supprimerUnion } from '../donnees/actions';

const OPTIONS_NATURE = NATURES_FILIATION.map((n) => [n, NATURE_FILIATION[n]] as const);

export function FicheIndividu({ individu, donnees, arbreId, peutEcrire, onFermer, onChoisir, onChange }: {
    individu: Individu;
    donnees: DonneesArbre;
    arbreId: Id;
    peutEcrire: boolean;
    onFermer: () => void;
    onChoisir: (id: Id) => void;
    onChange: () => void;
}) {
    const [fenetre, setFenetre] = useState<null | 'modifier' | 'completer' | 'foyer' | ModeLien>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const trouver = (id: Id) => donnees.individus.find((i) => i.id === id);
    const parents = donnees.filiations.filter((f) => f.enfant_id === individu.id);
    const enfants = donnees.filiations.filter((f) => f.parent_id === individu.id);
    const couples = donnees.unions.filter((u) => u.partenaire_a === individu.id || u.partenaire_b === individu.id);
    const freres = fratrie(donnees, individu.id);

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

    const nature = (f: Filiation, n: NatureFiliation) => {
        const motif = controlerFiliation(donnees, { parent: f.parent_id, enfant: f.enfant_id, nature: n, idExistant: f.id });
        if (motif) setErreur(motif);
        else void agir(() => changerNature(f.id, n));
    };

    const ligneLien = (f: Filiation, autre: Id) => {
        const p = trouver(autre);
        if (!p) return null;
        return (
            <li key={f.id} className="flex flex-col gap-1 py-2">
                <div className="flex items-center justify-between gap-2">
                    <button type="button" className="text-left text-[15px] text-encre hover:text-sepia min-h-9" onClick={() => onChoisir(p.id)}>{nomAffiche(p)}</button>
                    {peutEcrire && (
                        <button type="button" className="text-xs text-encre-3 hover:text-rouge min-h-9 px-2" disabled={envoi}
                            onClick={() => window.confirm(`Retirer le lien entre ${nomAffiche(individu)} et ${nomAffiche(p)} ? Les deux fiches restent.`) && void agir(() => delier(f.id))}>
                            retirer le lien
                        </button>
                    )}
                </div>
                {peutEcrire ? (
                    <Choix libelle="" aria-label={`Nature du lien avec ${nomAffiche(p)}`} valeur={f.nature} onChange={(n) => nature(f, n)} options={OPTIONS_NATURE} />
                ) : (
                    <span className="text-xs text-encre-3">{NATURE_FILIATION[f.nature]}</span>
                )}
            </li>
        );
    };

    const vie = [
        individu.naissance && `${accord(individu.genre, 'Né', 'Née', 'Né·e')} ${individu.naissance_precision === 'annee' ? 'en' : 'le'} ${dateLisible(individu.naissance, individu.naissance_precision)}${individu.lieu_naissance ? ` à ${individu.lieu_naissance}` : ''}`,
        individu.deces && `${accord(individu.genre, 'Décédé', 'Décédée', 'Décédé·e')} ${individu.deces_precision === 'annee' ? 'en' : 'le'} ${dateLisible(individu.deces, individu.deces_precision)}${individu.lieu_deces ? ` à ${individu.lieu_deces}` : ''}`,
        !individu.deces && !individu.vivant && accord(individu.genre, 'Décédé (date inconnue)', 'Décédée (date inconnue)', 'Décédé·e (date inconnue)'),
    ].filter(Boolean);

    return (
        <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-trait bg-carte p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:static md:z-auto md:max-h-none md:h-full md:w-[380px] md:shrink-0 md:rounded-none md:border-t-0 md:border-l" aria-label={`Fiche de ${nomAffiche(individu)}`}>
            <div className="flex items-start justify-between gap-3">
                <Portrait individu={individu} taille={64} texte={individu.prenom === PARENT_A_TROUVER ? '?' : undefined} />
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-2xl leading-tight break-words">{individu.illustre && <span className="text-sepia">★ </span>}{nomAffiche(individu)}</h2>
                    <div className="text-sm text-encre-3">{GENRE[individu.genre]}{individu.se_nomme ? ` · ${individu.se_nomme}` : ''}{individu.profession ? ` · ${individu.profession}` : ''}</div>
                </div>
                <button type="button" onClick={onFermer} aria-label="Fermer la fiche" className="min-w-11 min-h-11 -mr-2 -mt-2 rounded-full text-2xl text-encre-3 hover:text-encre">×</button>
            </div>

            {vie.length > 0 && <ul className="mt-3 text-sm text-encre-2 flex flex-col gap-1">{vie.map((v) => <li key={v as string}>{v}</li>)}</ul>}
            {individu.thematiques.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">{individu.thematiques.map((t) => <span key={t} className="rounded-full border border-trait px-2.5 py-1 text-xs text-encre-2">{t}</span>)}</div>
            )}
            {individu.biographie && <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line">{individu.biographie}</p>}

            {peutEcrire && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                    <Bouton variante="secondaire" onClick={() => setFenetre('parent')}>+ Parent</Bouton>
                    <Bouton variante="secondaire" onClick={() => setFenetre('enfant')}>+ Enfant</Bouton>
                    <Bouton variante="secondaire" onClick={() => setFenetre('conjoint')}>+ Conjoint·e</Bouton>
                    <Bouton variante="secondaire" onClick={() => setFenetre('frere_soeur')}>+ Frère / sœur</Bouton>
                    <Bouton variante="secondaire" onClick={() => setFenetre('foyer')}>+ Foyer</Bouton>
                    <Bouton variante="discret" onClick={() => setFenetre('modifier')}>Modifier</Bouton>
                    <Bouton variante="danger" enCours={envoi} className="col-span-2"
                        onClick={() => window.confirm(`Supprimer ${nomAffiche(individu)} de l’arbre ? Ses ${parents.length + enfants.length} lien(s) de filiation et ${couples.length} couple(s) partent avec la fiche ; les autres personnes restent.`) && void agir(async () => { await supprimerIndividu(individu.id); onFermer(); })}>
                        Supprimer
                    </Bouton>
                </div>
            )}
            {erreur && <div className="mt-3"><Alerte>{erreur}</Alerte></div>}
            {peutEcrire && individu.prenom === PARENT_A_TROUVER && (
                <ParentATrouver individu={individu} donnees={donnees} onCompleter={() => setFenetre('completer')} onRemplace={(reel) => { onChange(); onChoisir(reel); }} />
            )}

            <section className="mt-6">
                <h3 className="text-xs uppercase tracking-wider text-encre-3">Parents ({parents.length})</h3>
                <ul className="divide-y divide-trait-leger">{parents.map((f) => ligneLien(f, f.parent_id))}</ul>
            </section>
            {freres.length > 0 && (
                <section className="mt-4">
                    <h3 className="text-xs uppercase tracking-wider text-encre-3">Frères et sœurs ({freres.length})</h3>
                    <ul className="divide-y divide-trait-leger">
                        {freres.map(({ individu: f, demi }) => (
                            <li key={f.id} className="py-2">
                                <button type="button" className="text-left text-[15px] text-encre hover:text-sepia min-h-9" onClick={() => onChoisir(f.id)}>
                                    {nomAffiche(f)}{demi && <span className="text-xs text-encre-3"> · {accord(f.genre, 'demi-frère', 'demi-sœur', 'demi-adelphe')}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <section className="mt-4">
                <h3 className="text-xs uppercase tracking-wider text-encre-3">Enfants ({enfants.length})</h3>
                <ul className="divide-y divide-trait-leger">{enfants.map((f) => ligneLien(f, f.enfant_id))}</ul>
            </section>
            <section className="mt-4">
                <h3 className="text-xs uppercase tracking-wider text-encre-3">Couples ({couples.length})</h3>
                <ul className="divide-y divide-trait-leger">
                    {couples.map((u) => {
                        const p = trouver(u.partenaire_a === individu.id ? u.partenaire_b : u.partenaire_a);
                        return p && (
                            <li key={u.id} className="flex items-center justify-between gap-2 py-2">
                                <button type="button" className="text-left min-h-9" onClick={() => onChoisir(p.id)}>
                                    <span className="text-[15px] text-encre">{nomAffiche(p)}</span>
                                    <span className="block text-xs text-encre-3">{NATURE_UNION[u.nature]} · {STATUT_UNION[u.statut]}{u.debut ? ` · depuis ${u.debut.slice(0, 4)}` : ''}</span>
                                </button>
                                {peutEcrire && (
                                    <button type="button" className="text-xs text-encre-3 hover:text-rouge min-h-9 px-2" disabled={envoi}
                                        onClick={() => window.confirm(`Retirer le couple ${nomAffiche(individu)} – ${nomAffiche(p)} ? Les deux fiches restent.`) && void agir(() => supprimerUnion(u.id))}>
                                        retirer
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
            <div className="mt-4"><FoyersDe individu={individu} donnees={donnees} peutEcrire={peutEcrire} onChange={onChange} /></div>

            {fenetre === 'modifier' && (
                <Fenetre titre={`Modifier ${nomAffiche(individu)}`} onFermer={() => setFenetre(null)} large>
                    <FormulaireIndividu initial={saisieDepuis(individu)} donnees={donnees} idModifie={individu.id} libelleBouton="Enregistrer"
                        onValider={async (v) => { await modifierIndividu(individu.id, v); setFenetre(null); onChange(); }} />
                </Fenetre>
            )}
            {fenetre === 'completer' && (
                <Fenetre titre="Compléter le parent retrouvé" onFermer={() => setFenetre(null)} large>
                    <FormulaireIndividu initial={{ ...saisieDepuis(individu), prenom: '' }} donnees={donnees} idModifie={individu.id} libelleBouton="Enregistrer"
                        onValider={async (v) => { await modifierIndividu(individu.id, v); setFenetre(null); onChange(); }} />
                </Fenetre>
            )}
            {(fenetre === 'parent' || fenetre === 'enfant' || fenetre === 'conjoint' || fenetre === 'frere_soeur') && (
                <Fenetre titre={fenetre === 'parent' ? 'Ajouter un parent' : fenetre === 'enfant' ? 'Ajouter un enfant' : fenetre === 'conjoint' ? 'Ajouter un conjoint' : 'Ajouter un frère ou une sœur'} onFermer={() => setFenetre(null)} large>
                    <FormulaireLien mode={fenetre} depuis={individu} donnees={donnees} arbreId={arbreId} onFini={() => { setFenetre(null); onChange(); }} />
                </Fenetre>
            )}
            {fenetre === 'foyer' && (
                <Fenetre titre="Créer un foyer" onFermer={() => setFenetre(null)}>
                    <CreerFoyer depuis={individu} donnees={donnees} arbreId={arbreId} onFini={() => { setFenetre(null); onChange(); }} />
                </Fenetre>
            )}
        </aside>
    );
}

// ---- FIN FICHE D'UN INDIVIDU ----
