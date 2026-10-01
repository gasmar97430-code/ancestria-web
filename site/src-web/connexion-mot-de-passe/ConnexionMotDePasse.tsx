// ---- CONNEXION DE L'ADMINISTRATEUR PAR MOT DE PASSE ----
//
// Sa demande du 01/10/2026 : « sur le site j'aurai le droit de corriger si besoin, en me connectant
// avec un mot de passe que j'aurai fait depuis mon appli et à partir de l'appli ».
//   - ConnexionMotDePasse : e-mail + mot de passe (Supabase Auth : le mot de passe n'est gardé que
//     chiffré par Supabase, jamais par le site ni par l'appli). Un lien « recevoir un lien pour
//     choisir mon mot de passe » sert la première fois et en cas d'oubli (le même que celui que
//     l'appli du PC demande depuis « Mon accès au site »).
//   - ChoisirMotDePasse : la page où arrive ce lien (type=recovery) ; 10 caractères au moins.
// Une fois connecté, il entre en propriétaire (Porte.tsx) ; ses corrections des fiches venues du PC
// sont mises de côté pour le PC par la base (schema.sql, « CORRECTIONS DU PROPRIÉTAIRE »).
//
// Lignes d'appel : Porte.tsx.

import { useEffect, useState, type ReactNode } from 'react';
import { adressePublique, supabase } from '../prise/supabase';
import { TitreCentre } from '../../src/app/TitreCentre';

const champ = 'h-11 px-3 rounded-[10px] bg-blanc border border-trait text-encre outline-none focus:border-sepia';
const bouton = 'h-11 rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium hover:bg-sepia-tint disabled:opacity-60';
const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const LONGUEUR_MIN = 10;

// Le lien de choix du mot de passe arrive avec « type=recovery » dans l'adresse : relevé ICI, au
// chargement, avant que la prise Supabase ne nettoie l'adresse.
const ARRIVEE_PAR_LIEN = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search);

/** Vrai quand il arrive par le lien « choisir mon mot de passe ». */
export function useChoixDuMotDePasse(): [boolean, () => void] {
    const [actif, setActif] = useState(ARRIVEE_PAR_LIEN);
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((evenement) => { if (evenement === 'PASSWORD_RECOVERY') setActif(true); });
        return () => data.subscription.unsubscribe();
    }, []);
    return [actif, () => setActif(false)];
}

function Cadre({ titre, children }: { titre: string; children: ReactNode }) {
    return (
        <div className="min-h-screen bg-papier text-encre font-sans flex flex-col">
            <TitreCentre />
            <main className="flex-1 grid place-items-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-6" data-porte="administrateur">
                    <h1 className="font-display text-[40px] leading-none font-medium m-0">{titre}</h1>
                    {children}
                </div>
            </main>
        </div>
    );
}
const Erreur = ({ t }: { t: string | null }) => (t ? <p className="text-[13px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="connexion">{t}</p> : null);

export function ConnexionMotDePasse({ onRetour }: { onRetour: () => void }) {
    const [email, setEmail] = useState('');
    const [mdp, setMdp] = useState('');
    const [etat, setEtat] = useState<'saisie' | 'envoi' | 'lien-envoye'>('saisie');
    const [erreur, setErreur] = useState<string | null>(null);

    const seConnecter = async () => {
        const e = email.trim().toLowerCase();
        if (!emailValide(e)) return setErreur('Adresse e-mail incomplète.');
        if (!mdp) return setErreur('Mot de passe manquant.');
        setErreur(null);
        setEtat('envoi');
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: mdp });
        setEtat('saisie');
        if (error) setErreur(error.status === 400 ? 'E-mail ou mot de passe incorrect.' : error.status === 429 ? 'Trop d’essais : attendez un peu.' : error.message);
    };
    const recevoirLien = async () => {
        const e = email.trim().toLowerCase();
        if (!emailValide(e)) return setErreur('Écrivez d’abord votre adresse e-mail.');
        setErreur(null);
        setEtat('envoi');
        const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: adressePublique });
        if (error) { setEtat('saisie'); setErreur(error.status === 429 ? 'Trop de demandes : attendez un peu avant de redemander un lien.' : error.message); } else setEtat('lien-envoye');
    };

    return (
        <Cadre titre="Connexion">
            {etat === 'lien-envoye' ? (
                <p className="text-sm text-encre-2 leading-relaxed m-0" data-message="lien-envoye">Un lien vient de partir vers <b className="text-encre">{email.trim()}</b> : ouvrez-le pour choisir votre mot de passe (pensez à la corbeille et aux indésirables).</p>
            ) : (
                <form className="flex flex-col gap-3" onSubmit={(ev) => { ev.preventDefault(); void seConnecter(); }} noValidate>
                    <label className="text-sm text-encre-2" htmlFor="courriel">Votre adresse e-mail</label>
                    <input id="courriel" type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} className={champ} />
                    <label className="text-sm text-encre-2" htmlFor="mot-de-passe">Votre mot de passe</label>
                    <input id="mot-de-passe" type="password" autoComplete="current-password" value={mdp} onChange={(ev) => setMdp(ev.target.value)} className={champ} />
                    <Erreur t={erreur} />
                    <button type="submit" disabled={etat === 'envoi'} className={bouton} data-bouton="se-connecter">{etat === 'envoi' ? 'Un instant…' : 'Se connecter'}</button>
                    <button type="button" onClick={() => void recevoirLien()} disabled={etat === 'envoi'} className="self-start text-xs text-encre-2 underline underline-offset-4 min-h-11" data-bouton="recevoir-lien">
                        Pas encore de mot de passe, ou oublié ? Recevoir un lien pour le choisir
                    </button>
                </form>
            )}
            <button type="button" onClick={onRetour} className="self-start text-xs text-encre-3 underline underline-offset-4 min-h-11">← Retour à l’inscription</button>
        </Cadre>
    );
}

