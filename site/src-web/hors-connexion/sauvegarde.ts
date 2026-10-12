// ---- SAUVEGARDE DE CE QUE LE TÉLÉPHONE GARDE (12/10/2026) ----
// Sa demande (texte collé, « pas le jeu mais ancestria ») : « une sauvegarde locale de la progression, avec export et
// import au format JSON » ; « mettre à jour … avec sauvegarde de la progression avant le rechargement ».
// Pour Ancestria, la « progression » = ce que l'appareil garde de la personne : son inscription (nom, prénom, contact —
// JAMAIS le mot de passe, que le téléphone ne garde pas), la charte acceptée, le lien de l'arbre, les noms récents, la
// palette, les fenêtres déjà vues. Toutes ces clés commencent par « ancestria ». La connexion administrateur (clés
// « sb-… » de Supabase) n'est JAMAIS exportée : lui se reconnecte avec son mot de passe.
// Règles pures, testées (sauvegarde.test.ts). Utilisé par MaSauvegarde.tsx et HorsConnexion.tsx.

export const FORMAT = 'ancestria-sauvegarde';
export const CLE_AVANT_MAJ = 'ancestria-sauvegarde-avant-maj';
type Stockage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem'>;

export type Sauvegarde = { format: typeof FORMAT; version: 1; faite_le: string; donnees: Record<string, string> };

/** Une clé fait-elle partie de la progression ? (jamais la sauvegarde elle-même, jamais une connexion) */
export function cleGardee(cle: string): boolean {
    return /^ancestria[-.]/.test(cle) && cle !== CLE_AVANT_MAJ && cle !== 'ancestria-prete-hors-connexion' && !/mot|passe|token|session/i.test(cle);
}

export function faireSauvegarde(s: Stockage, maintenant = new Date()): Sauvegarde {
    const donnees: Record<string, string> = {};
    for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && cleGardee(k)) { const v = s.getItem(k); if (v !== null) donnees[k] = v; }
    }
    return { format: FORMAT, version: 1, faite_le: maintenant.toISOString(), donnees };
}

/** Lit un fichier de sauvegarde ; refuse tout ce qui n'en est pas une (message pour la personne). */
export function lireSauvegarde(texte: string): { ok: true; sauvegarde: Sauvegarde } | { ok: false; raison: string } {
    let o: unknown;
    try { o = JSON.parse(texte); } catch { return { ok: false, raison: 'Ce fichier n’est pas une sauvegarde Ancestria (il ne se lit pas).' }; }
    const s = o as Partial<Sauvegarde>;
    if (!s || s.format !== FORMAT || s.version !== 1 || typeof s.donnees !== 'object' || s.donnees === null)
        return { ok: false, raison: 'Ce fichier n’est pas une sauvegarde Ancestria.' };
    const donnees: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.donnees)) if (cleGardee(k) && typeof v === 'string' && v.length < 200_000) donnees[k] = v;
    if (Object.keys(donnees).length === 0) return { ok: false, raison: 'Cette sauvegarde est vide.' };
    return { ok: true, sauvegarde: { format: FORMAT, version: 1, faite_le: String(s.faite_le ?? ''), donnees } };
}

/** Remet la sauvegarde dans l'appareil ; rend le nombre de réglages remis. */
export function remettreSauvegarde(s: Stockage, sv: Sauvegarde): number {
    let n = 0;
    for (const [k, v] of Object.entries(sv.donnees)) if (cleGardee(k)) { s.setItem(k, v); n++; }
    return n;
}

export function nomDuFichier(maintenant = new Date()): string {
    const p = (x: number) => String(x).padStart(2, '0');
    return `ancestria-sauvegarde-${maintenant.getFullYear()}-${p(maintenant.getMonth() + 1)}-${p(maintenant.getDate())}.json`;
}
// ---- FIN SAUVEGARDE ----
