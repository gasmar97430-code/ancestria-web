// ---- PATRIMOINE, ARCHIVES & RÉCIT MÉMORIEL (gestion) ----
// Pour la famille comme pour la collectivité : documents d'archives
// géolocalisés reliés aux individus, familles historiques, et — sous
// licence collectivité — publication d'un espace public « Tourisme de
// racines » et export patrimonial certifié.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { lienPatrimoine } from '../lib/config';
import { ecrire, toutLire } from '../donnees/arbre';
import { TYPE_DOCUMENT, nomAffiche } from '../domaine/libelles';
import { SAISIE_DOCUMENT_VIDE, validerDocument, validerEspace, validerFamille, type Erreurs, type SaisieDocument } from '../domaine/validation';
import { TYPES_DOCUMENT, type Arbre, type DocumentArchive, type DocumentIndividu, type FamilleHistorique, type Individu, type Role } from '../domaine/types';
import { Jauge, Reserve, useEtatOffre } from '../offres/offres';
import { Carte } from '../composants/Carte';
import { QrPartage } from '../composants/QrPartage';
import { LienRetour, Alerte, Bouton, Case, Champ, Chargement, Choix, EnTetePage, Fenetre } from '../ui/ui';

const OPTIONS_TYPE = TYPES_DOCUMENT.map((t) => [t, TYPE_DOCUMENT[t]] as const);
const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function saisieDocument(d: DocumentArchive): SaisieDocument {
    return {
        titre: d.titre, type: d.type, date_document: d.date_document ? d.date_document.split('-').reverse().join('/') : '', periode: d.periode ?? '', lieu: d.lieu ?? '',
        position: d.lat !== null && d.lng !== null ? `${d.lat}, ${d.lng}` : '', url: d.url ?? '', cote: d.cote ?? '', source: d.source ?? '', droits: d.droits ?? '',
        description: d.description ?? '', public: d.public,
    };
}

