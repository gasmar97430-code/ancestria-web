// ---- MODE D'AFFICHAGE (PC / MOBILE) ----
// Sa demande, mot pour mot : « - DÉTECTION ET BASCULEMENT D'AFFICHAGE (PC / MOBILE) : • Détection automatique
// du type d'appareil au lancement (Responsive Auto-Adaptatif). • Ajoute un sélecteur/bouton de bascule manuel
// ("Mode Mobile 📱 / Mode PC 💻") accessible dans les Paramètres pour permettre de forcer l'affichage d'un mode
// quel que soit l'appareil utilisé (pratique pour tester l'interface mobile depuis un PC). »
//
// UN seul état : le choix 'auto' | 'mobile' | 'pc' (gardé dans localStorage 'ancestria:mode') et le mode
// appliqué 'mobile' | 'pc', posé sur <html data-mode="…"> (+ data-mode-forced quand le choix n'est pas
// automatique). En automatique : largeur ≥ 1024 px ET pointeur fin (souris) → PC, sinon mobile ; recalculé au
// lancement et à chaque redimensionnement. Tout le CSS lit [data-mode], toutes les décisions de app.js lisent
// AncestriaMode.current().
// Script classique chargé dans <head> AVANT la feuille de style : la page s'affiche directement dans le bon mode.
(function () {
  var KEY = 'ancestria:mode';
  var CHOICES = ['auto', 'mobile', 'pc'];
  var listeners = [];
  var meta = document.querySelector('meta[name="viewport"]');
  var metaOrig = meta ? meta.getAttribute('content') : null;
  var choice = 'auto', current = null;
  try { var v = localStorage.getItem(KEY); if (CHOICES.indexOf(v) >= 0) choice = v; } catch (e) { choice = 'auto'; }

  function detect() {
    var fine = false;
    try { fine = matchMedia('(pointer: fine)').matches; } catch (e) { fine = false; }
    return window.innerWidth >= 1024 && fine ? 'pc' : 'mobile';
  }
  function notify() {
    listeners.slice().forEach(function (fn) { try { fn(current, choice); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  function apply(force) {
    // Mode PC forcé sur un téléphone : la page se dessine sur 1280 px de large (comme « version pour ordinateur »),
    // on peut la faire défiler et zoomer. Retour : la consigne d'origine du paquet.
    if (meta) {
      var narrow = Math.min(screen.width, screen.height) < 1024 && !(window.matchMedia && matchMedia('(pointer: fine)').matches);
      meta.setAttribute('content', choice === 'pc' && narrow ? 'width=1280' : metaOrig);
    }
    var prev = current;
    current = choice === 'auto' ? detect() : choice;
    var h = document.documentElement;
    h.setAttribute('data-mode', current);
    if (choice === 'auto') h.removeAttribute('data-mode-forced'); else h.setAttribute('data-mode-forced', choice);
    if (force || (prev !== null && prev !== current)) notify();
  }

  window.AncestriaMode = {
    current: function () { return current; },
    choice: function () { return choice; },
    set: function (v) {
      if (CHOICES.indexOf(v) < 0) return;
      choice = v;
      try { localStorage.setItem(KEY, v); } catch (e) { /* stockage indisponible : le choix vaut pour cette visite */ }
      apply(true);
    },
    onChange: function (fn) { listeners.push(fn); },
  };
  apply(false);
  window.addEventListener('resize', function () { apply(false); });
})();
// ---- FIN MODE D'AFFICHAGE ----
