import { useEffect, useState } from 'react';
import { CloudArrowUp, X } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { create } from 'zustand';
import { useLectureSeule } from './lectureSeule';
type Etat = {
    connecte: boolean;
    email: string | null;
    dernierEnvoi: string | null;
    changements: number;
    rappel: boolean;
    coffre: boolean;
};
type CompteRendu = {
    ok: boolean;
    raison?: string;
    ajoutees?: number;
    modifiees?: number;
    couples_ajoutes?: number;
    liens_ajoutes?: number;
    a_retirer?: number[];
    retirees?: number;
    refus?: string[];
    en_ligne?: {
        personnes: number;
        couples: number;
        liens: number;
    };
    envoyes?: {
        personnes: number;
        couples: number;
        liens: number;
    };
    quand?: string;
};
const ADRESSE_ADMINISTRATEUR = 'gasmar97430@gmail.com';
const heure = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const champ = 'h-10 px-3 rounded-[10px] bg-blanc border border-trait text-encre text-sm outline-none focus:border-sepia';
const boutonPlein = 'h-10 px-4 rounded-[10px] bg-sepia text-blanc text-sm font-medium disabled:opacity-60';
const boutonBord = 'h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium hover:bg-sepia-tint disabled:opacity-60';
const useRapatriement = create<{
    appliquees: number;
}>(() => ({ appliquees: 0 }));
let rapatriementFait = false;
export const RapatriementSite = () => {
    useEffect(() => {
        if (rapatriementFait)
            return;
        rapatriementFait = true;
        void apiClient.get<Etat>('/site/etat').then(async (r) => {
            if (!r.data.connecte)
                return;
            const c = await apiClient.post<{
                appliquees: number;
            }>('/site/rapatrier').catch(() => null);
            if (c?.data.appliquees)
                useRapatriement.setState({ appliquees: c.data.appliquees });
        }).catch(() => undefined);
    }, []);
    return null;
};
export const BoutonEnvoiSite = () => {
    const lecture = useLectureSeule((s) => s.actif);
    const [etat, setEtat] = useState<Etat | null>(null);
    const [ouvert, setOuvert] = useState(false);
    const rapatrie = useRapatriement((s) => s.appliquees);
    const relire = () => apiClient.get<Etat>('/site/etat').then((r) => setEtat(r.data)).catch(() => setEtat(null));
    useEffect(() => { void relire(); }, []);
    if (lecture || !etat)
        return null;
    return (<>
            <button onClick={() => setOuvert(true)} data-bouton="envoi-site" title={etat.dernierEnvoi ? `Dernier envoi : ${heure(etat.dernierEnvoi)}` : 'Jamais envoyé'} className={`flex items-center gap-2 h-9 px-3.5 rounded-[10px] border text-[13px] font-medium flex-none ${etat.rappel ? 'border-sepia bg-sepia-tint text-sepia-deep' : 'border-trait text-encre-2 hover:bg-papier'}`}>
                <CloudArrowUp size={16}/>
                Envoyer vers le site{etat.rappel ? ` · ${pluriel(etat.changements, 'nouveauté', 'nouveautés')}` : ''}
            </button>
            {ouvert && <Fenetre etat={etat} rapatrie={rapatrie} onFermer={() => { setOuvert(false); void relire(); }} relire={relire}/>}
        </>);
};
export function Fenetre({ etat, rapatrie, onFermer, relire }: {
    etat: Etat;
    rapatrie: number;
    onFermer: () => void;
    relire: () => Promise<void>;
}) {
    const [email, setEmail] = useState(etat.email ?? ADRESSE_ADMINISTRATEUR);
    const [lienEnvoye, setLienEnvoye] = useState(false);
    const [mdp, setMdp] = useState('');
    const [occupe, setOccupe] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [cr, setCr] = useState<CompteRendu | null>(null);
    const appel = async <T,>(f: () => Promise<T>) => { setOccupe(true); setMessage(null); try {
        return await f();
    }
    finally {
        setOccupe(false);
    } };
    const lien = () => appel(async () => {
        const r = await apiClient.post<{
            ok: boolean;
            raison?: string;
        }>('/site/lien', { email }).then((x) => x.data).catch((e) => e.response?.data ?? { ok: false });
        if (r.ok)
            return void setLienEnvoye(true);
        setMessage(r.raison === 'trop_de_demandes' ? 'Trop de demandes : attendez un peu (2 e-mails par heure au plus).' : 'Adresse e-mail incomplète ou refusée.');
    });
    const connexion = () => appel(async () => {
        const r = await apiClient.post<{
            ok: boolean;
            raison?: string;
            garde?: boolean;
        }>('/site/connexion', { email, motDePasse: mdp }).then((x) => x.data).catch((e) => e.response?.data ?? { ok: false });
        setMdp('');
        if (r.ok) {
            await relire();
            setMessage(r.garde ? null : 'Connecté pour cette séance seulement (le coffre de Windows n’est pas disponible).');
        }
        else
            setMessage(r.raison === 'identifiants' ? 'E-mail ou mot de passe incorrect.' : r.raison === 'trop_de_demandes' ? 'Trop d’essais : attendez un peu.' : 'Le site ne répond pas pour l’instant.');
    });
    const envoyer = (retirer: boolean) => appel(async () => {
        const r = await apiClient.post<CompteRendu>('/site/envoyer', { retirer }).then((x) => x.data).catch((e) => e.response?.data ?? { ok: false });
        setCr(r);
        if (r.ok)
            await relire();
        else
            setMessage(r.raison === 'connexion_requise' ? 'La connexion au site a expiré : reconnectez-vous.' : r.raison === 'pas_proprietaire' ? 'Ce compte n’est pas celui du propriétaire du site.' : 'L’envoi n’a pas abouti.');
    });
    const deconnexion = () => appel(async () => { await apiClient.post('/site/deconnexion'); await relire(); setCr(null); });
    return (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
            <div onClick={(e) => e.stopPropagation()} data-fenetre="envoi-site" className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <h2 className="font-display text-[30px] font-medium leading-none m-0">{etat.connecte ? 'Envoyer vers le site' : 'Mon accès au site'}</h2>
                        <div className="text-[13px] text-encre-2 mt-1.5">
                            {etat.connecte ? `Connecté : ${etat.email ?? ''}${etat.dernierEnvoi ? ` · dernier envoi le ${heure(etat.dernierEnvoi)}` : ' · jamais envoyé'}` : 'Votre mot de passe sert ici et sur le site. L’appli ne le garde jamais.'}
                        </div>
                    </div>
                    <button onClick={onFermer} className="w-9 h-9 grid place-items-center rounded-[10px] text-encre-2 hover:bg-papier" title="Fermer"><X size={18}/></button>
                </div>

                {rapatrie > 0 && <p className="text-[13px] text-encre m-0 rounded-[10px] bg-sepia-tint px-3 py-2" data-message="rapatrie">{pluriel(rapatrie, 'correction faite sur le site est revenue', 'corrections faites sur le site sont revenues')} dans votre base (copie de sécurité faite avant).</p>}

                {!etat.connecte ? (<div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1 text-sm text-encre-2" htmlFor="site-email">Votre adresse e-mail d’administrateur
                            <input id="site-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ}/>
                        </label>
                        <section className="flex flex-col gap-2 rounded-[12px] border border-sepia px-4 py-3" data-etape="creer-mot-de-passe">
                            <h3 className="font-display text-xl text-sepia-deep m-0">1. Première fois : créer mon mot de passe</h3>
                            {!lienEnvoye ? (<>
                                    <p className="text-[13px] text-encre-2 m-0">Une seule fois. Supabase vous envoie un lien ; il ouvre la page du site où vous choisissez votre mot de passe.</p>
                                    <button type="button" disabled={occupe || !email} onClick={() => void lien()} className={`${boutonPlein} self-start`} data-bouton="site-lien">M’envoyer le lien pour créer mon mot de passe</button>
                                </>) : (<ol className="text-[13px] text-encre m-0 pl-5 flex flex-col gap-1 list-decimal" data-message="etapes-lien">
                                    <li>Ouvrez votre messagerie ({email}) : un mail de Supabase, <b>en anglais</b>, « Reset Your Password » (regardez aussi les indésirables).</li>
                                    <li>Cliquez sur son lien : la page « Votre mot de passe » du site s’ouvre.</li>
                                    <li>Choisissez votre mot de passe (10 caractères au moins), deux fois, puis « Enregistrer ».</li>
                                    <li>Revenez ici et connectez-vous ci-dessous.</li>
                                </ol>)}
                        </section>
                        <form className="flex flex-col gap-2 rounded-[12px] border border-trait-leger px-4 py-3" onSubmit={(e) => { e.preventDefault(); void connexion(); }} noValidate data-etape="se-connecter">
                            <h3 className="font-display text-xl text-encre m-0">2. J’ai mon mot de passe : me connecter</h3>
                            <input id="site-mdp" type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={mdp} onChange={(e) => setMdp(e.target.value)} className={champ}/>
                            <button type="submit" disabled={occupe || !email || !mdp} className={`${boutonBord} self-start`} data-bouton="site-connexion">Se connecter</button>
                        </form>
                    </div>) : (<div className="flex flex-col gap-3">
                        <p className="text-[13px] text-encre-2 m-0">{etat.changements > 0 ? `${pluriel(etat.changements, 'fiche changée', 'fiches changées')} depuis le dernier envoi.` : 'Rien n’a changé depuis le dernier envoi.'} Les personnes vivantes partent en « Fiche protégée » (ni nom, ni date, ni lieu).</p>
                        <div className="flex flex-wrap gap-2">
                            <button disabled={occupe} onClick={() => void envoyer(false)} className={boutonPlein} data-bouton="site-envoyer">{occupe ? 'Envoi…' : 'Envoyer maintenant'}</button>
                            <button disabled={occupe} onClick={() => void deconnexion()} className={boutonBord}>Se déconnecter</button>
                        </div>
                    </div>)}

                {cr?.ok && (<div className="flex flex-col gap-2 rounded-[12px] border border-trait-leger px-4 py-3 text-[13px] text-encre" data-compte-rendu="envoi">
                        <p className="m-0"><b>En ligne à {heure(cr.quand)}</b> : {pluriel(cr.ajoutees ?? 0, 'fiche ajoutée', 'fiches ajoutées')}, {pluriel(cr.modifiees ?? 0, 'modifiée', 'modifiées')}, {pluriel(cr.couples_ajoutes ?? 0, 'couple ajouté', 'couples ajoutés')}, {pluriel(cr.liens_ajoutes ?? 0, 'lien ajouté', 'liens ajoutés')}{cr.retirees ? `, ${pluriel(cr.retirees, 'fiche retirée', 'fiches retirées')}` : ''}.</p>
                        <p className="m-0 text-encre-2">Envoyé : {cr.envoyes?.personnes} personnes, {cr.envoyes?.couples} couples, {cr.envoyes?.liens} liens · sur le site : {cr.en_ligne?.personnes} personnes, {cr.en_ligne?.couples} couples, {cr.en_ligne?.liens} liens.</p>
                        {!!cr.refus?.length && <p className="m-0" style={{ color: 'var(--o-afrique)' }}>{pluriel(cr.refus.length, 'ligne refusée', 'lignes refusées')} par les règles du site (dates impossibles…).</p>}
                        {!!cr.a_retirer?.length && !cr.retirees && (<div className="flex flex-col gap-2 pt-1" data-question="retirer">
                                <p className="m-0">{pluriel(cr.a_retirer.length, 'fiche a quitté', 'fiches ont quitté')} votre PC (fusion ou suppression) : n° {cr.a_retirer.join(', ')}. Les retirer aussi du site ?</p>
                                <div className="flex gap-2">
                                    <button disabled={occupe} onClick={() => void envoyer(true)} className={boutonBord} data-bouton="site-retirer">Oui, les retirer du site</button>
                                    <button disabled={occupe} onClick={() => setCr({ ...cr, a_retirer: [] })} className={boutonBord}>Non, les garder</button>
                                </div>
                            </div>)}
                    </div>)}
                {message && <p className="text-[13px] m-0" style={{ color: 'var(--encre-2)' }} data-message="envoi-site">{message}</p>}
            </div>
        </div>);
}
