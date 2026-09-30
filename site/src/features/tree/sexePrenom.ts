import donnees from '../../data/prenoms-sexe.json';
const TABLE = (donnees as unknown as {
    p: Record<string, [
        number,
        number
    ]>;
}).p;
export const SEUIL = 95;
const aplatir = (s: string) => s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
export interface SexePropose {
    genre: 'M' | 'F';
    part: number;
    lu: string;
}
const decisif = (cle: string): SexePropose | null => {
    const e = TABLE[cle];
    if (!e)
        return null;
    const [m] = e;
    if (m >= SEUIL)
        return { genre: 'M', part: m, lu: cle };
    if (m <= 100 - SEUIL)
        return { genre: 'F', part: 100 - m, lu: cle };
    return null;
};
export function estMixte(prenom: string): boolean {
    const premier = aplatir(prenom).split(/[\s-]+/)[0];
    const e = TABLE[premier];
    return !!e && e[0] > 100 - SEUIL && e[0] < SEUIL;
}
export function proposerSexe(prenom: string): SexePropose | null {
    const parties = aplatir(prenom)
        .split(/[\s-]+/)
        .filter((m) => !m.includes('…') && !m.includes('"') && !m.endsWith('.'))
        .filter((m) => m.length >= 2);
    if (parties.length === 0)
        return null;
    if (parties[0] === 'marie') {
        for (const p of parties.slice(1)) {
            const d = decisif(p);
            if (d?.genre === 'M')
                return { ...d, lu: `marie … ${p}` };
        }
    }
    if (parties.length > 1) {
        const tout = decisif(parties.join('-'));
        if (tout)
            return tout;
        const deux = decisif(parties.slice(0, 2).join('-'));
        if (deux)
            return deux;
    }
    const premier = decisif(parties[0]);
    if (premier)
        return premier;
    const suivants = parties.slice(1).map(decisif);
    if (suivants.length > 0 && suivants.every(Boolean) && suivants.every((s) => s!.genre === suivants[0]!.genre)) {
        return { ...suivants[0]!, lu: parties.slice(1).join(' ') };
    }
    return null;
}
