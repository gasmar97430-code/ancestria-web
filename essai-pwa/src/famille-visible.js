// ---- RIEN À L'OUVERTURE : LA FAMILLE DE LA PERSONNE TAPÉE (14/10/2026) ----
// Ses mots : « tous ces noms ne doivent pas être visibles, on ne doit pas les voir dès l'ouverture de la page mais
// simplement quand je tape un nom » ; « si je tape paul hoarau je dois voir que la famille de Paul, et pour Paul
// qui a un deuxième prénom, peu importe le prénom : si j'écris paul ou joselito ça devrait automatiquement
// apparaître dans l'arborescence ».
//   · rien de choisi (ouverture, Accueil) → aucune carte, aucun lien : le banian seul ;
//   · une personne choisie → SA famille : ses ascendants (3 générations), ses descendants (2), ses frères et
//     sœurs, et les conjoints de tous ceux-là (même règle que la lumière des liens) ;
//   · la recherche : chaque mot tapé doit se trouver dans UN des prénoms ou dans le nom (sans accents, sans
//     majuscules, dans n'importe quel ordre) → « paul hoarau » et « joselito hoarau » trouvent Josélito Paul HOARAU ;
//   · une seule personne trouvée → son arbre s'ouvre tout seul.
// Lignes d'appel : app.js, computeModel() et searchMatches(). Les retirer = comme avant.
export const GENERATIONS = { haut: 3, bas: 2 };
const norme = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mots = (s) => norme(s).split(/[^a-z0-9]+/).filter(Boolean);

// Chaque mot tapé est le début d'un des prénoms ou d'un mot du nom.
export function correspond(p, q) {
  try {
    const tapes = mots(q);
    if (!tapes.length) return true;
    const siens = [...mots(p.first_name), ...mots(p.last_name)];
    return tapes.every((t) => siens.some((m) => m.startsWith(t)));
  } catch (err) { return false; }
}

export function familleVisible(personnes, relations, choisi) {
  try {
    if (!choisi) return [];
    const ids = new Set(personnes.map((p) => p.id));
    if (!ids.has(choisi)) return [];
    const parents = {}, enfants = {}, conjoints = {};
    const ajoute = (m, k, v) => { (m[k] ??= []).includes(v) || m[k].push(v); };
    for (const r of relations) {
      if (r.is_hidden || !ids.has(r.person_id) || !ids.has(r.related_id)) continue;
      if (r.kind === 'parent') { ajoute(parents, r.related_id, r.person_id); ajoute(enfants, r.person_id, r.related_id); }
      else { ajoute(conjoints, r.person_id, r.related_id); ajoute(conjoints, r.related_id, r.person_id); }
    }
    const garde = new Set([choisi]);
    const parcours = (suivant, max) => {
      let front = [choisi];
      for (let k = 0; k < max && front.length; k++) {
        const suite = [];
        for (const id of front) for (const n of suivant[id] ?? []) if (!garde.has(n)) { garde.add(n); suite.push(n); }
        front = suite;
      }
    };
    parcours(parents, GENERATIONS.haut);
    parcours(enfants, GENERATIONS.bas);
    for (const p of parents[choisi] ?? []) for (const f of enfants[p] ?? []) garde.add(f); // frères et sœurs
    for (const id of [...garde]) for (const c of conjoints[id] ?? []) garde.add(c);
    return personnes.filter((p) => garde.has(p.id));
  } catch (err) {
    return personnes.filter((p) => p.id === choisi); // repli : au moins la personne cherchée
  }
}

// Une seule personne trouvée pendant la frappe → son arbre s'ouvre (après une courte pause de frappe).
try {
  let minuterie = 0;
  document.addEventListener('input', (e) => {
    if (!(e.target instanceof Element) || e.target.id !== 'search-input') return;
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      const res = document.querySelectorAll('#search-results [data-goto]');
      if (res.length === 1 && e.target.value.trim().length >= 3) res[0].click();
    }, 700);
  });
} catch (err) { /* repli : on choisit dans la liste, comme avant */ }
// ---- FIN RIEN À L'OUVERTURE ----
