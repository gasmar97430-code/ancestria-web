export type LieuDuNom = {
    commune: string;
    lieu: string;
    personnes: number;
    source: 'releve' | 'base';
};
const sans = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\(.*?\)/g, ' ')
    .replace(/['’-]/g, ' ').replace(/\bst\b/g, 'saint').replace(/\bste\b/g, 'sainte').replace(/\s+/g, ' ').trim();
export const COMMUNES = ['Les Avirons', 'Bras-Panon', 'Entre-Deux', "L'Étang-Salé", 'Petite-Île', 'La Plaine-des-Palmistes', 'Le Port',
    'La Possession', 'Saint-André', 'Saint-Benoît', 'Saint-Denis', 'Saint-Joseph', 'Saint-Leu', 'Saint-Louis', 'Saint-Paul', 'Saint-Pierre',
    'Saint-Philippe', 'Sainte-Marie', 'Sainte-Rose', 'Sainte-Suzanne', 'Salazie', 'Le Tampon', 'Les Trois-Bassins', 'Cilaos'];
const ALIAS: Record<string, string> = {
    tampon: 'Le Tampon', letampon: 'Le Tampon', 'plaine des cafres': 'Le Tampon', 'la plaine des cafres': 'Le Tampon',
    'saint gilles': 'Saint-Paul', 'saint gilles les bains': 'Saint-Paul', 'saint gilles les hauts': 'Saint-Paul',
    'etang sale': "L'Étang-Salé", 'plaine des palmistes': 'La Plaine-des-Palmistes',
};
const QUARTIERS = new Set(['plaine des cafres', 'la plaine des cafres', 'saint gilles', 'saint gilles les bains', 'saint gilles les hauts']);
const PAR_CLE = new Map<string, string>([...COMMUNES.map((c) => [sans(c), c] as [
        string,
        string
    ]), ...COMMUNES.map((c) => [sans(c).replace(/^(le|la|les|l) /, ''), c] as [
        string,
        string
    ]), ...Object.entries(ALIAS)]);
export function communeDuLieu(lieu: string | null | undefined): string | null {
    if (!lieu?.trim())
        return null;
    const k = sans(lieu);
    return PAR_CLE.get(k) ?? PAR_CLE.get(k.replace(/ /g, '')) ?? null;
}
export const RELEVES_ILE: Record<string, {
    source: string;
    lieux: string[];
}> = {
    CLAIRIVET: { source: 'Ses textes du 30/09/2026 sur le nom Clairivet.', lieux: ['Saint-Paul', 'Saint-Benoît', 'Le Tampon', 'Saint-Pierre', 'La Plaine-des-Palmistes', 'La Plaine des Cafres'] },
};
type Porteur = {
    nom?: string | null;
    lieuNaissance?: string | null;
    lieuDeces?: string | null;
};
export function lieuxDuNom(nom: string, gens: Porteur[]): {
    lieux: LieuDuNom[];
    horsCarte: string[];
} {
    const cle = sans(nom).replace(/ /g, '');
    const parCommune = new Map<string, LieuDuNom>();
    const horsCarte = new Set<string>();
    const ajouter = (lieu: string, source: LieuDuNom['source'], compte: number) => {
        const commune = communeDuLieu(lieu);
        if (!commune) {
            horsCarte.add(lieu.trim());
            return;
        }
        const e = parCommune.get(commune) ?? { commune, lieu: commune, personnes: 0, source };
        e.personnes += compte;
        if (e.source !== source)
            e.source = 'base';
        if (QUARTIERS.has(sans(lieu)) && !e.lieu.includes(lieu.trim()))
            e.lieu = `${commune} (${lieu.trim()})`;
        parCommune.set(commune, e);
    };
    for (const [n, r] of Object.entries(RELEVES_ILE))
        if (sans(n).replace(/ /g, '') === cle)
            for (const l of r.lieux)
                ajouter(l, 'releve', 0);
    for (const p of gens) {
        if (sans(p.nom ?? '').replace(/ /g, '') !== cle)
            continue;
        const vus = new Set<string>();
        for (const l of [p.lieuNaissance, p.lieuDeces]) {
            if (!l?.trim())
                continue;
            const c = communeDuLieu(l) ?? `?${l}`;
            if (vus.has(c))
                continue;
            vus.add(c);
            ajouter(l, 'base', 1);
        }
    }
    return { lieux: [...parCommune.values()].sort((a, b) => b.personnes - a.personnes || a.commune.localeCompare(b.commune)), horsCarte: [...horsCarte] };
}
