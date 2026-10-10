import { useEffect, useState } from 'react';
import { LockKey } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { usePortesDuSite } from './portesDuSite';
const RAISONS: Record<string, string> = {
    incomplet: 'Il faut votre e-mail et votre code.',
    identifiants: 'E-mail ou code incorrect.',
    trop_de_demandes: 'Trop d’essais : attendez quelques minutes.',
    hors_ligne: 'Pas d’Internet : le site ne répond pas.',
};
export const BoutonAdministrateur = ({ rail }: {
    rail: boolean;
}) => {
    const [ouverte, setOuverte] = useState(false);
    return (<>
            {rail ? (<button onClick={() => setOuverte(true)} title="Administrateur : ouvrir le site connecté" className="w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier" data-porte="administrateur">
                    <LockKey />
                </button>) : (<button onClick={() => setOuverte(true)} className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-encre-2 text-sm hover:bg-papier text-left" data-porte="administrateur">
                    <LockKey size={18}/>
                    <span className="flex-1">Administrateur</span>
                </button>)}
            {ouverte && <Fenetre onFermer={() => setOuverte(false)}/>}
        </>);
};
const champ = 'h-10 px-3 rounded-[10px] bg-blanc border border-trait text-encre outline-none focus:border-sepia';
const Fenetre = ({ onFermer }: {
    onFermer: () => void;
}) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    useEffect(() => {
        void apiClient.get<{
            email?: string | null;
        }>('/site/etat').then((r) => r.data?.email && setEmail(r.data.email)).catch(() => undefined);
    }, []);
    const ouvrir = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            const r = (await apiClient.post<{
                ok: boolean;
                raison?: string;
                adresse?: string;
            }>('/site/porte-administrateur', { email, motDePasse: code })).data;
            if (r.ok && r.adresse) {
                window.open(r.adresse, '_blank', 'noopener');
                setCode('');
                onFermer();
            }
            else
                setErreur(RAISONS[r.raison ?? ''] ?? 'Le site n’a pas pu être ouvert.');
        }
        catch {
            setErreur('Le site n’a pas pu être ouvert.');
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={onFermer} data-fenetre="administrateur">
            <form className="w-[360px] max-w-[92vw] flex flex-col gap-3 rounded-[16px] bg-carte border border-trait p-5 shadow-xl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void ouvrir(); }}>
                <h2 className="font-display text-2xl m-0">Administrateur</h2>
                <p className="text-[13px] text-encre-2 m-0">Ouvre le site en ligne, déjà connecté en administrateur.</p>
                <label className="flex flex-col gap-1 text-xs text-encre-3">E-mail<input className={champ} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" data-champ="admin-email"/></label>
                <label className="flex flex-col gap-1 text-xs text-encre-3">Code<input className={champ} type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="current-password" autoFocus data-champ="admin-code"/></label>
                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="administrateur">{erreur}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={envoi} className="h-10 px-4 rounded-[10px] bg-sepia text-blanc text-sm font-medium disabled:opacity-60" data-bouton="ouvrir-site-admin">Ouvrir le site</button>
                    <button type="button" onClick={onFermer} className="h-10 px-4 rounded-[10px] text-encre-2 text-sm hover:bg-papier">Annuler</button>
                </div>
            </form>
        </div>);
};
if (typeof window !== 'undefined' && /^(127\.0\.0\.1|localhost|\[::1\])$/.test(window.location.hostname)) {
    const portes = usePortesDuSite.getState().portes;
    if (!portes.includes(BoutonAdministrateur))
        usePortesDuSite.setState({ portes: [...portes, BoutonAdministrateur] });
}
