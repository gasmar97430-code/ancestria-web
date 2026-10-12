import { describe, expect, it } from 'vitest';
import { cleGardee, faireSauvegarde, lireSauvegarde, remettreSauvegarde, nomDuFichier, CLE_AVANT_MAJ } from './sauvegarde';

function stockage(init: Record<string, string> = {}) {
    const m = new Map(Object.entries(init));
    return {
        get length() { return m.size; },
        key: (i: number) => [...m.keys()][i] ?? null,
        getItem: (k: string) => m.get(k) ?? null,
        setItem: (k: string, v: string) => { m.set(k, v); },
        m,
    };
}

describe('sauvegarde de l’appareil', () => {
    it('garde les clés ancestria, jamais la connexion Supabase ni un mot de passe', () => {
        expect(cleGardee('ancestria-inscription')).toBe(true);
        expect(cleGardee('ancestria.recents')).toBe(true);
        expect(cleGardee('sb-jxv-auth-token')).toBe(false);
        expect(cleGardee('ancestria-mot-de-passe')).toBe(false);
        expect(cleGardee(CLE_AVANT_MAJ)).toBe(false);
        expect(cleGardee('racines.accueil-auteur.replie')).toBe(false);
    });
    it('export → import rend exactement la même progression', () => {
        const a = stockage({ 'ancestria-inscription': '{"nom":"Banc"}', 'ancestria.palette.v3': 'ivoire', 'sb-x-auth-token': 'SECRET' });
        const sv = faireSauvegarde(a, new Date('2026-10-12T10:00:00Z'));
        expect(Object.keys(sv.donnees).sort()).toEqual(['ancestria-inscription', 'ancestria.palette.v3']);
        expect(JSON.stringify(sv)).not.toContain('SECRET');
        const lu = lireSauvegarde(JSON.stringify(sv));
        expect(lu.ok).toBe(true);
        const b = stockage();
        expect(remettreSauvegarde(b, (lu as { ok: true; sauvegarde: typeof sv }).sauvegarde)).toBe(2);
        expect(b.m.get('ancestria-inscription')).toBe('{"nom":"Banc"}');
        expect(b.m.has('sb-x-auth-token')).toBe(false);
    });
    it('refuse ce qui n’est pas une sauvegarde, et filtre les clés étrangères', () => {
        expect(lireSauvegarde('pas du json').ok).toBe(false);
        expect(lireSauvegarde('{"format":"autre","version":1,"donnees":{}}').ok).toBe(false);
        expect(lireSauvegarde('{"format":"ancestria-sauvegarde","version":1,"donnees":{"sb-x":"1"}}').ok).toBe(false);
        const r = lireSauvegarde('{"format":"ancestria-sauvegarde","version":1,"donnees":{"ancestria.recents":"[]","sb-x":"1","ancestria-x":5}}');
        expect(r.ok && Object.keys(r.sauvegarde.donnees)).toEqual(['ancestria.recents']);
    });
    it('nom du fichier daté', () => {
        expect(nomDuFichier(new Date(2026, 9, 12))).toBe('ancestria-sauvegarde-2026-10-12.json');
    });
});
