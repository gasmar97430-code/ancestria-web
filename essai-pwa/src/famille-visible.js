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

// 15/10 — ses mots : « je tape un nom et rien ne s'affiche, ça reste bloqué sur la liste, pas d'arborescence ».
// Un NOM DE FAMILLE seul (« hoarau ») → l'arborescence de ce nom s'ouvre d'elle-même : tous ceux qui le portent et
// leurs conjoints (sa demande du 14/10 : « quand je tape un nom de famille, l'arborescence s'ouvre »). Une PERSONNE
// (« paul hoarau ») → sa famille, comme avant. Un toucher sur un nom de la liste → la famille de cette personne.
let requeteAuto = null;   // ce qui était tapé quand l'appli a ouvert l'arbre d'elle-même
let clicAuto = false;
let nomOuvert = null;     // nom de famille dont l'arborescence est ouverte (null = famille d'une personne)
const motsNom = (p) => mots(p.last_name);

function arbreDuNom(personnes, relations, nom, choisi) {
  const garde = new Set(personnes.filter((p) => mots(p.last_name).join(' ') === nom).map((p) => p.id));
  garde.add(choisi);
  const base = new Set(garde);
  for (const r of relations) {
    if (r.is_hidden || r.kind !== 'spouse') continue;
    if (base.has(r.person_id)) garde.add(r.related_id);
    if (base.has(r.related_id)) garde.add(r.person_id);
  }
  return personnes.filter((p) => garde.has(p.id));
}

export function familleVisible(personnes, relations, choisi) {
  try {
    if (!choisi) { nomOuvert = null; requeteAuto = null; return []; }
    const ids = new Set(personnes.map((p) => p.id));
    if (!ids.has(choisi)) return [];
    if (requeteAuto !== null) {
      // Tout ce qui correspond porte le même nom, et chaque mot tapé est dans ce nom → c'est un nom de famille.
      const trouves = personnes.filter((p) => correspond(p, requeteAuto));
      const noms = new Set(trouves.map((p) => motsNom(p).join(' ')));
      const tapes = mots(requeteAuto);
      const [nom] = noms;
      nomOuvert = trouves.length > 1 && noms.size === 1 && tapes.every((t) => nom.split(' ').some((m) => m.startsWith(t))) ? nom : null;
      requeteAuto = null;
    }
    if (nomOuvert) return arbreDuNom(personnes, relations, nomOuvert, choisi);
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
      const res = [...document.querySelectorAll('#search-results [data-goto]')];
      const q = e.target.value.trim();
      if (q.length < 3 || !res.length) return;
      // 15/10, sur SON arbre : « FERRERE » et « FERRÈRE » = le même nom (accents et majuscules ne comptent pas).
      const nomsListe = new Set(res.map((b) => mots(b.querySelector('.name b')?.textContent || '').join(' ')));
      if (res.length === 1) { requeteAuto = q; clicAuto = true; res[0].click(); return; }
      if (nomsListe.size === 1) {
        // Un nom de famille : on ouvre son arborescence sur le plus ancien de la liste (l'aïeul).
        const an = (b) => +((b.querySelector('small')?.textContent || '').match(/(1[0-9]{3}|20[0-9]{2})/)?.[1] || 9999);
        const aieul = res.reduce((a, b) => (an(b) < an(a) ? b : a));
        requeteAuto = q; clicAuto = true; aieul.click();
      }
    }, 700);
  });
  // Un toucher sur un nom de la liste = la famille de CETTE personne (on quitte l'arborescence du nom).
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-goto]')) return;
    if (clicAuto) { clicAuto = false; return; }
    requeteAuto = null; nomOuvert = null;
  }, true);
} catch (err) { /* repli : on choisit dans la liste, comme avant */ }
// ---- FIN RIEN À L'OUVERTURE ----
