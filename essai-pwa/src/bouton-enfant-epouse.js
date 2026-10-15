// ---- « + ENFANT » SUR L'ÉPOUSE (repris de l'ancienne appli : frontend/src/features/tree/BoutonEnfantEpouse.tsx) ----
// Ses demandes du 26/09 : « pour ajouter les enfants il serait mieux d'ajouter plutôt sur l'épouse au lieu du mari ».
// Redit le 15/10 : « si je tape un nom de femme et que son conjoint est déjà inscrit, au-dessus du nom de la femme on
// doit voir ENFANT, et si je clique sur Enfant c'est pour ajouter — ces fonctions étaient terminées ».
// Règle de l'ancienne appli, à l'identique :
//   · un homme choisi qui a une ou plusieurs épouses → « + Enfant » au-dessus de la carte de CHAQUE épouse ;
//   · une femme choisie dont le conjoint est inscrit → « + Enfant » au-dessus de SA carte (un par conjoint) ;
//   · un toucher → l'enfant est ajouté à CE couple (mère = l'épouse, père = son conjoint), nom du père proposé,
//     et sa fiche s'ouvre pour inscrire le prénom.
// Seulement pour l'administrateur (inscription obligatoire, loi 2). Rien n'est envoyé : brouillon, puis « Envoi ».
// Les bulles vivent dans leur propre calque (#bulles-enfant, dans #layer) : les cartes ne sont pas touchées.
// Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = l'arbre d'avant.
const LARGEUR = 92, HAUTEUR = 26, ECART = 6;

const style = document.createElement('style');
style.textContent = `
#bulles-enfant { position: absolute; left: 0; top: 0; pointer-events: none; }
#bulles-enfant .bulle-enfant { position: absolute; width: ${LARGEUR}px; height: ${HAUTEUR}px; pointer-events: auto;
  border-radius: 8px; border: 1px solid #b07a35; background: oklch(0.99 0.008 90 / .97); color: #7a4f1d;
  font: 500 11px/1 var(--sans, system-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
  box-shadow: 0 1px 3px oklch(0.3 0.03 60 / .25); }
#bulles-enfant .bulle-enfant:hover { background: #f6ead6; }`;
document.head.appendChild(style);

const prenom = (p) => String(p?.first_name || '').trim().split(/\s+/)[0] || '';

/** Les couples dont « + Enfant » va sur l'épouse : [{ mere, pere }]. */
export function couplesDe(V, choisi) {
  const lui = V.personne(choisi);
  if (!lui) return [];
  const conj = V.conjoints(choisi).map((id) => V.personne(id)).filter(Boolean);
  if (lui.sex === 'F') return conj.filter((c) => c.sex !== 'F').map((c) => ({ mere: lui, pere: c }));
  return conj.filter((c) => c.sex !== 'M').map((c) => ({ mere: c, pere: lui }));
}

function dessiner() {
  try {
    const V = window.AncestriaVue;
    const layer = document.getElementById('layer');
    if (!V || !layer) return;
    let calque = document.getElementById('bulles-enfant');
    if (!calque) { calque = document.createElement('div'); calque.id = 'bulles-enfant'; layer.appendChild(calque); }
    const choisi = V.choisi();
    const couples = choisi && V.admin() ? couplesDe(V, choisi) : [];
    const parMere = {};
    for (const c of couples) (parMere[c.mere.id] ??= []).push(c);
    let html = '';
    for (const [mereId, liste] of Object.entries(parMere)) {
      const b = V.boite(mereId);
      if (!b) continue;
      liste.forEach((c, i) => {
        const x = b.x + b.w / 2 - LARGEUR / 2;
        const y = b.y - (HAUTEUR + ECART) * (i + 1);
        const avec = liste.length > 1 ? ` · ${prenom(c.pere)}` : '';
        html += `<button type="button" class="bulle-enfant" data-mere="${c.mere.id}" data-pere="${c.pere.id}" style="left:${x}px;top:${y}px" title="Ajouter un enfant de ce couple (cette épouse est la mère)">+ Enfant${avec.replace(/[<>&"]/g, '')}</button>`;
      });
    }
    if (calque.innerHTML !== html) calque.innerHTML = html;
  } catch (err) { /* repli : la fiche « Ajouter un membre » reste là */ }
}

try {
  const nodes = document.getElementById('nodes');
  if (nodes) new MutationObserver(dessiner).observe(nodes, { childList: true });
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('#bulles-enfant .bulle-enfant');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    window.AncestriaVue?.ajouterEnfant(b.dataset.mere, b.dataset.pere);
  }, true);
  dessiner();
} catch (err) { /* repli : la fiche « Ajouter un membre » reste là */ }
// ---- FIN « + ENFANT » SUR L'ÉPOUSE ----