export function ChoisirMotDePasse({ onFini }: { onFini: () => void }) {
    const [mdp, setMdp] = useState('');
    const [mdp2, setMdp2] = useState('');
    const [etat, setEtat] = useState<'saisie' | 'envoi' | 'fait'>('saisie');
    const [erreur, setErreur] = useState<string | null>(null);

    const enregistrer = async () => {
        if (mdp.length < LONGUEUR_MIN) return setErreur(`Au moins ${LONGUEUR_MIN} caractères.`);
        if (mdp !== mdp2) return setErreur('Les deux mots de passe ne sont pas les mêmes.');
        setErreur(null);
        setEtat('envoi');
        const { error } = await supabase.auth.updateUser({ password: mdp });
        if (error) { setEtat('saisie'); setErreur(error.message); } else setEtat('fait');
    };

    return (
        <Cadre titre="Votre mot de passe">
            {etat === 'fait' ? (
                <>
                    <p className="text-sm text-encre-2 leading-relaxed m-0" data-message="mot-de-passe-enregistre">Mot de passe enregistré. Il sert ici, sur le site, et dans votre appli (« Mon accès au site »).</p>
                    <button type="button" onClick={onFini} className={bouton} data-bouton="continuer">Continuer</button>
                </>
            ) : (
                <form className="flex flex-col gap-3" onSubmit={(ev) => { ev.preventDefault(); void enregistrer(); }} noValidate>
                    <label className="text-sm text-encre-2" htmlFor="nouveau-mdp">Nouveau mot de passe ({LONGUEUR_MIN} caractères au moins)</label>
                    <input id="nouveau-mdp" type="password" autoComplete="new-password" value={mdp} onChange={(ev) => setMdp(ev.target.value)} className={champ} />
                    <label className="text-sm text-encre-2" htmlFor="nouveau-mdp-2">Le même, une deuxième fois</label>
                    <input id="nouveau-mdp-2" type="password" autoComplete="new-password" value={mdp2} onChange={(ev) => setMdp2(ev.target.value)} className={champ} />
                    <Erreur t={erreur} />
                    <button type="submit" disabled={etat === 'envoi'} className={bouton} data-bouton="enregistrer-mdp">{etat === 'envoi' ? 'Un instant…' : 'Enregistrer mon mot de passe'}</button>
                </form>
            )}
        </Cadre>
    );
}

// ---- FIN CONNEXION DE L'ADMINISTRATEUR PAR MOT DE PASSE ----
