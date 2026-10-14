// ---- LA NOUVELLE VERSION S'APPLIQUE TOUT DE SUITE (15/10/2026) ----
// Ses mots : « le bouton installé est toujours visible » — mesuré : le service de l'appli (sw.js) sert d'abord les
// fichiers gardés ; une nouvelle version s'installait en arrière-plan et ne se voyait qu'à l'ouverture SUIVANTE.
// Ici : dès que la nouvelle version prend la main, la page se recharge une fois — tout de suite si rien n'est en
// cours de saisie, sinon au prochain retour sur l'appli (une saisie en cours n'est jamais coupée).
// Première visite (aucune version avant) : rien à recharger.
// Ligne d'appel : index.html. La retirer = la nouvelle version au prochain lancement, comme avant.
(() => {
  try {
    if (!('serviceWorker' in navigator)) return;
    let avant = !!navigator.serviceWorker.controller; // une version tournait déjà
    let fait = false;
    const occupe = () => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value) return true;   // on tape quelque chose
      if (document.querySelector('#panel [data-field]')) return true;                  // fiche en modification
      return false;
    };
    const recharger = () => { if (!fait) { fait = true; location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!avant) { avant = true; return; }
      if (!occupe()) return recharger();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recharger(); });
    });
    // Chercher une nouvelle version à chaque retour sur l'appli (un téléphone la laisse ouverte des jours).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
    });
  } catch (err) { /* repli : la nouvelle version au prochain lancement */ }
})();
// ---- FIN LA NOUVELLE VERSION S'APPLIQUE TOUT DE SUITE ----
