import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface EtatSession {
    session: Session | null;
    chargement: boolean;
}

const Contexte = createContext<EtatSession>({ session: null, chargement: true });

export function FournisseurSession({ children }: { children: ReactNode }) {
    const [etat, setEtat] = useState<EtatSession>({ session: null, chargement: true });
    useEffect(() => {
        let vivant = true;
        supabase.auth.getSession().then(({ data }) => {
            if (vivant) setEtat({ session: data.session, chargement: false });
        }).catch(() => {
            if (vivant) setEtat({ session: null, chargement: false });
        });
        const { data } = supabase.auth.onAuthStateChange((_evenement, session) => {
            if (vivant) setEtat({ session, chargement: false });
        });
        return () => {
            vivant = false;
            data.subscription.unsubscribe();
        };
    }, []);
    return <Contexte.Provider value={etat}>{children}</Contexte.Provider>;
}

export const useSession = () => useContext(Contexte);
