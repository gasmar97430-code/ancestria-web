// ---- FORMULAIRE : S'INSCRIRE OU SE CONNECTER, SANS DOUBLON (14/10/2026) ----
// Ses mots : « y a deux fois j'ai lu le texte donc il faut voir autrement », « il faut de la fluidité donc pas de
// doublon », « il faut s'inscrire ». Le formulaire du paquet montrait tout à la fois : un 2e titre sous celui de la
// feuille, « Prénom (inscription) » même pour se connecter, deux boutons côte à côte.
// Ce nœud montre UN chemin à la fois :
//   · « s'inscrire » (par défaut, la feuille « Pour aller plus loin, inscrivez-vous ») : Prénom, Nom, E-mail,
//     Mot de passe, Charte, un bouton « Créer mon compte », puis « Déjà inscrit ? Se connecter » ;
//   · « se connecter » (clic sur « Se connecter » en haut, ou sur ce lien) : E-mail, Mot de passe, un bouton
//     « Se connecter », puis « Pas encore de compte ? S'inscrire ».
// Le code d'envoi (app.js) ne change pas : il lit toujours le bouton pressé (value signup / signin).
// Ligne d'appel : index.html. La retirer = le formulaire d'avant, intact.
(() => {
  try {
    const form = document.getElementById('auth-form');
    const sheet = document.getElementById('sheet');
    if (!form || !sheet) return;
    const btnUp = form.querySelector('button[value="signup"]');
    const btnIn = form.querySelector('button[value="signin"]');
    const pw = form.querySelector('input[name="password"]');
    const titres = { signup: 'Pour aller plus loin, inscrivez-vous', signin: 'Se connecter' };

    // Libellés sans « (inscription) » : ces champs n'apparaissent plus qu'à l'inscription.
    form.querySelectorAll('.names .field > span').forEach((s) => { s.textContent = s.textContent.replace(/\s*\(inscription\)\s*/i, ''); });

    const bascule = document.createElement('p');
    bascule.className = 'auth-switch';
    form.append(bascule);

    let mode = 'signup';
    let voulu = 'signup';
    const appliquer = (m) => {
      mode = m;
      form.dataset.authMode = m;
      const up = m === 'signup';
      btnUp.hidden = !up; btnIn.hidden = up;
      // Entrée au clavier = le bouton visible (le premier bouton « submit » est celui qui part)
      btnUp.type = up ? 'submit' : 'button';
      btnIn.type = up ? 'button' : 'submit';
      btnUp.textContent = 'Créer mon compte';
      btnUp.classList.toggle('btn-primary', up); // le seul bouton visible est le bouton principal
      if (pw) pw.autocomplete = up ? 'new-password' : 'current-password';
      bascule.innerHTML = up
        ? 'Déjà inscrit ? <button type="button" class="lien" data-auth-to="signin">Se connecter</button>'
        : 'Pas encore de compte ? <button type="button" class="lien" data-auth-to="signup">S\'inscrire</button>';
      const msg = document.getElementById('auth-msg');
      if (msg) msg.textContent = '';
      const h = sheet.querySelector('.sheet-head h2');
      if (h && form.closest('#sheet')) h.textContent = titres[m];
    };

    bascule.addEventListener('click', (e) => {
      const to = e.target.closest('[data-auth-to]')?.dataset.authTo;
      if (to) { appliquer(to); form.querySelector(to === 'signup' ? 'input[name="first_name"]' : 'input[name="email"]')?.focus(); }
    });
    // « Se connecter » en haut (la puce du compte) → chemin connexion ; tout autre geste → inscription.
    window.addEventListener('pointerdown', (e) => {
      if (!(e.target instanceof Element) || e.target.closest('#sheet')) return;
      voulu = e.target.closest('.user-chip') ? 'signin' : 'signup';
    }, true);
    // À chaque ouverture de la feuille avec le formulaire : le chemin voulu, un seul titre.
    new MutationObserver(() => {
      if (!sheet.hidden && form.closest('#sheet') && sheet.dataset.kind === 'auth' && !sheet.dataset.authVu) {
        sheet.dataset.authVu = '1';
        appliquer(voulu);
      }
      if (sheet.hidden || sheet.dataset.kind !== 'auth') delete sheet.dataset.authVu;
    }).observe(sheet, { attributes: true, childList: true, attributeFilter: ['hidden', 'data-kind'] });
    appliquer('signup');
  } catch (err) { /* repli : le formulaire du paquet reste tel quel */ }
})();
// ---- FIN FORMULAIRE : S'INSCRIRE OU SE CONNECTER ----
