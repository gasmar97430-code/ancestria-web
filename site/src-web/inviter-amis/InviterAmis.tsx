// ---- INVITER SES PROCHES, AVEC GENTILLESSE (05/10/2026, refait le 12/10/2026) ----
//
// 05/10, ses mots : « dès qu'il s'inscrit il doit y avoir une info-bulle de partager avec des amis afin de finir la
// validation d'inscription » ; « un petit mot sympathique afin de les encourager à voir l'appli ».
// 12/10, SA NOUVELLE RÈGLE (remplace celle du 05/10) : « il ne faut pas que le partage soit une obligation » ·
// « il faut plutôt penser que si vous aimez cette appli n'hésitez pas à le partager avec une certaine gentillesse ».
// → Juste après l'inscription, UNE SEULE FOIS par appareil : « Vous aimez Ancestria ? » + le petit mot +
//   « Partager avec mes proches » (menu de partage du téléphone) ou « Non merci ». Fermée d'une façon ou d'une
//   autre, elle ne revient plus. Plus de « dernière étape » ni d'« inscription complète » : l'inscription est
//   complète sans partager. Le partage reste toujours possible par « Faire connaître Ancestria ».
// Ligne d'appel : Porte.tsx (entrée d'un visiteur inscrit).

import { useEffect, useState } from 'react';
import { ShareNetwork, X } from '@phosphor-icons/react';
import { CONSIGNE_COLLER, partagerAncestria } from '../partage/partager'; // 05/10 : partage fluide

export const BLOQUANTE = false;
export const PETIT_MOT =
    'Coucou ! Je viens de découvrir Ancestria, l’arbre de famille universel 🌳 C’est gratuit : on y retrouve le nom de nos ancêtres, et chacun peut y ajouter sa famille, d’où qu’elle vienne. Viens voir :';
const CLE = 'ancestria-amis-invites';

/** Déjà montrée sur cet appareil (partagé ou « Non merci ») ? */
const dejaVue = () => { try { return localStorage.getItem(CLE) !== null; } catch { return false; } };
const noter = (v: 'oui' | 'non') => { try { localStorage.setItem(CLE, v); } catch { /* sans stockage : montrée une fois par visite */ } };

export function InviterAmis() {
    const [ouverte, setOuverte] = useState(false);
    const [merci, setMerci] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    useEffect(() => {
        if (dejaVue()) return;
        const t = setTimeout(() => { noter('non'); setOuverte(true); }, 1200); // laisser l'arbre s'afficher d'abord ; une seule fois
        return () => clearTimeout(t);
    }, []);
    if (!ouverte) return null;

    const partager = async () => {
        try {
            const r = await partagerAncestria(PETIT_MOT); // partage/partager.ts : 05/10, message copié + carte de partage
            setNote(r.copie ? CONSIGNE_COLLER : 'Partage ouvert.');
            noter('oui');
            setMerci(true);
        } catch {
            // menu de partage fermé sans choisir : rien n'est compté
        }
    };
    const fermer = () => setOuverte(false);

    return (
        <div className="fixed inset-0 z-[60] bg-black/30 grid place-items-center p-4" data-bloc="inviter-amis" onClick={fermer}>
            <div className="w-full max-w-sm bg-carte border border-trait-leger rounded-[18px] p-5 flex flex-col gap-3 shadow-carte" role="dialog" aria-label="Partager Ancestria" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-2">
                    <h2 className="font-display text-[24px] leading-tight m-0 flex-1">{merci ? 'Merci pour ce partage !' : 'Vous aimez Ancestria ?'}</h2>
                    <button type="button" onClick={fermer} className="text-encre-3 hover:text-encre min-h-11 min-w-11 grid place-items-center" title="Fermer" data-bouton="amis-plus-tard"><X size={18} /></button>
                </div>
                {merci ? (
                    <>
                        <p className="text-[14px] text-encre-2 m-0">Plus nous sommes nombreux, plus le grand arbre grandit. Bonne découverte !</p>
                        <button type="button" onClick={fermer} className="min-h-11 rounded-[10px] bg-sepia text-blanc text-[14px] font-medium" data-bouton="amis-fermer">Continuer</button>
                    </>
                ) : (
                    <>
                        <p className="text-[14px] text-encre-2 m-0">Si le cœur vous en dit, n’hésitez pas à la partager avec vos proches (WhatsApp, Facebook, SMS…). Voici le petit mot qui partirait :</p>
                        <blockquote className="m-0 rounded-[12px] bg-papier border border-trait px-3 py-2 text-[13.5px] text-encre leading-relaxed" data-petit-mot>{PETIT_MOT}</blockquote>
                        <button type="button" onClick={() => void partager()} className="min-h-11 rounded-[10px] bg-sepia text-blanc text-[15px] font-medium inline-flex items-center justify-center gap-2" data-bouton="amis-partager">
                            <ShareNetwork size={18} /> Partager avec mes proches
                        </button>
                        <button type="button" onClick={fermer} className="self-center text-[13px] text-encre-3 underline underline-offset-4 min-h-11" data-bouton="amis-plus-tard-texte">Non merci</button>
                        {note && <p className="text-[12.5px] text-encre-2 m-0">{note}</p>}
                    </>
                )}
            </div>
        </div>
    );
}

// ---- FIN INVITER SES PROCHES ----
