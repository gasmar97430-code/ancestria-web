import { supabase } from './supabase.js';

// Adresse de base de l'appli (racine d'un domaine OU sous-dossier, ex. GitHub Pages /ancestria-web/).
export const appBase = () => new URL('./', document.baseURI).href;
const redirect = () => `${appBase()}?confirmed=1`;
// Version de la Charte d'Ancestria acceptée à l'inscription (loi 2).
export const CHARTE = '2026-10-13';

// Double opt-in : "Confirm email" activé dans Supabase. Pas de session tant que le lien n'est pas cliqué.
// Prénom, nom et Charte acceptée sont gardés dans user_metadata.
export async function signUp(email, password, { firstName, lastName } = {}) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: redirect(), data: { first_name: firstName, last_name: lastName, charte: CHARTE } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Email not confirmed' ? 'Confirmez votre e-mail avant de vous connecter.' : error.message);
  return data;
}

export const signOut = () => supabase.auth.signOut();

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email_confirmed_at ? session : null;
}

// Rôle porté par app_metadata (non modifiable par l'utilisateur) — voir schema.sql
export const isAdminUser = (user) => user?.app_metadata?.role === 'admin';

export const displayName = (user) => {
  const m = user?.user_metadata || {};
  const full = [m.first_name, m.last_name].filter((v) => v && String(v).trim()).join(' ');
  return (full || m.username || user?.email?.split('@')[0] || '').toUpperCase();
};

// Invitation : lien d'inscription par e-mail (magic link), SMS ou partage natif.
export async function inviteByEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
  if (error) throw error;
}
export function inviteBySms(phone = '') {
  const body = encodeURIComponent(`Rejoignez l'arbre familial Ancestria : ${appBase()}`);
  location.href = `sms:${phone}?&body=${body}`;
}
export async function shareInvite() {
  const url = appBase();
  if (navigator.share) return navigator.share({ title: 'Ancestria', text: "Rejoignez l'arbre familial", url });
  await navigator.clipboard.writeText(url);
  return 'copied';
}
