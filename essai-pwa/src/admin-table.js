// ---- ADMINISTRATEUR PAR LA TABLE « admins » (14/10/2026) ----
// Sa capture du 14/10 : connecté en administrateur, il voyait des « Fiche protégée ». La base le reconnaît
// (is_admin() lit app_metadata.role OU la table admins, où sa ligne a été posée le 14/10), mais l'appli ne
// regardait que app_metadata.role. Ici : sa propre ligne dans admins (la règle admins_read ne montre qu'elle).
// Ligne d'appel : app.js, boot(). Retirer l'appel = comme avant (app_metadata seul).
export async function estAdministrateur(supabase, user) {
  try {
    if (!user?.id) return false;
    const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return !error && !!data;
  } catch (err) { return false; } // repli : pas administrateur (rien de privé ne s'affiche)
}
// ---- FIN ADMINISTRATEUR PAR LA TABLE ----
