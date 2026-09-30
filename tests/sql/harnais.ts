// Harnais d'essai du schéma : un vrai PostgreSQL (PGlite) préparé comme un
// projet Supabase neuf — rôles anon / authenticated / service_role, schéma
// auth avec auth.users et auth.uid() (lu dans request.jwt.claim.sub, comme
// Supabase), schéma extensions avec pgcrypto, publication supabase_realtime,
// et les droits par défaut que Supabase donne sur le schéma public.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// SCHEMA_FICHIER : essai de sabotage (vérifier que les essais savent échouer).
export const SCHEMA = readFileSync(process.env.SCHEMA_FICHIER ?? new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

const COMME_SUPABASE = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant anon, authenticated, service_role to postgres;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email varchar(255) unique);
create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                           current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create publication supabase_realtime;
`;

export type Base = PGlite;

export async function nouvelleBase(): Promise<Base> {
    const db = await PGlite.create({ extensions: { pgcrypto } });
    await db.exec(COMME_SUPABASE);
    await db.exec(SCHEMA);
    return db;
}

export async function admin(db: Base): Promise<void> {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
}

export async function utilisateur(db: Base, id: string, ip = '10.0.0.1'): Promise<void> {
    await admin(db);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.headers', $2, false)`, [
        id,
        JSON.stringify({ 'x-forwarded-for': ip }),
    ]);
    await db.exec('set role authenticated');
}

export async function anonyme(db: Base, ip = '192.0.2.1'): Promise<void> {
    await admin(db);
    await db.query(`select set_config('request.headers', $1, false)`, [JSON.stringify({ 'x-forwarded-for': ip })]);
    await db.exec('set role anon');
}

export async function creerCompte(db: Base, email: string): Promise<string> {
    await admin(db);
    const r = await db.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [email]);
    return r.rows[0].id;
}

export async function une<T>(db: Base, sql: string, params: unknown[] = []): Promise<T> {
    const r = await db.query<T>(sql, params);
    return r.rows[0];
}

export async function toutes<T>(db: Base, sql: string, params: unknown[] = []): Promise<T[]> {
    return (await db.query<T>(sql, params)).rows;
}
