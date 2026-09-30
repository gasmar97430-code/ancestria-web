// Connexion par lien magique : pas de mot de passe à retenir ni à voler.
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { messageErreur } from '../domaine/erreurs';
import { Alerte, Bouton, Champ } from '../ui/ui';
import { Signature } from '../arbre-bureau/Signature';

export function Connexion() {
    const [email, setEmail] = useState('');
    const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
    const [erreur, setErreur] = useState<string | null>(null);

    const envoyer = async () => {
        setErreur(null);
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) {
            setErreur('Adresse e-mail incomplète.');
            return;
        }
        setEtat('envoi');
        const { error } = await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: config.adressePublique } });
        if (error) {
            setErreur(error.status === 429 ? 'Trop de demandes : attendez une minute avant de redemander un lien.' : messageErreur(error));
            setEtat('saisie');
        } else {
            setEtat('envoye');
        }
    };

    return (
        <main className="min-h-dvh grid place-items-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-5">
                <Signature centre />
                <div className="text-center">
                    <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="w-16 h-16 mx-auto mb-3" />
                    <h1 className="font-display text-4xl">Ancestria</h1>
                    <p className="text-encre-2 mt-1">L’arbre de famille que l’on complète ensemble.</p>
                </div>
                {etat === 'envoye' ? (
                    <Alerte genre="succes">Un lien de connexion vient de partir vers <b>{email.trim()}</b>. Ouvrez-le sur cet appareil (pensez aux courriers indésirables).</Alerte>
                ) : (
                    <form className="flex flex-col gap-4" onSubmit={(ev) => { ev.preventDefault(); void envoyer(); }} noValidate>
                        <Champ libelle="Votre adresse e-mail" valeur={email} onChange={setEmail} type="email" mode="email" autoComplete="email" erreur={erreur ?? undefined} />
                        <Bouton variante="principal" type="submit" enCours={etat === 'envoi'}>Recevoir mon lien de connexion</Bouton>
                    </form>
                )}
                <p className="text-xs text-encre-3 text-center">Pas de mot de passe : un lien valable une fois arrive par e-mail.</p>
            </div>
        </main>
    );
}
