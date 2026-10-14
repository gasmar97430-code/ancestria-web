// ---- INSTALLER SUR LE TÉLÉPHONE, FLUIDE (15/10/2026) ----
// Ses mots : « ton système d'installation n'est pas fluide sur le téléphone ». Sa règle 14 (12/10) : un clic quand le
// navigateur le permet ; sinon les gestes EXACTS de SON navigateur ; lien ouvert dans Facebook / Instagram / WhatsApp →
// « Ouvrir dans Chrome » + « Copier le lien ». Modèle repris tel quel (textes et détection) :
// ancestria-web/site/src-web/appli-telephone/AppliTelephone.tsx (modeInstallation, gestes, MESSAGE_ACCEPTE).
// Relevé avant : « Installer » → une carte → « Ajouter à l'écran d'accueil » → la fenêtre du téléphone (3 touchers),
// et dans Chrome sans invitation (déjà refusée une fois…) : « Ouvrez ce lien dans Chrome » alors qu'on y est déjà.
// Maintenant :
//   · invitation disponible (Chrome, Edge, Samsung récent) → « Installer » ouvre DIRECTEMENT la fenêtre du téléphone ;
//   · sinon → la carte montre les 3 gestes exacts de ce navigateur-là, numérotés, + les boutons utiles ;
//   · refus de la fenêtre → les gestes à la main, au lieu de ne rien dire ; acceptation → le message du modèle.
// Ligne d'appel : index.html. La retirer = la carte d'avant.
import { installState, promptInstall, isStandalone } from './pwa.js';

const DANS_APPLI = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Twitter|MicroMessenger|Pinterest|GSA\/|; wv\)/i;
const MESSAGE_ACCEPTE = 'Ancestria s’installe : son icône arrive sur votre écran d’accueil (parfois sur la dernière page). Si rien n’apparaît d’ici une minute : Paramètres du téléphone → Applications → Chrome → Autorisations → autoriser les raccourcis sur l’écran d’accueil, puis dans Chrome ⋮ → « Installer l’application ».';

