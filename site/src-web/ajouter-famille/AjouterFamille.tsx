// ---- « AJOUTER CETTE FAMILLE » (le visiteur du site) ----
//
// Ses textes du 30/09/2026 : « S'il n'est pas trouvé dans la base, un bouton "Ajouter cette
// famille" doit obligatoirement apparaître, permettant à l'utilisateur d'accéder au formulaire de
// proposition d'ajout pour soumettre son propre patronyme » ; « pour que rien n'entre dans l'arbre
// sans ton accord direct » ; « toute personne souhaitant ajouter une famille ou contribuer doit
// obligatoirement s'inscrire en fournissant son Nom, Prénom et Adresse e-mail ou Numéro de
// téléphone » ; charte affichée à l'inscription ; contribution verrouillée une fois envoyée.
//
// Posé dans l'emplacement vide de l'Accueil du PC (src/lib/ajouterFamille.tsx de la copie), SUR
// PLACE sous « Aucun patronyme ne correspond » — pas de fenêtre posée par-dessus.
// Trois temps : 1. inscription + Charte (une fois par téléphone) ; 2. la famille : vous, vos
// proches, ce que vous savez ; 3. envoyé = verrouillé.
// L'inscription, la Charte, ses deux messages officiels : les MÊMES fichiers que l'ancien site
// (src/inscription, textes mot pour mot) — une seule source.
// Envoi : soumettre_contribution (jeton du lien partagé) ; la base contrôle tout de nouveau.
// Ligne d'appel : visiteur/visiteur.ts (entrerEnVisiteur).

import { useState, type ReactNode } from 'react';
import { supabase } from '../prise/supabase';
import { jetonVisiteur, emailAdministrateur } from '../visiteur/visiteur';
import { garderInscription, genreContact, lireInscription, oublierInscription, validerInscription, type ErreursInscription, type Inscrit } from '../../../src/inscription/contact';
import { ARTICLES_CHARTE, AVIS_COURT, ENGAGEMENT_CHARTE, TITRE_CHARTE, VERSION_CHARTE, avisDetaille, charteAcceptee, garderCharte } from '../../../src/inscription/charte';
import { ADMINISTRATEUR, MESSAGE_ACCUEIL, MESSAGE_PRUDENCE, MOT_CORRECTION } from '../../../src/inscription/messages';
import { MAX_PROCHES, validerFamille, type ErreursFamille, type ProcheSaisi, type SaisieFamille } from './proposition';

const RAISONS: Record<string, string> = {
    lien_invalide: 'Ce lien n’est pas complet. Demandez-le à nouveau à la personne qui vous l’a envoyé.',
    lien_ferme: 'Ce partage est fermé ou a expiré. Demandez un nouveau lien à l’administrateur.',
    pin_requis: 'Ce partage est protégé : entrez le code de la famille.',
    pin_faux: 'Code incorrect.',
    trop_d_essais: 'Trop d’essais de code : réessayez dans une heure.',
    trop_d_envois: 'Beaucoup d’envois depuis ce réseau : réessayez dans une heure.',
    contenu_invalide: 'Une information envoyée n’est pas au bon format.',
    inscription_requise: 'Pour contribuer, l’inscription est obligatoire : nom, prénom, et e-mail ou téléphone.',
};

const LIENS: { v: ProcheSaisi['relation']; t: string }[] = [
    { v: 'parent', t: 'Mon père / ma mère' },
    { v: 'conjoint', t: 'Mon conjoint' },
    { v: 'enfant', t: 'Mon enfant' },
];

const champ = 'h-11 w-full px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[15px] outline-none focus:border-sepia';
const bouton = 'min-h-11 px-4 rounded-[10px] border text-sm font-medium';
const Erreur = ({ t }: { t?: string }) => (t ? <span className="text-[13px]" style={{ color: 'var(--o-afrique)' }} data-erreur>{t}</span> : null);

function Libelle({ t, children, erreur, aide }: { t: string; children: ReactNode; erreur?: string; aide?: string }) {
    return (
        <label className="flex flex-col gap-1 text-[13px] text-encre-2">
            {t}
            {children}
            {aide && <span className="text-xs text-encre-3">{aide}</span>}
            <Erreur t={erreur} />
        </label>
    );
}

