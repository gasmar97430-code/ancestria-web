import { supabase } from './supabase.js';
import { signIn, signUp, signOut, requireSession, isAdminUser, displayName, shareInvite, inviteBySms, appBase } from './auth.js';
import { initPWA, installState, promptInstall, onInstallChange, isAndroid } from './pwa.js';
import * as store from './tree-store.js';
import { layoutTree, PanZoom, NODE_W, NODE_H } from './tree-view.js';
import { familleVisible, correspond } from './famille-visible.js'; // 14/10 : rien à l'ouverture ; la famille de la personne tapée (tous ses prénoms)
import { estAdministrateur } from './admin-table.js'; // 14/10 : administrateur aussi par la table admins

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Mode PC / mobile : UN état, tenu par src/mode.js (<html data-mode>). Même interface que le matchMedia du
// paquet (desktop.matches, desktop.addEventListener('change')) : le reste du code n'a pas à changer.
const desktop = {
  get matches() { return window.AncestriaMode?.current() === 'pc'; },
  addEventListener: (_type, fn) => window.AncestriaMode?.onChange(fn),
};
const ORIGINS = ['Europe', 'Inde', 'Afrique', 'Madagascar', 'Chine', "Nom d'affranchi"];
const FIELDS = [
  ['first_name', 'Prénom', 'text'], ['last_name', 'Nom', 'text'],
  ['birth_date', 'Naissance', 'date'], ['death_date', 'Décès', 'date'],
  ['birth_place', 'Lieu de naissance', 'text', 'full'], ['origin', 'Origine', 'origin', 'full'],
  ['source_url', "Lien de l'acte d'état civil", 'url', 'full'], ['notes', 'Notes', 'textarea', 'full'],
  ['deceased', 'Décédé(e)', 'checkbox', 'full'], // loi 6 : une fiche non décédée est protégée pour les non-administrateurs
];
// Loi 6 : fiche d'une personne vivante telle que la vue persons_public la rend à un non-administrateur.
const PROTEGEE = 'Fiche protégée';
const isProtected = (p) => p?.first_name === PROTEGEE;

const S = {
  user: null, isAdmin: false, treeId: null,
  base: { all: [], relations: [] }, draft: store.emptyDraft(), photoUrls: {},
  m: { persons: {}, relations: [] }, layout: null,
  sel: null, editing: false, adding: false, origin: null, nav: 'home',
};
let pz = null, bootedFor;
const authForm = $('#auth-form'); // le formulaire du paquet, montré dans la feuille « inscrivez-vous »

const adminMode = () => S.isAdmin && desktop.matches;
const fullName = (p) => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
const nameHtml = (p) => `${esc(p.first_name)} <b>${esc(p.last_name)}</b>`;
const initials = (p) => ((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase() || '?';
const yr = (d) => d?.slice(0, 4);
const years = (p) => p.death_date ? `${yr(p.birth_date) ?? '?'} – ${yr(p.death_date)}` : p.birth_date ? `né(e) en ${yr(p.birth_date)}` : '';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
const fmtTime = (d) => d ? new Date(d).toLocaleString('fr-FR') : '';
const photoOf = (p) => S.draft.photos[p.id] || S.photoUrls[p.photo_path] || null;
const avatar = (p, cls = 'av') => `<span class="${cls}">${photoOf(p) ? `<img src="${esc(photoOf(p))}" alt="">` : esc(initials(p))}</span>`;
// Drapeau de l'origine (son modèle PC) quand elle en a un ; sinon le globe du paquet.
const FLAGS = { Europe: 'eu', Inde: 'in', Madagascar: 'mg', Chine: 'cn' };
const flagOf = (o) => FLAGS[o] ? `<span class="fi fi-${FLAGS[o]} flag" aria-hidden="true"></span>` : '<i class="ph ph-globe-hemisphere-west"></i>';
const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : null;

/* ---------- Démarrage / Auth ---------- */
initPWA();
supabase.auth.onAuthStateChange((_evt, session) => {
  const id = session?.user?.id ?? null;
  if (id !== bootedFor) setTimeout(boot, 0); // hors callback : évite le verrou interne de supabase-js
});
desktop.addEventListener('change', () => { if (S.user || document.body.classList.contains('guest')) { S.editing = false; applyOrientation(false); render(); fitView(); } });

async function boot() {
  const session = await requireSession();
  bootedFor = session?.user?.id ?? null;
  if (!pz) pz = new PanZoom($('#viewport'), $('#layer'), onView);
  applyOrientation(false);
  if (!session) return showGuest();
  document.body.classList.remove('guest');
  if ($('#sheet').dataset.kind === 'auth') closeSheet();
  $('#auth').append(authForm); // le formulaire retourne à sa place (section #auth, cachée)
  S.user = session.user;
  S.isAdmin = isAdminUser(session.user) || await estAdministrateur(supabase, session.user);
  $('#auth').hidden = true; $('#app').hidden = false;
  $$('.js-user-name').forEach((el) => (el.textContent = displayName(S.user)));

  S.treeId = window.ANCESTRIA_TREE_ID
    || (await supabase.from('trees').select('id').order('created_at').limit(1).maybeSingle()).data?.id;
  if (!S.treeId) return toast('Aucun arbre trouvé dans la base.');
  S.draft = S.isAdmin ? store.loadDraft(S.treeId) : store.emptyDraft();
  try { await refresh(true); } catch (e) { toast(`Chargement impossible : ${e.message}`); }
  maybeAutoInstall();
}

// ---- VISITEUR SANS COMPTE (sa règle « Google ») ----
// « quand quelqu'un clique sur Ancestria il voit simplement l'interface, mais pour aller plus loin il faut
// absolument s'inscrire » : fond, barres, recherche et zoom visibles, AUCUNE donnée chargée ; tout geste
// (navigation, recherche, arbre, zoom, filtres) ouvre la feuille « Pour aller plus loin, inscrivez-vous »
// avec le formulaire du paquet (Créer un compte / Se connecter). Seuls « Installer » et la vue panoramique
// restent libres (ils ne montrent aucune donnée).
function showGuest() {
  S.user = null; S.isAdmin = false; S.treeId = null; S.sel = null; S.editing = false;
  S.base = { all: [], relations: [] }; S.draft = store.emptyDraft(); S.photoUrls = {};
  document.body.classList.add('guest');
  $('#auth').hidden = true; $('#app').hidden = false;
  $$('.js-user-name').forEach((el) => (el.textContent = el.closest('.user-chip') ? 'Se connecter' : ''));
  render(); fitView();
  maybeAutoInstall();
}
function openAuthSheet() {
  if ($('#sheet').dataset.kind === 'auth' && !$('#sheet').hidden) return;
  openSheet('Pour aller plus loin, inscrivez-vous', '<div data-auth-slot></div>');
  $('#sheet [data-auth-slot]').replaceWith(authForm);
  $('#sheet').dataset.kind = 'auth';
}
const guestGate = (e) => {
  if (!document.body.classList.contains('guest') || !(e.target instanceof Element)) return;
  if (e.target.closest('#sheet, #pano, [data-nav="install"]')) return;
  if (!e.target.closest('[data-nav], [data-zoom], [data-origin], .user-chip, #viewport, #search-input, #searchbar, #panel')) return;
  e.preventDefault(); e.stopPropagation();
  if (e.type === 'focusin') e.target.blur();
  openAuthSheet();
};
['click', 'pointerdown', 'focusin'].forEach((t) => document.addEventListener(t, guestGate, true));
document.addEventListener('wheel', guestGate, { capture: true, passive: false });
// ---- FIN VISITEUR SANS COMPTE ----

function showAuth(msg = '') {
  $('#auth-msg').textContent = msg;
  if (!S.user) openAuthSheet();
}
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const email = String(f.get('email')).trim(), pw = String(f.get('password'));
  if (!email || pw.length < 8) return showAuth('E-mail et mot de passe (8 caractères minimum) requis.');
  try {
    if (e.submitter?.value === 'signup') {
      const firstName = String(f.get('first_name') || '').trim(), lastName = String(f.get('last_name') || '').trim();
      if (!firstName || !lastName) return showAuth('Prénom et nom sont obligatoires pour créer un compte.');
      if (!f.get('charte')) return showAuth("Cochez « J'accepte la Charte d'Ancestria » pour créer un compte.");
      await signUp(email, pw, { firstName, lastName });
      showAuth('Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte.');
    } else await signIn(email, pw);
  } catch (err) { showAuth(err.message); }
});

