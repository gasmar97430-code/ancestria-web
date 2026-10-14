// ---- APRÈS « CRÉER MON COMPTE » : UNE SEULE ÉTAPE, LA BOÎTE MAIL (14/10/2026) ----
// Ses mots : « si je suis sur inscription et je dois m'inscrire puis me connecter, dis-moi pourquoi j'ai 2 fois le
// bloc connexion » ; « vas y ». Mesuré : après l'inscription, le formulaire entier restait affiché sous le message.
// Comme les sites de généalogie : le formulaire disparaît, il reste « Vérifiez votre boîte mail » avec l'adresse
// tapée ; le lien de l'e-mail ouvre Ancestria déjà connecté (supabase-js lit le lien : detectSessionInUrl).
// « Déjà confirmé ? Se connecter » reste pour qui a cliqué le lien sur un autre appareil.
// Ligne d'appel : index.html. La retirer = comme avant (le message sous le formulaire).
(() => {
  try {
    const form = document.getElementById('auth-form');
    const msg = document.getElementById('auth-msg');
    const sheet = document.getElementById('sheet');
    if (!form || !msg || !sheet) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const panneau = document.createElement('div');
    panneau.className = 'auth-envoye';
    form.append(panneau);

    const montrer = () => {
      const email = form.querySelector('input[name="email"]')?.value.trim();
      panneau.innerHTML = `<p class="auth-envoye-icone" aria-hidden="true">✉️</p>`
        + `<p>Nous avons envoyé un lien à <b>${esc(email)}</b>.</p>`
        + `<p>Ouvrez cet e-mail et cliquez sur le lien : Ancestria s'ouvrira, vous serez connecté.</p>`
        + `<p class="muted">Rien reçu ? Regardez dans les courriers indésirables.</p>`
        + `<p class="auth-switch">Déjà confirmé ? <button type="button" class="lien" data-envoye-connexion>Se connecter</button></p>`;
      form.dataset.authMode = 'envoye';
      const h = sheet.querySelector('.sheet-head h2');
      if (h && form.closest('#sheet')) h.textContent = 'Vérifiez votre boîte mail';
    };

    // Le message de réussite de app.js (« Un e-mail de confirmation vous a été envoyé… ») déclenche l'étape.
    new MutationObserver(() => {
      if (/^Un e-mail de confirmation/i.test(msg.textContent || '')) montrer();
    }).observe(msg, { childList: true, characterData: true, subtree: true });

    panneau.addEventListener('click', (e) => {
      if (!e.target.closest('[data-envoye-connexion]')) return;
      const vers = form.querySelector('[data-auth-to="signin"]');
      if (vers) vers.click(); // le chemin « Se connecter » de auth-mode.js (remet aussi le titre)
      form.querySelector('input[name="password"]').value = '';
      form.querySelector('input[name="password"]')?.focus();
    });
  } catch (err) { /* repli : le message reste sous le formulaire, comme avant */ }
})();
// ---- FIN APRÈS « CRÉER MON COMPTE » ----