export function AjouterFamille({ nom }: { nom: string }) {
    const [ouvert, setOuvert] = useState(false);
    const [inscrit, setInscrit] = useState<Inscrit | null>(() => (charteAcceptee(localStorage) ? lireInscription(localStorage) : null));
    const [envoye, setEnvoye] = useState(false);
    const [pour, setPour] = useState(nom);
    if (pour !== nom) {
        // un autre nom est cherché : le bloc repart du bouton (l'inscription, elle, reste gardée)
        setPour(nom);
        setOuvert(false);
        setEnvoye(false);
    }
    if (!nom) return null;
    return (
        <div className="px-4 pb-5 flex flex-col gap-3" data-ajouter-famille>
            {!ouvert && !envoye && (
                <button type="button" onClick={() => setOuvert(true)} data-bouton="ajouter-famille"
                    className={`${bouton} self-start border-sepia text-sepia-deep bg-blanc hover:bg-sepia-tint`}>
                    Ajouter cette famille
                </button>
            )}
            {ouvert && !envoye && !inscrit && <Inscription onInscrit={setInscrit} onFermer={() => setOuvert(false)} />}
            {ouvert && !envoye && inscrit && (
                <Formulaire famille={nom} inscrit={inscrit} onEnvoye={() => setEnvoye(true)} onFermer={() => setOuvert(false)}
                    onChangerInscrit={() => { oublierInscription(localStorage); setInscrit(null); }} />
            )}
            {envoye && <Verrou />}
        </div>
    );
}

function Inscription({ onInscrit, onFermer }: { onInscrit: (i: Inscrit) => void; onFermer: () => void }) {
    const [s, setS] = useState<Inscrit>({ nom: '', prenom: '', contact: '' });
    const [charte, setCharte] = useState(false);
    const [erreurs, setErreurs] = useState<ErreursInscription & { charte?: string }>({});
    const email = emailAdministrateur();
    const valider = () => {
        const r = validerInscription(s);
        const manque = charte ? {} : { charte: 'Pour contribuer, il faut s’engager à respecter la charte.' };
        if (!r.ok || !charte) return setErreurs({ ...(r.ok ? {} : r.erreurs), ...manque });
        garderInscription(localStorage, r.inscrit);
        garderCharte(localStorage);
        onInscrit(r.inscrit);
    };
    return (
        <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); valider(); }} data-inscription="formulaire">
            <p className="text-[14px] leading-relaxed text-encre m-0" data-message="accueil">{MESSAGE_ACCUEIL}</p>
            <h3 className="font-display text-2xl m-0">Inscription</h3>
            <Libelle t="Nom" erreur={erreurs.nom}><input className={champ} value={s.nom} maxLength={80} autoComplete="family-name" onChange={(e) => setS({ ...s, nom: e.target.value })} data-champ="inscrit-nom" /></Libelle>
            <Libelle t="Prénom" erreur={erreurs.prenom}><input className={champ} value={s.prenom} maxLength={80} autoComplete="given-name" onChange={(e) => setS({ ...s, prenom: e.target.value })} data-champ="inscrit-prenom" /></Libelle>
            <Libelle t="E-mail ou téléphone" erreur={erreurs.contact} aide="L’un des deux suffit."><input className={champ} value={s.contact} maxLength={200} autoComplete="email" onChange={(e) => setS({ ...s, contact: e.target.value })} data-champ="inscrit-contact" /></Libelle>
            <section className="rounded-[12px] border border-sepia bg-blanc px-4 py-3 flex flex-col gap-2" data-charte="articles">
                <h4 className="font-display text-xl text-sepia-deep m-0">{TITRE_CHARTE}</h4>
                <ol className="flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-encre list-decimal pl-5 m-0">
                    {ARTICLES_CHARTE.map((a) => <li key={a.titre}><b>{a.titre}.</b> {a.texte}</li>)}
                </ol>
            </section>
            <label className="flex items-start gap-2.5 text-[14px] text-encre min-h-11">
                <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--sepia)]" checked={charte} onChange={(e) => setCharte(e.target.checked)} data-champ="charte" />
                <span>{ENGAGEMENT_CHARTE}</span>
            </label>
            <Erreur t={erreurs.charte} />
            <div className="text-xs leading-relaxed text-encre-2 flex flex-col gap-1" data-avis="donnees">
                <p className="m-0"><b>Vos données.</b> {AVIS_COURT}</p>
                <details>
                    <summary className="cursor-pointer text-sepia-deep underline underline-offset-4 min-h-11 flex items-center">Tout savoir sur vos données et vos droits</summary>
                    <dl className="flex flex-col gap-1 m-0">
                        {avisDetaille(ADMINISTRATEUR, email).map((l) => <div key={l.titre}><dt className="inline font-semibold">{l.titre} : </dt><dd className="inline m-0">{l.texte}</dd></div>)}
                    </dl>
                </details>
            </div>
            <div className="flex flex-wrap gap-2">
                <button type="submit" className={`${bouton} border-sepia text-blanc bg-sepia hover:bg-sepia-deep`} data-bouton="inscrire">M’inscrire et continuer</button>
                <button type="button" onClick={onFermer} className={`${bouton} border-trait text-encre-2 bg-blanc`}>Annuler</button>
            </div>
            <p className="text-xs text-encre-3 m-0">Consulter les pages reste libre et gratuit : l’inscription n’est demandée que pour contribuer.</p>
        </form>
    );
}