/* ---------- Données ---------- */
async function refresh(fit) {
  S.base = await store.loadTree(S.treeId, S.isAdmin);
  S.photoUrls = await store.signedPhotoUrls(S.base.all.map((p) => p.photo_path).filter(Boolean));
  if (S.sel && !S.base.all.some((p) => p.id === S.sel) && !S.draft.persons[S.sel]) S.sel = null;
  render();
  if (fit) fitView();
}

function computeModel() {
  const persons = {};
  for (const p of S.base.all) persons[p.id] = p;
  for (const p of Object.values(S.draft.persons)) persons[p.id] = { ...persons[p.id], ...p, _dirty: true };
  S.m = { persons, relations: [...S.base.relations, ...S.draft.relations] };
  const visible = familleVisible(Object.values(persons).filter((p) => !p.is_hidden), S.m.relations, S.sel);
  S.layout = layoutTree(visible, S.m.relations, layoutOpts(visible, S.m.relations));
  return visible;
}

// ---- ARBRE « ARBRE DE LUMIÈRE » (ses modèles du 13/10 : reference-telephone-13-10.png, reference-pc-13-10.webp) ----
// Ses mots : « c'est tout simplement un modèle … réaliser une interface qui RESSEMBLE à cette image ». Téléphone
// ET PC : l'ancêtre de la lignée en GRANDE carte dorée en haut au centre (prénom / NOM, rang, naissance / décès),
// les générations dessous en petites cartes blanches compactes, une pastille sous chaque couple, des liens en
// COURBES dorées, l'arbre centré sur le banian de l'image de fond.
// Proportions mesurées sur sa référence : grande carte ≈ 3,5 × la largeur et la hauteur d'une petite ;
// arbre presque aussi haut que large, posé sur le banian (centré vers 55 % de la hauteur de l'écran).
// Grande carte : ≈ 3 × une petite sur le modèle téléphone, ≈ 2 × sur le modèle PC.
const MOBILE_TREE = { nodeW: 112, nodeH: 62, col: 122, row: 140, pad: 20, curves: true, union: 18 };
const BIG = () => (desktop.matches ? { w: 240, h: 132 } : { w: 330, h: 200 });
function soucheDe(L) {
  // L'ancêtre de la lignée : parmi la 1re génération, celui qui a le plus de descendants (à égalité : le plus à gauche).
  const roots = Object.keys(L.gen).filter((id) => L.gen[id] === 0 && L.children[id].length).sort((a, b) => L.pos[a].x - L.pos[b].x);
  let best = null, bestN = -1;
  for (const r of roots) {
    const vu = new Set(); const pile = [r];
    while (pile.length) for (const c of L.children[pile.pop()]) if (!vu.has(c)) { vu.add(c); pile.push(c); }
    if (vu.size > bestN) { best = r; bestN = vu.size; }
  }
  return best;
}
function layoutOpts(visible, relations) {
  S.souche = null;
  try {
    S.souche = soucheDe(layoutTree(visible, relations, { ...MOBILE_TREE, top: BIG().h - MOBILE_TREE.nodeH }));
  } catch { S.souche = null; } // repli : pas de grande carte, l'arbre reste dessiné
  const big = BIG();
  return S.souche ? { ...MOBILE_TREE, top: big.h - MOBILE_TREE.nodeH + 10, big: { id: S.souche, ...big } } : MOBILE_TREE;
}
function soucheHtml(p, o, cls) {
  const rk = rank(p);
  const dates = isProtected(p) ? '' : `Naiss. ${yr(p.birth_date) ?? '?'} / décès ${yr(p.death_date) ?? '—'}`;
  return `<button type="button" class="${cls} node--souche" data-id="${p.id}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px">${avatar(p)}<span class="souche-first">${esc(p.first_name)}</span><span class="souche-last">${esc(p.last_name)}</span>${rk ? `<span class="souche-sub">${rk}</span>` : ''}${dates ? `<span class="souche-sub">${esc(dates)}</span>` : ''}</button>`;
}
function unionsHtml() {
  return S.layout.couples.map((c) => {
    const noms = [...new Set([c.l, c.r].map((id) => (S.m.persons[id]?.last_name || '').trim().toUpperCase()).filter(Boolean))].join(' · ');
    return `<span class="union" style="left:${c.x + c.w * 0.1}px;top:${c.y + 4}px;width:${c.w * 0.8}px">${esc(noms)}</span>`;
  }).join('');
}
// ---- FIN ARBRE DU TÉLÉPHONE ----

