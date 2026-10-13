// Brouillon local (survit au F5) → Envoi (seule écriture définitive) → relecture depuis Supabase.
import { supabase } from './supabase.js';

const KEY = (treeId) => `ancestria:draft:${treeId}`;
const PERSON_FIELDS = ['id', 'first_name', 'last_name', 'sex', 'birth_date', 'birth_place', 'death_date', 'deceased', 'origin', 'source_url', 'notes', 'photo_path'];

export const emptyDraft = () => ({ persons: {}, relations: [], photos: {} });
// UUID attribué à la création : c'est la clé primaire définitive, les liens l'utilisent dès le brouillon.
export const newPersonId = () => crypto.randomUUID();
export const pickPerson = (p) => Object.fromEntries(PERSON_FIELDS.map((k) => [k, p?.[k] ?? null]));

export function loadDraft(treeId) {
  try { return { ...emptyDraft(), ...JSON.parse(localStorage.getItem(KEY(treeId)) || '{}') }; }
  catch { return emptyDraft(); }
}
export function saveDraft(treeId, draft) {
  try { localStorage.setItem(KEY(treeId), JSON.stringify(draft)); }
  catch { throw new Error('Brouillon trop volumineux pour le stockage local : faites un Envoi.'); }
}
export const draftSize = (d) => Object.keys(d.persons).length + d.relations.length;

// Normalisation identique au SQL : conjoints stockés (min, max)
export function normRel(r) {
  if (r.kind !== 'spouse') return { person_id: r.person_id, related_id: r.related_id, kind: r.kind };
  const [a, b] = [r.person_id, r.related_id].sort();
  return { person_id: a, related_id: b, kind: 'spouse' };
}
export const relKey = (r) => { const n = normRel(r); return `${n.kind}:${n.person_id}:${n.related_id}`; };

// Portrait réduit à 640 px, conservé en dataURL dans le brouillon jusqu'à l'Envoi
export async function resizePhoto(file, max = 640) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

async function fetchAll(build) {
  // PostgREST plafonne à 1000 lignes par requête : on pagine pour ne jamais tronquer l'arbre.
  const out = []; const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) return out;
  }
}

// Loi 6 (vivants) : un non-administrateur ne lit JAMAIS la table persons, seulement la vue persons_public
// (mêmes colonnes ; vivant → « Fiche protégée », sans dates, lieu, notes, photo, origine ni source).
export async function loadTree(treeId, isAdmin = false) {
  const source = isAdmin ? 'persons' : 'persons_public';
  const [all, relations] = await Promise.all([
    fetchAll(() => supabase.from(source).select('*').eq('tree_id', treeId).order('id')),
    fetchAll(() => supabase.from('relations').select('person_id, related_id, kind, is_hidden').eq('tree_id', treeId).order('id')),
  ]);
  return { all, relations };
}

export async function signedPhotoUrls(paths) {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from('portraits').createSignedUrls(paths, 3600);
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

export async function publish(treeId, draft, onStep = () => {}) {
  const persons = Object.values(draft.persons).map(pickPerson);

  // b) Portraits → Storage. Chemin = UUID de la fiche, upsert : rejouable sans doublon.
  onStep('photos');
  for (const p of persons) {
    const dataUrl = draft.photos[p.id];
    if (!dataUrl) continue;
    const path = `${treeId}/${p.id}.jpg`;
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from('portraits').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw new Error(`Portrait de ${p.first_name} ${p.last_name} : ${error.message}`);
    p.photo_path = path;
  }

  // a) + c) Fiches + clés UUID de liaison : une seule transaction Postgres (rollback total en cas d'erreur)
  onStep('transaction');
  const { data, error } = await supabase.rpc('publish_tree', {
    p_tree_id: treeId,
    p_persons: persons,
    p_relations: draft.relations.map(normRel),
  });
  if (error) throw error;

  // Relecture : le brouillon n'est vidé que si tout est bien en base.
  onStep('verify');
  const fresh = await loadTree(treeId, true); // seul l'administrateur publie
  const ids = new Set(fresh.all.map((p) => p.id));
  const rels = new Set(fresh.relations.map(relKey));
  const missP = persons.filter((p) => !ids.has(p.id)).length;
  const missR = draft.relations.filter((r) => !rels.has(relKey(r))).length;
  if (missP || missR) throw new Error(`Relecture incomplète (${missP} fiche(s), ${missR} lien(s)). Brouillon conservé.`);

  localStorage.removeItem(KEY(treeId));
  onStep('done');
  return { result: data, tree: fresh };
}

export const getModerationQueue = () => supabase.from('moderation_queue').select('*');
export const restorePerson = (id) => supabase.rpc('restore_person', { p_id: id });
export const hidePerson = (id, reason) => supabase.rpc('hide_person', { p_id: id, p_reason: reason });