export function modeInstallation(a) {
  if (a.autonome) return 'deja-installee';
  const ios = /iPhone|iPad|iPod/i.test(a.agent) || (/Macintosh/i.test(a.agent) && a.tactile);
  const android = /Android/i.test(a.agent);
  const telephone = ios || android || a.tactile || /Mobile/i.test(a.agent);
  if (a.inviteDisponible) return 'un-toucher';
  if (!telephone) {
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

export function gestes(mode) {
  switch (mode) {
    case 'iphone': return ['Touchez Partager : le carré avec une flèche vers le haut, en bas de l’écran.', 'Faites glisser vers le haut et touchez « Sur l’écran d’accueil ».', 'Touchez « Ajouter » : Ancestria apparaît sur votre écran.'];
    case 'iphone-chrome': return ['Touchez Partager : le carré avec une flèche, en haut à droite à côté de l’adresse.', 'Touchez « Sur l’écran d’accueil » (ou « Ajouter à l’écran d’accueil »).', 'Touchez « Ajouter ».'];
    case 'iphone-autre': return ['Ouvrez le menu (☰ ou …) puis « Partager ».', 'Touchez « Sur l’écran d’accueil ».', 'Touchez « Ajouter ». Si vous ne le trouvez pas : copiez le lien et ouvrez-le dans Safari.'];
    case 'iphone-dans-appli': return ['Ce lien s’est ouvert à l’intérieur d’une appli (Google, Facebook, Instagram, WhatsApp…) : de là, l’iPhone ne peut rien installer.', 'Touchez … ou ⋯ (en haut ou en bas), puis « Ouvrir dans Safari » — ou touchez « Copier le lien » ci-dessous et collez-le dans Safari.', 'Dans Safari : Partager (carré avec une flèche) → « Sur l’écran d’accueil » → « Ajouter ».'];
    case 'android-chrome': return ['Touchez ⋮ (les trois points), en haut à droite.', 'Touchez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).', 'Confirmez : Ancestria apparaît sur votre écran.'];
    case 'android-samsung': return ['Touchez ☰ (les trois traits), en bas à droite — ou l’icône ⤓ dans la barre d’adresse.', 'Touchez « Ajouter la page à », puis « Écran d’accueil » (ou « Installer »).', 'Confirmez avec « Ajouter ».'];
    case 'android-firefox': return ['Touchez ⋮ (les trois points).', 'Touchez « Installer » (ou « Ajouter à l’écran d’accueil »).', 'Confirmez avec « Ajouter ».'];
    case 'android-dans-appli': return ['Ce lien s’est ouvert à l’intérieur d’une appli (Google, Facebook, Instagram, WhatsApp…) : de là, le téléphone ne peut rien installer.', 'Touchez le bouton « Ouvrir dans Chrome » ci-dessous (ou ⋮ → « Ouvrir dans le navigateur »).', 'Dans Chrome : touchez « Installer » s’il apparaît, sinon ⋮ → « Installer l’application ».'];
    case 'pc': return ['Dans la barre d’adresse, à droite, cliquez l’icône « Installer » (un écran avec une flèche, ou ⊕).', 'Sinon : menu ⋮ ou … → « Installer Ancestria » (Edge : « Applications » → « Installer ce site en tant qu’application »).', 'Cliquez « Installer » : Ancestria s’ouvre dans sa fenêtre et reste dans le menu Démarrer.'];
    case 'pc-safari': return ['Dans Safari (Mac), menu « Fichier ».', 'Cliquez « Ajouter au Dock ».', 'Cliquez « Ajouter » : Ancestria est dans le Dock.'];
    case 'pc-firefox': return ['Firefox ne sait pas installer un site comme une appli.', 'Copiez le lien (bouton ci-dessous) et ouvrez-le dans Edge ou Chrome.', 'Là, cliquez l’icône « Installer » dans la barre d’adresse.'];
    case 'autre-telephone': return ['Ouvrez le menu du navigateur (⋮, ☰ ou …).', 'Cherchez « Installer », « Ajouter à l’écran d’accueil » ou « Ajouter la page à ».', 'Si rien de tel : touchez « Ouvrir dans Chrome » ou copiez le lien et ouvrez-le dans Chrome.'];
    default: return [];
  }
}

(() => {
  try {
    const sheet = document.getElementById('sheet');
    if (!sheet) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lien = () => new URL('./', document.baseURI).href;
    const versChrome = () => { const u = new URL(lien()); return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;end`; };
    const mode = (sansInvite) => modeInstallation({
      autonome: isStandalone(), inviteDisponible: !sansInvite && installState() === 'prompt',
      agent: navigator.userAgent, tactile: navigator.maxTouchPoints > 0,
    });
    let message = null; // « accepté » / « refusé » : ce que la carte doit dire après la fenêtre du téléphone

    const remplir = () => {
      const tete = sheet.querySelector('.install-head');
      if (!tete) return;
      const sub = tete.querySelector('.install-sub');
      if (sub) sub.textContent = 'L’icône de l’arbre sur votre écran d’accueil, comme une appli.';
      const m = mode(message === 'refuse');
      let corps;
      const fermer = '<button type="button" class="btn btn-ghost" data-close-sheet>Fermer</button>'; // chaque carte se ferme
      if (message === 'accepte') corps = `<p class="install-ok">${esc(MESSAGE_ACCEPTE)}</p><div class="row-actions">${fermer}</div>`;
      else if (m === 'deja-installee') corps = `<p class="muted">Ancestria est installée sur cet appareil.</p><div class="row-actions">${fermer}</div>`;
      else if (m === 'un-toucher') corps = '<div class="row-actions"><button type="button" class="btn btn-ghost" data-close-sheet>Plus tard</button><button type="button" class="btn btn-primary" data-installer-un-toucher>Installer</button></div>';
      else {
        const etapes = gestes(m).map((g) => `<li>${esc(g)}</li>`).join('');
        const boutons = [
          m === 'android-dans-appli' ? `<a class="btn btn-primary" href="${esc(versChrome())}">Ouvrir dans Chrome</a>` : '',
          /dans-appli|iphone-autre|autre-telephone|pc-firefox/.test(m) ? '<button type="button" class="btn" data-installer-copier>Copier le lien</button>' : '',
        ].join('');
        corps = `${message === 'refuse' ? '<p class="muted">La fenêtre du téléphone a été fermée. Vous pouvez installer à la main :</p>' : ''}<ol class="install-gestes">${etapes}</ol><div class="row-actions">${fermer}${boutons}</div>`;
      }
      [...sheet.children].forEach((el) => { if (el !== tete) el.remove(); });
      tete.insertAdjacentHTML('afterend', `<div class="install-corps">${corps}</div>`);
    };

    const fenetreDuTelephone = async () => {
      const issue = await promptInstall();
      message = issue === 'accepted' ? 'accepte' : 'refuse';
      if (sheet.dataset.kind === 'install' && !sheet.hidden) remplir();
      else document.querySelector('[data-nav="install"]')?.click();
    };

    // « Installer » (barre du bas, rail du PC) : la fenêtre du téléphone tout de suite, sans carte entre les deux.
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('[data-installer-un-toucher]')) { e.preventDefault(); fenetreDuTelephone(); return; }
      if (e.target.closest('[data-installer-copier]')) {
        e.preventDefault();
        navigator.clipboard?.writeText(lien()).then(() => { const b = e.target.closest('[data-installer-copier]'); b.textContent = 'Lien copié ✓'; }).catch(() => {});
        return;
      }
      const nav = e.target.closest('[data-nav="install"]');
      if (nav && mode(false) === 'un-toucher' && !message) { e.preventDefault(); e.stopPropagation(); fenetreDuTelephone(); }
    }, true);

    // Chaque fois que la carte « Installer » s'ouvre (bouton, ou proposée après la connexion) : notre contenu.
    new MutationObserver(() => {
      if (sheet.hidden && message === 'refuse') message = null; // carte fermée : on repart de l'état du téléphone
      if (!sheet.hidden && sheet.dataset.kind === 'install' && !sheet.querySelector('.install-corps')) remplir();
    })
      .observe(sheet, { attributes: true, childList: true, attributeFilter: ['hidden', 'data-kind'] });
  } catch (err) { /* repli : la carte d'avant */ }
})();
// ---- FIN INSTALLER SUR LE TÉLÉPHONE, FLUIDE ----