function touch(id) {
  if (!S.draft.persons[id]) S.draft.persons[id] = store.pickPerson(S.m.persons[id]);
  return S.draft.persons[id];
}
function persist() { try { store.saveDraft(S.treeId, S.draft); } catch (e) { toast(e.message); } }

function rank(p) {
  const ps = S.layout.parents[p.id];
  if (!ps?.length) return '';
  const sibs = [...new Set(ps.flatMap((x) => S.layout.children[x]))].map((id) => S.m.persons[id])
    .sort((a, b) => (a.birth_date || '9999').localeCompare(b.birth_date || '9999'));
  const i = sibs.findIndex((s) => s.id === p.id) + 1;
  return i ? `${i === 1 ? '1er' : `${i}e`} enfant` : '';
}

/* ---------- Rendu ---------- */
function render() {
  document.body.classList.toggle('admin-mode', adminMode());
  document.body.classList.toggle('est-admin', !!S.isAdmin); // 14/10 : « Admin » (téléphone) seulement pour l'administrateur
  drawTree(computeModel());
  renderTopbar(); renderPanel(); renderNav(); renderChips($('#chips'));
}

// ---- LUMIÈRE DES LIENS (LienLumineux + LumiereDesParents + fond-arbre-de-vie de l'ancienne appli) ----
// Ses mots : « les lignes clignotantes qui relient parent enfant il faudra les garder ». Pour la personne
// choisie : sa famille proche (3 générations au-dessus, 2 au-dessous, et les conjoints d'elle et de ses
// enfants) a des cordons lumineux — halo, trait plein, lueur qui court (vers le haut sur l'ascendance) ;
// les cordons de ses parents vers TOUS leurs enfants brillent ; le contour des cartes du père et de la mère
// clignote. Même règle que focus.ts / LumiereDesParents.tsx ; couleurs et temps dans app.css.
const GENERATIONS_LUMINEUSES = { haut: 3, bas: 2 };
function lumiereDe(pivot) {
  const L = S.layout;
  const parcours = (next, max) => {
    const vu = new Map([[pivot, 0]]); let front = [pivot];
    for (let k = 1; k <= max; k++) {
      const suite = [];
      for (const a of front) for (const b of next[a] || []) if (!vu.has(b)) { vu.set(b, k); suite.push(b); }
      front = suite;
    }
    return vu;
  };
  const haut = parcours(L.parents, GENERATIONS_LUMINEUSES.haut), bas = parcours(L.children, GENERATIONS_LUMINEUSES.bas);
  const conjoints = new Set();
  for (const [id, k] of bas) if (k < GENERATIONS_LUMINEUSES.bas) (L.spouses[id] || []).forEach((c) => conjoints.add(c));
  const personnes = new Set([...haut.keys(), ...bas.keys(), ...conjoints]);
  // Un couple porte la lumière : couple d'ancêtres (elle remonte), ou couple de la personne / d'un enfant.
  const couple = (a, b) => {
    if (haut.has(a) && haut.has(b) && a !== pivot && b !== pivot) return 'monte';
    if (((bas.get(a) ?? 9) < GENERATIONS_LUMINEUSES.bas || (bas.get(b) ?? 9) < GENERATIONS_LUMINEUSES.bas) && personnes.has(a) && personnes.has(b)) return 'descend';
    return null;
  };
  const versLui = L.cords.find((c) => c.kind === 'parent' && c.to === pivot);
  return { haut, personnes, couple, parents: new Set(L.parents[pivot] || []), fratrie: versLui ? versLui.from.join() : null };
}
function cordSvg(c, lum) {
  const d = `d="${c.d}"`;
  if (!lum) return { z: 0, svg: `<path ${d}/>` };
  let sens = null;
  if (c.kind === 'spouse' || c.from.length === 2) {
    const [a, b] = c.kind === 'spouse' ? [c.from[0], c.to] : c.from;
    const u = lum.couple(a, b);
    if (u && (c.kind === 'spouse' || lum.personnes.has(c.to))) sens = u === 'monte' && (c.kind === 'spouse' || lum.haut.has(c.to)) ? 'monte' : 'descend';
  } else if (lum.personnes.has(c.from[0]) && lum.personnes.has(c.to)) {
    sens = lum.haut.has(c.from[0]) && lum.haut.has(c.to) ? 'monte' : 'descend';
  }
  if (sens) {
    const cls = ['lien-lumineux', c.kind === 'parent' && 'lien-lumineux--cordon', sens === 'monte' && 'lien-lumineux--monte'].filter(Boolean).join(' ');
    return { z: 2, svg: `<g class="${cls}"><path ${d} class="lien-lumineux__halo"/><path ${d} class="lien-lumineux__coeur"/><path ${d} pathLength="1000" class="lien-lumineux__lueur"/></g>` };
  }
  if (c.kind === 'parent' && lum.fratrie && c.from.join() === lum.fratrie) return { z: 1, svg: `<path ${d} class="cordon-fratrie"/>` };
  return { z: 0, svg: `<path ${d}/>` };
}
function linksSvg() {
  const { cords, pos } = S.layout;
  let lum = null, out;
  try {
    lum = S.sel && pos[S.sel] ? lumiereDe(S.sel) : null;
    out = cords.map((c) => cordSvg(c, lum));
  } catch { lum = null; out = cords.map((c) => cordSvg(c, null)); } // repli : rien ne brille, l'arbre reste tel quel
  out.sort((a, b) => a.z - b.z); // les cordons allumés passent au-dessus
  return { html: out.map((o) => o.svg).join(''), lum };
}
// ---- FIN LUMIÈRE DES LIENS ----

