// ---- PRÊTE À UTILISER + MA SAUVEGARDE (15/10/2026 ; repris de l'ancien site du 12/10 : ancestria-web/site/src-web/
// hors-connexion/HorsConnexion.tsx, MaSauvegarde.tsx, sauvegarde.ts) ----
// Son cahier (redonné le 15/10) : « un message “Prêt à utiliser” quand tout est gardé » ; « une sauvegarde locale de la
// progression, avec export et import au format JSON ».
//   · « ✓ Ancestria est prête, même sans Internet » : une fois par version, quand les fichiers de l'appli sont gardés
//     dans le téléphone (cache du service sw.js) ; disparaît seul après 7 s ;
//   · « Ma sauvegarde » dans Paramètres : « Enregistrer ma sauvegarde » (fichier .json dans les Téléchargements) et
//     « Reprendre une sauvegarde » ; sur la page d'inscription : « J'ai déjà une sauvegarde Ancestria ».
// La « progression » = ce que l'appareil garde, clés « ancestria… » : le brouillon pas encore envoyé, le mode
// d'affichage, l'installation. JAMAIS la connexion (clés « sb-… » de Supabase) ni un mot de passe.
// Ligne d'appel : index.html. Supprimer ce fichier et sa ligne = comme avant.
export const FORMAT = 'ancestria-sauvegarde';
const CLE_PRETE = 'ancestria:prete';
const MAX = 5_000_000; // une valeur (un brouillon avec photos) : au-delà, refusée

export const cleGardee = (cle) => /^ancestria[-.:]/.test(cle) && cle !== CLE_PRETE && !/mot|passe|token|session/i.test(cle);

export function faireSauvegarde(s, maintenant = new Date()) {
  const donnees = {};
  for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && cleGardee(k)) { const v = s.getItem(k); if (v !== null) donnees[k] = v; } }
  return { format: FORMAT, version: 1, faite_le: maintenant.toISOString(), donnees };
}

export function lireSauvegarde(texte) {
  let o;
  try { o = JSON.parse(texte); } catch (err) { return { ok: false, raison: 'Ce fichier n’est pas une sauvegarde Ancestria (il ne se lit pas).' }; }
  if (!o || o.format !== FORMAT || o.version !== 1 || typeof o.donnees !== 'object' || o.donnees === null) return { ok: false, raison: 'Ce fichier n’est pas une sauvegarde Ancestria.' };
  const donnees = {};
  for (const [k, v] of Object.entries(o.donnees)) if (cleGardee(k) && typeof v === 'string' && v.length < MAX) donnees[k] = v;
  if (!Object.keys(donnees).length) return { ok: false, raison: 'Cette sauvegarde est vide.' };
  return { ok: true, sauvegarde: { format: FORMAT, version: 1, faite_le: String(o.faite_le ?? ''), donnees } };
}

export function remettreSauvegarde(s, sv) {
  let n = 0;
  for (const [k, v] of Object.entries(sv.donnees)) if (cleGardee(k)) { s.setItem(k, v); n++; }
  return n;
}

export function nomDuFichier(m = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `ancestria-sauvegarde-${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}.json`;
}

const style = document.createElement('style');
style.textContent = `
#bandeau-prete { position: fixed; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 140px); z-index: 6; margin: 0 auto; max-width: 520px;
  padding: 10px 14px; border-radius: 12px; border: 1px solid var(--gold); background: var(--ivory); color: var(--ink); font: 14px/1.35 var(--sans);
  box-shadow: 0 4px 16px oklch(0.3 0.03 60 / .18); }
[data-mode="pc"] #bandeau-prete { bottom: 24px; }
body.fiche-ouverte #bandeau-prete, body:has(#sheet:not([hidden])) #bandeau-prete { display: none; }
.ma-sauvegarde { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--ivory); font-size: 14px; }
.ma-sauvegarde .ms-boutons { display: flex; flex-wrap: wrap; gap: 8px; }
.ma-sauvegarde .ms-message { font-size: 13.5px; }
.ma-sauvegarde .ms-message.non { color: #a33; }
.lien-sauvegarde { background: none; border: 0; padding: 6px 0; color: var(--gold-deep); text-decoration: underline; text-underline-offset: 4px; font: 14px var(--sans); cursor: pointer; }`;
document.head.appendChild(style);