function FormulaireDocument({ arbreId, doc, individus, liens, onFini }: { arbreId: string; doc: DocumentArchive | null; individus: Individu[]; liens: DocumentIndividu[]; onFini: () => void }) {
    const [s, setS] = useState<SaisieDocument>(doc ? saisieDocument(doc) : SAISIE_DOCUMENT_VIDE);
    const [relies, setRelies] = useState<string[]>(doc ? liens.filter((l) => l.document_id === doc.id).map((l) => l.individu_id) : []);
    const [recherche, setRecherche] = useState('');
    const [erreurs, setErreurs] = useState<Erreurs>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const maj = (c: Partial<SaisieDocument>) => setS((x) => ({ ...x, ...c }));
    const trouves = useMemo(() => {
        const q = plat(recherche.trim());
        return q.length < 2 ? [] : individus.filter((i) => !relies.includes(i.id) && plat(nomAffiche(i)).includes(q)).slice(0, 8);
    }, [recherche, individus, relies]);

    const envoyer = async () => {
        setErreur(null);
        const v = validerDocument(s);
        if (!v.ok) {
            setErreurs(v.erreurs);
            return;
        }
        setErreurs({});
        setEnvoi(true);
        try {
            let id = doc?.id;
            if (id) await ecrire(supabase.from('documents').update(v.donnees).eq('id', id));
            else id = ((await ecrire(supabase.from('documents').insert({ arbre_id: arbreId, ...v.donnees }).select('id').single())) as { id: string }).id;
            const avant = liens.filter((l) => l.document_id === id).map((l) => l.individu_id);
            const aRetirer = avant.filter((x) => !relies.includes(x));
            const aAjouter = relies.filter((x) => !avant.includes(x));
            if (aRetirer.length) await ecrire(supabase.from('document_individus').delete().eq('document_id', id).in('individu_id', aRetirer));
            if (aAjouter.length) await ecrire(supabase.from('document_individus').insert(aAjouter.map((i) => ({ document_id: id, individu_id: i, arbre_id: arbreId }))));
            onFini();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Champ libelle="Titre" valeur={s.titre} onChange={(v) => maj({ titre: v })} erreur={erreurs.titre} obligatoire max={200} autoFocus /></div>
                <Choix libelle="Type" valeur={s.type as (typeof TYPES_DOCUMENT)[number]} onChange={(v) => maj({ type: v })} options={OPTIONS_TYPE} />
                <Champ libelle="Date" valeur={s.date_document} onChange={(v) => maj({ date_document: v })} erreur={erreurs.date_document} placeholder="JJ/MM/AAAA ou AAAA" mode="numeric" />
                <Champ libelle="Période" valeur={s.periode} onChange={(v) => maj({ periode: v })} erreur={erreurs.periode} placeholder="vers 1850, 1848-1870" max={60} />
                <Champ libelle="Lieu" valeur={s.lieu} onChange={(v) => maj({ lieu: v })} erreur={erreurs.lieu} max={120} />
                <Champ libelle="Position (carte)" valeur={s.position} onChange={(v) => maj({ position: v })} erreur={erreurs.position} placeholder="-20.8823, 55.4504" mode="decimal" />
                <Champ libelle="Lien vers l’archive" valeur={s.url} onChange={(v) => maj({ url: v })} erreur={erreurs.url} placeholder="https://…" type="url" mode="url" max={1000} />
                <Champ libelle="Cote" valeur={s.cote} onChange={(v) => maj({ cote: v })} erreur={erreurs.cote} max={120} />
                <Champ libelle="Source (fonds, institution)" valeur={s.source} onChange={(v) => maj({ source: v })} erreur={erreurs.source} max={200} placeholder="Archives départementales, ANOM…" />
                <Champ libelle="Droits" valeur={s.droits} onChange={(v) => maj({ droits: v })} erreur={erreurs.droits} max={200} placeholder="domaine public, CC BY…" />
                <div className="sm:col-span-2"><Champ libelle="Description" valeur={s.description} onChange={(v) => maj({ description: v })} erreur={erreurs.description} multiligne max={5000} /></div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="text-sm text-encre-2">Personnes concernées</div>
                <div className="flex flex-wrap gap-2">
                    {relies.map((id) => {
                        const i = individus.find((x) => x.id === id);
                        return i && <button key={id} type="button" onClick={() => setRelies(relies.filter((r) => r !== id))} className="rounded-full border border-trait px-3 min-h-9 text-sm">{nomAffiche(i)} ×</button>;
                    })}
                </div>
                <Champ libelle="Relier une personne" valeur={recherche} onChange={setRecherche} placeholder="tapez un nom" autoComplete="off" />
                {trouves.map((i) => <button key={i.id} type="button" className="self-start text-sm text-sepia min-h-9" onClick={() => { setRelies([...relies, i.id]); setRecherche(''); }}>+ {nomAffiche(i)}</button>)}
            </div>
            <Case libelle="Visible dans l’espace public (si l’arbre est publié)" coche={s.public} onChange={(v) => maj({ public: v })} aide="Seuls les documents cochés et les personnes décédées sont montrés au public." />
            {erreur && <Alerte>{erreur}</Alerte>}
            <Bouton variante="principal" type="submit" enCours={envoi}>{doc ? 'Enregistrer' : 'Ajouter le document'}</Bouton>
        </form>
    );
}

function Espace({ arbre, onFini }: { arbre: Arbre; onFini: () => void }) {
    const [s, setS] = useState({
        slug: arbre.slug ?? '', territoire: arbre.territoire ?? '', description: arbre.description ?? '',
        centre: arbre.centre_lat !== null && arbre.centre_lng !== null ? `${arbre.centre_lat}, ${arbre.centre_lng}` : '', public_patrimoine: arbre.public_patrimoine,
    });
    const [erreurs, setErreurs] = useState<Erreurs>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const [ok, setOk] = useState(false);
    const envoyer = async () => {
        setErreur(null);
        setOk(false);
        const v = validerEspace(s);
        if (!v.ok) {
            setErreurs(v.erreurs);
            return;
        }
        setErreurs({});
        try {
            await ecrire(supabase.from('arbres').update(v.donnees).eq('id', arbre.id));
            setOk(true);
            onFini();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        }
    };
    return (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <Champ libelle="Adresse publique" valeur={s.slug} onChange={(v) => setS({ ...s, slug: v.toLowerCase() })} erreur={erreurs.slug} placeholder="saint-paul" max={60} aide={s.slug ? lienPatrimoine(s.slug.toLowerCase()) : undefined} />
            <Champ libelle="Territoire" valeur={s.territoire} onChange={(v) => setS({ ...s, territoire: v })} erreur={erreurs.territoire} max={120} placeholder="Saint-Paul (La Réunion)" />
            <div className="sm:col-span-2"><Champ libelle="Présentation" valeur={s.description} onChange={(v) => setS({ ...s, description: v })} erreur={erreurs.description} multiligne max={4000} /></div>
            <Champ libelle="Centre de la carte" valeur={s.centre} onChange={(v) => setS({ ...s, centre: v })} erreur={erreurs.centre} placeholder="-21.0096, 55.2707" mode="decimal" />
            <Case libelle="Publier l’espace « Patrimoine & tourisme de racines »" coche={s.public_patrimoine} onChange={(v) => setS({ ...s, public_patrimoine: v })} aide="Montre au public les personnes DÉCÉDÉES et les documents cochés « public »." />
            {erreur && <div className="sm:col-span-2"><Alerte>{erreur}</Alerte></div>}
            {ok && <div className="sm:col-span-2"><Alerte genre="succes">Enregistré.</Alerte></div>}
            <div className="sm:col-span-2"><Bouton variante="principal" type="submit">Enregistrer l’espace public</Bouton></div>
        </form>
    );
}

async function sha256(texte: string): Promise<string> {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function ExportCertifie({ arbreId }: { arbreId: string }) {
    const [etat, setEtat] = useState<{ empreinte: string; nb_individus: number; nb_documents: number } | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const exporter = async () => {
        setErreur(null);
        setEnvoi(true);
        try {
            const r = (await ecrire(supabase.rpc('exporter_patrimoine', { p_arbre: arbreId }))) as { empreinte: string; texte: string; nb_individus: number; nb_documents: number; cree_le: string };
            // double contrôle : l'empreinte recalculée ici doit être celle enregistrée par la base
            if ((await sha256(r.texte)) !== r.empreinte) throw new Error('Empreinte incohérente : export annulé, réessayez.');
            const url = URL.createObjectURL(new Blob([r.texte], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `patrimoine-${r.cree_le.slice(0, 10)}-${r.empreinte.slice(0, 12)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            setEtat(r);
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };
    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-encre-2">Fichier JSON des personnes décédées, liens, couples et documents. Son empreinte SHA-256 est enregistrée : n’importe qui peut vérifier, sur la page « Vérifier un export », que le fichier n’a pas été modifié.</p>
            <Bouton variante="principal" enCours={envoi} onClick={() => void exporter()}>Exporter et certifier</Bouton>
            {etat && (
                <Alerte genre="succes">
                    Export de {etat.nb_individus} personne(s) et {etat.nb_documents} document(s). Empreinte : <code className="break-all">{etat.empreinte}</code>
                    <div className="mt-2"><Link to={`/certificat/${etat.empreinte}`} className="underline underline-offset-4">Voir et imprimer le certificat</Link></div>
                </Alerte>
            )}
            {erreur && <Alerte>{erreur}</Alerte>}
        </div>
    );
}

export function GestionPatrimoine() {
    const { id = '' } = useParams();
    const [arbre, setArbre] = useState<Arbre | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [docs, setDocs] = useState<DocumentArchive[] | null>(null);
    const [liens, setLiens] = useState<DocumentIndividu[]>([]);
    const [individus, setIndividus] = useState<Individu[]>([]);
    const [familles, setFamilles] = useState<FamilleHistorique[]>([]);
    const [edition, setEdition] = useState<DocumentArchive | 'nouveau' | null>(null);
    const [fam, setFam] = useState({ nom: '', resume: '', origine: '', periode: '' });
    const [erreurFam, setErreurFam] = useState<Erreurs>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const { etat, recharger: rechargerOffre } = useEtatOffre(id);
    const peutEcrire = role === 'proprietaire' || role === 'editeur';

    const charger = useCallback(async () => {
        try {
            const [a, r, d, l, i, f] = await Promise.all([
                supabase.from('arbres').select('id, nom, proprietaire, slug, public_patrimoine, territoire, description, centre_lat, centre_lng, cree_le').eq('id', id).maybeSingle(),
                supabase.rpc('role_dans', { p_arbre: id }),
                toutLire<DocumentArchive>('documents', id),
                toutLire<DocumentIndividu>('document_individus', id, '*', 'document_id'),
                toutLire<Individu>('individus', id),
                toutLire<FamilleHistorique>('familles_historiques', id),
            ]);
            setArbre(a.data as Arbre | null);
            setRole(r.data as Role | null);
            setDocs(d);
            setLiens(l);
            setIndividus(i);
            setFamilles(f);
            rechargerOffre();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        }
    }, [id, rechargerOffre]);
    useEffect(() => {
        void charger();
    }, [charger]);

    const ajouterFamille = async () => {
        const v = validerFamille(fam);
        if (!v.ok) {
            setErreurFam(v.erreurs);
            return;
        }
        setErreurFam({});
        try {
            await ecrire(supabase.from('familles_historiques').insert({ arbre_id: id, ...v.donnees }));
            setFam({ nom: '', resume: '', origine: '', periode: '' });
            await charger();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        }
    };

    if (!docs || !arbre) return erreur ? <main className="p-6"><Alerte>{erreur}</Alerte></main> : <Chargement />;

    const points = docs.filter((d) => d.lat !== null && d.lng !== null).map((d) => ({
        id: d.id, position: [d.lat!, d.lng!] as [number, number], couleur: '#d9a95b',
        contenu: <div><b>{d.titre}</b><div>{TYPE_DOCUMENT[d.type]}{d.periode ? ` · ${d.periode}` : ''}</div>{d.lieu && <div>{d.lieu}</div>}</div>,
    }));

    return (
        <main className="max-w-4xl mx-auto p-5 sm:p-8 flex flex-col gap-8">
            <EnTetePage titre="Patrimoine & archives" sousTitre={<LienRetour vers={`/arbres/${id}`}>{arbre.nom}</LienRetour>}
                actions={peutEcrire && <Bouton variante="principal" onClick={() => setEdition('nouveau')}>+ Document</Bouton>} />
            {erreur && <Alerte>{erreur}</Alerte>}
            {etat && <Jauge libelle="Documents" valeur={etat.documents} max={etat.max_documents} />}

            <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">Documents géolocalisés</h2>
                {points.length > 0 && <Carte points={points} centre={arbre.centre_lat !== null && arbre.centre_lng !== null ? [arbre.centre_lat, arbre.centre_lng] : null} hauteur={320} />}
                {docs.length === 0 ? <p className="text-encre-2">Aucun document. Registres, actes, photos d’époque : reliez-les aux personnes et placez-les sur la carte.</p> : (
                    <ul className="flex flex-col divide-y divide-trait-leger rounded-2xl border border-trait bg-carte">
                        {docs.map((d) => {
                            const qui = liens.filter((l) => l.document_id === d.id).map((l) => individus.find((i) => i.id === l.individu_id)).filter(Boolean) as Individu[];
                            return (
                                <li key={d.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-semibold">{d.titre} {d.public && <span className="text-xs text-vert">· public</span>}</div>
                                        <div className="text-xs text-encre-3">{TYPE_DOCUMENT[d.type]}{d.periode ? ` · ${d.periode}` : ''}{d.lieu ? ` · ${d.lieu}` : ''}{d.cote ? ` · cote ${d.cote}` : ''}</div>
                                        {qui.length > 0 && <div className="text-xs text-encre-2">{qui.map(nomAffiche).join(', ')}</div>}
                                        {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sepia underline break-all inline-flex items-center min-h-9">{d.url}</a>}
                                    </div>
                                    {peutEcrire && (
                                        <div className="flex gap-2">
                                            <Bouton variante="discret" onClick={() => setEdition(d)}>Modifier</Bouton>
                                            <Bouton variante="danger" onClick={() => window.confirm(`Supprimer le document « ${d.titre} » ?`) && void ecrire(supabase.from('documents').delete().eq('id', d.id)).then(charger).catch((e) => setErreur(e instanceof Error ? e.message : String(e)))}>Supprimer</Bouton>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">Familles historiques</h2>
                {familles.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {familles.map((f) => (
                            <li key={f.id} className="rounded-2xl border border-trait bg-carte p-3">
                                <div className="flex justify-between gap-2"><b>{f.nom}</b>
                                    {peutEcrire && <button type="button" className="text-xs text-encre-3 hover:text-rouge min-h-9" onClick={() => void ecrire(supabase.from('familles_historiques').delete().eq('id', f.id)).then(charger)}>retirer</button>}
                                </div>
                                <div className="text-xs text-encre-3">{[f.origine, f.periode].filter(Boolean).join(' · ')}</div>
                                {f.resume && <p className="text-sm text-encre-2 mt-1">{f.resume}</p>}
                            </li>
                        ))}
                    </ul>
                )}
                {peutEcrire && (
                    <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void ajouterFamille(); }} noValidate>
                        <Champ libelle="Nom de famille" valeur={fam.nom} onChange={(v) => setFam({ ...fam, nom: v })} erreur={erreurFam.nom} max={80} />
                        <Champ libelle="Origine" valeur={fam.origine} onChange={(v) => setFam({ ...fam, origine: v })} max={120} />
                        <Champ libelle="Période" valeur={fam.periode} onChange={(v) => setFam({ ...fam, periode: v })} max={60} />
                        <div className="sm:col-span-3"><Champ libelle="Résumé" valeur={fam.resume} onChange={(v) => setFam({ ...fam, resume: v })} multiligne lignes={3} max={5000} /></div>
                        <div className="sm:col-span-3"><Bouton variante="secondaire" type="submit">Ajouter la famille</Bouton></div>
                    </form>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">Espace public « Tourisme de racines »</h2>
                <Reserve etat={etat} fonction="patrimoinePublic">
                    {role === 'proprietaire' ? <Espace arbre={arbre} onFini={() => void charger()} /> : <p className="text-sm text-encre-2">Seul le propriétaire publie l’espace.</p>}
                    {arbre.public_patrimoine && arbre.slug && <div className="mt-4"><QrPartage lien={lienPatrimoine(arbre.slug)} titre={arbre.territoire ?? arbre.nom} /></div>}
                </Reserve>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">Export patrimonial certifié</h2>
                <Reserve etat={etat} fonction="exportCertifie">{peutEcrire ? <ExportCertifie arbreId={id} /> : <p className="text-sm text-encre-2">Réservé aux éditeurs.</p>}</Reserve>
            </section>

            {edition && (
                <Fenetre titre={edition === 'nouveau' ? 'Nouveau document' : 'Modifier le document'} onFermer={() => setEdition(null)} large>
                    <FormulaireDocument arbreId={id} doc={edition === 'nouveau' ? null : edition} individus={individus} liens={liens} onFini={() => { setEdition(null); void charger(); }} />
                </Fenetre>
            )}
        </main>
    );
}

// ---- FIN PATRIMOINE (gestion) ----