function drawTree(visible) {
  const { pos, width, height } = S.layout;
  const layer = $('#layer'); layer.style.width = `${width}px`; layer.style.height = `${height}px`;
  const svg = $('#links'); svg.setAttribute('width', width); svg.setAttribute('height', height);
  const { html, lum } = linksSvg();
  svg.innerHTML = html;
  $('#nodes').innerHTML = visible.map((p) => {
    const o = pos[p.id];
    const famille = S.sel && (p.id === S.sel || S.layout.spouses[S.sel]?.includes(p.id)); // la personne choisie et son couple brillent (téléphone)
    const cls = ['node', p.id === S.sel && 'is-sel', famille && 'is-famille', lum?.parents.has(p.id) && 'is-parent-lit', p._dirty && 'is-dirty', S.origin && p.origin !== S.origin && 'is-dim'].filter(Boolean).join(' ');
    if (p.id === S.souche) return soucheHtml(p, o, cls);
    return `<button type="button" class="${cls}" data-id="${p.id}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px">${avatar(p)}<span class="node-text"><span class="node-name">${nameHtml(p)}</span><span class="node-years">${esc(years(p))}</span></span></button>`;
  }).join('') + unionsHtml();
}

function renderTopbar() {
  if (!adminMode()) return;
  const n = store.draftSize(S.draft);
  const btn = $('#publish');
  if (!btn.dataset.busy) { btn.disabled = n === 0; btn.querySelector('span').textContent = n ? `Envoi (${n})` : 'Envoi'; }
  if (!btn.dataset.busy) $('#status').textContent = n ? `${n} modification(s) en brouillon` : 'Tout est enregistré';
  // Son modèle PC ne montre ni « Envoi » ni l'état quand rien n'attend : ils apparaissent dès qu'il y a un brouillon.
  btn.hidden = n === 0 && !btn.dataset.busy; $('#status').hidden = btn.hidden;
}

function renderNav() {
  $$('[data-nav]').forEach((b) => b.toggleAttribute('aria-current', b.dataset.nav === S.nav && b.closest('#rail, #tabbar')));
  $$('#rail [aria-current], #tabbar [aria-current]').forEach((b) => b.setAttribute('aria-current', 'page'));
}

function renderChips(el) {
  if (!el) return;
  el.innerHTML = ORIGINS.map((o) => `<button type="button" class="tag" data-origin="${esc(o)}" aria-pressed="${S.origin === o}"><span class="dot"></span>${esc(o)}</button>`).join('');
}

function renderPanel() {
  const el = $('#panel');
  const p = S.m.persons[S.sel];
  if (!p) { el.hidden = true; return; }
  el.hidden = false;
  const editing = S.editing && adminMode();
  el.classList.toggle('is-editing', editing);
  el.classList.toggle('has-portrait', !editing);
  if (editing) return renderEditor(el, p);

  const rel = (label, ids) => ids?.length ? `<div class="ed-label">${label}</div><div class="links-list">${ids.map((id) => S.m.persons[id]).map((o) => `<button type="button" class="tag" data-goto="${o.id}">${esc(fullName(o))}</button>`).join('')}</div>` : '';
  if (isProtected(p)) { // loi 6 : personne vivante, aucun fait montré
    el.innerHTML = `
    <div class="portrait"><i class="ph ph-lock-simple"></i></div>
    <button type="button" class="btn-icon panel-close" data-act="close" aria-label="Fermer"><i class="ph ph-x"></i></button>
    <div class="panel-body">
      <h2 class="p-title">${PROTEGEE}</h2>
      ${rel('Parents', S.layout.parents[p.id])}${rel('Conjoint·e', S.layout.spouses[p.id])}${rel('Enfants', S.layout.children[p.id])}
    </div>`;
    return;
  }
  const rk = rank(p);
  const birth = p.birth_date ? `Né(e) le ${fmtDate(p.birth_date)}${p.birth_place ? ` à ${esc(p.birth_place)}` : ''}` : 'Naissance non documentée';
  const src = safeUrl(p.source_url);
  el.innerHTML = `
    <div class="portrait">${photoOf(p) ? `<img src="${esc(photoOf(p))}" alt="">` : esc(initials(p))}</div>
    <button type="button" class="btn-icon panel-close" data-act="close" aria-label="Fermer"><i class="ph ph-x"></i></button>
    <div class="panel-body">
      <div class="p-user">M'ASTEL.974</div>
      <h2 class="p-title">${nameHtml(p)}</h2>
      <div class="facts">
        ${rk ? `<div><i class="ph-fill ph-circle"></i>${rk}</div>` : ''}
        <div><i class="ph-fill ph-circle"></i>${birth}</div>
        ${p.death_date ? `<div><i class="ph-fill ph-circle"></i>Décès le ${fmtDate(p.death_date)}</div>` : ''}
        <div>${flagOf(p.origin)}Origine ${esc(p.origin || 'non documentée')}</div>
      </div>
      ${rel('Parents', S.layout.parents[p.id])}${rel('Conjoint·e', S.layout.spouses[p.id])}${rel('Enfants', S.layout.children[p.id])}
      ${adminMode() ? `
        <button type="button" class="btn" data-act="edit"><i class="ph ph-pencil-simple"></i>Modifier</button>
        <button type="button" class="btn btn-primary" data-act="add"><i class="ph ph-user-plus"></i>Ajouter un membre</button>
        ${S.adding ? `<div class="add-kinds">
          <button type="button" class="btn" data-add="child">Enfant</button>
          <button type="button" class="btn" data-add="spouse">Conjoint·e</button>
          <button type="button" class="btn" data-add="parent">Parent</button></div>` : ''}
        <div class="admin-box"><div class="admin-box-title">Admin / Validation</div>
          ${src ? `<span>Dernier acte d'état civil</span><a href="${esc(src)}" target="_blank" rel="noopener"><i class="ph ph-arrow-square-out"></i> validé</a>` : '<span class="muted">Aucun acte d\'état civil lié</span>'}
        </div>` : ''}
    </div>`;
}

