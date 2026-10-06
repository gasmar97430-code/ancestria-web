// ---- PORTE DU SITE ----
//
// Étape 1a (30/09) : l'écran du bureau s'ouvre pour le propriétaire connecté
// (lecture de son arbre). Les visiteurs du lien partagé arrivent à l'étape 3.
// Bloc refait le 01/10/2026 (sa demande : « pour qu'une personne puisse y accéder
// il faut un bloc de formule pour l'inscription selon les restrictions formulées
// dans le journal ») :
//   - adresse du site, sans connexion : l'INSCRIPTION (porte-inscription/), puis
//     l'arbre public (décédés) par le lien de la porte, en lecture seule ;
//   - lien partagé (/c/<jeton>) : l'inscription d'abord si l'appareil n'est pas
//     encore inscrit, puis le même arbre public ;
//   - « Administrateur : se connecter » (discret) : sa connexion par e-mail, inchangée.

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adressePublique, configurationPrete, supabase } from './prise/supabase';
import { entrerEnProprietaire } from './propositions/Propositions'; // Propositions.tsx : sa porte « Propositions », lui seul
import { entrerEnVisiteur, jetonVisiteur } from './visiteur/visiteur'; // visiteur.ts : le lien partagé s'ouvre sans connexion, en lecture seule
import { PorteInscription, dejaInscrit } from './porte-inscription/PorteInscription';
import { ChoisirMotDePasse, ConnexionMotDePasse, useChoixDuMotDePasse } from './connexion-mot-de-passe/ConnexionMotDePasse'; // 01/10 : sa connexion par mot de passe // l'inscription avant d'entrer (01/10)
import { useAssistantIA } from '../src/app/AssistantIA';
import { TitreCentre } from '../src/app/TitreCentre'; // l'en-tête de l'appli, tel quel (01/10)
import { poserCompteSite } from './compte-site/CompteSite'; // 04/10 : « Site en ligne » + « S'inscrire · Se connecter » sur sa page
import { garderJeton, jetonGarde, porteDemandee } from './porte-inscription/jetonGarde'; // 05/10 : l'inscrit rouvre l'appli et entre
import { InviterAmis } from './inviter-amis/InviterAmis'; // 05/10 : « partager avec des amis » après l'inscription
import { PageVisiteur } from './page-visiteur/PageVisiteur'; // 06/10 : le visiteur s'inscrit et ajoute des noms, rien d'autre

useAssistantIA.setState({ actif: false }); // l'assistant IA tourne sur le PC (IA locale) : pas dans le site en ligne

export function Porte({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [, setTour] = useState(0); // relit l'adresse après l'inscription (/c/<jeton> posé sans recharger)
    const [administrateur, setAdministrateur] = useState(false);
    const [choixMotDePasse, finChoixMotDePasse] = useChoixDuMotDePasse(); // arrivée par le lien « choisir mon mot de passe »
    useEffect(() => poserCompteSite(), []); // compte-site/CompteSite.tsx (après entree.tsx, qui éteint « Site en ligne »)

    useEffect(() => {
        void supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => data.subscription.unsubscribe();
    }, []);

    const jeton = configurationPrete ? (jetonVisiteur() ?? (!porteDemandee() && dejaInscrit() ? jetonGarde() : null)) : null; // jetonGarde.ts : l'inscrit qui rouvre l'appli
    const entrer = (j: string) => {
        if (jetonVisiteur() !== j) window.history.replaceState(null, '', `${import.meta.env.BASE_URL}c/${j}`);
        setTour((t) => t + 1);
    };

    if (!configurationPrete) return <Cadre titre="Bienvenue"><p className="text-encre-2 text-sm">Le site n’est pas encore relié à sa base.</p></Cadre>;
    if (choixMotDePasse) return <ChoisirMotDePasse onFini={finChoixMotDePasse} />;
    if (jeton && dejaInscrit()) { garderJeton(jeton); if (!jetonVisiteur()) window.history.replaceState(null, '', `${import.meta.env.BASE_URL}c/${jeton}`); entrerEnVisiteur(); return session === undefined ? <div className="h-screen bg-papier" /> : session ? <>{children}<InviterAmis /></> : <PageVisiteur />; } // page-visiteur/ : 06/10, sa règle du 05/10 « on s'inscrit et on ajoute des noms et rien d'autre » (l'administrateur connecté garde tout)
    if (session === undefined) return <div className="h-screen bg-papier" />;
    if (session && !jeton) { entrerEnProprietaire(); return <>{children}</>; }
    if (administrateur && !jeton) return <ConnexionMotDePasse onRetour={() => setAdministrateur(false)} />; // 01/10 : mot de passe (l'ancienne Connexion par lien reste ci-dessous)
    return <PorteInscription jeton={jeton} onEntree={entrer} onAdministrateur={() => setAdministrateur(true)} />; // 06/10 : plus de menu de l'appli ici (MenuPorte gardé, sans appel) — le visiteur n'a plus d'arbre derrière, sa règle du 05/10
}

function Cadre({ children, titre = 'Connexion' }: { children: ReactNode; titre?: string }) {
    return (
        <div className="min-h-screen bg-papier text-encre font-sans flex flex-col">
            <TitreCentre />
            <main className="flex-1 grid place-items-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-6">
                    <h1 className="font-display text-[40px] leading-none font-medium m-0">{titre}</h1>
                    {children}
                </div>
            </main>
        </div>
    );
}

export function Connexion({ onRetour }: { onRetour: () => void }) {
    const [email, setEmail] = useState('');
    const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
    const [erreur, setErreur] = useState<string | null>(null);

    const envoyer = async () => {
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return setErreur('Adresse e-mail incomplète.');
        setErreur(null);
        setEtat('envoi');
        const { error } = await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: adressePublique } });
        if (error) {
            setErreur(error.status === 429 ? 'Trop de demandes : attendez un peu avant de redemander un lien.' : error.message);
            setEtat('saisie');
        } else setEtat('envoye');
    };

    return (
        <Cadre>
            {etat === 'envoye' ? (
                <p className="text-sm text-encre-2 leading-relaxed m-0">Un lien de connexion vient de partir vers <b className="text-encre">{email.trim()}</b>. Ouvrez-le (pensez à la corbeille et aux indésirables).</p>
            ) : (
                <form className="flex flex-col gap-3" onSubmit={(ev) => { ev.preventDefault(); void envoyer(); }} noValidate>
                    <label className="text-sm text-encre-2" htmlFor="courriel">Votre adresse e-mail</label>
                    <input id="courriel" type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)}
                        className="h-11 px-3 rounded-[10px] bg-blanc border border-trait text-encre outline-none focus:border-sepia" />
                    {erreur && <p className="text-[13px] m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                    <button type="submit" disabled={etat === 'envoi'}
                        className="h-11 rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium hover:bg-sepia-tint disabled:opacity-60">
                        {etat === 'envoi' ? 'Envoi…' : 'Recevoir mon lien de connexion'}
                    </button>
                </form>
            )}
            <button type="button" onClick={onRetour} className="self-start text-xs text-encre-3 underline underline-offset-4 min-h-11">← Retour à l’inscription</button>
        </Cadre>
    );
}

// ---- FIN PORTE DU SITE ----
