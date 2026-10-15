// ---- « AJOUTER UN NOUVEAU NOM » TOUT EN BAS (15/10/2026) ----
// Ses mots : « puis tout en bas un bloc pour ajouter un nouveau nom » (juste après « le A mais sans cette bulle » : la
// place de « Vue Panoramique », retirée du téléphone).
// Un bloc en bas de l'écran, au-dessus de la barre Accueil / Admin / Paramètres : « ＋ Ajouter un nouveau nom ». Un
// toucher → la petite page d'inscription (fiche-enfant-telephone.js) pour une personne SANS lien : prénom, nom, dates,
// lieu, photo… Rien n'est envoyé : brouillon, puis « Envoi ». Seulement pour l'administrateur (loi 2 : pas d'anonyme).
// Caché pendant qu'une fiche est ouverte. Téléphone seulement (« le PC on fera plus tard »).
// Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = comme avant.
const style = document.createElement('style');
style.textContent = `
#ajouter-nom { display: none; }
[data-mode="mobile"] body.admin-mode #ajouter-nom { display: flex; position: fixed; z-index: 3; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 84px);
  min-height: 46px; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; border: 1px solid var(--gold);
  background: var(--glass); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 4px 16px oklch(0.3 0.03 60 / .18);
  color: var(--gold-deep); font: 500 15px var(--sans); cursor: pointer; }
[data-mode="mobile"] body.admin-mode.fiche-ouverte #ajouter-nom, body.paysage #ajouter-nom { display: none !important; }`;
document.head.appendChild(style);

try {
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'ajouter-nom';
  b.innerHTML = '<i class="ph ph-user-plus"></i>Ajouter un nouveau nom';
  b.addEventListener('click', (e) => { e.stopPropagation(); window.AncestriaVue?.ajouterNom(); });
  document.body.appendChild(b);
  // Caché pendant qu'une fiche est ouverte (la petite page prend sa place).
  const panel = document.getElementById('panel');
  const suivre = () => document.body.classList.toggle('fiche-ouverte', !!panel && panel.classList.contains('is-editing'));
  if (panel) new MutationObserver(suivre).observe(panel, { attributes: true, attributeFilter: ['class', 'hidden'] });
} catch (err) { /* repli : l'ajout par la bulle « + Enfant » reste */ }
// ---- FIN « AJOUTER UN NOUVEAU NOM » ----
