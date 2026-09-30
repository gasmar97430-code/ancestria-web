import { describe, expect, it } from 'vitest';
import { admin, nouvelleBase, SCHEMA } from './harnais';

describe('schéma : chargement', () => {
    it('se charge sur un projet Supabase neuf, puis se rejoue sans erreur', async () => {
        const db = await nouvelleBase();
        await admin(db);
        await db.exec(SCHEMA); // 2e passage : rejouable
        const t = await db.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public' order by 1`);
        expect(t.rows.map((r) => r.tablename)).toEqual([
            'abonnements', 'arbres', 'contributions', 'document_individus', 'documents', 'essais_pin', 'exports_certifies',
            'familles_historiques', 'filiations', 'foyer_parents', 'foyers', 'individus', 'invitations', 'limites_offres', 'membres', 'unions',
        ]);
        const sansRls = await db.query<{ relname: string }>(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
        expect(sansRls.rows).toEqual([]); // toutes les tables sous sécurité par ligne
        const pub = await db.query<{ tablename: string }>(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`);
        expect(pub.rows.map((r) => r.tablename)).toEqual([
            'contributions', 'document_individus', 'documents', 'filiations', 'foyer_parents', 'foyers', 'individus', 'unions',
        ]);
    });

    it('les fonctions SECURITY DEFINER ont toutes un search_path fixé (pas de détournement)', async () => {
        const db = await nouvelleBase();
        const r = await db.query<{ proname: string }>(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef and not exists (
                select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
        expect(r.rows).toEqual([]);
    });

    it('le public (anon) ne peut exécuter QUE les fonctions prévues', async () => {
        const db = await nouvelleBase();
        const r = await db.query<{ proname: string }>(`select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
        expect(r.rows.map((x) => x.proname)).toEqual([
            'date_max', 'invitation_publique', 'patrimoine_carte', 'patrimoine_individu', 'patrimoine_public',
            'patrimoine_recherche', 'plat', 'soumettre_contribution', 'thematiques_valides', 'verifier_export',
        ]);
    });

    it('plat() retire accents et majuscules', async () => {
        const db = await nouvelleBase();
        const r = await db.query<{ p: string }>(`select plat('LEFÈVRE Anatole Émile Fictif Œuvre') as p`);
        expect(r.rows[0].p).toBe('lefevre anatole emile fictif ouvre'); // œ → o (ligature ramenée à une lettre)
    });
});