function renderEditor(el, p) {
  const persisted = S.base.all.some((b) => b.id === p.id);
  const input = ([f, , t]) => {
    const v = esc(p[f] ?? '');
    if (t === 'checkbox') return `<label class="check"><input type="checkbox" data-field="${f}"${p[f] ? ' checked' : ''}><span>Décédé(e)</span></label>`;
    if (t === 'textarea') return `<textarea class="input" data-field="${f}">${v}</textarea>`;
    if (t === 'origin') return `<select class="input" data-field="${f}"><option value="">Non documentée</option>${ORIGINS.map((o) => `<option${p[f] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    return `<input class="input" type="${t}" data-field="${f}" value="${v}">`;
  };
  const rels = S.m.relations.filter((r) => r.person_id === p.id || r.related_id === p.id).map((r) => {
    const o = S.m.persons[r.person_id === p.id ? r.related_id : r.person_id];
    if (!o) return '';
    const label = r.kind === 'spouse' ? 'Conjoint·e' : r.person_id === p.id ? 'Parent de' : 'Enfant de';
    return `<span class="tag">${label} ${esc(fullName(o))}</span>`;
  }).join('');
  const options = Object.values(S.m.persons).filter((o) => o.id !== p.id)
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'))
    .map((o) => `<option value="${o.id}">${esc(fullName(o) || 'Sans nom')}${years(o) ? ` · ${esc(years(o))}` : ''}</option>`).join('');
  el.innerHTML = `
    <button type="button" class="btn-icon panel-close" data-act="view" aria-label="Fermer l'édition"><i class="ph ph-x"></i></button>
    <div class="panel-body">
      <div class="ed-head">
        <label class="ed-photo">${photoOf(p) ? `<img src="${esc(photoOf(p))}" alt="">` : esc(initials(p))}<span class="hint"><i class="ph ph-camera"></i></span><input type="file" accept="image/*" data-photo hidden></label>
        <div><h2 class="js-ed-name">${esc(fullName(p)) || 'Nouvelle fiche'}</h2><code>${p.id}</code></div>
      </div>
      <div class="ed-grid">${FIELDS.map((fd) => fd[2] === 'checkbox' ? `<div class="field ${fd[3] || ''}">${input(fd)}</div>` : `<label class="field ${fd[3] || ''}"><span>${fd[1]}</span>${input(fd)}</label>`).join('')}</div>
      <div class="ed-section">
        <div class="ed-label">Liens familiaux (clés UUID)</div>
        <div class="links-list">${rels || '<span class="muted">Aucun lien</span>'}</div>
        <div class="ed-rel">
          <select class="input" data-rel-kind><option value="parent">Ce parent :</option><option value="child">Cet enfant :</option><option value="spouse">Ce conjoint :</option></select>
          <select class="input" data-rel-target>${options}</select>
          <button type="button" class="btn" data-act="link">Lier</button>
        </div>
      </div>
      <p class="muted">Brouillon conservé sur cet appareil. Enregistrement définitif au clic sur « Envoi ».</p>
      <div class="row-actions">
        ${persisted ? '<button type="button" class="btn" data-act="hide"><i class="ph ph-eye-slash"></i>Masquer</button>' : ''}
        <button type="button" class="btn btn-primary" data-act="view">Terminé</button>
      </div>
    </div>`;
}

/* ---------- Vue / navigation ---------- */
function insets() {
  if (document.body.classList.contains('paysage')) { // mode paysage : arbre plein écran, fiche en panneau latéral
    return { left: 8, top: 8, right: S.sel ? 350 : 56, bottom: 8 };
  }
  if (desktop.matches) return { left: 80, top: 62 + 130, right: 20, bottom: 60 }; // PC : l'arbre centré sur le banian (son modèle)
  return { left: 0, top: 180, right: 0, bottom: 93 }; // téléphone : l'arbre sur toute la largeur, posé sur le banian (sa référence)
}
function fitView() { if (S.layout) pz.fit(S.layout.width, S.layout.height, insets()); }
function focusPerson(id) {
  const o = S.layout?.pos[id]; if (!o) return;
  pz.centerOn(o.x + o.w / 2, o.y + o.h / 2, Math.max(pz.s, 0.9), insets());
}
function onView(s, x, y) {
  $$('.js-zoom-pct').forEach((el) => (el.textContent = `${Math.round(s * 100)}%`));
  $('#bg').style.transform = `translate3d(${(x * 0.03).toFixed(1)}px, ${(y * 0.03).toFixed(1)}px, 0)`;
}
function select(id, focus) {
  S.sel = id; S.editing = false; S.adding = false;
  closeSheet(); render();
  if (focus) focusPerson(id);
}

$('#nodes').addEventListener('click', (e) => {
  const b = e.target.closest('.node');
  if (b && !pz.dragged) select(b.dataset.id, false);
});
// Zoom : UNE colonne par écran (sa précision : « un seul contrôle de zoom »).
$$('#zoom').forEach((box) => box.addEventListener('click', (e) => {
  const z = e.target.closest('[data-zoom]')?.dataset.zoom;
  if (z === 'in') pz.zoomBy(0.2); else if (z === 'out') pz.zoomBy(-0.2); else if (z === 'fit') fitView();
}));

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]')?.dataset.nav;
  if (!nav) return;
  S.nav = nav; renderNav();
  if (nav === 'home') { S.sel = null; closeSheet(); render(); fitView(); }
  else if (nav === 'search') desktop.matches ? $('#search-input').focus() : openSearchSheet();
  else if (nav === 'tree') { closeSheet(); S.sel ? focusPerson(S.sel) : pz.centerOn(S.layout.width / 2, S.layout.nodeH, 1, insets()); }
  else if (nav === 'profile') openProfileSheet();
  // « Admin » (téléphone) : ce que le paquet prévoit pour l'administrateur (Modération) ; pour les autres, la page compte.
  else if (nav === 'admin') S.isAdmin ? openModerationSheet() : openProfileSheet();
  else if (nav === 'settings') openSettingsSheet(); // « Paramètres » (téléphone) = affichage
  else if (nav === 'install') openInstallSheet();
  else if (nav === 'moderation' && adminMode()) openModerationSheet();
});

document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-origin]');
  if (!o) return;
  S.origin = S.origin === o.dataset.origin ? null : o.dataset.origin;
  render();
  if (!$('#sheet').hidden) $('#sheet [data-results]') && runSearch($('#sheet input')?.value || '', $('#sheet [data-results]'));
  $$('#sheet .chips').forEach(renderChips);
});

