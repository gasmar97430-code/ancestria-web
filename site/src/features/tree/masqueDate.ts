export function masqueDate(saisie: string): string {
    const s = saisie.trim();
    if (!/^\d{5,8}$/.test(s))
        return saisie;
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
}
