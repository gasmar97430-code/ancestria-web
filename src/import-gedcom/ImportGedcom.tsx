// ---- IMPORT GEDCOM : L'ÉCRAN ----
//
// Porte : « Importer un arbre (fichier GEDCOM) » sur un arbre VIDE (ArbrePage,
// une ligne). Sur un arbre déjà rempli, l'import doublerait les personnes :
// il n'y est pas proposé. Étapes : choisir le fichier → aperçu (ce qui entre,
// ce qui ne peut pas entrer) → import avec progression → compte rendu (chaque
// refus avec sa raison). C'est lui qui lance l'import : rien ne part sans son clic.

import { useState, type ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Alerte, Bouton, Fenetre } from '../ui/ui';
import { lireFichier, type PlanImport } from './versWeb';
import { importer, versErreurEcriture, type Ecrivain, type ResultatImport } from './importer';

const ecrivainSupabase: Ecrivain = {
    async inserer(table, lignes) {
        const { error } = await supabase.from(table).insert(lignes);
        return error ? versErreurEcriture(error) : null;
    },
};

const ETIQUETTES: Record<string, string> = {
    SOUR: 'sources', OBJE: 'médias (photos, documents)', REPO: 'dépôts d’archives', ASSO: 'associations entre personnes',
    'FAM EVEN': 'événements de couple', 'FAM SOUR': 'sources de couple', 'FAM OBJE': 'médias de couple',
};

const nombre = (n: number, un: string, plusieurs: string) => `${n.toLocaleString('fr-FR')} ${n > 1 ? plusieurs : un}`;

