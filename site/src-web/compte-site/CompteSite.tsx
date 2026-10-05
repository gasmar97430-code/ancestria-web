// ---- « SITE EN LIGNE » + « S'INSCRIRE · SE CONNECTER » SUR LE SITE (sa demande du 04/10/2026) ----
//
// Ses mots : « Site en ligne, S'inscrire doit être sur ma page en ligne » — « avec les restrictions que j'ai
// demandées » — « sur ma page ». Le haut à droite du site devient celui du PC (même place, même police) :
//   - « Site en ligne » : l'adresse publique du site (le bouton du PC, rallumé ici) ;
//   - « S'inscrire · Se connecter » : la PORTE du site (inscription + Charte, ou « Administrateur : se
//     connecter ») — les restrictions ne changent pas : un visiteur lit seulement, les vivants restent protégés ;
//   - lui connecté : « Connecté · Se déconnecter ».
// Posé dans l'emplacement vide du PC (src/lib/compteDuSite.tsx). Ligne d'appel : Porte.tsx (poserCompteSite).

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { supabase } from '../prise/supabase';
import { useCompteDuSite } from '../../src/lib/compteDuSite';
import { useBoutonSiteEnLigne } from '../../src/lib/boutonSiteEnLigne';

// 05/10, ses mots : « quand je clique sur inscription je n'ai pas de retour pour revenir sur la page d'accueil » → la page
// d'où l'on vient est notée ici ; la page d'inscription propose « ← Revenir à Ancestria » (porte-inscription/RetourAncestria.tsx).
export const CLE_RETOUR = 'ancestria-retour';

const classe = 'flex items-center gap-1.5 h-6 px-2.5 rounded-[10px] text-[13px] leading-none text-encre-2 hover:bg-papier';

export function CompteSite() {
    const [session, setSession] = useState<Session | null>(null);
    useEffect(() => {
        void supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => data.subscription.unsubscribe();
    }, []);
    if (session) {
        return (
            <button type="button" className={classe} data-bouton="compte-site" title={session.user.email ?? 'Connecté'}
                onClick={() => void supabase.auth.signOut().then(() => window.location.assign(import.meta.env.BASE_URL))}>
                <SignOut size={16} />
                Connecté · Se déconnecter
            </button>
        );
    }
    return (
        <a href={`${import.meta.env.BASE_URL}?porte`} className={classe} data-bouton="compte-site" title="Inscription (avec la Charte) ou connexion de l'administrateur"
            onClick={() => { try { sessionStorage.setItem(CLE_RETOUR, window.location.pathname); } catch { /* sans stockage : pas de retour proposé */ } }}>
            <UserCircle size={16} />
            S’inscrire · Se connecter
        </a>
    );
}

/** Appelée par la porte (au premier affichage) : rallume « Site en ligne » et pose la porte dans l'en-tête. */
export function poserCompteSite(): void {
    useCompteDuSite.setState({ Composant: CompteSite });
    useBoutonSiteEnLigne.setState({ montrer: false }); // 05/10, ses mots : « en haut à droite l'info-bulle Site en ligne il faut l'enlever » (sur le site il renvoyait au site lui-même ; au PC il reste)
}

// ---- FIN « SITE EN LIGNE » + « S'INSCRIRE · SE CONNECTER » SUR LE SITE ----
