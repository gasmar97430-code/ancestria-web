// ---- PORTE : L'INSCRIPTION AVANT D'ENTRER ----
//
// Ses mots du 01/10/2026 : « quand je vais sur le site pour qu'une [personne] puisse
// y accéder je ne vois pas où se trouve la demande d'inscription », « pour qu'une
// personne puisse y accéder il faut un bloc de formule pour l'inscription selon les
// restrictions formulées dans le journal ».
// Les restrictions (LOIS_ANCESTRIA.md, loi 2 et loi 3) : nom, prénom, e-mail OU
// téléphone ; zéro anonymat ; la Charte de l'Arbre de Lumière affichée et acceptée ;
// ses deux messages officiels mot pour mot ; l'avis sur les données (CNIL).
// Ce bloc reprend les pièces existantes (src/inscription/ : validation, Charte,
// messages — les mêmes que « Ajouter cette famille ») ; il ne les réécrit pas.
// Envoi : inscrire_visiteur (la base refuse une inscription incomplète), avec le lien
// partagé reçu, ou sans lien (adresse du site) : la base rend alors le lien de la porte,
// et seulement après une inscription valide (audit du 01/10, point 2). L'inscription est
// gardée sur l'appareil : « Ajouter cette famille » ne la redemande pas.
// Posé par Porte.tsx.

import { useState, type ReactNode } from 'react';
import { AppliTelephone } from '../appli-telephone/AppliTelephone'; // 03/10 : Ancestria sur le téléphone
import { MentionAmazon } from '../../src/lib/bannierePartenaires'; // 04/10 : la phrase d'Amazon
import { supabase } from '../prise/supabase';
import { emailAdministrateur } from '../visiteur/visiteur';
import { garderInscription, lireInscription, validerInscription, type ErreursInscription, type Inscrit } from '../../../src/inscription/contact';
import { ARTICLES_CHARTE, AVIS_COURT, ENGAGEMENT_CHARTE, TITRE_CHARTE, VERSION_CHARTE, avisDetaille, charteAcceptee, garderCharte } from '../../../src/inscription/charte';
import { ADMINISTRATEUR, MESSAGE_ACCUEIL } from '../../../src/inscription/messages';
import { TitreCentre } from '../../src/app/TitreCentre'; // l'en-tête de l'appli, tel quel (« au miroir de l'appli »)

const champ = 'h-11 w-full px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[15px] outline-none focus:border-sepia';
const bouton = 'min-h-11 px-4 rounded-[10px] border text-sm font-medium';

const RAISONS: Record<string, string> = {
    inscription_requise: 'L’inscription est incomplète : nom, prénom, et un e-mail ou un téléphone valides.',
    aucun_arbre: 'Le site n’a pas encore d’arbre ouvert au public.',
    trop_d_envois:'Trop d’inscriptions depuis cet appareil : réessayez dans une heure.',
    lien_invalide: 'Ce lien n’est pas (ou plus) valable.',
    lien_ferme: 'Ce lien a été fermé par l’administrateur.',
    pin_requis: 'Ce lien demande un code : utilisez le lien partagé reçu.',
};

/** Inscrit sur cet appareil (inscription complète + Charte acceptée). */
export function dejaInscrit(): boolean {
    try {
        return charteAcceptee(localStorage) && !!lireInscription(localStorage);
    } catch {
        return false;
    }
}

function Libelle({ t, children, erreur, aide }: { t: string; children: ReactNode; erreur?: string; aide?: string }) {
    return (
        <label className="flex flex-col gap-1 text-sm text-encre-2">
            <span>{t}{aide && <span className="text-encre-3 text-xs"> — {aide}</span>}</span>
            {children}
            {erreur && <span className="text-[13px]" style={{ color: 'var(--o-afrique)' }}>{erreur}</span>}
        </label>
    );
}

