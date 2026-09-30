// ---- TOURISME DE RACINES (espace public d'une collectivité) ----
// Sans compte. Le visiteur cherche ses ancêtres liés au territoire : par
// nom (accents ignorés), thématique (migration, engagisme…), personnalités
// illustres, familles historiques ; carte des naissances et des archives ;
// notice mémorielle de chaque personne. Jamais une personne vivante.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TYPE_DOCUMENT, nombre } from '../domaine/libelles';
import { dateLisible } from '../domaine/dates';
import type { Genre, Precision, TypeDocument } from '../domaine/types';
import { Carte, type Point } from '../composants/Carte';
import { Portrait } from '../ui/Portrait';
import { Alerte, Case, Champ, Chargement, Choix, Fenetre } from '../ui/ui';
import { Signature } from '../arbre-bureau/Signature';

interface Espace {
    ok: boolean;
    nom: string;
    territoire: string | null;
    description: string | null;
    centre: [number, number] | null;
    individus: number;
    illustres: number;
    documents: number;
    thematiques: string[];
    familles: { nom: string; resume: string | null; origine: string | null; periode: string | null }[];
}
interface Resultat {
    id: string; prenom: string; nom: string; genre: Genre; naissance_annee: number | null; deces_annee: number | null;
    lieu_naissance: string | null; profession: string | null; illustre: boolean; thematiques: string[]; position: [number, number] | null;
}
interface Notice {
    ok: boolean;
    individu: {
        id: string; prenom: string; nom: string; genre: Genre; photo_url: string | null; se_nomme: string | null; naissance: string | null; naissance_precision: Precision; lieu_naissance: string | null;
        deces: string | null; deces_precision: Precision; lieu_deces: string | null; profession: string | null; biographie: string | null; illustre: boolean; thematiques: string[];
    };
    parents: { id: string; prenom: string; nom: string }[];
    enfants: { id: string; prenom: string; nom: string }[];
    documents: { id: string; titre: string; type: TypeDocument; periode: string | null; lieu: string | null; url: string | null; cote: string | null; source: string | null; droits: string | null; description: string | null }[];
}
interface PointsCarte {
    documents: { id: string; titre: string; type: TypeDocument; lieu: string | null; periode: string | null; position: [number, number] }[];
    naissances: { id: string; prenom: string; nom: string; lieu: string | null; annee: number | null; illustre: boolean; position: [number, number] }[];
}

