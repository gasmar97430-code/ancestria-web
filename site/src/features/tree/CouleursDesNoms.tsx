import { memo } from 'react';
import type { Edge, Node } from 'reactflow';
export const CLARTE_FONCEE = 0.36;
export const CLARTE_CLAIRE = 0.76;
const CHROMA = 0.15;
const GRIS = 'oklch(0.62 0 0)';
type Personne = {
    id: string;
    nom: string;
    y: number;
};
export const cleDuNom = (nom: string) => nom.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
const inconnu = (cle: string) => !cle || /^[?\s]+$/.test(cle) || cle === 'XX';
export function teintesDesNoms(noms: string[]): Map<string, number> {
    const compte = new Map<string, number>();
    for (const n of noms) {
        const c = cleDuNom(n);
        if (!inconnu(c))
            compte.set(c, (compte.get(c) ?? 0) + 1);
    }
    const ordre = [...compte].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return new Map(ordre.map(([c], i) => [c, (25 + i * 137.508) % 360]));
}
export function generations(gens: Personne[]): {
    gen: Map<string, number>;
    total: number;
} {
    const rangees = [...new Set(gens.map((p) => Math.round(p.y / 10) * 10))].sort((a, b) => a - b);
    const gen = new Map(gens.map((p) => [p.id, rangees.indexOf(Math.round(p.y / 10) * 10)]));
    return { gen, total: rangees.length };
}
export const clarte = (g: number, total: number) => total <= 1 ? CLARTE_FONCEE : CLARTE_FONCEE + ((CLARTE_CLAIRE - CLARTE_FONCEE) * Math.max(0, g)) / (total - 1);
export function couleursDesTraits(noeuds: Node[], traits: Edge[]): Map<string, string> {
    const gens: Personne[] = noeuds
        .filter((n) => n.type === 'carte' && (n.data as {
        individu?: {
            nom?: string;
        };
    })?.individu)
        .map((n) => ({ id: n.id, nom: String((n.data as {
            individu: {
                nom: string;
            };
        }).individu.nom ?? ''), y: n.position?.y ?? 0 }));
    const parId = new Map(gens.map((p) => [p.id, p]));
    const teintes = teintesDesNoms(gens.map((p) => p.nom));
    const { gen, total } = generations(gens);
    const sortie = new Map<string, string>();
    for (const t of traits) {
        const versEnfant = t.id.startsWith('child-') || t.id.startsWith('rel-');
        const qui = versEnfant ? parId.get(t.target) : (parId.get(t.source) ?? parId.get(t.target));
        if (!qui)
            continue;
        const cle = cleDuNom(qui.nom);
        const g = (gen.get(qui.id) ?? 0) - (versEnfant ? 1 : 0);
        sortie.set(t.id, inconnu(cle) ? GRIS : `oklch(${clarte(g, total).toFixed(3)} ${CHROMA} ${teintes.get(cle)!.toFixed(1)})`);
    }
    return sortie;
}
const echapper = (s: string) => s.replace(/["\\]/g, '\\$&');
export const CouleursDesNoms = memo(({ nodes, edges }: {
    nodes: Node[];
    edges: Edge[];
}) => {
    let css = '';
    try {
        css = [...couleursDesTraits(nodes, edges)]
            .map(([id, c]) => `.react-flow__edge[data-testid="rf__edge-${echapper(id)}"] .react-flow__edge-path { stroke: ${c} !important; }`)
            .join('\n');
    }
    catch {
        css = '';
    }
    return css ? <style data-bloc="couleurs-des-noms">{css}</style> : null;
});
CouleursDesNoms.displayName = 'CouleursDesNoms';