/* ---------- Recherche ---------- */
function searchMatches(q) {
  const n = q.trim().toLowerCase();
  return Object.values(S.m.persons)
    .filter((p) => !p.is_hidden && (!S.origin || p.origin === S.origin) && (n ? correspond(p, n) : !!S.origin)) // 14/10 : rien tant qu'on n'a rien tapé (ou choisi une origine)
    .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'fr') || (a.first_name || '').localeCompare(b.first_name || '', 'fr'))
    .slice(0, 40);
}
function runSearch(q, el) {
  if (!q.trim() && !S.origin) { el.innerHTML = ''; return; } // 14/10 : aucun nom avant la frappe
  const list = searchMatches(q);
  el.innerHTML = list.length
    ? list.map((p) => `<button type="button" class="result" data-goto="${p.id}">${avatar(p)}<span><span class="name">${nameHtml(p)}</span><small>${esc(years(p))}${p.origin ? ` · ${esc(p.origin)}` : ''}</small></span></button>`).join('')
    : '<p class="muted" style="padding:8px">Aucun résultat.</p>';
}
$('#search-input').addEventListener('input', (e) => {
  const el = $('#search-results');
  el.hidden = !e.target.value.trim();
  if (!el.hidden) runSearch(e.target.value, el);
});
$('#search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const first = $('#search-results [data-goto]'); if (first) first.click(); }
  if (e.key === 'Escape') { e.target.value = ''; $('#search-results').hidden = true; }
});
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goto]');
  if (!g) return;
  $('#search-results').hidden = true; $('#search-input').value = '';
  select(g.dataset.goto, true);
});

/* ---------- Panneau : actions ---------- */
$('#panel').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const add = e.target.closest('[data-add]')?.dataset.add;
  const p = S.m.persons[S.sel];
  if (!p) return;
  if (act === 'close') { S.sel = null; render(); }
  else if (act === 'edit' && adminMode()) { S.editing = true; renderPanel(); }
  else if (act === 'view') { S.editing = false; render(); }
  else if (act === 'add') { S.adding = !S.adding; renderPanel(); }
  else if (add && adminMode()) addMember(p, add);
  else if (act === 'link') linkSelected(p);
  else if (act === 'hide') hideSelected(p);
});

