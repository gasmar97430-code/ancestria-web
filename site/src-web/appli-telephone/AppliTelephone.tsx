// ---- ANCESTRIA SUR LE TÉLÉPHONE : INSTALLER + FAIRE CONNAÎTRE (sa demande du 03/10/2026, bloc refait le 12/10) ----
//
// Ses mots (03/10) : « pour que tout le monde voie l'appli … un moyen simple et efficace pour qu'ils aient l'appli ».
// Ses mots (12/10) : « l'installation sur le téléphone ne fonctionne pas … corrige pour que la personne clique sur le
// lien et puisse l'installer sans difficulté ; je viens de l'essayer sur celui de ma femme et ça n'installe pas en
// cliquant sur installer » · « ça devrait [marcher] pour tous types de téléphone ».
// Mesure du 12/10 : le site EST installable (Chrome Android : manifeste 200, service actif, aucune erreur
// d'installabilité, fenêtre d'installation reçue). Ce qui échoue, c'est le téléphone qui ne peut pas installer
// d'où il est : lien ouvert DANS Facebook / Messenger / Instagram / WhatsApp…, iPhone (Apple n'offre aucun bouton),
// navigateur Samsung, Firefox, invitation déjà refusée une fois… Le bloc reconnaît donc chaque cas et donne le bon
// geste, en gros, tout de suite :
//   - Android + invitation du téléphone → un toucher (la fenêtre « Installer » du téléphone) ;
//   - lien ouvert dans une appli (Facebook, Instagram…) → bouton « Ouvrir dans Chrome » (Android) ou « Ouvrir dans
//     Safari » expliqué (iPhone), et « Copier le lien » ;
//   - sinon, les gestes EXACTS de son navigateur (Chrome, Samsung, Firefox, Safari, Chrome sur iPhone…).
// 12/10 encore : « que ce soit iPhone ou autres, c'est surtout le LIEN qui doit être installable, peu importe Android,
// Apple ou PC » · « il faut que l'appli soit universelle » → l'ordinateur a aussi son bouton et ses gestes.
// Gratuit : aucun store, aucun paiement. Ligne d'appel : porte-inscription/PorteInscription.tsx.

import { useEffect, useState } from 'react';
import { CONSIGNE_COLLER, partagerAncestria } from '../partage/partager'; // 05/10 : partage fluide

type Invite = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// L'événement arrive tôt (au chargement) : on le garde dès l'import du module.
let invite: Invite | null = null;
const abonnes = new Set<() => void>();
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e as Invite; abonnes.forEach((f) => f()); });
    window.addEventListener('appinstalled', () => { invite = null; abonnes.forEach((f) => f()); });
}

export type ModeInstallation =
    | 'deja-installee' | 'un-toucher' | 'pc' | 'pc-safari' | 'pc-firefox'
    | 'iphone' | 'iphone-chrome' | 'iphone-autre' | 'iphone-dans-appli'
    | 'android-chrome' | 'android-samsung' | 'android-firefox' | 'android-dans-appli'
    | 'autre-telephone';

// Les applis qui ouvrent les liens DANS leur propre fenêtre (on ne peut rien installer de là).
const DANS_APPLI = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Twitter|MicroMessenger|Pinterest|GSA\/|; wv\)/i;