function Formulaire({ famille, inscrit, onEnvoye, onFermer, onChangerInscrit }: { famille: string; inscrit: Inscrit; onEnvoye: () => void; onFermer: () => void; onChangerInscrit: () => void }) {
    const nomFamille = famille.toUpperCase();
    const [s, setS] = useState<SaisieFamille>({ famille: nomFamille, prenom: inscrit.prenom, nom: inscrit.nom, annee: '', proches: [], message: '' });
    const [erreurs, setErreurs] = useState<ErreursFamille>({});
    const [pin, setPin] = useState<string | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [uid] = useState(() => crypto.randomUUID()); // un renvoi du même envoi n'entre qu'une fois
    const proche = (i: number, p: Partial<ProcheSaisi>) => setS({ ...s, proches: s.proches.map((x, j) => (j === i ? { ...x, ...p } : x)) });

    const envoyer = async () => {
        const v = validerFamille(s);
        if (!v.ok) return setErreurs(v.erreurs);
        setErreurs({});
        setErreur(null);
        setEnvoi(true);
        try {
            const { data, error } = await supabase.rpc('soumettre_contribution', {
                p_jeton: jetonVisiteur(), p_pin: pin, p_contact: inscrit.contact, p_uid: uid,
                p_contenu: { ...v.contenu, inscrit: { nom: inscrit.nom, prenom: inscrit.prenom, charte: VERSION_CHARTE } },
            });
            if (error) throw new Error(error.message);
            const r = data as { ok: boolean; raison?: string };
            if (r.ok) return onEnvoye();
            if (r.raison === 'pin_requis' || r.raison === 'pin_faux') setPin((x) => x ?? '');
            setErreur(RAISONS[r.raison ?? ''] ?? 'L’envoi n’a pas abouti.');
        } catch {
            setErreur('Pas de connexion pour l’instant : rien n’est perdu, réessayez l’envoi dans un moment.');
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); void envoyer(); }} data-formulaire="famille">
            <h3 className="font-display text-2xl m-0">Ajouter la famille {nomFamille}</h3>
            <div role="note" className="rounded-[12px] border border-sepia bg-sepia-tint px-3.5 py-3 text-[13.5px] leading-relaxed text-encre" data-message="prudence">{MESSAGE_PRUDENCE}</div>
            <Libelle t="Nom de famille" erreur={erreurs.famille}><input className={champ} value={s.famille} maxLength={80} onChange={(e) => setS({ ...s, famille: e.target.value })} data-champ="famille" /></Libelle>

            <fieldset className="flex flex-col gap-2 border border-trait rounded-[12px] px-3.5 pt-1 pb-3.5 m-0">
                <legend className="px-1 text-xs uppercase tracking-widest text-encre-3">Vous</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Libelle t="Prénom" erreur={erreurs.prenom}><input className={champ} value={s.prenom} maxLength={80} onChange={(e) => setS({ ...s, prenom: e.target.value })} data-champ="prenom" /></Libelle>
                    <Libelle t="Nom" erreur={erreurs.nom}><input className={champ} value={s.nom} maxLength={80} onChange={(e) => setS({ ...s, nom: e.target.value })} data-champ="nom" /></Libelle>
                    <Libelle t="Année de naissance" erreur={erreurs.annee} aide="Facultatif"><input className={champ} value={s.annee} inputMode="numeric" maxLength={4} onChange={(e) => setS({ ...s, annee: e.target.value })} data-champ="annee" /></Libelle>
                </div>
            </fieldset>

            {s.proches.map((p, i) => (
                <fieldset key={i} className="flex flex-col gap-2 border border-trait rounded-[12px] px-3.5 pt-1 pb-3.5 m-0" data-proche={i}>
                    <legend className="px-1 text-xs uppercase tracking-widest text-encre-3">Proche {i + 1}</legend>
                    <div className="flex flex-wrap gap-1.5">
                        {LIENS.map((l) => (
                            <button key={l.v} type="button" onClick={() => proche(i, { relation: l.v })}
                                className={`min-h-11 px-3 rounded-[10px] border text-[13px] ${p.relation === l.v ? 'bg-sepia-tint border-sepia text-encre' : 'bg-blanc border-trait text-encre-2'}`}>{l.t}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Libelle t="Prénom" erreur={erreurs[`proche-${i}-prenom`]}><input className={champ} value={p.prenom} maxLength={80} onChange={(e) => proche(i, { prenom: e.target.value })} data-champ={`proche-${i}-prenom`} /></Libelle>
                        <Libelle t="Nom" erreur={erreurs[`proche-${i}-nom`]}><input className={champ} value={p.nom} maxLength={80} onChange={(e) => proche(i, { nom: e.target.value })} /></Libelle>
                        <Libelle t="Année de naissance" erreur={erreurs[`proche-${i}-annee`]} aide="Facultatif"><input className={champ} value={p.annee} inputMode="numeric" maxLength={4} onChange={(e) => proche(i, { annee: e.target.value })} /></Libelle>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-[14px] text-encre min-h-11">
                            <input type="checkbox" className="w-5 h-5 accent-[var(--sepia)]" checked={p.decede} onChange={(e) => proche(i, { decede: e.target.checked })} />
                            Décédé(e)
                        </label>
                        <button type="button" className="min-h-11 text-[13px] text-encre-2 underline underline-offset-4" onClick={() => setS({ ...s, proches: s.proches.filter((_, j) => j !== i) })}>Retirer ce proche</button>
                    </div>
                </fieldset>
            ))}
            {s.proches.length < MAX_PROCHES && (
                <button type="button" data-bouton="ajouter-proche" className={`${bouton} self-start border-trait text-encre bg-blanc hover:border-sepia`}
                    onClick={() => setS({ ...s, proches: [...s.proches, { relation: 'parent', prenom: '', nom: s.famille, annee: '', decede: true }] })}>
                    + Ajouter un proche
                </button>
            )}

            <Libelle t="Ce que vous savez de cette famille (origine, communes, histoire…)" erreur={erreurs.message} aide="Facultatif. Rien n’entre dans l’arbre sans l’accord de l’administrateur.">
                <textarea className={`${champ} h-28 py-2`} value={s.message} maxLength={2000} onChange={(e) => setS({ ...s, message: e.target.value })} data-champ="message" />
            </Libelle>

            {pin !== null && (
                <Libelle t="Code de la famille"><input className={champ} value={pin} inputMode="numeric" maxLength={12} onChange={(e) => setPin(e.target.value)} data-champ="pin" /></Libelle>
            )}

            <div className="rounded-[12px] border border-trait px-3.5 py-2.5 text-[13.5px] flex flex-col gap-0.5" data-inscription="rappel">
                <span className="text-xs uppercase tracking-widest text-encre-3">Inscrit</span>
                <span className="text-encre break-words"><b>{inscrit.prenom} {inscrit.nom}</b> — {genreContact(inscrit.contact) === 'email' ? 'e-mail' : 'téléphone'} : {inscrit.contact}</span>
                <button type="button" className="self-start text-sepia-deep underline underline-offset-4 min-h-11" onClick={onChangerInscrit}>Ce n’est pas moi / corriger mon inscription</button>
            </div>
            {erreur && <p className="text-[14px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="envoi">{erreur}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={envoi} className={`${bouton} border-sepia text-blanc bg-sepia hover:bg-sepia-deep disabled:opacity-60`} data-bouton="envoyer">
                    {envoi ? 'Envoi…' : 'Envoyer ma proposition'}
                </button>
                <button type="button" onClick={onFermer} className={`${bouton} border-trait text-encre-2 bg-blanc`}>Annuler</button>
            </div>
        </form>
    );
}

function Verrou() {
    const email = emailAdministrateur();
    const objet = encodeURIComponent(`${MOT_CORRECTION} — Ancestria`);
    return (
        <div className="rounded-[12px] border border-sepia bg-sepia-tint px-4 py-3 text-[14px] leading-relaxed text-encre" data-message="verrou">
            <b>Votre proposition est enregistrée et verrouillée</b> : elle ne peut plus être modifiée ici. Elle entrera dans l’arbre
            quand l’administrateur l’aura vérifiée. Pour toute correction, écrivez à l’administrateur, {ADMINISTRATEUR}, en commençant
            votre message par le mot « {MOT_CORRECTION} ».
            {email && <> <a className="text-sepia-deep underline underline-offset-4 break-all" href={`mailto:${email}?subject=${objet}`}>{email}</a></>}
        </div>
    );
}

// ---- FIN « AJOUTER CETTE FAMILLE » ----
