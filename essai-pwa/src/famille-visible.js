// ---- RIEN À L'OUVERTURE : SEULEMENT LE NOM DE FAMILLE TAPÉ (14/10/2026) ----
// Ses mots : « tous ces noms ne doivent pas être visibles, on ne doit pas les voir dès l'ouverture de la page mais
// simplement quand je tape un nom » ; « quand je tape un nom de famille alors l'arborescence s'ouvre, que
// simplement le nom tapé ».
//   · rien de choisi (ouverture, Accueil) → aucune carte, aucun lien : le banian seul ;
//   · un nom choisi dans la recherche (clic sur un résultat, ou Entrée) → l'arborescence de CE nom de famille :
//     toutes les fiches qui portent ce nom, et leurs conjoints (pour qu'un couple reste un couple et que les
//     enfants restent reliés à leurs deux parents) ;
//   · un clic sur une carte de cet arbre choisit la personne SANS changer de nom de famille.
// Ligne d'appel : app.js, computeModel(). Retirer l'appel = tout l'arbre visible, comme avant.
const norme = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

let nomChoisi = null;        // le nom de famille de l'arbre affiché
let depuisRecherche = false; // le prochain choix vient d'un résultat de recherche
try {
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-goto]')) depuisRecherche = true;
  }, true);
} catch (err) { /* repli : sans le guetteur, le nom suit la personne choisie */ }

export function familleVisible(personnes, relations, choisi) {
  try {
    if (!choisi) { nomChoisi = null; depuisRecherche = false; return []; }
    const p0 = personnes.find((p) => p.id === choisi);
    if (!p0) return [];
    if (depuisRecherche || !nomChoisi) { nomChoisi = norme(p0.last_name); depuisRecherche = false; }
    const garde = new Set(personnes.filter((p) => nomChoisi && norme(p.last_name) === nomChoisi).map((p) => p.id));
    garde.add(choisi);
    const base = new Set(garde);
    const ids = new Set(personnes.map((p) => p.id));
    for (const r of relations) {
      if (r.is_hidden || r.kind !== 'spouse' || !ids.has(r.person_id) || !ids.has(r.related_id)) continue;
      if (base.has(r.person_id)) garde.add(r.related_id);
      if (base.has(r.related_id)) garde.add(r.person_id);
    }
    // Les conjoints ajoutés ci-dessus n'ajoutent pas LEURS conjoints : on reste sur le nom tapé.
    return personnes.filter((p) => garde.has(p.id));
  } catch (err) {
    return personnes.filter((p) => p.id === choisi); // repli : au moins la personne cherchée
  }
}
// ---- FIN RIEN À L'OUVERTURE ----
