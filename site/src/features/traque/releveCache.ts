export interface ReleveCache {
    appels: number;
    depuisCache: number;
    plusAncienMs: number | null;
}
export function ilYA(ms: number | null): string {
    if (ms === null || !Number.isFinite(ms) || ms < 0)
        return '';
    const min = Math.floor(ms / 60000);
    if (min < 1)
        return "à l'instant";
    if (min < 60)
        return `il y a ${min} min`;
    return `il y a ${Math.floor(min / 60)} h`;
}
export function motCache(c: ReleveCache | null | undefined): string | null {
    if (!c || c.depuisCache <= 0)
        return null;
    const age = ilYA(c.plusAncienMs);
    const part = c.depuisCache === c.appels ? 'depuis le cache' : `${c.depuisCache}/${c.appels} réponses depuis le cache`;
    return age ? `${part} (${age})` : part;
}
export function bilanCache(etats: {
    cache?: ReleveCache | null;
}[] | null): string | null {
    if (!etats)
        return null;
    const touchees = etats.filter((e) => e.cache && e.cache.depuisCache > 0);
    if (touchees.length === 0)
        return null;
    const plusAncien = Math.max(...touchees.map((e) => e.cache!.plusAncienMs ?? 0));
    const toutes = touchees.every((e) => e.cache!.depuisCache === e.cache!.appels) && touchees.length === etats.length;
    const qui = toutes ? 'toutes les sources' : `${touchees.length} source${touchees.length > 1 ? 's' : ''} sur ${etats.length}`;
    return `${qui} depuis le cache (${ilYA(plusAncien)} au plus)`;
}