$('#panel').addEventListener('input', (e) => {
  const f = e.target.dataset.field;
  if (!f || !adminMode()) return;
  touch(S.sel)[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim() === '' ? null : e.target.value;
  persist();
  drawTree(computeModel()); renderTopbar();
  const h = $('.js-ed-name'); if (h) h.textContent = fullName(S.m.persons[S.sel]) || 'Nouvelle fiche';
});

$('#panel').addEventListener('change', async (e) => {
  if (!e.target.matches('[data-photo]') || !e.target.files[0]) return;
  try {
    S.draft.photos[S.sel] = await store.resizePhoto(e.target.files[0]);
    touch(S.sel); persist(); render();
  } catch (err) { toast(`Photo illisible : ${err.message}`); }
});

function addRelation(personId, relatedId, kind) {
  const r = store.normRel({ person_id: personId, related_id: relatedId, kind });
  const k = store.relKey(r);
  if (S.m.relations.some((x) => store.relKey(x) === k)) return false;
  S.draft.relations.push(r);
  return true;
}

function addMember(p, kind) {
  const id = store.newPersonId();
  S.draft.persons[id] = store.pickPerson({ id, last_name: kind === 'child' ? p.last_name : null, deceased: false });
  if (kind === 'child') addRelation(p.id, id, 'parent');
  else if (kind === 'parent') addRelation(id, p.id, 'parent');
  else addRelation(p.id, id, 'spouse');
  persist();
  S.sel = id; S.editing = true; S.adding = false;
  render(); focusPerson(id);
  $('#panel [data-field="first_name"]')?.focus();
}

function linkSelected(p) {
  const kind = $('#panel [data-rel-kind]').value, target = $('#panel [data-rel-target]').value;
  if (!target) return;
  const ok = kind === 'parent' ? addRelation(target, p.id, 'parent')
    : kind === 'child' ? addRelation(p.id, target, 'parent')
    : addRelation(p.id, target, 'spouse');
  if (!ok) return toast('Ce lien existe déjà.');
  persist(); render();
}

async function hideSelected(p) {
  const reason = prompt(`Motif du masquage de ${fullName(p)} :`, "Masqué par l'administrateur");
  if (reason === null) return;
  const { error } = await store.hidePerson(p.id, reason || "Masqué par l'administrateur");
  if (error) return toast(error.message);
  toast(`${fullName(p)} est masqué(e). La fiche reste conservée en base.`);
  S.sel = null; S.editing = false;
  await refresh(false);
}

/* ---------- ENVOI ---------- */
$('#publish').addEventListener('click', async () => {
  if (!adminMode()) return;
  const bad = Object.values(S.draft.persons).find((p) => !p.first_name?.trim() || !p.last_name?.trim());
  if (bad) { S.sel = bad.id; S.editing = true; render(); return toast('Prénom et nom sont obligatoires avant l\'Envoi.'); }
  const btn = $('#publish');
  const label = { photos: 'portraits → Storage', transaction: 'fiches + liens UUID (transaction)', verify: 'relecture depuis Supabase' };
  btn.dataset.busy = '1'; btn.disabled = true; btn.querySelector('span').textContent = 'Envoi…';
  try {
    const { result } = await store.publish(S.treeId, S.draft, (k) => { if (label[k]) $('#status').textContent = `Envoi : ${label[k]}…`; });
    S.draft = store.emptyDraft();
    S.editing = false;
    delete btn.dataset.busy;
    await refresh(false);
    toast(`Publié : ${result.persons} fiche(s), ${result.relations_new} nouveau(x) lien(s)${result.hidden ? `, ${result.hidden} masquée(s) par le Surveillant` : ''}.`);
  } catch (err) {
    delete btn.dataset.busy;
    toast(`Envoi annulé : rien n'a été écrit dans la base, le brouillon est conservé. (${err.message})`);
  } finally { renderTopbar(); }
});

/* ---------- Feuilles ---------- */
function openSheet(title, body, wide = false) {
  const el = $('#sheet');
  el.classList.toggle('wide', wide);
  el.classList.remove('install');
  el.innerHTML = title
    ? `<div class="sheet-head"><h2>${title}</h2><button type="button" class="btn-icon" data-close-sheet aria-label="Fermer"><i class="ph ph-x"></i></button></div>${body}`
    : body;
  el.hidden = false;
}
function closeSheet() {
  const el = $('#sheet');
  if (!el.hidden && el.dataset.kind === 'install') localStorage.setItem('ancestria:install-dismissed', '1');
  el.hidden = true; el.dataset.kind = '';
}
$('#sheet').addEventListener('click', async (e) => {
  if (e.target.closest('[data-close-sheet]')) return closeSheet();
  const a = e.target.closest('[data-sheet-act]')?.dataset.sheetAct;
  if (a === 'share') { const r = await shareInvite().catch(() => null); if (r === 'copied') toast('Lien copié.'); }
  if (a === 'sms') inviteBySms();
  const mode = e.target.closest('[data-mode-choice]')?.dataset.modeChoice;
  if (mode) { // effet immédiat (render + fitView via le mode), choix gardé
    const kind = $('#sheet').dataset.kind;
    window.AncestriaMode?.set(mode);
    kind === 'settings' ? openSettingsSheet() : openProfileSheet();
  }
  if (a === 'logout') { await signOut(); location.reload(); }
  if (a === 'install') { await promptInstall(); openInstallSheet(); }
  if (a === 'copy') {
    try { await navigator.clipboard.writeText(appBase()); toast('Lien copié.'); }
    catch { prompt('Copiez ce lien :', appBase()); }
  }
  const restore = e.target.closest('[data-restore]')?.dataset.restore;
  if (restore) {
    const { error } = await store.restorePerson(restore);
    if (error) return toast(error.message);
    toast('Fiche rétablie dans l\'arbre public.');
    await refresh(false); openModerationSheet();
  }
});

function openSearchSheet() {
  openSheet('Recherche', `<input class="input" type="search" placeholder="Tapez un nom de famille…" autocomplete="off"><div class="chips"></div><div data-results></div>`);
  const input = $('#sheet input'), res = $('#sheet [data-results]');
  renderChips($('#sheet .chips'));
  input.addEventListener('input', () => runSearch(input.value, res));
  runSearch('', res);
  setTimeout(() => input.focus(), 50);
}

const modeSwitch = () => `<div class="ed-label">Affichage</div>
    <div class="mode-switch" role="group" aria-label="Mode d'affichage">${[['auto', 'Automatique'], ['mobile', 'Mode Mobile 📱'], ['pc', 'Mode PC 💻']]
      .map(([v, l]) => `<button type="button" data-mode-choice="${v}" aria-pressed="${window.AncestriaMode?.choice() === v}">${l}</button>`).join('')}</div>`;
const moderationBtn = () => adminMode() ? '<button type="button" class="btn" data-nav="moderation"><i class="ph ph-shield-check"></i>Modération</button>' : '';
function openSettingsSheet() {
  openSheet('Paramètres', `${modeSwitch()}${moderationBtn()}`);
  $('#sheet').dataset.kind = 'settings';
}
function openProfileSheet() {
  openSheet(desktop.matches ? 'Mon compte' : 'Profil', `
    <div class="facts">
      <div><i class="ph ph-user-circle"></i>${esc(displayName(S.user))}</div>
      <div><i class="ph ph-envelope-simple"></i>${esc(S.user.email)}</div>
      ${S.isAdmin ? '<div><i class="ph ph-shield-check"></i>Administrateur' + (desktop.matches ? '' : ' (édition disponible sur PC)') + '</div>' : ''}
    </div>
    ${moderationBtn()}
    <button type="button" class="btn" data-sheet-act="share"><i class="ph ph-share-network"></i>Inviter un membre de la famille</button>
    <button type="button" class="btn mobile-only" data-sheet-act="sms"><i class="ph ph-chat-text"></i>Inviter par SMS</button>
    <button type="button" class="btn" data-sheet-act="logout"><i class="ph ph-sign-out"></i>Se déconnecter</button>`);
}

// Carte « Installer Ancestria » (idée de la maquette sombre) : icône, « Ajoute l'icône de l'arbre à l'écran
// d'accueil », Plus tard / Ajouter à l'écran d'accueil, gestes iPhone ; lien ouvert DANS Facebook / Instagram /
// WhatsApp : ouvrir dans Chrome (Android) ou Safari (iPhone) + « Copier le lien ».
function openInstallSheet() {
  const st = installState();
  const later = '<button type="button" class="btn btn-ghost" data-close-sheet>Plus tard</button>';
  const chromeIntent = () => { const u = new URL(appBase()); return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;end`; };
  const inapp = 'Ce lien est ouvert dans une appli (Facebook, Instagram, WhatsApp…) qui ne sait pas installer Ancestria.';
  const body = {
    installed: '<p class="muted">Ancestria est installée sur cet appareil.</p>',
    prompt: `<div class="row-actions">${later}<button type="button" class="btn btn-primary" data-sheet-act="install">Ajouter à l'écran d'accueil</button></div>`,
    ios: `<p class="install-ios">Sur iPhone : touchez <i class="ph ph-export"></i> Partager puis « Sur l'écran d'accueil ».</p><div class="row-actions">${later}</div>`,
    inapp: isAndroid()
      ? `<p class="install-ios">${inapp} Ouvrez-le dans Chrome.</p><div class="row-actions">${later}<button type="button" class="btn" data-sheet-act="copy"><i class="ph ph-copy"></i>Copier le lien</button><a class="btn btn-primary" href="${esc(chromeIntent())}">Ouvrir dans Chrome</a></div>`
      : `<p class="install-ios">${inapp} Touchez ⋯ puis « Ouvrir dans Safari », ou copiez le lien et collez-le dans Safari.</p><div class="row-actions">${later}<button type="button" class="btn btn-primary" data-sheet-act="copy"><i class="ph ph-copy"></i>Copier le lien</button></div>`,
    unsupported: '<p class="muted">Ouvrez ce lien dans Chrome (Android) ou Safari (iPhone) pour installer Ancestria.</p>',
  }[st];
  openSheet('', `<div class="install-head"><img class="app-icon" src="icons/ancestria-192.png" alt=""><div><div class="install-title">Installer Ancestria</div><div class="install-sub">Ajoute l'icône de l'arbre à l'écran d'accueil.</div></div><span class="spacer"></span></div>${body}`);
  $('#sheet').dataset.kind = 'install';
  $('#sheet').classList.add('install');
}
onInstallChange(() => { if ($('#sheet').dataset.kind === 'install') openInstallSheet(); });

function maybeAutoInstall() {
  if (desktop.matches || localStorage.getItem('ancestria:install-dismissed')) return;
  if (['prompt', 'ios', 'inapp'].includes(installState())) setTimeout(() => { if ($('#sheet').hidden) openInstallSheet(); }, 1200);
}

async function openModerationSheet() {
  openSheet('Modération', '<p class="muted">Chargement…</p>', true);
  const { data, error } = await store.getModerationQueue();
  if (error) return openSheet('Modération', `<p class="muted">${esc(error.message)}</p>`, true);
  openSheet('Modération', `
    <p class="muted">Rien n'est supprimé. Les fiches masquées sont absentes de l'arbre public et conservées avec les preuves d'auteur.</p>
    ${data.length ? data.map((m) => `<div class="mod-row">
      <strong>${esc(m.first_name)} ${esc(m.last_name)}</strong>
      <span class="muted">${esc(m.hidden_reason || 'Masquée')}</span>
      <dl><dt>Auteur</dt><dd>${esc(m.author_email || '—')}</dd><dt>Adresse IP</dt><dd><code>${esc(m.author_ip || '—')}</code></dd>
      <dt>Créée le</dt><dd>${esc(fmtTime(m.created_at))}</dd><dt>Masquée le</dt><dd>${esc(fmtTime(m.hidden_at))}</dd></dl>
      <div class="row-actions"><button type="button" class="btn btn-primary" data-restore="${m.id}"><i class="ph ph-arrow-counter-clockwise"></i>Rétablir</button></div>
    </div>`).join('') : '<p class="muted">Aucune fiche masquée.</p>'}`, true);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 5000);
}

// ---- MODE PAYSAGE ET VUE PANORAMIQUE (téléphone) ----
// Sa demande, mot pour mot : « - OPTIMISATION MODE HORIZONTAL (PAYSAGE) SUR MOBILE : • Gère nativement la
// rotation d'écran (Portrait/Paysage). • En mode horizontal, masque automatiquement les barres d'outils
// secondaires pour offrir une vue panoramique plein écran de l'Arbre de Lumière. • Ajoute un bouton tactile
// d'orientation ("Vue Panoramique 🔄") pour forcer le basculement horizontal même si la rotation automatique
// du smartphone est désactivée. »
// - Paysage (téléphone tenu à l'horizontale) : body.paysage → barres cachées, arbre plein écran, zoom réduit,
//   fiche en panneau latéral (app.css).
// - « Vue Panoramique 🔄 » en portrait : plein écran + verrou paysage (Android Chrome, appli installée) ;
//   refusé ou absent (Safari iPhone) → repli body.pano-css : toute la vue pivote de 90° et le pan/zoom
//   convertit les coordonnées du doigt (PanZoom.rot). « Retour portrait » annule tout.
// - À chaque rotation : nouveau cadrage, la personne choisie reste choisie (et centrée).
const paysageMQ = matchMedia('(orientation: landscape) and (max-height: 500px)'); // s'applique en mode mobile
const panoBtn = $('#pano');
function applyOrientation(reframe = true) {
  const b = document.body.classList;
  const css = b.contains('pano-css');
  b.toggle('paysage', (paysageMQ.matches && !desktop.matches) || css);
  if (pz) pz.rot = css ? 90 : 0;
  const pano = b.contains('pano');
  panoBtn.textContent = pano ? 'Retour portrait' : 'Vue Panoramique 🔄'; // son texte, à la lettre
  panoBtn.setAttribute('aria-pressed', String(pano));
  if (reframe && S.layout) requestAnimationFrame(() => (S.sel && S.layout.pos[S.sel] ? focusPerson(S.sel) : fitView()));
}
async function enterPano() {
  const b = document.body.classList;
  let locked = false;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation.lock('landscape');
    locked = true;
  } catch { locked = false; }
  b.add('pano');
  if (!locked && !paysageMQ.matches) b.add('pano-css');
  applyOrientation();
}
async function exitPano() {
  const b = document.body.classList;
  try { screen.orientation?.unlock?.(); } catch { /* rien à déverrouiller */ }
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  b.remove('pano', 'pano-css');
  applyOrientation();
}
panoBtn.addEventListener('click', () => {
  const b = document.body.classList;
  if (b.contains('pano')) return exitPano();
  enterPano();
});
paysageMQ.addEventListener('change', () => applyOrientation());
document.addEventListener('fullscreenchange', () => {
  // Sortie du plein écran par le geste « retour » : la vue panoramique verrouillée s'arrête aussi.
  if (!document.fullscreenElement && document.body.classList.contains('pano') && !document.body.classList.contains('pano-css')) exitPano();
});
let resizeTimer;
let lastOrient = innerWidth > innerHeight;
window.addEventListener('resize', () => { // rotation : recadrer seulement quand l'orientation change vraiment
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const o = innerWidth > innerHeight; if (o !== lastOrient) { lastOrient = o; applyOrientation(); } }, 150);
});
// ---- FIN MODE PAYSAGE ET VUE PANORAMIQUE ----

// ---- PORTE DE LA VUE (15/10/2026) : lecture seule pour src/fiche-mobile.js (cadrer l'arbre lisible sur téléphone) ----
window.AncestriaVue = {
  echelle: () => pz?.s ?? 1,
  souche: () => S.souche, choisi: () => S.sel,
  boite: (id) => S.layout?.pos?.[id] ?? null,
  centrer: (x, y, s) => { if (pz) pz.centerOn(x, y, s, insets()); },
};
// ---- FIN PORTE DE LA VUE ----
