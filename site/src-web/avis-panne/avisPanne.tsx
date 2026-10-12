// ---- AVIS DE PANNE, AVEC DES MOTS SYMPATHIQUES (12/10/2026) ----
//
// Ses mots : « si jamais une panne plutôt logistique arrive après avoir été inscrit, il serait bien de prévenir que
// momentanément nous avons un souci de …, et que ce sera remis en service dans les plus brefs délais, des mots
// sympathiques ».
// Chaque appel du site vers la base (Supabase) est regardé : réseau coupé, ou réponse 5xx (panne, maintenance) →
// un bandeau en haut de l'écran, bienveillant ; il disparaît tout seul au premier appel qui réussit. Deux cas :
//   - le téléphone est hors connexion (navigator.onLine faux) : « votre téléphone semble hors connexion » ;
//   - sinon : « Ancestria rencontre momentanément un petit souci technique ».
// Rien n'est écrit, rien n'est perdu : il ne fait que prévenir. Monté une fois, à part (sa propre racine), par la
// ligne d'import dans Porte.tsx. Supprimer ce fichier et la ligne = le site d'avant.

import { createRoot } from 'react-dom/client';
import { create } from 'zustand';

export const useAvisPanne = create<{ panne: boolean }>(() => ({ panne: false }));

/** Règle pure (testée) : une réponse dit-elle « panne » (true), « ça marche » (false) ou rien (null) ? */
export function etatReponse(reseauCoupe: boolean, statut: number | null): boolean | null {
    if (reseauCoupe) return true;
    if (statut === null) return null;
    if (statut >= 500) return true;
    return false;
}

function regarderLesAppels(): void {
    const origine = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
        const adresse = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
        const versLaBase = /supabase\.co/.test(adresse);
        try {
            const r = await origine(...args);
            if (versLaBase) { const e = etatReponse(false, r.status); if (e !== null) useAvisPanne.setState({ panne: e }); }
            return r;
        } catch (err) {
            if (versLaBase) useAvisPanne.setState({ panne: true });
            throw err;
        }
    };
    window.addEventListener('online', () => useAvisPanne.setState({ panne: false }));
    window.addEventListener('offline', () => useAvisPanne.setState({ panne: true }));
}

function AvisPanne() {
    const panne = useAvisPanne((s) => s.panne);
    if (!panne) return null;
    const horsLigne = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
        <div role="status" aria-live="polite" data-avis="panne" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80 }}
            className="px-3 pt-2">
            <div className="mx-auto max-w-xl rounded-[14px] border border-sepia bg-carte shadow-carte px-4 py-3 text-encre flex flex-col gap-2">
                <div className="text-[15px] leading-relaxed">
                    {horsLigne
                        ? <>📶 <b>Votre téléphone semble hors connexion.</b> Dès que le réseau revient, Ancestria reprend là où vous en étiez — rien n’est perdu.</>
                        : <>🌿 <b>Petit contretemps :</b> Ancestria rencontre momentanément un souci technique. Rien n’est perdu : nous faisons le nécessaire et tout sera remis en service dans les plus brefs délais. Merci de votre patience, et à très vite !</>}
                </div>
                <button type="button" onClick={() => window.location.reload()} className="self-start min-h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep bg-blanc text-[14px]" data-bouton="reessayer">
                    Réessayer
                </button>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined' && !(window as { __avisPanne?: boolean }).__avisPanne) {
    (window as { __avisPanne?: boolean }).__avisPanne = true;
    regarderLesAppels();
    const lieu = document.createElement('div');
    lieu.id = 'avis-panne';
    document.body.appendChild(lieu);
    createRoot(lieu).render(<AvisPanne />);
}

// ---- FIN AVIS DE PANNE ----
