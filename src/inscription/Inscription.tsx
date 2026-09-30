// ---- INSCRIPTION, PRUDENCE, VERROU : LES ÉCRANS ----
// Règle de l'administrateur (30/09/2026) :
//   1. lire est gratuit et libre ; pour contribuer, on s'inscrit d'abord
//      (Nom, Prénom, e-mail OU téléphone) — aucune contribution anonyme ;
//   2. une contribution envoyée est verrouillée : pour la corriger, on écrit
//      à l'administrateur, qui fait la modification lui-même ;
//   3. ses deux messages officiels, mot pour mot (messages.ts).
// Posé dans pages/Contribuer.tsx par une ligne par composant.

import { useState } from 'react';
import { Alerte, Bouton, Case, Champ } from '../ui/ui';
import { garderInscription, oublierInscription, validerInscription, genreContact, type ErreursInscription, type Inscrit } from './contact';
import { ADMINISTRATEUR, MESSAGE_ACCUEIL, MESSAGE_PRUDENCE, MOT_CORRECTION, emailAdministrateur } from './messages';
import { ARTICLES_CHARTE, AVIS_COURT, ENGAGEMENT_CHARTE, TITRE_CHARTE, avisDetaille, garderCharte } from './charte';

/** La Charte de l'Arbre de Lumière, entière (30/09 : « au moment de l'inscription »). */
export function Charte() {
    return (
        <section className="rounded-2xl border border-sepia/60 bg-carte px-4 py-3.5 flex flex-col gap-2.5" data-charte="articles">
            <h3 className="font-display text-xl text-sepia">{TITRE_CHARTE}</h3>
            <ol className="flex flex-col gap-2 text-sm leading-relaxed text-encre list-decimal pl-5">
                {ARTICLES_CHARTE.map((a) => (
                    <li key={a.titre}><b>{a.titre}.</b> {a.texte}</li>
                ))}
            </ol>
        </section>
    );
}

/** L'avis sur les données personnelles : l'essentiel, puis le détail à déplier (liste de la CNIL). */
export function AvisDonnees() {
    return (
        <div className="text-xs leading-relaxed text-encre-2 flex flex-col gap-1.5" data-avis="donnees">
            <p><b>Vos données.</b> {AVIS_COURT}</p>
            <details>
                <summary className="cursor-pointer text-sepia underline underline-offset-4 min-h-11 flex items-center">Tout savoir sur vos données et vos droits</summary>
                <dl className="flex flex-col gap-1.5 mt-1">
                    {avisDetaille(ADMINISTRATEUR, emailAdministrateur()).map((l) => (
                        <div key={l.titre}><dt className="inline font-semibold">{l.titre} : </dt><dd className="inline">{l.texte}</dd></div>
                    ))}
                </dl>
            </details>
        </div>
    );
}

/** Premier écran de qui veut contribuer : le message d'accueil, la charte, les trois renseignements. */
export function Inscription({ onInscrit, depart }: { onInscrit: (i: Inscrit) => void; depart?: Inscrit | null }) {
    const [s, setS] = useState<Inscrit>(depart ?? { nom: '', prenom: '', contact: '' });
    const [charte, setCharte] = useState(false);
    const [erreurs, setErreurs] = useState<ErreursInscription & { charte?: string }>({});
    const envoyer = () => {
        const r = validerInscription(s);
        const manqueCharte = charte ? {} : { charte: 'Pour contribuer, il faut s’engager à respecter la charte.' };
        if (!r.ok || !charte) {
            setErreurs({ ...(r.ok ? {} : r.erreurs), ...manqueCharte });
            return;
        }
        setErreurs({});
        garderInscription(localStorage, r.inscrit);
        garderCharte(localStorage);
        onInscrit(r.inscrit);
    };
    return (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); envoyer(); }} noValidate data-inscription="formulaire">
            <p className="text-[15px] leading-relaxed text-encre" data-message="accueil">{MESSAGE_ACCUEIL}</p>
            <h2 className="font-display text-2xl">Inscription</h2>
            <Champ libelle="Nom" valeur={s.nom} onChange={(v) => setS({ ...s, nom: v })} erreur={erreurs.nom} obligatoire max={80} autoComplete="family-name" autoFocus />
            <Champ libelle="Prénom" valeur={s.prenom} onChange={(v) => setS({ ...s, prenom: v })} erreur={erreurs.prenom} obligatoire max={80} autoComplete="given-name" />
            <Champ libelle="E-mail ou téléphone" valeur={s.contact} onChange={(v) => setS({ ...s, contact: v })} erreur={erreurs.contact} obligatoire max={200} autoComplete="email"
                aide="L’un des deux suffit." />
            <Charte />
            <Case libelle={ENGAGEMENT_CHARTE} coche={charte} onChange={setCharte} erreur={erreurs.charte} />
            <AvisDonnees />
            <Bouton variante="principal" type="submit">M’inscrire et continuer</Bouton>
            <p className="text-xs text-encre-3">Consulter les pages reste libre et gratuit : l’inscription n’est demandée que pour contribuer.</p>
        </form>
    );
}

/** Le message de prudence, entier. */
export function Prudence() {
    return (
        <div role="note" className="rounded-xl border border-sepia/60 bg-sepia/10 px-3.5 py-3 text-sm leading-relaxed text-encre" data-message="prudence">
            {MESSAGE_PRUDENCE}
        </div>
    );
}

/** Rappel de qui est inscrit, au moment d'envoyer (remplace le « contact facultatif » d'avant). */
export function RappelInscription({ inscrit, onModifier }: { inscrit: Inscrit; onModifier: () => void }) {
    return (
        <div className="rounded-xl border border-trait px-3.5 py-3 text-sm flex flex-col gap-1" data-inscription="rappel">
            <div className="text-xs uppercase tracking-widest text-encre-3">Inscrit</div>
            <div className="text-encre break-words">
                <b>{inscrit.prenom} {inscrit.nom}</b> — {genreContact(inscrit.contact) === 'email' ? 'e-mail' : 'téléphone'} : {inscrit.contact}
            </div>
            <button type="button" className="self-start text-sepia underline underline-offset-4 min-h-11" onClick={() => { oublierInscription(localStorage); onModifier(); }}>
                Ce n’est pas moi / corriger mon inscription
            </button>
        </div>
    );
}

/** Après l'envoi : la contribution est verrouillée ; une correction se demande à l'administrateur. */
export function Verrou() {
    const email = emailAdministrateur();
    const objet = encodeURIComponent(`${MOT_CORRECTION} — Ancestria`);
    return (
        <Alerte genre="info">
            <span data-message="verrou">
                <b>Votre contribution est enregistrée et verrouillée</b> : elle ne peut plus être modifiée ici.
                Pour toute correction, écrivez à l’administrateur, {ADMINISTRATEUR}, en commençant votre message par le mot « {MOT_CORRECTION} » :
                il vérifie et fait la modification lui-même.
                {email && (
                    <>
                        {' '}
                        <a className="text-sepia underline underline-offset-4 break-all inline-flex items-center min-h-11" href={`mailto:${email}?subject=${objet}`} data-verrou="email">{email}</a>
                    </>
                )}
            </span>
        </Alerte>
    );
}

// ---- FIN INSCRIPTION, PRUDENCE, VERROU ----