export function BoutonImportGedcom({ arbreId, arbreNom, onFini }: { arbreId: string; arbreNom: string; onFini: () => void }) {
    const [ouvert, setOuvert] = useState(false);
    const [plan, setPlan] = useState<PlanImport | null>(null);
    const [fichier, setFichier] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);
    const [progres, setProgres] = useState<{ fait: number; total: number } | null>(null);
    const [resultat, setResultat] = useState<ResultatImport | null>(null);
    const enCours = !!progres && !resultat;

    const fermer = () => {
        if (enCours) return; // pas d'arrêt au milieu : l'arbre serait à moitié écrit
        setOuvert(false);
        setPlan(null);
        setErreur(null);
        setProgres(null);
        if (resultat) onFini();
        setResultat(null);
    };

    const choisir = async (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setErreur(null);
        setPlan(null);
        try {
            const p = lireFichier(new Uint8Array(await f.arrayBuffer()));
            if (p.individus.length === 0) {
                setErreur('Ce fichier ne contient aucune personne : est-ce bien un fichier GEDCOM (.ged) ?');
                return;
            }
            setFichier(f.name);
            setPlan(p);
        } catch (err) {
            setErreur(`Fichier illisible : ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const lancer = async () => {
        if (!plan) return;
        setProgres({ fait: 0, total: plan.individus.length + plan.unions.length + plan.filiations.length });
        try {
            setResultat(await importer(arbreId, plan, ecrivainSupabase, (fait, total) => setProgres({ fait, total })));
        } catch (err) {
            setResultat({ personnes: 0, couples: 0, liens: 0, refus: [], arrete: err instanceof Error ? err.message : String(err) });
        }
    };

    const nonRepris = plan ? Object.entries(plan.nonRepris).filter(([, n]) => n > 0) : [];
    const vivants = plan ? plan.individus.filter((i) => i.vivant).length : 0;

    return (
        <>
            <Bouton variante="secondaire" onClick={() => setOuvert(true)}>Importer un arbre (fichier GEDCOM)</Bouton>
            {ouvert && (
                <Fenetre titre="Importer un arbre" onFermer={fermer}>
                    <div className="flex flex-col gap-4 text-left">
                        {!plan && !resultat && (
                            <>
                                <p className="text-encre-2 text-sm leading-relaxed">
                                    Reprenez un arbre déjà fait, sans rien retaper. <b>Depuis Ancestria sur votre ordinateur</b> : bouton
                                    « GEDCOM (Geneanet) » → « Exporter en GEDCOM », <b>sans cocher</b> « masquer les personnes vivantes ».
                                    Le fichier est écrit dans <i>Documents › Ancestria › GEDCOM</i>. Un fichier .ged de Geneanet ou d’un autre
                                    logiciel convient aussi.
                                </p>
                                <label className="self-start inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-sepia text-nuit font-medium cursor-pointer">
                                    Choisir le fichier .ged
                                    <input type="file" accept=".ged,.GED,text/plain" className="sr-only" onChange={(e) => void choisir(e)} />
                                </label>
                                {erreur && <Alerte>{erreur}</Alerte>}
                            </>
                        )}

                        {plan && !progres && (
                            <>
                                <p className="text-sm text-encre-2">Fichier : <b className="text-encre break-all">{fichier}</b>{plan.logiciel ? ` (écrit par ${plan.logiciel})` : ''}</p>
                                <ul className="text-sm flex flex-col gap-1 list-disc pl-5">
                                    <li>{nombre(plan.individus.length, 'personne', 'personnes')}, dont {nombre(vivants, 'vivante', 'vivantes')}</li>
                                    <li>{nombre(plan.unions.length, 'couple', 'couples')}</li>
                                    <li>{nombre(plan.filiations.length, 'lien parent → enfant', 'liens parent → enfant')}</li>
                                </ul>
                                {(nonRepris.length > 0 || plan.renvoisPerdus > 0 || plan.lignesIllisibles > 0) && (
                                    <Alerte genre="info">
                                        Ne sera pas repris :{' '}
                                        {[
                                            ...nonRepris.map(([t, n]) => `${n} ${ETIQUETTES[t] ?? t}`),
                                            plan.renvoisPerdus ? `${plan.renvoisPerdus} renvoi(s) vers une fiche absente du fichier` : '',
                                            plan.lignesIllisibles ? `${plan.lignesIllisibles} ligne(s) illisible(s)` : '',
                                        ].filter(Boolean).join(' ; ')}.
                                    </Alerte>
                                )}
                                <p className="text-sm text-encre-2">
                                    Les dates approchées (« vers 1900 »), baptêmes, professions et notes sont gardés dans les notes de chaque
                                    personne. Les règles de l’arbre s’appliquent : un lien impossible (dates, boucle) est refusé et vous sera listé.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Bouton variante="principal" onClick={() => void lancer()}>Importer dans « {arbreNom} »</Bouton>
                                    <Bouton variante="discret" onClick={() => setPlan(null)}>Choisir un autre fichier</Bouton>
                                </div>
                            </>
                        )}

                        {progres && !resultat && (
                            <div className="flex flex-col gap-2" role="status">
                                <p className="text-sm">Import en cours… ne fermez pas la page.</p>
                                <div className="h-2 rounded-full bg-nuit overflow-hidden">
                                    <div className="h-full bg-sepia transition-[width]" style={{ width: `${Math.round((progres.fait / Math.max(1, progres.total)) * 100)}%` }} />
                                </div>
                                <p className="text-xs text-encre-3">{progres.fait} / {progres.total}</p>
                            </div>
                        )}

                        {resultat && (
                            <>
                                <Alerte genre={resultat.arrete ? 'erreur' : 'succes'}>
                                    {resultat.arrete ? `Import arrêté : ${resultat.arrete} ` : 'Import terminé. '}
                                    {nombre(resultat.personnes, 'personne', 'personnes')}, {nombre(resultat.couples, 'couple', 'couples')},{' '}
                                    {nombre(resultat.liens, 'lien', 'liens')} ajoutés.
                                </Alerte>
                                {resultat.refus.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm">{nombre(resultat.refus.length, 'élément refusé', 'éléments refusés')} par les règles de l’arbre (à corriger à la main si besoin) :</p>
                                        <ul className="text-sm flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                                            {resultat.refus.map((r, k) => (
                                                <li key={k} className="border-l-2 border-trait pl-2">
                                                    <b>{r.libelle}</b> <span className="text-encre-3">({r.quoi})</span> — {r.motif}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <Bouton variante="principal" onClick={fermer}>Voir l’arbre</Bouton>
                            </>
                        )}
                    </div>
                </Fenetre>
            )}
        </>
    );
}

// ---- FIN IMPORT GEDCOM : L'ÉCRAN ----
