// ---- ANCESTRIA SUR LE TÉLÉPHONE : INSTALLER + FAIRE CONNAÎTRE (sa demande du 03/10/2026) ----
//
// Ses mots : « pour que tout le monde voie l'appli, comment ils vont connaître l'appli ? … il faut trouver un
// moyen simple et efficace pour qu'ils aient l'appli, ensuite ils pourront s'inscrire » ; « ok on fait les trois ».
// Posé DANS la page d'inscription, sous le texte « Bienvenue » (là où arrive toute personne qui touche le lien) :
//   - « Installer Ancestria sur mon téléphone » : Android/Chrome = la fenêtre d'installation du téléphone en un
//     toucher (événement beforeinstallprompt) ; iPhone = Apple ne le permet pas → les 2 gestes expliqués
//     (Partager, puis « Sur l'écran d'accueil ») ; déjà ouverte comme appli = rien à installer, on ne le montre pas ;
//   - « Faire connaître Ancestria » : le partage du téléphone (WhatsApp, Facebook, SMS…) avec le lien déjà écrit ;
//     sans partage (ordinateur) : le lien est copié.
// Gratuit : aucun store, aucun paiement. Ligne d'appel : porte-inscription/PorteInscription.tsx.

import { useEffect, useState } from 'react';

type Invite = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// L'événement arrive tôt (au chargement) : on le garde dès l'import du module.
let invite: Invite | null = null;
const abonnes = new Set<() => void>();
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e as Invite; abonnes.forEach((f) => f()); });
    window.addEventListener('appinstalled', () => { invite = null; abonnes.forEach((f) => f()); });
}

export type ModeInstallation = 'deja-installee' | 'un-toucher' | 'iphone' | 'autre-telephone' | 'ordinateur';

/** Ce qu'on propose, selon l'appareil (fonction pure, testée). */
export function modeInstallation(a: { autonome: boolean; inviteDisponible: boolean; agent: string; tactile: boolean }): ModeInstallation {
    if (a.autonome) return 'deja-installee';
    const telephone = a.tactile || /Android|Mobile|iPhone|iPad|iPod/i.test(a.agent);
    if (!telephone) return 'ordinateur'; // Chrome/Edge proposent aussi l'installation sur un PC : ce bouton parle du TÉLÉPHONE
    if (a.inviteDisponible) return 'un-toucher';
    if (/iPhone|iPad|iPod/i.test(a.agent)) return 'iphone';
    return 'autre-telephone';
}

export const MESSAGE_PARTAGE = 'Ancestria — l’arbre de famille universel, gratuit pour tous. Retrouvez le nom de vos ancêtres et ajoutez votre famille, d’où qu’elle vienne :';

const adresse = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

export function AppliTelephone() {
    const [, setTour] = useState(0);
    const [aide, setAide] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    useEffect(() => { const f = () => setTour((t) => t + 1); abonnes.add(f); return () => { abonnes.delete(f); }; }, []);

    const mode = modeInstallation({
        autonome: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
        inviteDisponible: invite !== null,
        agent: navigator.userAgent,
        tactile: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    });

    const installer = async () => {
        if (mode === 'un-toucher' && invite) {
            try {
                const i = invite;
                await i.prompt();
                const { outcome } = await i.userChoice;
                if (outcome === 'accepted') { invite = null; setMessage('Ancestria est sur votre écran d’accueil.'); }
                setTour((t) => t + 1);
                return;
            } catch {
                // le téléphone a refusé d'ouvrir sa fenêtre : on montre les gestes à faire à la main
            }
        }
        setAide((x) => !x);
    };

    const partager = async () => {
        const url = adresse();
        try {
            if (navigator.share) { await navigator.share({ title: 'Ancestria', text: MESSAGE_PARTAGE, url }); return; }
            await navigator.clipboard.writeText(`${MESSAGE_PARTAGE} ${url}`);
            setMessage('Lien copié : collez-le dans un message (WhatsApp, Facebook, SMS…).');
        } catch {
            // partage annulé par la personne : rien à dire
        }
    };

    const bouton = 'min-h-11 px-4 rounded-[10px] text-[14px] font-medium text-left';
    return (
        <section className="rounded-[12px] border border-trait bg-carte px-4 py-3 flex flex-col gap-2.5" data-bloc="appli-telephone" data-mode={mode}>
            <div className="text-[13px] text-encre-2">Ancestria est gratuite. Gardez-la sur votre téléphone et faites-la connaître à votre famille.</div>
            <div className="flex flex-wrap gap-2">
                {mode !== 'deja-installee' && mode !== 'ordinateur' && (
                    <button type="button" onClick={() => void installer()} className={`${bouton} bg-sepia text-blanc`} data-bouton="installer">
                        Installer Ancestria sur mon téléphone
                    </button>
                )}
                <button type="button" onClick={() => void partager()} className={`${bouton} border border-sepia text-sepia-deep bg-blanc`} data-bouton="partager">
                    Faire connaître Ancestria
                </button>
            </div>
            {aide && mode === 'iphone' && (
                <ol className="m-0 pl-5 text-[13.5px] text-encre leading-relaxed" data-aide="iphone">
                    <li>Touchez <b>Partager</b> (le carré avec une flèche, en bas de Safari).</li>
                    <li>Touchez <b>« Sur l’écran d’accueil »</b>, puis <b>Ajouter</b>.</li>
                </ol>
            )}
            {aide && (mode === 'autre-telephone' || mode === 'un-toucher') && (
                <ol className="m-0 pl-5 text-[13.5px] text-encre leading-relaxed" data-aide="android">
                    <li>Ouvrez ce lien dans <b>Chrome</b>.</li>
                    <li>Touchez <b>⋮</b> en haut à droite, puis <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »).</li>
                </ol>
            )}
            {message && <div className="text-[13px] text-encre-2" data-message="appli-telephone">{message}</div>}
        </section>
    );
}

// ---- FIN ANCESTRIA SUR LE TÉLÉPHONE ----
