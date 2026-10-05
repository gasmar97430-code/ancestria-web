// ---- INVITER SES AMIS, JUSTE APRÈS L'INSCRIPTION (sa demande du 05/10/2026) ----
//
// Ses mots : « dès qu'il s'inscrit il doit y avoir une info-bulle de partager avec des amis afin de finir la
// validation d'inscription » ; « une fois que le partage des amis est coché (liste d'amis Facebook, WhatsApp,
// etc.), un petit mot sympathique afin de les encourager à voir l'appli ».
// → À l'entrée d'un visiteur inscrit, une bulle : le petit mot tout prêt, « Partager avec mes amis » (le menu de
//   partage du téléphone : WhatsApp, Facebook, SMS…, avec le lien), puis un merci. Tant qu'il n'a pas partagé,
//   la bulle revient à chaque ouverture ; « Plus tard » la ferme pour cette fois.
// Ce qu'un site NE PEUT PAS savoir : si le message est vraiment parti (seulement si le menu de partage a été
// mené jusqu'au bout). Et Facebook interdit d'OBLIGER à partager : la bulle incite, elle ne bloque pas
// (BLOQUANTE = false ; à passer à true seulement sur sa décision).
// Ligne d'appel : Porte.tsx (entrée d'un visiteur inscrit).

import { useEffect, useState } from 'react';
import { ShareNetwork, X } from '@phosphor-icons/react';
import { CONSIGNE_COLLER, partagerAncestria } from '../partage/partager'; // 05/10 : partage fluide

export const BLOQUANTE = false;
export const PETIT_MOT =
    'Coucou ! Je viens de découvrir Ancestria, l’arbre de famille universel 🌳 C’est gratuit : on y retrouve le nom de nos ancêtres, et chacun peut y ajouter sa famille, d’où qu’elle vienne. Viens voir :';
const CLE = 'ancestria-amis-invites';

const dejaPartage = () => { try { return localStorage.getItem(CLE) === 'oui'; } catch { return false; } };

export function InviterAmis() {
    const [ouverte, setOuverte] = useState(false);
    const [merci, setMerci] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    useEffect(() => {
        if (dejaPartage()) return;
        const t = setTimeout(() => setOuverte(true), 1200); // laisser l'arbre s'afficher d'abord
        return () => clearTimeout(t);
    }, []);
    if (!ouverte) return null;

    const partager = async () => {
        try {
            const r = await partagerAncestria(PETIT_MOT); // partage/partager.ts : 05/10, message copié + carte de partage
            setNote(r.copie ? CONSIGNE_COLLER : 'Partage ouvert.');
            try { localStorage.setItem(CLE, 'oui'); } catch { /* sans stockage : la bulle reviendra */ }
            setMerci(true);
        } catch {
            // menu de partage fermé sans choisir : rien n'est compté
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/30 grid place-items-center p-4" data-bloc="inviter-amis">
            <div className="w-full max-w-sm bg-carte border border-trait-leger rounded-[18px] p-5 flex flex-col gap-3 shadow-carte" role="dialog" aria-label="Inviter vos amis">
                <div className="flex items-start gap-2">
                    <h2 className="font-display text-[24px] leading-tight m-0 flex-1">{merci ? 'Merci, votre inscription est complète !' : 'Dernière étape : invitez vos proches'}</h2>
                    {!BLOQUANTE && !merci && (
                        <button type="button" onClick={() => setOuverte(false)} className="text-encre-3 hover:text-encre min-h-11 min-w-11 grid place-items-center" title="Plus tard" data-bouton="amis-plus-tard"><X size={18} /></button>
                    )}
                </div>
                {merci ? (
                    <>
                        <p className="text-[14px] text-encre-2 m-0">Plus nous sommes nombreux, plus le grand arbre grandit. Bonne découverte !</p>
                        <button type="button" onClick={() => setOuverte(false)} className="min-h-11 rounded-[10px] bg-sepia text-blanc text-[14px] font-medium" data-bouton="amis-fermer">Entrer dans Ancestria</button>
                    </>
                ) : (
                    <>
                        <p className="text-[14px] text-encre-2 m-0">Partagez Ancestria avec vos amis et votre famille (WhatsApp, Facebook, SMS…). Voici le petit mot qui partira :</p>
                        <blockquote className="m-0 rounded-[12px] bg-papier border border-trait px-3 py-2 text-[13.5px] text-encre leading-relaxed" data-petit-mot>{PETIT_MOT}</blockquote>
                        <button type="button" onClick={() => void partager()} className="min-h-11 rounded-[10px] bg-sepia text-blanc text-[15px] font-medium inline-flex items-center justify-center gap-2" data-bouton="amis-partager">
                            <ShareNetwork size={18} /> Partager avec mes amis
                        </button>
                        {!BLOQUANTE && <button type="button" onClick={() => setOuverte(false)} className="self-center text-[12.5px] text-encre-3 underline underline-offset-4 min-h-11" data-bouton="amis-plus-tard-texte">Plus tard</button>}
                        {note && <p className="text-[12.5px] text-encre-2 m-0">{note}</p>}
                    </>
                )}
            </div>
        </div>
    );
}

// ---- FIN INVITER SES AMIS ----