/** jeton : celui du lien partagé reçu, ou null (adresse du site : le lien de la porte est demandé à la base). */
export function PorteInscription({ jeton, onEntree, onAdministrateur }: { jeton: string | null; onEntree: (jeton: string) => void; onAdministrateur: () => void }) {
    const [s, setS] = useState<Inscrit>({ nom: '', prenom: '', contact: '' });
    const [charte, setCharte] = useState(false);
    const [erreurs, setErreurs] = useState<ErreursInscription & { charte?: string }>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const email = emailAdministrateur();

    const valider = async () => {
        const r = validerInscription(s);
        const manque = charte ? {} : { charte: 'Pour entrer, il faut s’engager à respecter la Charte.' };
        if (!r.ok || !charte) return setErreurs({ ...(r.ok ? {} : r.erreurs), ...manque });
        setErreurs({});
        setErreur(null);
        setEnvoi(true);
        try {
            const { data, error } = await supabase.rpc('inscrire_visiteur', {
                p_jeton: jeton, p_nom: r.inscrit.nom, p_prenom: r.inscrit.prenom, p_contact: r.inscrit.contact, p_charte: VERSION_CHARTE,
            });
            if (error) throw new Error(error.message);
            const res = data as { ok: boolean; raison?: string; jeton?: string };
            if (!res.ok || !res.jeton) return setErreur(RAISONS[res.raison ?? ''] ?? 'L’inscription n’a pas abouti.');
            garderInscription(localStorage, r.inscrit);
            garderCharte(localStorage);
            onEntree(res.jeton);
        } catch {
            setErreur('Le site ne répond pas pour l’instant : rien n’est perdu, réessayez dans un moment.');
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <div className="min-h-screen bg-papier text-encre font-sans flex flex-col">
        <TitreCentre />
        <main className="flex justify-center p-5 sm:p-8" data-porte="inscription">
            <div className="w-full max-w-xl flex flex-col gap-5">
                <h1 className="font-display text-[40px] leading-none font-medium m-0">Bienvenue</h1>
                <p className="text-[15px] leading-relaxed text-encre m-0" data-message="accueil">{MESSAGE_ACCUEIL}</p>
                <AppliTelephone />{/* appli-telephone/ : 03/10, installer sur le téléphone + faire connaître */}
                <form className="flex flex-col gap-3 rounded-[14px] border border-trait bg-carte px-4 py-4 sm:px-5" noValidate onSubmit={(e) => { e.preventDefault(); void valider(); }} data-inscription="porte">
                    <h2 className="font-display text-2xl m-0">Inscription</h2>
                    <Libelle t="Nom" erreur={erreurs.nom}><input className={champ} value={s.nom} maxLength={80} autoComplete="family-name" onChange={(e) => setS({ ...s, nom: e.target.value })} data-champ="inscrit-nom" /></Libelle>
                    <Libelle t="Prénom" erreur={erreurs.prenom}><input className={champ} value={s.prenom} maxLength={80} autoComplete="given-name" onChange={(e) => setS({ ...s, prenom: e.target.value })} data-champ="inscrit-prenom" /></Libelle>
                    <Libelle t="E-mail ou téléphone" erreur={erreurs.contact} aide="l’un des deux suffit"><input className={champ} value={s.contact} maxLength={200} autoComplete="email" onChange={(e) => setS({ ...s, contact: e.target.value })} data-champ="inscrit-contact" /></Libelle>
                    <section className="rounded-[12px] border border-sepia bg-blanc px-4 py-3 flex flex-col gap-2" data-charte="articles">
                        <h3 className="font-display text-xl text-sepia-deep m-0">{TITRE_CHARTE}</h3>
                        <ol className="flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-encre list-decimal pl-5 m-0">
                            {ARTICLES_CHARTE.map((a) => <li key={a.titre}><b>{a.titre}.</b> {a.texte}</li>)}
                        </ol>
                    </section>
                    <label className="flex items-start gap-2.5 text-[14px] text-encre min-h-11">
                        <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--sepia)]" checked={charte} onChange={(e) => { setCharte(e.target.checked); if (e.target.checked) setErreurs((x) => ({ ...x, charte: undefined })); }} data-champ="charte" />
                        <span>{ENGAGEMENT_CHARTE}</span>
                    </label>
                    {erreurs.charte && <span className="text-[13px]" style={{ color: 'var(--o-afrique)' }}>{erreurs.charte}</span>}
                    <div className="text-xs leading-relaxed text-encre-2 flex flex-col gap-1" data-avis="donnees">
                        <p className="m-0"><b>Vos données.</b> {AVIS_COURT}</p>
                        <details>
                            <summary className="cursor-pointer text-sepia-deep underline underline-offset-4 min-h-11 flex items-center">Tout savoir sur vos données et vos droits</summary>
                            <dl className="flex flex-col gap-1 m-0">
                                {avisDetaille(ADMINISTRATEUR, email).map((l) => <div key={l.titre}><dt className="inline font-semibold">{l.titre} : </dt><dd className="inline m-0">{l.texte}</dd></div>)}
                            </dl>
                        </details>
                    </div>
                    {erreur && <p className="text-[13.5px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="porte">{erreur}</p>}
                    <button type="submit" disabled={envoi} className={`${bouton} border-sepia text-blanc bg-sepia hover:bg-sepia-deep disabled:opacity-60`} data-bouton="entrer">
                        {envoi ? 'Inscription…' : 'M’inscrire et entrer'}
                    </button>
                </form>
                <button type="button" onClick={onAdministrateur} className="self-start text-xs text-encre-3 underline underline-offset-4 min-h-11" data-bouton="administrateur">
                    Administrateur : se connecter
                </button>
                <MentionAmazon />{/* 04/10 : phrase exigée par le contrat Amazon Partenaires (lib/bannierePartenaires.tsx), seulement si sa bannière est visible */}
            </div>
        </main>
        </div>
    );
}

// ---- FIN PORTE : L'INSCRIPTION AVANT D'ENTRER ----
