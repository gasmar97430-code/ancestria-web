// ---- DÉSINSCRIPTION (12/10/2026) ----
//
// Ses mots : « une fois installé sur le téléphone, il faut pour supprimer l'appli un désabonnement en quelque sorte :
// l'appli n'est pas qu'un petit moment de visite mais une appli très sérieuse, que l'on aurait besoin à chaque moment
// de la vie » · « on efface rien … un nom validé reste figé » · « avec un code de validation c'est plus strict » ·
// « mot de passe » · « c'est une appli très sereine et stricte à la fois, on néglige rien ».
// Chemin : « Ajouter des noms » (en-tête) → « Me désinscrire… » → texte sérieux → nom, prénom, contact, mot de passe
// + taper DÉSINSCRIRE → la base efface SON inscription (jamais l'arbre ni ses propositions envoyées) → le téléphone
// oublie tout ce qu'il gardait d'elle → retour à « Bienvenue ». Base : supabase/schema.sql « DÉSINSCRIPTION ».
// Ligne d'appel : compte-site/AjouterNomsEnTete.tsx.

import { useState } from 'react';
import { supabase } from '../prise/supabase';

const CLES = ['ancestria-inscription', 'ancestria-charte', 'ancestria-lien-arbre', 'ancestria-amis-invites', 'ancestria-bienvenue-vue'];
const champ = 'h-12 w-full px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[17px] outline-none focus:border-sepia';

export function Desinscription({ onAnnuler }: { onAnnuler: () => void }) {
    const [s, setS] = useState({ nom: '', prenom: '', contact: '', confirme: '' }); // 12/10 : « pour désinscription pas besoin de mot de passe »
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const pret = s.nom.trim() && s.prenom.trim() && s.contact.trim() && s.confirme.trim().toUpperCase() === 'DÉSINSCRIRE';

    const partir = async () => {
        if (!pret) return setErreur('Remplissez nom, prénom, e-mail ou téléphone, et tapez DÉSINSCRIRE.');
        setEnvoi(true); setErreur(null);
        try {
            const { data, error } = await supabase.rpc('desinscrire', { p_nom: s.nom, p_prenom: s.prenom, p_contact: s.contact, p_mot: null });
            if (error) throw new Error(error.message);
            const r = data as { ok: boolean; raison?: string };
            if (!r.ok) return setErreur(r.raison === 'identite_incomplete' ? 'Il manque votre nom, votre prénom ou votre contact.' : 'Ces informations ne correspondent à aucune inscription. Rien n’a été effacé.');
            for (const k of CLES) { try { localStorage.removeItem(k); } catch { /* sans stockage */ } }
            window.location.assign(import.meta.env.BASE_URL);
        } catch {
            setErreur('Le site ne répond pas pour l’instant : rien n’a été effacé, réessayez dans un moment.');
        } finally { setEnvoi(false); }
    };

    const ligne = (t: string, k: 'nom' | 'prenom' | 'contact', auto: string) => (
        <label className="flex flex-col gap-1"><span className="text-sm text-encre-2">{t}</span>
            <input className={champ} value={s[k]} maxLength={200} autoComplete={auto} onChange={(e) => setS({ ...s, [k]: e.target.value })} data-champ={`desinscrire-${k}`} /></label>
    );
    return (
        <div className="flex flex-col gap-3" data-bloc="desinscription">
            <h3 className="font-display text-[26px] leading-tight m-0">Vous désinscrire d’Ancestria</h3>
            <p className="text-[14.5px] leading-relaxed m-0">Ancestria garde la mémoire des familles pour toute une vie. Si vous partez, <b>votre inscription est effacée</b> ; les noms que vous avez apportés <b>restent dans l’arbre</b> — c’est la mémoire de votre famille — et vos propositions déjà envoyées restent à la vérification de l’administrateur.</p>
            <p className="text-[14.5px] leading-relaxed m-0">Pour confirmer que c’est bien vous, donnez les informations de votre inscription.</p>
            {ligne('Nom', 'nom', 'family-name')}
            {ligne('Prénom', 'prenom', 'given-name')}
            {ligne('E-mail ou téléphone', 'contact', 'email')}
            <label className="flex flex-col gap-1"><span className="text-sm text-encre-2">Tapez <b>DÉSINSCRIRE</b> pour confirmer</span>
                <input className={champ} value={s.confirme} onChange={(e) => setS({ ...s, confirme: e.target.value })} data-champ="desinscrire-confirme" /></label>
            {erreur && <p className="text-[14px] m-0" style={{ color: 'var(--o-afrique)' }} data-erreur="desinscription">{erreur}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onAnnuler} className="min-h-11 px-4 rounded-[10px] border border-sepia bg-sepia text-blanc text-[15px] font-medium">Rester sur Ancestria</button>
                <button type="button" disabled={envoi} onClick={() => void partir()} className="min-h-11 px-4 rounded-[10px] border text-[15px] disabled:opacity-50" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} data-bouton="desinscrire">
                    {envoi ? 'Un instant…' : 'Me désinscrire'}
                </button>
            </div>
        </div>
    );
}

// ---- FIN DÉSINSCRIPTION ----
