// ---- ENFANTS DES COUPLES (le couple de naissance de chaque enfant) ----
//
// Constat du 01/10/2026 (son arbre en ligne « coupé ») : au PC, l'écran range chaque enfant sous
// le couple dont il est né grâce à la table enfants_unions de sa base ; le site lui passait une
// liste VIDE (traduction.ts), si bien que la mise en page n'était pas la même (6 rangées au lieu
// de 8 pour la même famille). Sur sa base, les 187 rattachements sont tous la paire de ses deux
// parents : on les déduit donc ainsi — un enfant dont les deux parents forment un couple de
// l'arbre est l'enfant de ce couple. Un seul parent connu, ou des parents qui ne sont pas un
// couple : aucun rattachement (comme au PC).
//
// Ligne d'appel : prise/traduction.ts.

export function enfantsDesCouples(
    relationships: { parentId: number; enfantId: number }[],
    unions: { id: number; partenaire1Id: number; partenaire2Id: number }[],
): { enfantId: number; unionId: number }[] {
    const parents = new Map<number, number[]>();
    for (const r of relationships) parents.set(r.enfantId, [...(parents.get(r.enfantId) ?? []), r.parentId]);
    const couple = new Map<string, number>();
    for (const u of unions) couple.set([u.partenaire1Id, u.partenaire2Id].sort((a, b) => a - b).join('-'), u.id);
    const resultat: { enfantId: number; unionId: number }[] = [];
    for (const [enfantId, ps] of parents) {
        const vus = new Set<number>();
        for (let i = 0; i < ps.length; i++) {
            for (let j = i + 1; j < ps.length; j++) {
                const u = couple.get([ps[i], ps[j]].sort((a, b) => a - b).join('-'));
                if (u !== undefined && !vus.has(u)) { vus.add(u); resultat.push({ enfantId, unionId: u }); }
            }
        }
    }
    return resultat;
}

// ---- FIN ENFANTS DES COUPLES ----