// Le bloc « Ma sauvegarde » (exporter = false : seulement reprendre, pour un nouveau téléphone).
function bloc(exporter) {
  const div = document.createElement('div');
  div.className = 'ma-sauvegarde'; div.dataset.bloc = 'ma-sauvegarde';
  div.innerHTML = `${exporter ? '<div>Ma sauvegarde : gardez ce que ce téléphone a en attente (noms pas encore envoyés, réglages) dans un fichier, pour le retrouver sur un autre téléphone.</div>' : ''}
    <div class="ms-boutons">${exporter ? '<button type="button" class="btn" data-ms="exporter">Enregistrer ma sauvegarde</button>' : ''}
      <button type="button" class="${exporter ? 'btn' : 'lien-sauvegarde'}" data-ms="importer">${exporter ? 'Reprendre une sauvegarde' : 'J’ai déjà une sauvegarde Ancestria'}</button>
      <input type="file" accept="application/json,.json" hidden data-ms="fichier"></div>
    <div class="ms-message" role="status" hidden></div>`;
  const dire = (ok, texte) => { const m = div.querySelector('.ms-message'); m.hidden = false; m.classList.toggle('non', !ok); m.textContent = texte; };
  const fichier = div.querySelector('[data-ms="fichier"]');
  div.addEventListener('click', (e) => {
    const quoi = e.target.closest('[data-ms]')?.dataset.ms;
    if (quoi === 'importer') fichier.click();
    if (quoi !== 'exporter') return;
    try {
      const sv = faireSauvegarde(localStorage);
      const url = URL.createObjectURL(new Blob([JSON.stringify(sv, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = nomDuFichier(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      dire(true, `Sauvegarde enregistrée (${Object.keys(sv.donnees).length} réglage(s)) : le fichier ${nomDuFichier()} est dans vos Téléchargements.`);
    } catch (err) { dire(false, 'La sauvegarde n’a pas pu être enregistrée sur cet appareil.'); }
  });
  fichier.addEventListener('change', async () => {
    const f = fichier.files?.[0];
    if (!f) return;
    try {
      const r = lireSauvegarde(await f.text());
      if (!r.ok) return dire(false, r.raison);
      const n = remettreSauvegarde(localStorage, r.sauvegarde);
      dire(true, `Sauvegarde reprise (${n} réglage(s)). Ancestria se recharge…`);
      setTimeout(() => location.reload(), 1200);
    } catch (err) { dire(false, 'Ce fichier n’a pas pu être lu.'); } finally { fichier.value = ''; }
  });
  return div;
}

// Les portes : Paramètres (feuille #sheet, data-kind="settings") et la page d'inscription (#auth-form).
try {
  const sheet = document.getElementById('sheet');
  if (sheet) new MutationObserver(() => {
    if (sheet.dataset.kind !== 'settings' || sheet.hidden || sheet.querySelector('[data-bloc="ma-sauvegarde"]')) return;
    (sheet.querySelector('.sheet-body') || sheet).appendChild(bloc(true));
  }).observe(sheet, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-kind'] });
  const form = document.getElementById('auth-form');
  if (form && !form.querySelector('[data-bloc="ma-sauvegarde"]')) form.appendChild(bloc(false));
} catch (err) { /* repli : l'appli sans sauvegarde */ }

// « Prête à utiliser » : les fichiers de l'appli sont gardés dans le téléphone (cache « ancestria-vN » complet).
(async () => {
  try {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return;
    await navigator.serviceWorker.ready;
    for (let essai = 0; essai < 20; essai++) {
      const cles = (await caches.keys()).filter((k) => /^ancestria-v\d+$/.test(k));
      const version = cles.sort((a, b) => +b.slice(11) - +a.slice(11))[0];
      if (version) {
        const c = await caches.open(version);
        const base = new URL('./', location.href).href;
        const ok = (await Promise.all(['index.html', 'app.css', 'src/app.js', 'img/arbre-de-vie.webp'].map((p) => c.match(base + p)))).every(Boolean);
        if (ok) {
          let deja = false; try { deja = localStorage.getItem(CLE_PRETE) === version; localStorage.setItem(CLE_PRETE, version); } catch (err) { /* sans stockage */ }
          if (deja) return;
          const b = document.createElement('div');
          b.id = 'bandeau-prete'; b.setAttribute('role', 'status');
          b.innerHTML = '✓ <b>Ancestria est prête à utiliser</b>, même sans Internet : les arbres déjà ouverts restent consultables.';
          document.body.appendChild(b);
          setTimeout(() => b.remove(), 7000);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (err) { /* repli : pas de message */ }
})();
// ---- FIN PRÊTE À UTILISER + MA SAUVEGARDE ----