export function PatrimoinePublic() {
    const { slug = '' } = useParams();
    const [espace, setEspace] = useState<Espace | null>(null);
    const [introuvable, setIntrouvable] = useState(false);
    const [texte, setTexte] = useState('');
    const [thematique, setThematique] = useState('');
    const [illustres, setIllustres] = useState(false);
    const [famille, setFamille] = useState('');
    const [resultats, setResultats] = useState<Resultat[] | null>(null);
    const [carte, setCarte] = useState<PointsCarte | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    useEffect(() => {
        void supabase.rpc('patrimoine_public', { p_slug: slug }).then(({ data, error }) => {
            if (error) setErreur('Pas de connexion au serveur.');
            else if (!(data as Espace).ok) setIntrouvable(true);
            else setEspace(data as Espace);
        });
        void supabase.rpc('patrimoine_carte', { p_slug: slug }).then(({ data }) => {
            if (data && (data as { ok: boolean }).ok) setCarte(data as PointsCarte);
        });
    }, [slug]);

    // Recherche (légèrement retardée pendant la frappe).
    useEffect(() => {
        if (!espace) return;
        const t = setTimeout(() => {
            void supabase.rpc('patrimoine_recherche', { p_slug: slug, p_texte: texte || null, p_thematique: thematique || null, p_illustres: illustres, p_famille: famille || null })
                .then(({ data, error }) => {
                    if (error) setErreur('La recherche n’a pas abouti : réessayez.');
                    else setResultats(((data as { resultats: Resultat[] }).resultats) ?? []);
                });
        }, 250);
        return () => clearTimeout(t);
    }, [espace, slug, texte, thematique, illustres, famille]);

    const ouvrir = useCallback(async (id: string) => {
        const { data } = await supabase.rpc('patrimoine_individu', { p_slug: slug, p_individu: id });
        if (data && (data as Notice).ok) setNotice(data as Notice);
    }, [slug]);

    const points: Point[] = useMemo(() => {
        if (!carte) return [];
        return [
            ...carte.naissances.map((n) => ({
                id: `n-${n.id}`, position: n.position, couleur: n.illustre ? '#d9a95b' : '#7fa7d6', rayon: n.illustre ? 9 : 6,
                contenu: <button type="button" className="text-left" onClick={() => void ouvrir(n.id)}><b>{n.prenom} {n.nom}</b><br />né·e {n.annee ? `en ${n.annee}` : ''} {n.lieu ? `à ${n.lieu}` : ''}</button>,
            })),
            ...carte.documents.map((d) => ({
                id: `d-${d.id}`, position: d.position, couleur: '#8fbf7a', rayon: 7,
                contenu: <div><b>{d.titre}</b><br />{TYPE_DOCUMENT[d.type]}{d.periode ? ` · ${d.periode}` : ''}{d.lieu ? <><br />{d.lieu}</> : null}</div>,
            })),
        ];
    }, [carte, ouvrir]);

    if (introuvable) return <main className="max-w-xl mx-auto p-6"><Alerte>Cet espace patrimonial n’existe pas ou n’est plus publié.</Alerte></main>;
    if (!espace) return erreur ? <main className="p-6"><Alerte>{erreur}</Alerte></main> : <Chargement />;

    return (
        <main className="max-w-5xl mx-auto p-5 sm:p-8 flex flex-col gap-6">
            <header>
                <div className="mb-4"><Signature /></div>
                <div className="text-xs uppercase tracking-widest text-encre-3">Tourisme de racines · {espace.territoire ?? ''}</div>
                <h1 className="font-display text-4xl sm:text-5xl mt-1">{espace.nom}</h1>
                {espace.description && <p className="text-encre-2 mt-3 max-w-3xl whitespace-pre-line">{espace.description}</p>}
                <div className="text-sm text-encre-3 mt-2">
                    {nombre(espace.individus, 'personne', 'personnes')} · {nombre(espace.illustres, 'personnalité illustre', 'personnalités illustres')} · {nombre(espace.documents, 'document d’archives', 'documents d’archives')}
                </div>
            </header>

            <section className="rounded-2xl border border-trait bg-carte p-4 grid gap-3 sm:grid-cols-4" aria-label="Retrouver vos ancêtres">
                <div className="sm:col-span-2"><Champ libelle="Retrouver un ancêtre" valeur={texte} onChange={setTexte} placeholder="nom ou prénom, ex. Martin" autoComplete="off" /></div>
                <Choix libelle="Thématique" valeur={thematique} onChange={setThematique} options={[['', 'Toutes'] as const, ...espace.thematiques.map((t) => [t, t] as const)]} />
                <Choix libelle="Famille historique" valeur={famille} onChange={setFamille} options={[['', 'Toutes'] as const, ...espace.familles.map((f) => [f.nom, f.nom] as const)]} />
                <div className="sm:col-span-4"><Case libelle="Personnalités illustres seulement" coche={illustres} onChange={setIllustres} /></div>
            </section>

            {erreur && <Alerte>{erreur}</Alerte>}

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <section aria-label="Résultats">
                    {!resultats ? <Chargement /> : resultats.length === 0 ? <p className="text-encre-2">Aucune personne ne correspond.</p> : (
                        <ul className="flex flex-col divide-y divide-trait-leger rounded-2xl border border-trait bg-carte max-h-[560px] overflow-y-auto">
                            {resultats.map((r) => (
                                <li key={r.id}>
                                    <button type="button" className="w-full text-left p-3 hover:bg-carte-2 min-h-12" onClick={() => void ouvrir(r.id)}>
                                        <div>{r.illustre && <span className="text-sepia">★ </span>}<b>{r.prenom} {r.nom}</b> <span className="text-xs text-encre-3">{r.naissance_annee ?? '?'} – {r.deces_annee ?? '?'}</span></div>
                                        <div className="text-xs text-encre-3">{[r.profession, r.lieu_naissance, ...r.thematiques].filter(Boolean).join(' · ')}</div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {resultats && resultats.length >= 300 && <p className="text-xs text-encre-3 mt-2">300 premiers résultats : précisez la recherche.</p>}
                </section>
                <section aria-label="Carte">
                    <Carte points={points} centre={espace.centre} hauteur={560} />
                    <div className="flex gap-4 text-xs text-encre-3 mt-2">
                        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-bleu" /> naissance</span>
                        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-sepia" /> personnalité illustre</span>
                        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-vert" /> archive</span>
                    </div>
                </section>
            </div>

            {espace.familles.length > 0 && (
                <section>
                    <h2 className="font-display text-2xl mb-3">Familles historiques</h2>
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {espace.familles.map((f) => (
                            <li key={f.nom}>
                                <button type="button" className="w-full text-left rounded-2xl border border-trait bg-carte p-4 hover:border-sepia" onClick={() => setFamille(f.nom)}>
                                    <b className="font-display text-xl">{f.nom}</b>
                                    <div className="text-xs text-encre-3">{[f.origine, f.periode].filter(Boolean).join(' · ')}</div>
                                    {f.resume && <p className="text-sm text-encre-2 mt-2 line-clamp-4">{f.resume}</p>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {notice && (
                <Fenetre titre={`${notice.individu.prenom} ${notice.individu.nom}`.trim()} onFermer={() => setNotice(null)} large>
                    <div className="flex flex-col gap-4">
                        {notice.individu.photo_url && <Portrait individu={notice.individu} taille={112} />}
                        <div className="text-sm text-encre-2">
                            {notice.individu.naissance && <div>Naissance : {dateLisible(notice.individu.naissance, notice.individu.naissance_precision)}{notice.individu.lieu_naissance ? `, ${notice.individu.lieu_naissance}` : ''}</div>}
                            {notice.individu.deces && <div>Décès : {dateLisible(notice.individu.deces, notice.individu.deces_precision)}{notice.individu.lieu_deces ? `, ${notice.individu.lieu_deces}` : ''}</div>}
                            {notice.individu.profession && <div>{notice.individu.profession}</div>}
                        </div>
                        {notice.individu.biographie && <p className="leading-relaxed whitespace-pre-line">{notice.individu.biographie}</p>}
                        {(notice.parents.length > 0 || notice.enfants.length > 0) && (
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                                {notice.parents.length > 0 && <div><div className="text-xs uppercase text-encre-3">Parents</div>{notice.parents.map((p) => <button key={p.id} type="button" className="block text-sepia min-h-9" onClick={() => void ouvrir(p.id)}>{p.prenom} {p.nom}</button>)}</div>}
                                {notice.enfants.length > 0 && <div><div className="text-xs uppercase text-encre-3">Enfants</div>{notice.enfants.map((p) => <button key={p.id} type="button" className="block text-sepia min-h-9" onClick={() => void ouvrir(p.id)}>{p.prenom} {p.nom}</button>)}</div>}
                            </div>
                        )}
                        {notice.documents.length > 0 && (
                            <div>
                                <div className="text-xs uppercase text-encre-3 mb-1">Archives</div>
                                <ul className="flex flex-col gap-2">
                                    {notice.documents.map((d) => (
                                        <li key={d.id} className="rounded-xl border border-trait p-3 text-sm">
                                            <b>{d.titre}</b> <span className="text-encre-3">({TYPE_DOCUMENT[d.type]}{d.periode ? `, ${d.periode}` : ''})</span>
                                            {d.description && <div className="text-encre-2 mt-1">{d.description}</div>}
                                            <div className="text-xs text-encre-3 mt-1">{[d.source, d.cote && `cote ${d.cote}`, d.droits].filter(Boolean).join(' · ')}</div>
                                            {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sepia underline text-xs break-all inline-flex items-center min-h-9">Consulter l’archive</a>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Fenetre>
            )}
        </main>
    );
}

// ---- FIN TOURISME DE RACINES ----
