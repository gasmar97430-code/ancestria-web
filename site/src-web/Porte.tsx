// ---- PORTE DU SITE ----
//
// Étape 1a (30/09) : l'écran du bureau s'ouvre pour le propriétaire connecté
// (lecture de son arbre). Sans session : la page de connexion, aux couleurs du
// bureau (lien par e-mail, sans mot de passe). Les visiteurs du lien partagé
// arrivent à l'étape 3.

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adressePublique, configurationPrete, supabase } from './prise/supabase';

export function Porte({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    useEffect(() => {
        void supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => data.subscription.unsubscribe();
    }, []);

    if (!configurationPrete) return <Cadre><p className="text-encre-2 text-sm">Le site n’est pas encore relié à sa base.</p></Cadre>;
    if (session === undefined) return <div className="h-screen bg-papier" />;
    if (!session) return <Connexion />;
    return <>{children}</>;
}

function Cadre({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-screen bg-papier text-encre font-sans grid place-items-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="w-11 h-11" />
                    <div className="text-[11px] tracking-[.14em] uppercase text-encre-3 leading-relaxed">M’astel.974<br />L’Arbre de Lumière</div>
                </div>
                <h1 className="font-display text-[44px] leading-none font-medium m-0">Ancestria</h1>
                {children}
            </div>
        </main>
    );
}

function Connexion() {
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
        </Cadre>
    );
}

// ---- FIN PORTE DU SITE ----
