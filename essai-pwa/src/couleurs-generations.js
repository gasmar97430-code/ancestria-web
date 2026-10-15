// ---- COULEURS DES GÉNÉRATIONS (15/10/2026 ~08:15) ----
// Ses mots (capture GASTELLIER) : « les lignes lumineuses : une couleur pour les parents, ensuite une autre couleur
// pour les enfants, autre couleur les grands-parents, c'est de changer de couleur sur chaque entité ».
// Déjà dit le 06/10 (ancienne appli, CouleursDesNoms.tsx) : « grand-parent foncé, petit-enfant plus clair ».
// Règle : chaque ligne prend la couleur de la GÉNÉRATION d'où elle part — la rangée de cartes au-dessus d'elle.
// Rien n'est recalculé : on lit ce que l'appli a déjà dessiné (#nodes, #links). Ligne d'appel : index.html.
// Supprimer ce fichier et sa ligne = les lignes dorées d'avant.
// SA règle du 06/10 (CouleursDesNoms.tsx, mêmes bornes) : la rangée du haut (aïeux) la plus FONCÉE, la plus basse
// (petits-enfants) la plus CLAIRE ; et ses mots du 15/10 : une AUTRE couleur à chaque génération → la teinte tourne
// de l'angle d'or (137,5°, comme ses couleurs des noms) d'une rangée à l'autre. Couleurs OKLCH (même clarté perçue).
export const CLARTE_FONCEE = 0.36, CLARTE_CLAIRE = 0.76;
const CHROMA = 0.15;
export function teinte(g, total) {
  const l = total <= 1 ? CLARTE_FONCEE : CLARTE_FONCEE + ((CLARTE_CLAIRE - CLARTE_FONCEE) * g) / (total - 1);
  const h = ((25 + g * 137.508) % 360).toFixed(1);
  return { trait: `oklch(${l.toFixed(3)} ${CHROMA} ${h})`, halo: `oklch(${Math.max(0.2, l - 0.18).toFixed(3)} ${CHROMA} ${h})` };
}

const depart = (el) => {
  const d = (el.matches('path') ? el : el.querySelector('path'))?.getAttribute('d') || '';
  const m = /M\s*(-?[\d.]+)[ ,](-?[\d.]+)/.exec(d);
  return m ? { x: +m[1], y: +m[2] } : null;
};

export function colorer() {
  try {
    const liens = document.getElementById('links');
    const cartes = [...document.querySelectorAll('#nodes .node')];
    if (!liens || !cartes.length) return;
    // Les rangées : les hauts de cartes distincts, du haut vers le bas.
    const rangees = [...new Set(cartes.map((c) => Math.round(parseFloat(c.style.top) || 0)))].sort((a, b) => a - b);
    for (const el of liens.children) {
      const p = depart(el);
      if (!p) continue;
      let g = 0;
      rangees.forEach((top, i) => { if (top <= p.y + 1) g = i; });
      const t = teinte(g, rangees.length - 1 || 1);
      el.dataset.generation = String(g);
      const peindre = (path, couleur) => { path.style.setProperty('stroke', couleur, 'important'); };
      if (el.matches('path')) {
        peindre(el, t.trait);
        el.style.setProperty('filter', `drop-shadow(0 0 2px ${t.trait}) drop-shadow(0 0 5px ${t.halo})`, 'important');
      } else {
        const halo = el.querySelector('.lien-lumineux__halo'), coeur = el.querySelector('.lien-lumineux__coeur'), lueur = el.querySelector('.lien-lumineux__lueur');
        if (halo) peindre(halo, t.halo);
        if (coeur) { peindre(coeur, t.trait); coeur.style.setProperty('filter', `drop-shadow(0 0 4px ${t.trait}) drop-shadow(0 0 10px ${t.halo})`, 'important'); }
        if (lueur) lueur.style.setProperty('filter', `drop-shadow(0 0 4px #fff) drop-shadow(0 0 9px ${t.trait})`, 'important');
      }
    }
  } catch (err) { /* repli : les lignes dorées d'avant */ }
}

try {
  const liens = document.getElementById('links');
  if (liens) new MutationObserver(colorer).observe(liens, { childList: true });
  colorer();
} catch (err) { /* repli : les lignes dorées d'avant */ }
// ---- FIN COULEURS DES GÉNÉRATIONS ----