/** Ce qu'on propose, selon l'appareil et le navigateur (fonction pure, testée). */
export function modeInstallation(a: { autonome: boolean; inviteDisponible: boolean; agent: string; tactile: boolean }): ModeInstallation {
    if (a.autonome) return 'deja-installee';
    const ios = /iPhone|iPad|iPod/i.test(a.agent) || (/Macintosh/i.test(a.agent) && a.tactile);
    const android = /Android/i.test(a.agent);
    const telephone = ios || android || a.tactile || /Mobile/i.test(a.agent);
    if (a.inviteDisponible) return 'un-toucher';                     // Chrome / Edge, téléphone OU ordinateur : un clic
    if (!telephone) {                                                 // 12/10 : l'ordinateur aussi (« universelle »)
        if (/Firefox/i.test(a.agent)) return 'pc-firefox';
        if (/Safari/i.test(a.agent) && !/Chrome|Chromium|Edg\//i.test(a.agent)) return 'pc-safari';
        return 'pc';
    }
    if (ios) {
        if (DANS_APPLI.test(a.agent)) return 'iphone-dans-appli';
        if (/CriOS/i.test(a.agent)) return 'iphone-chrome';
        if (/FxiOS|EdgiOS|OPiOS|OPT\//i.test(a.agent)) return 'iphone-autre';
        return 'iphone';
    }
    if (android) {
        if (DANS_APPLI.test(a.agent)) return 'android-dans-appli';
        if (/SamsungBrowser/i.test(a.agent)) return 'android-samsung';
        if (/Firefox/i.test(a.agent)) return 'android-firefox';
        if (/Chrome/i.test(a.agent) && !/EdgA|OPR|YaBrowser|MiuiBrowser|HuaweiBrowser|HeyTapBrowser|UCBrowser/i.test(a.agent)) return 'android-chrome';
        return 'autre-telephone';
    }
    return 'autre-telephone';
}

/** Les gestes à faire à la main, dans les mots du téléphone (fonction pure, testée). */
export function gestes(mode: ModeInstallation): string[] {
    switch (mode) {
        case 'iphone': return ['Touchez Partager : le carré avec une flèche vers le haut, en bas de l’écran.', 'Faites glisser vers le haut et touchez « Sur l’écran d’accueil ».', 'Touchez « Ajouter » : Ancestria apparaît sur votre écran.'];
        case 'iphone-chrome': return ['Touchez Partager : le carré avec une flèche, en haut à droite à côté de l’adresse.', 'Touchez « Sur l’écran d’accueil » (ou « Ajouter à l’écran d’accueil »).', 'Touchez « Ajouter ».'];
        case 'iphone-autre': return ['Ouvrez le menu (☰ ou …) puis « Partager ».', 'Touchez « Sur l’écran d’accueil ».', 'Touchez « Ajouter ». Si vous ne le trouvez pas : copiez le lien et ouvrez-le dans Safari.'];
        case 'iphone-dans-appli': return ['Ce lien s’est ouvert à l’intérieur d’une appli (Facebook, Instagram, WhatsApp…) : de là, l’iPhone ne peut rien installer.', 'Touchez … ou ⋯ (en haut ou en bas), puis « Ouvrir dans Safari » — ou touchez « Copier le lien » ci-dessous et collez-le dans Safari.', 'Dans Safari : Partager (carré avec une flèche) → « Sur l’écran d’accueil » → « Ajouter ».'];
        case 'android-chrome': return ['Touchez ⋮ (les trois points), en haut à droite.', 'Touchez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).', 'Confirmez : Ancestria apparaît sur votre écran.'];
        case 'android-samsung': return ['Touchez ☰ (les trois traits), en bas à droite — ou l’icône ⤓ dans la barre d’adresse.', 'Touchez « Ajouter la page à », puis « Écran d’accueil » (ou « Installer »).', 'Confirmez avec « Ajouter ».'];
        case 'android-firefox': return ['Touchez ⋮ (les trois points).', 'Touchez « Installer » (ou « Ajouter à l’écran d’accueil »).', 'Confirmez avec « Ajouter ».'];
        case 'android-dans-appli': return ['Ce lien s’est ouvert à l’intérieur d’une appli (Facebook, Instagram, WhatsApp…) : de là, le téléphone ne peut rien installer.', 'Touchez le bouton « Ouvrir dans Chrome » ci-dessous (ou ⋮ → « Ouvrir dans le navigateur »).', 'Dans Chrome : touchez « Installer » s’il apparaît, sinon ⋮ → « Installer l’application ».'];
        case 'pc': return ['Dans la barre d’adresse, à droite, cliquez l’icône « Installer » (un écran avec une flèche, ou ⊕).', 'Sinon : menu ⋮ ou … → « Installer Ancestria » (Edge : « Applications » → « Installer ce site en tant qu’application »).', 'Cliquez « Installer » : Ancestria s’ouvre dans sa fenêtre et reste dans le menu Démarrer.'];
        case 'pc-safari': return ['Dans Safari (Mac), menu « Fichier ».', 'Cliquez « Ajouter au Dock ».', 'Cliquez « Ajouter » : Ancestria est dans le Dock.'];
        case 'pc-firefox': return ['Firefox ne sait pas installer un site comme une appli.', 'Copiez le lien (bouton ci-dessous) et ouvrez-le dans Edge ou Chrome.', 'Là, cliquez l’icône « Installer » dans la barre d’adresse.'];
        case 'autre-telephone': return ['Ouvrez le menu du navigateur (⋮, ☰ ou …).', 'Cherchez « Installer », « Ajouter à l’écran d’accueil » ou « Ajouter la page à ».', 'Si rien de tel : touchez « Ouvrir dans Chrome » ou copiez le lien et ouvrez-le dans Chrome.'];
        default: return [];
    }
}

/** Adresse qui ouvre la page dans Chrome sur Android, même depuis Facebook ou Instagram. */
export const lienChrome = (adresse: string) => {
    const u = new URL(adresse);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(adresse)};end`;
};

export const MESSAGE_PARTAGE = 'Ancestria — l’arbre de famille universel, gratuit pour tous. Retrouvez le nom de vos ancêtres et ajoutez votre famille, d’où qu’elle vienne :';

export function AppliTelephone() {
    const [, setTour] = useState(0);
    const [aide, setAide] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    useEffect(() => { const f = () => setTour((t) => t + 1); abonnes.add(f); return () => { abonnes.delete(f); }; }, []);

    const appareil = {
        autonome: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
        agent: navigator.userAgent,
        tactile: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    };
    const mode = modeInstallation({ ...appareil, inviteDisponible: invite !== null });
    const sansInvite = modeInstallation({ ...appareil, inviteDisponible: false }); // si la fenêtre du téléphone ne s'ouvre pas : SES gestes
    const surPC = sansInvite.startsWith('pc');
    const dansAppli = sansInvite === 'android-dans-appli' || sansInvite === 'iphone-dans-appli';
    const android = /Android/i.test(navigator.userAgent) && (sansInvite.startsWith('android') || sansInvite === 'autre-telephone');
    const adresse = `${window.location.origin}${import.meta.env.BASE_URL}`;

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
        setAide(true);
    };

    const copier = async () => {
        try { await navigator.clipboard.writeText(adresse); setMessage('Lien copié : ouvrez votre navigateur, touchez la barre d’adresse, puis « Coller ».'); }
        catch { setMessage(`Le lien : ${adresse}`); }
    };

    const partager = async () => {
        try {
            const r = await partagerAncestria(MESSAGE_PARTAGE); // partage/partager.ts : 05/10, message copié + carte de partage
            setMessage(r.copie ? CONSIGNE_COLLER : 'Partage ouvert.');
        } catch {
            // partage annulé par la personne : rien à dire
        }
    };

    const bouton = 'min-h-11 px-4 rounded-[10px] text-[14px] font-medium text-left';
    const liste = gestes(sansInvite);
    const montrer = aide || dansAppli; // dans Facebook & co, l'aide s'affiche d'elle-même : le bouton ne pourrait rien faire
    return (
        <section className="rounded-[12px] border border-trait bg-carte px-4 py-3 flex flex-col gap-2.5" data-bloc="appli-telephone" data-mode={mode}>
            <div className="text-[13px] text-encre-2">Ancestria est gratuite. Gardez-la sur votre téléphone ou votre ordinateur, et faites-la connaître à votre famille.</div>
            <div className="flex flex-wrap gap-2">
                {mode !== 'deja-installee' && (
                    <button type="button" onClick={() => void installer()} className={`${bouton} bg-sepia text-blanc`} data-bouton="installer">
                        {surPC ? 'Installer Ancestria sur mon ordinateur' : 'Installer Ancestria sur mon téléphone'}
                    </button>
                )}
                <button type="button" onClick={() => void partager()} className={`${bouton} border border-sepia text-sepia-deep bg-blanc`} data-bouton="partager">
                    Faire connaître Ancestria
                </button>
            </div>
            {montrer && liste.length > 0 && (
                <div className="rounded-[10px] bg-papier border border-trait-leger px-3 py-2.5 flex flex-col gap-2" data-aide={sansInvite}>
                    <div className="text-[14px] font-semibold text-encre">Pour installer Ancestria :</div>
                    <ol className="m-0 pl-5 text-[14.5px] text-encre leading-relaxed">
                        {liste.map((g) => <li key={g}>{g}</li>)}
                    </ol>
                    <div className="flex flex-wrap gap-2">
                        {android && sansInvite !== 'android-chrome' && (
                            <a href={lienChrome(adresse)} className={`${bouton} bg-sepia text-blanc inline-flex items-center`} data-bouton="ouvrir-chrome">Ouvrir dans Chrome</a>
                        )}
                        {(dansAppli || sansInvite === 'iphone-autre' || sansInvite === 'autre-telephone' || sansInvite === 'pc-firefox') && (
                            <button type="button" onClick={() => void copier()} className={`${bouton} border border-sepia text-sepia-deep bg-blanc`} data-bouton="copier-lien">Copier le lien</button>
                        )}
                    </div>
                </div>
            )}
            {message && <div className="text-[13px] text-encre-2" data-message="appli-telephone">{message}</div>}
        </section>
    );
}

// ---- FIN ANCESTRIA SUR LE TÉLÉPHONE ----
