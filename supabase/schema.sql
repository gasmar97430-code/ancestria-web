-- =====================================================================
-- ANCESTRIA — SCHÉMA SUPABASE COMPLET
-- =====================================================================
-- À coller tel quel : Supabase → SQL Editor → New query → Run.
-- Rejouable : chaque objet est créé « s'il n'existe pas » ou remplacé,
-- sans perte de données. Base cible : PostgreSQL 15 ou plus (Supabase).
--
-- MODÈLE
--   arbres ── membres (propriétaire / éditeur / lecteur)
--     ├─ individus
--     ├─ unions ............ couples de toutes natures (conjugal)
--     ├─ foyers ............ unités parentales : 1, 2, 3 parents ou plus,
--     │   └─ foyer_parents     de tout genre (homoparentalité, familles
--     │                        recomposées, co-parentalité, accueil…)
--     ├─ filiations ........ lien parent → enfant QUALIFIÉ (biologique,
--     │                      adoptif, GPA : gestation / intention, don…),
--     │                      rattaché ou non à un foyer
--     ├─ documents ......... archives géolocalisées (registres, actes,
--     │   └─ document_individus  photos d'époque…) reliées aux individus
--     ├─ familles_historiques  patronymes mis en valeur par un territoire
--     ├─ invitations ─ contributions   partage public (QR, PIN, modération)
--     └─ exports_certifies  empreintes SHA-256 des exports patrimoniaux
--   abonnements + limites_offres : gratuit / famille / institution
--
-- GARANTIES TENUES PAR LA BASE (aucun client ne peut les contourner)
--   · un individu, un couple, un lien, un foyer, un document n'appartient
--     qu'à UN arbre (clés étrangères composites arbre_id + id) ;
--   · pas de boucle : personne ne devient l'ancêtre d'un de ses
--     ascendants (verrou par arbre contre les écritures simultanées) ;
--   · pas d'absurdité de dates : parent né après l'enfant, parent
--     biologique de moins de 10 ans, enfant né bien après la mort de son
--     parent biologique, union avant la naissance — y compris quand on
--     corrige une date APRÈS coup ;
--   · pas d'union entre un ascendant et son descendant ;
--   · au plus 2 parents BIOLOGIQUES ; les autres natures sont libres ;
--   · chacun ne voit et n'écrit que les arbres dont il est membre (RLS) ;
--   · le public ne peut QUE déposer une proposition (PIN, expiration,
--     limites de débit) ou lire un espace patrimonial publié par une
--     collectivité sous licence — et ne voit JAMAIS une personne vivante.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0. OUTILS
-- ---------------------------------------------------------------------

-- Texte sans accents ni majuscules (recherche « Lefèvre » = « lefevre »).
create or replace function public.plat(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
    select translate(lower(coalesce(p, '')),
        'àâäáãåāçćčéèêëēėęíìîïīįñńóòôöõøōúùûüūýÿžźżšœæ',
        'aaaaaaaccceeeeeeeiiiiiinnooooooouuuuuyyzzzsoa');
$$;

-- Bornes d'une date selon sa précision : « 1962 » (précision annee,
-- stockée au 1er janvier) couvre du 1er janvier au 31 décembre.
create or replace function public.date_max(p_date date, p_precision text)
returns date
language sql immutable parallel safe set search_path = ''
as $$
    select case
        when p_date is null then null
        when p_precision = 'annee' then (date_trunc('year', p_date) + interval '1 year - 1 day')::date
        else p_date
    end;
$$;

create or replace function public.thematiques_valides(p text[])
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
    select coalesce(cardinality(p), 0) <= 10
       and not exists (select 1 from unnest(coalesce(p, '{}'::text[])) t where t is null or char_length(btrim(t)) not between 1 and 40);
$$;

-- ---------------------------------------------------------------------
-- 1. OFFRES ET LICENCES — la seule porte des fonctions payantes
-- ---------------------------------------------------------------------

create table if not exists public.limites_offres (
    offre                     text primary key check (offre in ('gratuit', 'famille', 'institution')),
    libelle                   text not null,
    max_individus             integer check (max_individus is null or max_individus > 0),                       -- null = illimité
    max_invitations_ouvertes  integer check (max_invitations_ouvertes is null or max_invitations_ouvertes > 0),
    max_documents             integer check (max_documents is null or max_documents >= 0),
    patrimoine_public         boolean not null default false,   -- publier un espace « Patrimoine & Tourisme de racines »
    export_certifie           boolean not null default false    -- exports patrimoniaux avec empreinte vérifiable
);

insert into public.limites_offres (offre, libelle, max_individus, max_invitations_ouvertes, max_documents, patrimoine_public, export_certifie) values
    ('gratuit',     'Gratuit',                     500,  1,    50,   false, false),
    ('famille',     'Famille',                     null, null, null, false, false),
    ('institution', 'Licence collectivité',        null, null, null, true,  true)
on conflict (offre) do update set
    libelle = excluded.libelle,
    max_individus = excluded.max_individus,
    max_invitations_ouvertes = excluded.max_invitations_ouvertes,
    max_documents = excluded.max_documents,
    patrimoine_public = excluded.patrimoine_public,
    export_certifie = excluded.export_certifie;

create table if not exists public.abonnements (
    utilisateur        uuid primary key references auth.users (id) on delete cascade,
    offre              text not null default 'gratuit' references public.limites_offres (offre),
    statut             text not null default 'actif' check (statut in ('actif', 'en_retard', 'annule')),
    organisme          text check (char_length(organisme) <= 160),   -- mairie, département, région (licence)
    stripe_client      text unique,
    stripe_abonnement  text unique,
    fin_periode        timestamptz,
    maj_le             timestamptz not null default now()
);

-- L'offre réellement en vigueur pour un utilisateur.
create or replace function public.offre_de(p_utilisateur uuid)
returns text
language sql stable security definer set search_path = ''
as $$
    select coalesce((
        select a.offre from public.abonnements a
        where a.utilisateur = p_utilisateur
          and a.statut in ('actif', 'en_retard')
          and (a.fin_periode is null or a.fin_periode > now())
    ), 'gratuit');
$$;

-- ---------------------------------------------------------------------
-- 2. ARBRES ET MEMBRES
-- ---------------------------------------------------------------------

create table if not exists public.arbres (
    id                 uuid primary key default gen_random_uuid(),
    nom                text not null check (char_length(btrim(nom)) between 1 and 120),
    proprietaire       uuid not null default auth.uid() references auth.users (id) on delete cascade,
    -- espace patrimonial public (licence collectivité)
    slug               text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$'),
    public_patrimoine  boolean not null default false,
    territoire         text check (char_length(territoire) <= 120),
    description        text check (char_length(description) <= 4000),
    centre_lat         double precision check (centre_lat between -90 and 90),
    centre_lng         double precision check (centre_lng between -180 and 180),
    cree_le            timestamptz not null default now(),
    check ((centre_lat is null) = (centre_lng is null))
);

create table if not exists public.membres (
    arbre_id     uuid not null references public.arbres (id) on delete cascade,
    utilisateur  uuid not null references auth.users (id) on delete cascade,
    role         text not null check (role in ('proprietaire', 'editeur', 'lecteur')),
    ajoute_le    timestamptz not null default now(),
    primary key (arbre_id, utilisateur)
);
create index if not exists membres_utilisateur on public.membres (utilisateur);
create unique index if not exists membres_un_proprietaire on public.membres (arbre_id) where role = 'proprietaire';

create or replace function public.role_dans(p_arbre uuid)
returns text
language sql stable security definer set search_path = ''
as $$
    select m.role from public.membres m where m.arbre_id = p_arbre and m.utilisateur = auth.uid();
$$;

create or replace function public.peut_lire(p_arbre uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.role_dans(p_arbre) is not null; $$;

create or replace function public.peut_ecrire(p_arbre uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.role_dans(p_arbre) in ('proprietaire', 'editeur'), false); $$;

-- Limites de l'offre du PROPRIÉTAIRE de l'arbre.
create or replace function public.limites_arbre(p_arbre uuid)
returns public.limites_offres
language sql stable security definer set search_path = ''
as $$
    select l.* from public.arbres a
    join public.limites_offres l on l.offre = public.offre_de(a.proprietaire)
    where a.id = p_arbre;
$$;

create or replace function public.arbre_cree()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    insert into public.membres (arbre_id, utilisateur, role) values (new.id, new.proprietaire, 'proprietaire');
    return null;
end;
$$;

drop trigger if exists arbre_cree on public.arbres;
create trigger arbre_cree after insert on public.arbres
    for each row execute function public.arbre_cree();

create or replace function public.controler_arbre()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_offre public.limites_offres;
begin
    new.nom := btrim(new.nom);
    if tg_op = 'UPDATE' and new.proprietaire is distinct from old.proprietaire then
        raise exception 'Le propriétaire d''un arbre ne se change pas ainsi.' using errcode = '42501';
    end if;
    if new.public_patrimoine then
        if new.slug is null then
            raise exception 'Un espace patrimonial public a besoin d''une adresse (slug).' using errcode = '23514';
        end if;
        select l.* into v_offre from public.limites_offres l where l.offre = public.offre_de(new.proprietaire);
        if not v_offre.patrimoine_public then
            raise exception 'La publication patrimoniale est réservée à la licence collectivité.'
                using errcode = '23514', hint = 'LICENCE_PATRIMOINE';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists arbre_proprietaire_fixe on public.arbres;
drop trigger if exists controler_arbre on public.arbres;
create trigger controler_arbre before insert or update on public.arbres
    for each row execute function public.controler_arbre();

-- ---------------------------------------------------------------------
-- 3. INDIVIDUS
-- ---------------------------------------------------------------------

create table if not exists public.individus (
    id                   uuid primary key default gen_random_uuid(),
    arbre_id             uuid not null references public.arbres (id) on delete cascade,
    prenom               text not null check (char_length(btrim(prenom)) between 1 and 80),
    nom                  text not null default '' check (char_length(nom) <= 80),
    genre                text not null default 'inconnu' check (genre in ('femme', 'homme', 'non_binaire', 'inconnu')),
    se_nomme             text check (char_length(se_nomme) <= 80),        -- comment la personne se nomme (non binaire…)
    naissance            date,
    naissance_precision  text not null default 'jour' check (naissance_precision in ('jour', 'annee')),
    lieu_naissance       text check (char_length(lieu_naissance) <= 120),
    naissance_lat        double precision check (naissance_lat between -90 and 90),
    naissance_lng        double precision check (naissance_lng between -180 and 180),
    deces                date,
    deces_precision      text not null default 'jour' check (deces_precision in ('jour', 'annee')),
    lieu_deces           text check (char_length(lieu_deces) <= 120),
    vivant               boolean not null default true,
    profession           text check (char_length(profession) <= 120),
    biographie           text check (char_length(biographie) <= 20000),   -- récit mémoriel
    notes                text check (char_length(notes) <= 5000),
    illustre             boolean not null default false,                  -- personnalité illustre du territoire
    thematiques          text[] not null default '{}' check (public.thematiques_valides(thematiques)),  -- migration, engagisme, marine…
    cree_le              timestamptz not null default now(),
    maj_le               timestamptz not null default now(),
    unique (arbre_id, id),
    check (deces is null or naissance is null or public.date_max(deces, deces_precision) >= naissance),
    check (not (vivant and deces is not null)),
    check ((naissance_lat is null) = (naissance_lng is null))
);
-- Photo (4e cahier des charges, 28/09) : un LIEN https vers l'image (hébergée
-- ailleurs : archives, Wikimedia, album familial). Colonne ajoutée ici pour
-- qu'une base créée par une version antérieure du script la reçoive aussi.
alter table public.individus add column if not exists photo_url text
    check (photo_url is null or (photo_url ~ '^https://[^[:space:]]+$' and char_length(photo_url) <= 1000));
create index if not exists individus_arbre on public.individus (arbre_id);
create index if not exists individus_nom on public.individus (arbre_id, (public.plat(nom)));

-- ---------------------------------------------------------------------
-- 4. UNIONS, FOYERS, FILIATIONS
-- ---------------------------------------------------------------------

create table if not exists public.unions (
    id            uuid primary key default gen_random_uuid(),
    arbre_id      uuid not null references public.arbres (id) on delete cascade,
    partenaire_a  uuid not null,
    partenaire_b  uuid not null,
    nature        text not null default 'mariage'
                  check (nature in ('mariage', 'pacs', 'union_libre', 'religieuse', 'coutumiere', 'autre')),
    statut        text not null default 'en_cours' check (statut in ('en_cours', 'separes', 'divorces', 'veuvage')),
    debut         date,
    fin           date,
    cree_le       timestamptz not null default now(),
    check (partenaire_a <> partenaire_b),
    check (fin is null or debut is null or fin >= debut),
    foreign key (arbre_id, partenaire_a) references public.individus (arbre_id, id) on delete cascade,
    foreign key (arbre_id, partenaire_b) references public.individus (arbre_id, id) on delete cascade
);
create index if not exists unions_arbre on public.unions (arbre_id);
create unique index if not exists unions_paire
    on public.unions (arbre_id, least(partenaire_a, partenaire_b), greatest(partenaire_a, partenaire_b));

-- Unité parentale : les adultes qui élèvent ensemble des enfants, sans
-- présumer ni leur nombre ni leur genre ni qu'ils forment un couple.
create table if not exists public.foyers (
    id        uuid primary key default gen_random_uuid(),
    arbre_id  uuid not null references public.arbres (id) on delete cascade,
    libelle   text not null default 'Foyer' check (char_length(btrim(libelle)) between 1 and 120),
    forme     text not null default 'autre'
              check (forme in ('couple', 'monoparental', 'homoparental', 'pluriparental', 'recompose', 'accueil', 'autre')),
    notes     text check (char_length(notes) <= 2000),
    cree_le   timestamptz not null default now(),
    unique (arbre_id, id)
);
create index if not exists foyers_arbre on public.foyers (arbre_id);

create table if not exists public.foyer_parents (
    foyer_id     uuid not null,
    arbre_id     uuid not null,
    individu_id  uuid not null,
    qualite      text check (char_length(qualite) <= 60),   -- « mère », « parent », « beau-père », « co-parent »… dit par la famille
    primary key (foyer_id, individu_id),
    foreign key (arbre_id, foyer_id) references public.foyers (arbre_id, id) on delete cascade,
    foreign key (arbre_id, individu_id) references public.individus (arbre_id, id) on delete cascade
);

create table if not exists public.filiations (
    id         uuid primary key default gen_random_uuid(),
    arbre_id   uuid not null references public.arbres (id) on delete cascade,
    parent_id  uuid not null,
    enfant_id  uuid not null,
    nature     text not null default 'biologique'
               check (nature in ('biologique', 'adoptive', 'legale', 'sociale', 'beau_parent',
                                 'accueil', 'don_gametes', 'gestation', 'intention')),
    foyer_id   uuid,
    cree_le    timestamptz not null default now(),
    check (parent_id <> enfant_id),
    unique (arbre_id, parent_id, enfant_id),
    foreign key (arbre_id, parent_id) references public.individus (arbre_id, id) on delete cascade,
    foreign key (arbre_id, enfant_id) references public.individus (arbre_id, id) on delete cascade,
    -- le parent appartient forcément au foyer indiqué ; s'il le quitte, le lien reste (sans foyer)
    foreign key (foyer_id, parent_id) references public.foyer_parents (foyer_id, individu_id) on delete set null (foyer_id)
);
create index if not exists filiations_parent on public.filiations (arbre_id, parent_id);
create index if not exists filiations_enfant on public.filiations (arbre_id, enfant_id);
create index if not exists filiations_foyer on public.filiations (foyer_id);

-- ---------------------------------------------------------------------
-- 5. COHÉRENCE : BOUCLES, LIGNE DIRECTE, DATES
-- ---------------------------------------------------------------------

-- Descendants d'un individu (lui compris), en ignorant éventuellement un
-- lien (celui qu'on est en train de modifier). Parcours en largeur ;
-- « union » sans doublon : s'arrête même sur une donnée déjà abîmée.
create or replace function public.descendants_de(p_arbre uuid, p_individu uuid, p_sauf uuid default null)
returns table (id uuid)
language sql stable security definer set search_path = ''
as $$
    with recursive d (id) as (
        select p_individu
        union
        select f.enfant_id from public.filiations f join d on f.parent_id = d.id
        where f.arbre_id = p_arbre and f.id is distinct from p_sauf
    )
    select id from d;
$$;

create or replace function public.ascendants_de(p_arbre uuid, p_individu uuid, p_sauf uuid default null)
returns table (id uuid)
language sql stable security definer set search_path = ''
as $$
    with recursive a (id) as (
        select p_individu
        union
        select f.parent_id from public.filiations f join a on f.enfant_id = a.id
        where f.arbre_id = p_arbre and f.id is distinct from p_sauf
    )
    select id from a;
$$;

-- Absurdité de dates entre un parent et un enfant (null = cohérent).
-- Chaque règle ne tranche que si elle est fausse MÊME dans le cas le plus
-- favorable (une année seule couvre toute l'année).
create or replace function public.incoherence_dates(p_parent uuid, p_enfant uuid, p_nature text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
    p public.individus;
    e public.individus;
begin
    select * into p from public.individus where id = p_parent;
    select * into e from public.individus where id = p_enfant;
    if p.naissance is not null and e.naissance is not null then
        if p.naissance > public.date_max(e.naissance, e.naissance_precision) then
            return format('%s est né(e) après %s : il ou elle ne peut pas en être le parent.', btrim(p.prenom || ' ' || p.nom), btrim(e.prenom || ' ' || e.nom));
        end if;
        if p_nature in ('biologique', 'don_gametes', 'gestation')
           and public.date_max(e.naissance, e.naissance_precision) < (p.naissance + interval '10 years')::date then
            return format('%s aurait eu moins de 10 ans à la naissance de %s.', btrim(p.prenom || ' ' || p.nom), btrim(e.prenom || ' ' || e.nom));
        end if;
    end if;
    if p.deces is not null and e.naissance is not null then
        if p_nature in ('biologique', 'don_gametes')
           and e.naissance > (public.date_max(p.deces, p.deces_precision) + interval '1 year')::date then
            return format('%s serait né(e) plus d''un an après la mort de son parent biologique %s.', btrim(e.prenom || ' ' || e.nom), btrim(p.prenom || ' ' || p.nom));
        end if;
        if p_nature = 'gestation'
           and e.naissance > (public.date_max(p.deces, p.deces_precision) + interval '30 days')::date then
            return format('%s serait né(e) après la mort de la personne qui l''a porté(e).', btrim(e.prenom || ' ' || e.nom));
        end if;
    end if;
    return null;
end;
$$;

create or replace function public.controler_individu()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_max    integer;
    v_nombre integer;
begin
    new.prenom := btrim(new.prenom);
    new.nom := btrim(new.nom);
    new.thematiques := coalesce((select array_agg(distinct lower(btrim(t))) from unnest(new.thematiques) t), '{}');
    if new.deces is not null then
        new.vivant := false;
    end if;
    if new.naissance is not null and new.naissance > current_date then
        raise exception 'La date de naissance est dans le futur.' using errcode = '23514';
    end if;
    if new.deces is not null and new.deces > current_date then
        raise exception 'La date de décès est dans le futur.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' then
        if new.arbre_id <> old.arbre_id then
            raise exception 'Un individu ne change pas d''arbre.' using errcode = '23514';
        end if;
        new.maj_le := now();
    else
        perform pg_advisory_xact_lock(hashtext('individus:' || new.arbre_id::text));
        v_max := (public.limites_arbre(new.arbre_id)).max_individus;
        if v_max is not null then
            select count(*) into v_nombre from public.individus i where i.arbre_id = new.arbre_id;
            if v_nombre >= v_max then
                raise exception 'Limite de l''offre gratuite atteinte : % individus par arbre.', v_max
                    using errcode = '23514', hint = 'OFFRE_LIMITE_INDIVIDUS';
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists controler_individu on public.individus;
create trigger controler_individu before insert or update on public.individus
    for each row execute function public.controler_individu();

-- Une date corrigée APRÈS coup ne doit pas rendre un lien absurde.
create or replace function public.recontroler_dates()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    f        record;
    u        record;
    v_motif  text;
begin
    for f in select parent_id, enfant_id, nature from public.filiations
             where arbre_id = new.arbre_id and (parent_id = new.id or enfant_id = new.id) loop
        v_motif := public.incoherence_dates(f.parent_id, f.enfant_id, f.nature);
        if v_motif is not null then
            raise exception '%', v_motif using errcode = '23514', hint = 'DATES';
        end if;
    end loop;
    for u in select debut from public.unions
             where arbre_id = new.arbre_id and new.id in (partenaire_a, partenaire_b) and debut is not null loop
        if new.naissance is not null and u.debut < new.naissance then
            raise exception '%', format('%s serait en union avant sa naissance.', btrim(new.prenom || ' ' || new.nom)) using errcode = '23514', hint = 'DATES';
        end if;
    end loop;
    return null;
end;
$$;

drop trigger if exists recontroler_dates on public.individus;
create trigger recontroler_dates after update of naissance, naissance_precision, deces, deces_precision on public.individus
    for each row execute function public.recontroler_dates();

create or replace function public.controler_union()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    a public.individus;
    b public.individus;
begin
    if tg_op = 'UPDATE' and new.arbre_id <> old.arbre_id then
        raise exception 'Un couple ne change pas d''arbre.' using errcode = '23514';
    end if;
    perform pg_advisory_xact_lock(hashtext('liens:' || new.arbre_id::text));
    if exists (select 1 from public.descendants_de(new.arbre_id, new.partenaire_a) d where d.id = new.partenaire_b)
       or exists (select 1 from public.descendants_de(new.arbre_id, new.partenaire_b) d where d.id = new.partenaire_a) then
        raise exception 'Union impossible entre un ascendant et son descendant.' using errcode = '23514', hint = 'LIGNE_DIRECTE';
    end if;
    if new.debut is not null then
        if new.debut > current_date then
            raise exception 'La date d''union est dans le futur.' using errcode = '23514';
        end if;
        select * into a from public.individus where id = new.partenaire_a;
        select * into b from public.individus where id = new.partenaire_b;
        if (a.naissance is not null and new.debut < a.naissance) or (b.naissance is not null and new.debut < b.naissance) then
            raise exception 'Une union ne peut pas commencer avant la naissance d''un des partenaires.' using errcode = '23514', hint = 'DATES';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists controler_union on public.unions;
create trigger controler_union before insert or update on public.unions
    for each row execute function public.controler_union();

-- LE CONTRÔLE D'UN LIEN PARENT → ENFANT
--   1. boucle : le parent est-il déjà un descendant de l'enfant ?
--   2. ligne directe : le lien ferait-il d'un couple existant un ascendant
--      et son descendant ?
--   3. dates absurdes ;
--   4. au plus deux parents biologiques.
-- Le verrou par arbre sérialise les écritures : deux liens posés au même
-- instant (A → B et B → A) ne peuvent pas passer tous les deux.
create or replace function public.controler_filiation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_motif      text;
    v_biologique integer;
begin
    if tg_op = 'UPDATE' and new.arbre_id <> old.arbre_id then
        raise exception 'Un lien ne change pas d''arbre.' using errcode = '23514';
    end if;
    perform pg_advisory_xact_lock(hashtext('liens:' || new.arbre_id::text));

    if exists (select 1 from public.descendants_de(new.arbre_id, new.enfant_id, new.id) d where d.id = new.parent_id) then
        raise exception 'Lien impossible : ce parent est déjà un descendant de cet enfant (boucle dans l''arbre).'
            using errcode = '23514', hint = 'BOUCLE';
    end if;

    if exists (
        select 1 from public.unions u
        where u.arbre_id = new.arbre_id
          and ((u.partenaire_a in (select id from public.ascendants_de(new.arbre_id, new.parent_id, new.id))
                and u.partenaire_b in (select id from public.descendants_de(new.arbre_id, new.enfant_id, new.id)))
            or (u.partenaire_b in (select id from public.ascendants_de(new.arbre_id, new.parent_id, new.id))
                and u.partenaire_a in (select id from public.descendants_de(new.arbre_id, new.enfant_id, new.id))))
    ) then
        raise exception 'Lien impossible : il ferait d''un couple de l''arbre un ascendant et son descendant.'
            using errcode = '23514', hint = 'LIGNE_DIRECTE';
    end if;

    v_motif := public.incoherence_dates(new.parent_id, new.enfant_id, new.nature);
    if v_motif is not null then
        raise exception '%', v_motif using errcode = '23514', hint = 'DATES';
    end if;

    if new.nature = 'biologique' then
        select count(*) into v_biologique from public.filiations f
        where f.arbre_id = new.arbre_id and f.enfant_id = new.enfant_id and f.nature = 'biologique' and f.id <> new.id;
        if v_biologique >= 2 then
            raise exception 'Cet enfant a déjà deux parents biologiques : choisissez une autre nature de lien (adoptive, sociale, beau-parent, intention…).'
                using errcode = '23514', hint = 'DEUX_BIOLOGIQUES';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists controler_filiation on public.filiations;
create trigger controler_filiation before insert or update on public.filiations
    for each row execute function public.controler_filiation();

-- Rattacher un enfant à un foyer : un lien vers CHAQUE parent du foyer
-- (existant : il est rattaché au foyer, sa nature est gardée).
create or replace function public.rattacher_au_foyer(p_foyer uuid, p_enfant uuid, p_nature text default 'biologique')
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
    v_arbre  uuid;
    v_parent record;
    v_n      integer := 0;
begin
    select arbre_id into v_arbre from public.foyers where id = p_foyer;
    if v_arbre is null then
        raise exception 'Foyer introuvable.' using errcode = 'P0002';
    end if;
    for v_parent in select individu_id from public.foyer_parents where foyer_id = p_foyer loop
        insert into public.filiations (arbre_id, parent_id, enfant_id, nature, foyer_id)
        values (v_arbre, v_parent.individu_id, p_enfant, p_nature, p_foyer)
        on conflict (arbre_id, parent_id, enfant_id) do update set foyer_id = excluded.foyer_id;
        v_n := v_n + 1;
    end loop;
    return v_n;
end;
$$;

-- Ajouter un individu ET son lien en une seule transaction : si le lien est
-- refusé (boucle, dates…), l'individu n'est pas créé — jamais de fiche
-- orpheline. p : champs de l'individu (mêmes noms que les colonnes).
-- p_relation : 'parent' (le nouveau est parent de p_autre), 'enfant',
-- 'conjoint' (p_union : nature, statut, debut, fin) ou 'aucun'.
create or replace function public.ajouter_individu_lie(
    p_arbre uuid, p jsonb, p_relation text default 'aucun', p_autre uuid default null,
    p_nature text default 'biologique', p_union jsonb default null)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
    r    public.individus;
    u    public.unions;
    v_id uuid;
begin
    if p_relation not in ('parent', 'enfant', 'conjoint', 'aucun') then
        raise exception 'Relation inconnue.' using errcode = '22023';
    end if;
    if p_relation <> 'aucun' and p_autre is null then
        raise exception 'Choisissez la personne à relier.' using errcode = '22023';
    end if;
    r := jsonb_populate_record(null::public.individus, coalesce(p, '{}'::jsonb));
    insert into public.individus (arbre_id, prenom, nom, genre, se_nomme, naissance, naissance_precision, lieu_naissance,
                                  naissance_lat, naissance_lng, deces, deces_precision, lieu_deces, vivant, profession,
                                  biographie, notes, illustre, thematiques, photo_url)
    values (p_arbre, r.prenom, coalesce(r.nom, ''), coalesce(r.genre, 'inconnu'), r.se_nomme, r.naissance,
            coalesce(r.naissance_precision, 'jour'), r.lieu_naissance, r.naissance_lat, r.naissance_lng, r.deces,
            coalesce(r.deces_precision, 'jour'), r.lieu_deces, coalesce(r.vivant, true), r.profession, r.biographie,
            r.notes, coalesce(r.illustre, false), coalesce(r.thematiques, '{}'), r.photo_url)
    returning id into v_id;
    if p_relation = 'parent' then
        insert into public.filiations (arbre_id, parent_id, enfant_id, nature) values (p_arbre, v_id, p_autre, p_nature);
    elsif p_relation = 'enfant' then
        insert into public.filiations (arbre_id, parent_id, enfant_id, nature) values (p_arbre, p_autre, v_id, p_nature);
    elsif p_relation = 'conjoint' then
        u := jsonb_populate_record(null::public.unions, coalesce(p_union, '{}'::jsonb));
        insert into public.unions (arbre_id, partenaire_a, partenaire_b, nature, statut, debut, fin)
        values (p_arbre, p_autre, v_id, coalesce(u.nature, 'mariage'), coalesce(u.statut, 'en_cours'), u.debut, u.fin);
    end if;
    return v_id;
end;
$$;

-- FRÈRE OU SŒUR SANS CONNAÎTRE LES PARENTS (ses demandes du 28/09 : « sans
-- passer par les parents, pour cause de parent inconnu » ; « de parents
-- différents » ; « ou adoptif »). p_individu et l'autre (existant, ou nouveau
-- décrit par p) sont reliés PAR LEURS PARENTS, selon p_lien :
--   · germain : mêmes parents. Celui qui n'en a pas reçoit ceux de l'autre
--     (même nature, même foyer) ; si aucun n'en a, DEUX parents « à trouver »
--     communs sont posés ; si chacun a les siens, rien n'est déplacé (message).
--   · demi : UN parent en commun. p_parent_commun (un parent connu de l'un
--     des deux) est donné à l'autre ; sans lui, un parent « à trouver »
--     commun est posé — chacun garde ses autres parents.
--   · adoptif : l'autre est relié aux parents de p_individu par un lien
--     « adoptive » ; sans parents connus, un parent « à trouver » commun
--     (lien adoptif pour l'autre).
-- Les fiches « à trouver » se complètent ensuite (nom, dates), ou se
-- remplacent par une personne déjà dans l'arbre (remplacer_parent_a_trouver).
-- Tout ou rien : un refus (boucle, dates, 3e parent biologique…) n'a rien créé.
drop function if exists public.ajouter_frere_soeur(uuid, uuid, jsonb, uuid);
create or replace function public.ajouter_frere_soeur(
    p_arbre uuid, p_individu uuid, p jsonb default null, p_existant uuid default null,
    p_lien text default 'germain', p_parent_commun uuid default null)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
    v_autre   uuid;
    v_parent  record;
    v_a       integer;
    v_b       integer;
    v_source  uuid;
    v_cible   uuid;
    v_inter   uuid;
    i         integer;
begin
    if p_lien is null or p_lien not in ('germain', 'demi', 'adoptif') then
        raise exception 'Type de lien inconnu (germain, demi, adoptif).' using errcode = '22023';
    end if;
    if (p is null) = (p_existant is null) then
        raise exception 'Choisissez une personne existante OU décrivez une nouvelle personne.' using errcode = '22023';
    end if;
    if p_existant = p_individu then
        raise exception 'Une personne ne peut pas être son propre frère ou sa propre sœur.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.individus where id = p_individu and arbre_id = p_arbre) then
        raise exception 'Personne introuvable dans cet arbre.' using errcode = 'P0002';
    end if;
    v_autre := coalesce(p_existant, public.ajouter_individu_lie(p_arbre, p, 'aucun'));
    if not exists (select 1 from public.individus where id = v_autre and arbre_id = p_arbre) then
        raise exception 'Personne introuvable dans cet arbre.' using errcode = 'P0002';
    end if;
    select count(*) into v_a from public.filiations where arbre_id = p_arbre and enfant_id = p_individu;
    select count(*) into v_b from public.filiations where arbre_id = p_arbre and enfant_id = v_autre;

    if p_lien = 'demi' and p_parent_commun is not null then
        if exists (select 1 from public.filiations where parent_id = p_parent_commun and enfant_id = p_individu) then
            v_source := p_individu; v_cible := v_autre;
        elsif exists (select 1 from public.filiations where parent_id = p_parent_commun and enfant_id = v_autre) then
            v_source := v_autre; v_cible := p_individu;
        else
            raise exception 'Le parent commun choisi n''est le parent d''aucun des deux.' using errcode = '22023';
        end if;
        if exists (select 1 from public.filiations where parent_id = p_parent_commun and enfant_id = v_cible) then
            raise exception 'Ils ont déjà ce parent en commun.' using errcode = '23514', hint = 'DEJA_FRATRIE';
        end if;
        select nature, foyer_id into v_parent from public.filiations where parent_id = p_parent_commun and enfant_id = v_source;
        insert into public.filiations (arbre_id, parent_id, enfant_id, nature, foyer_id)
        values (p_arbre, p_parent_commun, v_cible, v_parent.nature, v_parent.foyer_id);
        return v_autre;
    end if;

    if exists (select 1 from public.filiations x join public.filiations y on y.parent_id = x.parent_id
               where x.enfant_id = p_individu and y.enfant_id = v_autre) then
        raise exception 'Ils ont déjà un parent en commun : ils sont déjà frère et sœur.' using errcode = '23514', hint = 'DEJA_FRATRIE';
    end if;

    if p_lien = 'demi' then
        -- parent commun inconnu : un seul parent « à trouver » partagé
        insert into public.individus (arbre_id, prenom, nom, vivant, notes)
        values (p_arbre, 'Parent à trouver', '', false, 'Parent commun de demi-frères / demi-sœurs : à compléter (nom, dates).')
        returning id into v_inter;
        insert into public.filiations (arbre_id, parent_id, enfant_id) values (p_arbre, v_inter, p_individu), (p_arbre, v_inter, v_autre);
        return v_autre;
    end if;

    if v_a > 0 and v_b > 0 then
        raise exception 'Chacun a déjà ses parents, différents : choisissez « demi-frère / demi-sœur » (un parent en commun), ou reliez-les par + Parent.'
            using errcode = '23514', hint = 'PARENTS_DIFFERENTS';
    elsif v_a > 0 or v_b > 0 then
        if v_a > 0 then v_source := p_individu; v_cible := v_autre; else v_source := v_autre; v_cible := p_individu; end if;
        for v_parent in select parent_id, nature, foyer_id from public.filiations where arbre_id = p_arbre and enfant_id = v_source loop
            insert into public.filiations (arbre_id, parent_id, enfant_id, nature, foyer_id)
            values (p_arbre, v_parent.parent_id, v_cible, case when p_lien = 'adoptif' then 'adoptive' else v_parent.nature end, v_parent.foyer_id);
        end loop;
    else
        for i in 1 .. case when p_lien = 'germain' then 2 else 1 end loop
            insert into public.individus (arbre_id, prenom, nom, vivant, notes)
            values (p_arbre, 'Parent à trouver', '', false,
                    case when p_lien = 'adoptif' then 'Parent commun (frère / sœur par adoption) : à compléter (nom, dates).'
                         else 'Parent commun de frères et sœurs : à compléter (nom, dates).' end)
            returning id into v_inter;
            insert into public.filiations (arbre_id, parent_id, enfant_id, nature)
            values (p_arbre, v_inter, p_individu, 'biologique'),
                   (p_arbre, v_inter, v_autre, case when p_lien = 'adoptif' then 'adoptive' else 'biologique' end);
        end loop;
    end if;
    return v_autre;
end;
$$;

-- Le parent « à trouver » est retrouvé et il est DÉJÀ dans l'arbre (sa
-- demande du 28/09) : ses liens passent sur la vraie personne (même nature,
-- même foyer ; boucles et dates contrôlées), puis la fiche vide disparaît.
-- Tout ou rien. (S'il n'est pas dans l'arbre : on complète simplement la
-- fiche « à trouver » — nom, dates — et tous ses enfants en profitent.)
create or replace function public.remplacer_parent_a_trouver(p_a_trouver uuid, p_reel uuid)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
    v_arbre  uuid;
    v_lien   record;
    v_n      integer := 0;
begin
    select arbre_id into v_arbre from public.individus where id = p_a_trouver and prenom = 'Parent à trouver';
    if v_arbre is null then
        raise exception 'Cette fiche n''est pas un parent « à trouver ».' using errcode = '22023';
    end if;
    if p_reel = p_a_trouver or not exists (select 1 from public.individus where id = p_reel and arbre_id = v_arbre) then
        raise exception 'Choisissez une autre personne de cet arbre.' using errcode = '22023';
    end if;
    for v_lien in select id, enfant_id, nature, foyer_id from public.filiations where arbre_id = v_arbre and parent_id = p_a_trouver loop
        delete from public.filiations where id = v_lien.id;
        if not exists (select 1 from public.filiations where arbre_id = v_arbre and parent_id = p_reel and enfant_id = v_lien.enfant_id) then
            insert into public.filiations (arbre_id, parent_id, enfant_id, nature)
            values (v_arbre, p_reel, v_lien.enfant_id, v_lien.nature);
            v_n := v_n + 1;
        end if;
    end loop;
    -- ses propres parents, s'il en avait reçu, passent aussi
    for v_lien in select id, parent_id, nature from public.filiations where arbre_id = v_arbre and enfant_id = p_a_trouver loop
        delete from public.filiations where id = v_lien.id;
        if not exists (select 1 from public.filiations where arbre_id = v_arbre and parent_id = v_lien.parent_id and enfant_id = p_reel) then
            insert into public.filiations (arbre_id, parent_id, enfant_id, nature) values (v_arbre, v_lien.parent_id, p_reel, v_lien.nature);
        end if;
    end loop;
    delete from public.individus where id = p_a_trouver;
    return v_n;
end;
$$;

-- Créer un foyer avec ses parents en une transaction.
create or replace function public.creer_foyer(p_arbre uuid, p_libelle text, p_forme text, p_parents uuid[], p_qualites text[] default null)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
    v_id uuid;
    i    integer;
begin
    if coalesce(cardinality(p_parents), 0) = 0 then
        raise exception 'Un foyer a au moins un parent.' using errcode = '22023';
    end if;
    insert into public.foyers (arbre_id, libelle, forme) values (p_arbre, btrim(coalesce(p_libelle, 'Foyer')), coalesce(p_forme, 'autre'))
    returning id into v_id;
    for i in 1 .. cardinality(p_parents) loop
        insert into public.foyer_parents (foyer_id, arbre_id, individu_id, qualite)
        values (v_id, p_arbre, p_parents[i], nullif(btrim(coalesce(p_qualites[i], '')), ''));
    end loop;
    return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. PATRIMOINE : DOCUMENTS GÉOLOCALISÉS, FAMILLES HISTORIQUES
-- ---------------------------------------------------------------------

create table if not exists public.documents (
    id             uuid primary key default gen_random_uuid(),
    arbre_id       uuid not null references public.arbres (id) on delete cascade,
    titre          text not null check (char_length(btrim(titre)) between 1 and 200),
    type           text not null default 'autre'
                   check (type in ('registre', 'acte', 'photo', 'carte', 'presse', 'temoignage', 'objet', 'autre')),
    date_document  date,
    periode        text check (char_length(periode) <= 60),          -- « vers 1850 », « 1848-1870 »
    lieu           text check (char_length(lieu) <= 120),
    lat            double precision check (lat between -90 and 90),
    lng            double precision check (lng between -180 and 180),
    url            text check (url ~ '^https://' and char_length(url) <= 1000),
    cote           text check (char_length(cote) <= 120),             -- référence d'archive
    source         text check (char_length(source) <= 200),           -- ANOM, archives départementales…
    droits         text check (char_length(droits) <= 200),
    description    text check (char_length(description) <= 5000),
    public         boolean not null default false,                     -- visible dans l'espace patrimonial publié
    cree_le        timestamptz not null default now(),
    unique (arbre_id, id),
    check ((lat is null) = (lng is null))
);
create index if not exists documents_arbre on public.documents (arbre_id);

create table if not exists public.document_individus (
    document_id  uuid not null,
    individu_id  uuid not null,
    arbre_id     uuid not null,
    primary key (document_id, individu_id),
    foreign key (arbre_id, document_id) references public.documents (arbre_id, id) on delete cascade,
    foreign key (arbre_id, individu_id) references public.individus (arbre_id, id) on delete cascade
);
create index if not exists document_individus_individu on public.document_individus (individu_id);

create table if not exists public.familles_historiques (
    id        uuid primary key default gen_random_uuid(),
    arbre_id  uuid not null references public.arbres (id) on delete cascade,
    nom       text not null check (char_length(btrim(nom)) between 1 and 80),
    resume    text check (char_length(resume) <= 5000),
    origine   text check (char_length(origine) <= 120),
    periode   text check (char_length(periode) <= 60),
    cree_le   timestamptz not null default now()
);
create unique index if not exists familles_historiques_nom on public.familles_historiques (arbre_id, (public.plat(nom)));

create or replace function public.controler_document()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_max    integer;
    v_nombre integer;
begin
    if tg_op = 'UPDATE' and new.arbre_id <> old.arbre_id then
        raise exception 'Un document ne change pas d''arbre.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
        perform pg_advisory_xact_lock(hashtext('documents:' || new.arbre_id::text));
        v_max := (public.limites_arbre(new.arbre_id)).max_documents;
        if v_max is not null then
            select count(*) into v_nombre from public.documents d where d.arbre_id = new.arbre_id;
            if v_nombre >= v_max then
                raise exception 'Limite de l''offre gratuite atteinte : % documents par arbre.', v_max
                    using errcode = '23514', hint = 'OFFRE_LIMITE_DOCUMENTS';
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists controler_document on public.documents;
create trigger controler_document before insert or update on public.documents
    for each row execute function public.controler_document();

-- ---------------------------------------------------------------------
-- 7. PARTAGE PUBLIC : INVITATIONS (QR + PIN) ET CONTRIBUTIONS
-- ---------------------------------------------------------------------

create table if not exists public.invitations (
    id         uuid primary key default gen_random_uuid(),
    arbre_id   uuid not null references public.arbres (id) on delete cascade,
    jeton      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
    libelle    text not null default 'Partage' check (char_length(btrim(libelle)) between 1 and 80),
    pin_hash   text,
    avec_pin   boolean generated always as (pin_hash is not null) stored,
    expire_le  timestamptz not null default now() + interval '90 days',
    ferme      boolean not null default false,
    cree_par   uuid not null default auth.uid() references auth.users (id) on delete cascade,
    cree_le    timestamptz not null default now()
);
create index if not exists invitations_arbre on public.invitations (arbre_id);

create table if not exists public.contributions (
    id             uuid primary key default gen_random_uuid(),
    arbre_id       uuid not null references public.arbres (id) on delete cascade,
    invitation_id  uuid references public.invitations (id) on delete set null,
    contenu        jsonb not null check (jsonb_typeof(contenu) = 'object' and octet_length(contenu::text) <= 20000),
    contact        text check (char_length(contact) <= 200),
    statut         text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee')),
    motif          text check (char_length(motif) <= 500),
    origine        text,
    uid            text unique check (uid ~ '^[0-9a-f-]{8,64}$'),  -- identifiant de l'envoi : un renvoi (réseau coupé) n'entre qu'une fois
    cree_le        timestamptz not null default now(),
    traitee_par    uuid references auth.users (id) on delete set null,
    traitee_le     timestamptz
);
-- (base créée par une version antérieure du script : la colonne arrive ici)
alter table public.contributions add column if not exists uid text unique check (uid ~ '^[0-9a-f-]{8,64}$');
create index if not exists contributions_arbre on public.contributions (arbre_id, statut, cree_le desc);
create index if not exists contributions_origine on public.contributions (origine, cree_le);

create table if not exists public.essais_pin (
    id             bigint generated always as identity primary key,
    invitation_id  uuid not null references public.invitations (id) on delete cascade,
    origine        text,
    reussi         boolean not null,
    le             timestamptz not null default now()
);
create index if not exists essais_pin_invitation on public.essais_pin (invitation_id, le);
create index if not exists essais_pin_origine on public.essais_pin (origine, le);

-- Empreinte de l'appelant (jamais son adresse en clair).
create or replace function public.origine_appel()
returns text
language sql stable security definer set search_path = ''
as $$
    select encode(extensions.digest(
        coalesce(nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''), 'inconnue'),
        'sha256'), 'hex');
$$;

create or replace function public.creer_invitation(p_arbre uuid, p_libelle text, p_pin text default null, p_jours integer default 90)
returns public.invitations
language plpgsql security definer set search_path = ''
as $$
declare
    v_max       integer;
    v_ouvertes  integer;
    v_ligne     public.invitations;
begin
    if not public.peut_ecrire(p_arbre) then
        raise exception 'Seuls le propriétaire et les éditeurs créent un partage.' using errcode = '42501';
    end if;
    if p_pin is not null and p_pin !~ '^[0-9]{4,8}$' then
        raise exception 'Le code PIN doit faire de 4 à 8 chiffres.' using errcode = '22023';
    end if;
    if p_jours is null or p_jours < 1 or p_jours > 365 then
        raise exception 'La durée doit être comprise entre 1 et 365 jours.' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtext('invitations:' || p_arbre::text));
    v_max := (public.limites_arbre(p_arbre)).max_invitations_ouvertes;
    if v_max is not null then
        select count(*) into v_ouvertes from public.invitations i
        where i.arbre_id = p_arbre and not i.ferme and i.expire_le > now();
        if v_ouvertes >= v_max then
            raise exception 'L''offre gratuite permet % partage ouvert à la fois : fermez l''ancien ou passez à l''offre Famille.', v_max
                using errcode = '23514', hint = 'OFFRE_LIMITE_INVITATIONS';
        end if;
    end if;
    insert into public.invitations (arbre_id, libelle, pin_hash, expire_le, cree_par)
    values (p_arbre, btrim(coalesce(p_libelle, 'Partage')),
            case when p_pin is null then null else extensions.crypt(p_pin, extensions.gen_salt('bf', 8)) end,
            now() + make_interval(days => p_jours), auth.uid())
    returning * into v_ligne;
    v_ligne.pin_hash := null; -- le haché ne ressort jamais
    return v_ligne;
end;
$$;

-- Rouvrir ou prolonger un partage compte comme en ouvrir un : même limite
-- de l'offre, même durée maximale (365 jours).
create or replace function public.controler_invitation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_max      integer;
    v_ouvertes integer;
begin
    if new.arbre_id <> old.arbre_id or new.jeton <> old.jeton then
        raise exception 'Un partage ne change ni d''arbre ni de lien.' using errcode = '23514';
    end if;
    if new.expire_le > now() + interval '366 days' then
        raise exception 'Un partage dure 365 jours au plus.' using errcode = '22023';
    end if;
    if not new.ferme and new.expire_le > now() and (old.ferme or old.expire_le <= now()) then
        perform pg_advisory_xact_lock(hashtext('invitations:' || new.arbre_id::text));
        v_max := (public.limites_arbre(new.arbre_id)).max_invitations_ouvertes;
        if v_max is not null then
            select count(*) into v_ouvertes from public.invitations i
            where i.arbre_id = new.arbre_id and not i.ferme and i.expire_le > now() and i.id <> new.id;
            if v_ouvertes >= v_max then
                raise exception 'L''offre gratuite permet % partage ouvert à la fois : fermez l''autre ou passez à l''offre Famille.', v_max
                    using errcode = '23514', hint = 'OFFRE_LIMITE_INVITATIONS';
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists controler_invitation on public.invitations;
create trigger controler_invitation before update on public.invitations
    for each row execute function public.controler_invitation();

-- Vérifie une invitation et son PIN. Ne lève JAMAIS d'erreur pour un
-- refus attendu : l'essai raté doit rester enregistré (une exception
-- annulerait l'enregistrement).
create or replace function public.ouvrir_invitation(p_jeton text, p_pin text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_inv       public.invitations;
    v_origine   text := public.origine_appel();
    v_rates     integer;
    v_rates_org integer;
begin
    if p_jeton is null or p_jeton !~ '^[0-9a-f]{32}$' then
        return jsonb_build_object('ok', false, 'raison', 'lien_invalide');
    end if;
    select * into v_inv from public.invitations where jeton = p_jeton;
    if not found then
        return jsonb_build_object('ok', false, 'raison', 'lien_invalide');
    end if;
    if v_inv.ferme or v_inv.expire_le <= now() then
        return jsonb_build_object('ok', false, 'raison', 'lien_ferme');
    end if;
    if v_inv.pin_hash is not null then
        select count(*) into v_rates from public.essais_pin
        where invitation_id = v_inv.id and not reussi and le > now() - interval '1 hour';
        select count(*) into v_rates_org from public.essais_pin
        where origine = v_origine and not reussi and le > now() - interval '1 hour';
        if v_rates >= 30 or v_rates_org >= 20 then
            return jsonb_build_object('ok', false, 'raison', 'trop_d_essais');
        end if;
        if p_pin is null then
            return jsonb_build_object('ok', false, 'raison', 'pin_requis');
        end if;
        if extensions.crypt(p_pin, v_inv.pin_hash) <> v_inv.pin_hash then
            insert into public.essais_pin (invitation_id, origine, reussi) values (v_inv.id, v_origine, false);
            return jsonb_build_object('ok', false, 'raison', 'pin_faux');
        end if;
    end if;
    return jsonb_build_object('ok', true, 'invitation_id', v_inv.id, 'arbre_id', v_inv.arbre_id);
end;
$$;

-- Ce que le public voit d'un arbre partagé : son nom et ses individus
-- DÉCÉDÉS (jamais un vivant), pour pouvoir s'y relier.
create or replace function public.invitation_publique(p_jeton text, p_pin text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_ouverture jsonb := public.ouvrir_invitation(p_jeton, p_pin);
    v_arbre     uuid;
    v_nom       text;
    v_avec_pin  boolean;
begin
    if not (v_ouverture ->> 'ok')::boolean then
        if v_ouverture ->> 'raison' in ('pin_requis', 'pin_faux', 'trop_d_essais') then
            select a.nom into v_nom from public.invitations i join public.arbres a on a.id = i.arbre_id where i.jeton = p_jeton;
            return v_ouverture || jsonb_build_object('arbre_nom', v_nom, 'avec_pin', true);
        end if;
        return v_ouverture;
    end if;
    v_arbre := (v_ouverture ->> 'arbre_id')::uuid;
    select a.nom into v_nom from public.arbres a where a.id = v_arbre;
    select i.avec_pin into v_avec_pin from public.invitations i where i.jeton = p_jeton;
    return jsonb_build_object(
        'ok', true,
        'arbre_nom', v_nom,
        'avec_pin', v_avec_pin,
        'individus', coalesce((
            select jsonb_agg(jsonb_build_object(
                       'id', q.id, 'prenom', q.prenom, 'nom', q.nom, 'genre', q.genre,
                       'naissance_annee', extract(year from q.naissance)::integer,
                       'deces_annee', extract(year from q.deces)::integer)
                   order by q.nom, q.prenom)
            from (select * from public.individus i
                  where i.arbre_id = v_arbre and not i.vivant and i.prenom <> 'Parent à trouver'
                  order by i.nom, i.prenom limit 3000) q
        ), '[]'::jsonb)
    );
end;
$$;

-- L'ARBRE PUBLIC D'UN LIEN PARTAGÉ (30/09/2026, sa demande : « les visiteurs
-- peuvent chercher un nom et voir les branches et les personnes décédées »).
-- Le site montre l'écran de l'Ancestria du PC aux visiteurs du lien : il lui
-- faut les personnes DÉCÉDÉES et les liens ENTRE elles (couples, parent → enfant).
-- Jamais : les vivants, les fiches « à trouver », les notes, les lieux ; les dates
-- sont réduites à l'année (même prudence que invitation_publique).
create or replace function public.arbre_public(p_jeton text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_ouverture jsonb := public.ouvrir_invitation(p_jeton, null);
    v_arbre     uuid;
begin
    if not (v_ouverture ->> 'ok')::boolean then
        return v_ouverture;
    end if;
    v_arbre := (v_ouverture ->> 'arbre_id')::uuid;
    return jsonb_build_object(
        'ok', true,
        'arbre_nom', (select a.nom from public.arbres a where a.id = v_arbre),
        'individus', coalesce((
            select jsonb_agg(jsonb_build_object(
                       'id', i.id, 'prenom', i.prenom, 'nom', i.nom, 'genre', i.genre,
                       'naissance', case when i.naissance is null then null else make_date(extract(year from i.naissance)::integer, 1, 1) end,
                       'naissance_precision', 'annee', 'lieu_naissance', null,
                       'deces', case when i.deces is null then null else make_date(extract(year from i.deces)::integer, 1, 1) end,
                       'deces_precision', 'annee', 'lieu_deces', null,
                       'vivant', false, 'notes', null, 'cree_le', i.cree_le, 'maj_le', i.cree_le)
                   order by i.cree_le, i.id)
            from public.individus i
            where i.arbre_id = v_arbre and not i.vivant and i.prenom <> 'Parent à trouver'
        ), '[]'::jsonb),
        'unions', coalesce((
            select jsonb_agg(jsonb_build_object('id', u.id, 'partenaire_a', u.partenaire_a, 'partenaire_b', u.partenaire_b,
                       'nature', u.nature, 'statut', u.statut, 'debut', null, 'fin', null) order by u.cree_le, u.id)
            from public.unions u
            join public.individus a on a.id = u.partenaire_a and not a.vivant and a.prenom <> 'Parent à trouver'
            join public.individus b on b.id = u.partenaire_b and not b.vivant and b.prenom <> 'Parent à trouver'
            where u.arbre_id = v_arbre
        ), '[]'::jsonb),
        'filiations', coalesce((
            select jsonb_agg(jsonb_build_object('id', f.id, 'parent_id', f.parent_id, 'enfant_id', f.enfant_id, 'nature', f.nature) order by f.cree_le, f.id)
            from public.filiations f
            join public.individus p on p.id = f.parent_id and not p.vivant and p.prenom <> 'Parent à trouver'
            join public.individus e on e.id = f.enfant_id and not e.vivant and e.prenom <> 'Parent à trouver'
            where f.arbre_id = v_arbre
        ), '[]'::jsonb)
    );
end;
$$;

-- ---------------------------------------------------------------------
-- 7 bis. INSCRIPTION OBLIGATOIRE ET VERROU DES CONTRIBUTIONS
-- ---------------------------------------------------------------------
-- Règle de l'administrateur, 30/09/2026 :
--   « toute personne souhaitant ajouter une famille ou contribuer doit
--     obligatoirement s'inscrire en fournissant son Nom, Prénom et Adresse
--     e-mail ou Numéro de téléphone. Aucune contribution anonyme ou sans
--     traçabilité ne doit être tolérée. »
--   « chaque contribution validée est verrouillée et tracée »
-- L'inscrit voyage dans la proposition : contenu -> 'inscrit' { nom, prenom }
-- et la colonne contact (e-mail OU téléphone). La règle est tenue ICI, dans
-- la base : l'écran peut être contourné, la base non.

-- Nature d'un contact : 'email', 'telephone', ou null (ni l'un ni l'autre).
-- Mêmes règles, lettre pour lettre, que src/inscription/contact.ts (essai de
-- parité tests/sql/inscription.test.ts) : classes ASCII seulement, lues
-- pareil par PostgreSQL et par le navigateur.
--   e-mail    : nom@domaine.extension (extension de 2 lettres au moins) ;
--   téléphone : 8 à 15 chiffres (norme E.164 : 15 au plus), « + » en tête
--               permis, espaces, points, tirets et parenthèses permis.
create or replace function public.genre_contact(p text)
returns text
language sql immutable set search_path = ''
as $$
    select case
        when p is null or char_length(p) > 200 then null
        when btrim(p, ' ') ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$' then 'email'
        when btrim(p, ' ') ~ '^\+?[0-9(][0-9 .()-]*$'
             and char_length(regexp_replace(p, '[^0-9]', '', 'g')) between 8 and 15 then 'telephone'
        else null
    end;
$$;

-- Ce qui manque à l'inscription ; null = elle est complète.
create or replace function public.defaut_inscription(p_contenu jsonb, p_contact text)
returns text
language sql immutable set search_path = ''
as $$
    select case
        when p_contenu is null or jsonb_typeof(p_contenu -> 'inscrit') is distinct from 'object' then 'inscription_requise'
        when jsonb_typeof(p_contenu -> 'inscrit' -> 'nom') is distinct from 'string'
             or char_length(btrim(p_contenu -> 'inscrit' ->> 'nom', ' ')) not between 1 and 80 then 'inscription_requise'
        when jsonb_typeof(p_contenu -> 'inscrit' -> 'prenom') is distinct from 'string'
             or char_length(btrim(p_contenu -> 'inscrit' ->> 'prenom', ' ')) not between 1 and 80 then 'inscription_requise'
        when public.genre_contact(p_contact) is null then 'inscription_requise'
        else null
    end;
$$;

-- Filet sur la table elle-même : quel que soit le chemin d'écriture,
--   · aucune proposition n'entre sans inscription complète ;
--   · ce qui a été envoyé ne se modifie plus (contenu, contact, origine,
--     date, identifiant d'envoi) : seule la décision de l'administrateur
--     s'écrit, une seule fois.
-- (invitation_id peut passer à null : c'est la suppression du partage.)
create or replace function public.controler_contribution()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if public.defaut_inscription(new.contenu, new.contact) is not null then
            raise exception 'Contribution refusée : l''inscription est obligatoire (nom, prénom, et e-mail ou téléphone).'
                using errcode = '23514', hint = 'INSCRIPTION_REQUISE';
        end if;
        return new;
    end if;
    if new.contenu is distinct from old.contenu
       or new.contact is distinct from old.contact
       or new.arbre_id is distinct from old.arbre_id
       or new.origine is distinct from old.origine
       or new.uid is distinct from old.uid
       or new.cree_le is distinct from old.cree_le
       or (new.invitation_id is distinct from old.invitation_id and new.invitation_id is not null) then
        raise exception 'Une contribution envoyée est verrouillée : elle ne se modifie plus.'
            using errcode = '23514', hint = 'CONTRIBUTION_VERROUILLEE';
    end if;
    if old.statut <> 'en_attente' and new.statut is distinct from old.statut then
        raise exception 'Cette proposition a déjà été traitée.' using errcode = '23514';
    end if;
    return new;
end;
$$;

drop trigger if exists controler_contribution on public.contributions;
create trigger controler_contribution before insert or update on public.contributions
    for each row execute function public.controler_contribution();

-- Dépôt d'une proposition par le public. Contrôle tout : lien, PIN,
-- débit (30 par heure et par adresse — une réunion de famille partage
-- souvent le même wifi —, 200 par heure et par partage), forme du
-- contenu, individu visé décédé et de CET arbre. p_uid : identifiant de
-- l'envoi donné par le téléphone ; un renvoi du même envoi (réponse perdue
-- en route) est reconnu et n'entre pas deux fois.
drop function if exists public.soumettre_contribution(text, text, jsonb, text);
create or replace function public.soumettre_contribution(p_jeton text, p_pin text, p_contenu jsonb, p_contact text default null, p_uid text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_ouverture   jsonb := public.ouvrir_invitation(p_jeton, p_pin);
    v_origine     text := public.origine_appel();
    v_arbre       uuid;
    v_invitation  uuid;
    v_lien        jsonb;
    v_cible       uuid;
    v_relation    text;
    v_proche      jsonb;
    v_id          uuid;
begin
    if not (v_ouverture ->> 'ok')::boolean then
        return v_ouverture;
    end if;
    v_arbre := (v_ouverture ->> 'arbre_id')::uuid;
    v_invitation := (v_ouverture ->> 'invitation_id')::uuid;

    if p_uid is not null then
        if p_uid !~ '^[0-9a-f-]{8,64}$' then
            return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
        end if;
        select id into v_id from public.contributions where uid = p_uid and invitation_id = v_invitation;
        if found then
            return jsonb_build_object('ok', true, 'id', v_id, 'deja_recue', true);
        end if;
    end if;

    if (select count(*) from public.contributions where origine = v_origine and cree_le > now() - interval '1 hour') >= 30
       or (select count(*) from public.contributions where invitation_id = v_invitation and cree_le > now() - interval '1 hour') >= 200 then
        return jsonb_build_object('ok', false, 'raison', 'trop_d_envois');
    end if;

    if p_contenu is null or jsonb_typeof(p_contenu) <> 'object' or octet_length(p_contenu::text) > 20000 then
        return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
    end if;
    if jsonb_typeof(p_contenu -> 'contributeur') is distinct from 'object'
       or char_length(btrim(coalesce(p_contenu -> 'contributeur' ->> 'prenom', ''))) not between 1 and 80
       or char_length(coalesce(p_contenu -> 'contributeur' ->> 'nom', '')) > 80 then
        return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
    end if;
    v_lien := p_contenu -> 'lien';
    if jsonb_typeof(v_lien) is distinct from 'object' then
        return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
    end if;
    v_relation := v_lien ->> 'relation';
    if v_relation is null or v_relation not in ('enfant', 'petit_enfant', 'parent', 'conjoint', 'frere_soeur', 'inconnu') then
        return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
    end if;
    if v_relation <> 'inconnu' then
        if coalesce(v_lien ->> 'individu_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
            return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
        end if;
        v_cible := (v_lien ->> 'individu_id')::uuid;
        if not exists (select 1 from public.individus where id = v_cible and arbre_id = v_arbre and not vivant) then
            return jsonb_build_object('ok', false, 'raison', 'individu_inconnu');
        end if;
    end if;
    if p_contenu ? 'proches' then
        if jsonb_typeof(p_contenu -> 'proches') <> 'array' or jsonb_array_length(p_contenu -> 'proches') > 20 then
            return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
        end if;
        for v_proche in select * from jsonb_array_elements(p_contenu -> 'proches') loop
            if jsonb_typeof(v_proche) <> 'object'
               or char_length(btrim(coalesce(v_proche ->> 'prenom', ''))) not between 1 and 80
               or coalesce(v_proche ->> 'relation', '') not in ('parent', 'enfant', 'conjoint') then
                return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
            end if;
        end loop;
    end if;
    if char_length(coalesce(p_contact, '')) > 200 then
        return jsonb_build_object('ok', false, 'raison', 'contenu_invalide');
    end if;
    -- 7 bis : aucune contribution anonyme (nom, prénom, e-mail ou téléphone)
    if public.defaut_inscription(p_contenu, p_contact) is not null then
        return jsonb_build_object('ok', false, 'raison', 'inscription_requise');
    end if;

    insert into public.contributions (arbre_id, invitation_id, contenu, contact, origine, uid)
    values (v_arbre, v_invitation, p_contenu, nullif(btrim(coalesce(p_contact, '')), ''), v_origine, p_uid)
    on conflict (uid) do nothing
    returning id into v_id;
    if v_id is null then
        -- même identifiant déjà reçu à l'instant (deux envois simultanés) : c'est le même envoi
        select id into v_id from public.contributions where uid = p_uid;
        return jsonb_build_object('ok', true, 'id', v_id, 'deja_recue', true);
    end if;
    return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Fabrique un individu depuis un objet JSON de proposition (champs
-- bornés ; année seule = précision « annee »).
create or replace function public.individu_depuis_json(p_arbre uuid, p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
    v_id     uuid;
    v_annee  integer;
    v_genre  text := coalesce(p ->> 'genre', 'inconnu');
    v_vivant boolean := case when p ->> 'vivant' in ('true', 'false') then (p ->> 'vivant')::boolean else true end;
begin
    if v_genre not in ('femme', 'homme', 'non_binaire', 'inconnu') then
        v_genre := 'inconnu';
    end if;
    if coalesce(p ->> 'naissance_annee', '') ~ '^[0-9]{4}$' then
        v_annee := (p ->> 'naissance_annee')::integer;
        if v_annee < 1000 or v_annee > extract(year from current_date) then
            v_annee := null;
        end if;
    end if;
    insert into public.individus (arbre_id, prenom, nom, genre, naissance, naissance_precision, vivant)
    values (p_arbre, left(btrim(p ->> 'prenom'), 80), left(btrim(coalesce(p ->> 'nom', '')), 80), v_genre,
            case when v_annee is null then null else make_date(v_annee, 1, 1) end,
            case when v_annee is null then 'jour' else 'annee' end,
            v_vivant)
    returning id into v_id;
    return v_id;
end;
$$;

-- Accepter une proposition : l'éditeur la verse dans l'arbre en une
-- seule transaction (tout ou rien), avec SES droits : sécurité par
-- ligne, boucles, dates et limites s'appliquent.
create or replace function public.accepter_contribution(p_contribution uuid)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
    v_c          public.contributions;
    v_contenu    jsonb;
    v_moi        uuid;
    v_cible      uuid;
    v_relation   text;
    v_inter      uuid;
    v_proche     jsonb;
    v_proche_id  uuid;
    v_parent     record;
    v_crees      integer := 0;
begin
    select * into v_c from public.contributions where id = p_contribution for update;
    if not found then
        raise exception 'Proposition introuvable.' using errcode = 'P0002';
    end if;
    if not public.peut_ecrire(v_c.arbre_id) then
        raise exception 'Seuls le propriétaire et les éditeurs acceptent une proposition.' using errcode = '42501';
    end if;
    if v_c.statut <> 'en_attente' then
        raise exception 'Cette proposition a déjà été traitée.' using errcode = '23514';
    end if;
    v_contenu := v_c.contenu;

    v_moi := public.individu_depuis_json(v_c.arbre_id, v_contenu -> 'contributeur');
    v_crees := v_crees + 1;
    v_relation := v_contenu -> 'lien' ->> 'relation';
    v_cible := nullif(v_contenu -> 'lien' ->> 'individu_id', '')::uuid;

    if v_relation = 'enfant' then
        insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_cible, v_moi);
    elsif v_relation = 'parent' then
        insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_moi, v_cible);
    elsif v_relation = 'conjoint' then
        insert into public.unions (arbre_id, partenaire_a, partenaire_b) values (v_c.arbre_id, v_cible, v_moi);
    elsif v_relation = 'petit_enfant' then
        insert into public.individus (arbre_id, prenom, nom, vivant, notes)
        values (v_c.arbre_id, 'Parent à trouver', '', false, 'Fiche créée depuis une proposition : à compléter.')
        returning id into v_inter;
        v_crees := v_crees + 1;
        insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_cible, v_inter);
        insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_inter, v_moi);
    elsif v_relation = 'frere_soeur' then
        if not exists (select 1 from public.filiations where arbre_id = v_c.arbre_id and enfant_id = v_cible) then
            insert into public.individus (arbre_id, prenom, nom, vivant, notes)
            values (v_c.arbre_id, 'Parent à trouver', '', false, 'Parent commun créé depuis une proposition (frère / sœur) : à compléter.')
            returning id into v_inter;
            v_crees := v_crees + 1;
            insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_inter, v_cible);
            insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_inter, v_moi);
        else
            for v_parent in select parent_id, nature, foyer_id from public.filiations where arbre_id = v_c.arbre_id and enfant_id = v_cible loop
                insert into public.filiations (arbre_id, parent_id, enfant_id, nature, foyer_id)
                values (v_c.arbre_id, v_parent.parent_id, v_moi, v_parent.nature, v_parent.foyer_id);
            end loop;
        end if;
    end if;

    if jsonb_typeof(v_contenu -> 'proches') = 'array' then
        for v_proche in select * from jsonb_array_elements(v_contenu -> 'proches') loop
            v_proche_id := public.individu_depuis_json(v_c.arbre_id, v_proche);
            v_crees := v_crees + 1;
            if v_proche ->> 'relation' = 'parent' then
                insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_proche_id, v_moi);
            elsif v_proche ->> 'relation' = 'enfant' then
                insert into public.filiations (arbre_id, parent_id, enfant_id) values (v_c.arbre_id, v_moi, v_proche_id);
            else
                insert into public.unions (arbre_id, partenaire_a, partenaire_b) values (v_c.arbre_id, v_moi, v_proche_id);
            end if;
        end loop;
    end if;

    update public.contributions set statut = 'acceptee', traitee_par = auth.uid(), traitee_le = now() where id = v_c.id;
    return jsonb_build_object('ok', true, 'individu_id', v_moi, 'individus_crees', v_crees);
end;
$$;

create or replace function public.refuser_contribution(p_contribution uuid, p_motif text default null)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
    v_c public.contributions;
begin
    select * into v_c from public.contributions where id = p_contribution for update;
    if not found then
        raise exception 'Proposition introuvable.' using errcode = 'P0002';
    end if;
    if not public.peut_ecrire(v_c.arbre_id) then
        raise exception 'Seuls le propriétaire et les éditeurs refusent une proposition.' using errcode = '42501';
    end if;
    if v_c.statut <> 'en_attente' then
        raise exception 'Cette proposition a déjà été traitée.' using errcode = '23514';
    end if;
    update public.contributions
    set statut = 'refusee', motif = left(nullif(btrim(coalesce(p_motif, '')), ''), 500), traitee_par = auth.uid(), traitee_le = now()
    where id = v_c.id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. ESPACE PATRIMONIAL PUBLIC (licence collectivité)
--    Lecture seule, individus DÉCÉDÉS seulement, documents marqués publics.
--    Si la licence s'arrête, la publication s'arrête d'elle-même.
-- ---------------------------------------------------------------------

create or replace function public.arbre_patrimoine(p_slug text)
returns uuid
language sql stable security definer set search_path = ''
as $$
    select a.id from public.arbres a
    join public.limites_offres l on l.offre = public.offre_de(a.proprietaire)
    where a.slug = p_slug and a.public_patrimoine and l.patrimoine_public;
$$;

create or replace function public.patrimoine_public(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_arbre uuid := public.arbre_patrimoine(p_slug);
begin
    if v_arbre is null then
        return jsonb_build_object('ok', false, 'raison', 'introuvable');
    end if;
    return (
        select jsonb_build_object(
            'ok', true,
            'nom', a.nom, 'territoire', a.territoire, 'description', a.description,
            'centre', case when a.centre_lat is null then null else jsonb_build_array(a.centre_lat, a.centre_lng) end,
            'individus', (select count(*) from public.individus i where i.arbre_id = a.id and not i.vivant),
            'illustres', (select count(*) from public.individus i where i.arbre_id = a.id and not i.vivant and i.illustre),
            'documents', (select count(*) from public.documents d where d.arbre_id = a.id and d.public),
            'thematiques', coalesce((select jsonb_agg(t order by t) from (
                select distinct unnest(i.thematiques) t from public.individus i where i.arbre_id = a.id and not i.vivant) x), '[]'::jsonb),
            'familles', coalesce((select jsonb_agg(jsonb_build_object('nom', f.nom, 'resume', f.resume, 'origine', f.origine, 'periode', f.periode) order by f.nom)
                                  from public.familles_historiques f where f.arbre_id = a.id), '[]'::jsonb))
        from public.arbres a where a.id = v_arbre
    );
end;
$$;

-- Recherche « Tourisme de racines » : par nom (sans accents), thématique,
-- illustres seulement, famille historique.
create or replace function public.patrimoine_recherche(
    p_slug text, p_texte text default null, p_thematique text default null,
    p_illustres boolean default false, p_famille text default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_arbre uuid := public.arbre_patrimoine(p_slug);
    v_texte text := public.plat(btrim(coalesce(p_texte, '')));
begin
    if v_arbre is null then
        return jsonb_build_object('ok', false, 'raison', 'introuvable');
    end if;
    if char_length(v_texte) > 80 then
        v_texte := left(v_texte, 80);
    end if;
    -- les jokers de LIKE (% et _) tapés par le visiteur sont des lettres, pas
    -- des motifs : on les échappe avec « ! » (déclaré par « escape '!' »)
    v_texte := replace(replace(replace(v_texte, '!', '!!'), '%', '!%'), '_', '!_');
    return jsonb_build_object('ok', true, 'resultats', coalesce((
        select jsonb_agg(r order by r ->> 'nom', r ->> 'prenom') from (
            select jsonb_build_object(
                'id', i.id, 'prenom', i.prenom, 'nom', i.nom, 'genre', i.genre,
                'naissance_annee', extract(year from i.naissance)::integer,
                'deces_annee', extract(year from i.deces)::integer,
                'lieu_naissance', i.lieu_naissance, 'profession', i.profession,
                'illustre', i.illustre, 'thematiques', to_jsonb(i.thematiques),
                'position', case when i.naissance_lat is null then null else jsonb_build_array(i.naissance_lat, i.naissance_lng) end) r
            from public.individus i
            where i.arbre_id = v_arbre and not i.vivant and i.prenom <> 'Parent à trouver'
              and (v_texte = '' or public.plat(i.nom || ' ' || i.prenom) like '%' || v_texte || '%' escape '!'
                                or public.plat(i.prenom || ' ' || i.nom) like '%' || v_texte || '%' escape '!')
              and (p_thematique is null or lower(p_thematique) = any (i.thematiques))
              and (not coalesce(p_illustres, false) or i.illustre)
              and (p_famille is null or public.plat(i.nom) = public.plat(p_famille))
            order by i.nom, i.prenom
            limit 300
        ) x), '[]'::jsonb));
end;
$$;

-- Notice mémorielle d'un individu décédé : récit, documents publics,
-- parents et enfants décédés.
create or replace function public.patrimoine_individu(p_slug text, p_individu uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_arbre uuid := public.arbre_patrimoine(p_slug);
    v_i     public.individus;
begin
    if v_arbre is null then
        return jsonb_build_object('ok', false, 'raison', 'introuvable');
    end if;
    select * into v_i from public.individus where id = p_individu and arbre_id = v_arbre and not vivant;
    if not found then
        return jsonb_build_object('ok', false, 'raison', 'introuvable');
    end if;
    return jsonb_build_object(
        'ok', true,
        'individu', jsonb_build_object(
            'id', v_i.id, 'prenom', v_i.prenom, 'nom', v_i.nom, 'genre', v_i.genre, 'se_nomme', v_i.se_nomme,
            'naissance', v_i.naissance, 'naissance_precision', v_i.naissance_precision, 'lieu_naissance', v_i.lieu_naissance,
            'deces', v_i.deces, 'deces_precision', v_i.deces_precision, 'lieu_deces', v_i.lieu_deces,
            'profession', v_i.profession, 'biographie', v_i.biographie, 'illustre', v_i.illustre, 'photo_url', v_i.photo_url,
            'thematiques', to_jsonb(v_i.thematiques),
            'position', case when v_i.naissance_lat is null then null else jsonb_build_array(v_i.naissance_lat, v_i.naissance_lng) end),
        'parents', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'prenom', p.prenom, 'nom', p.nom, 'nature', f.nature) order by p.nom)
                             from public.filiations f join public.individus p on p.id = f.parent_id
                             where f.enfant_id = v_i.id and not p.vivant), '[]'::jsonb),
        'enfants', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'prenom', e.prenom, 'nom', e.nom, 'nature', f.nature) order by e.naissance nulls last, e.prenom)
                             from public.filiations f join public.individus e on e.id = f.enfant_id
                             where f.parent_id = v_i.id and not e.vivant), '[]'::jsonb),
        'documents', coalesce((select jsonb_agg(jsonb_build_object(
                                    'id', d.id, 'titre', d.titre, 'type', d.type, 'date_document', d.date_document, 'periode', d.periode,
                                    'lieu', d.lieu, 'position', case when d.lat is null then null else jsonb_build_array(d.lat, d.lng) end,
                                    'url', d.url, 'cote', d.cote, 'source', d.source, 'droits', d.droits, 'description', d.description)
                                  order by d.date_document nulls last, d.titre)
                               from public.document_individus di join public.documents d on d.id = di.document_id
                               where di.individu_id = v_i.id and d.public), '[]'::jsonb));
end;
$$;

-- Points de la carte : documents publics géolocalisés et lieux de
-- naissance des individus décédés.
create or replace function public.patrimoine_carte(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_arbre uuid := public.arbre_patrimoine(p_slug);
begin
    if v_arbre is null then
        return jsonb_build_object('ok', false, 'raison', 'introuvable');
    end if;
    return jsonb_build_object(
        'ok', true,
        'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'titre', d.titre, 'type', d.type, 'lieu', d.lieu,
                                                                    'periode', d.periode, 'position', jsonb_build_array(d.lat, d.lng)))
                               from (select * from public.documents where arbre_id = v_arbre and public and lat is not null limit 2000) d), '[]'::jsonb),
        'naissances', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'prenom', i.prenom, 'nom', i.nom, 'lieu', i.lieu_naissance,
                                                                     'annee', extract(year from i.naissance)::integer, 'illustre', i.illustre,
                                                                     'position', jsonb_build_array(i.naissance_lat, i.naissance_lng)))
                                from (select * from public.individus where arbre_id = v_arbre and not vivant and naissance_lat is not null limit 3000) i), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------
-- 9. EXPORT PATRIMONIAL CERTIFIÉ (licence collectivité)
--    Le texte exporté est figé ; son empreinte SHA-256 est enregistrée.
--    N'importe qui peut ensuite vérifier qu'un fichier n'a pas été
--    modifié (verifier_export). Vivants exclus.
-- ---------------------------------------------------------------------

create table if not exists public.exports_certifies (
    id            uuid primary key default gen_random_uuid(),
    arbre_id      uuid not null references public.arbres (id) on delete cascade,
    empreinte     text not null unique check (empreinte ~ '^[0-9a-f]{64}$'),
    nb_individus  integer not null,
    nb_documents  integer not null,
    cree_par      uuid references auth.users (id) on delete set null,
    cree_le       timestamptz not null default now()
);

create or replace function public.exporter_patrimoine(p_arbre uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_contenu  jsonb;
    v_texte    text;
    v_empreinte text;
    v_nb_i     integer;
    v_nb_d     integer;
    v_quand    timestamptz := now();
begin
    if not public.peut_ecrire(p_arbre) then
        raise exception 'Seuls le propriétaire et les éditeurs exportent.' using errcode = '42501';
    end if;
    if not (public.limites_arbre(p_arbre)).export_certifie then
        raise exception 'L''export certifié est réservé à la licence collectivité.' using errcode = '23514', hint = 'LICENCE_EXPORT';
    end if;
    select count(*) into v_nb_i from public.individus where arbre_id = p_arbre and not vivant;
    select count(*) into v_nb_d from public.documents where arbre_id = p_arbre;
    select jsonb_build_object(
        'format', 'ancestria-patrimoine-1',
        'genere_le', v_quand,
        'arbre', jsonb_build_object('nom', a.nom, 'territoire', a.territoire, 'description', a.description),
        'individus', coalesce((select jsonb_agg(to_jsonb(i) - 'arbre_id' - 'notes' - 'vivant' order by i.nom, i.prenom, i.id)
                               from public.individus i where i.arbre_id = p_arbre and not i.vivant), '[]'::jsonb),
        'filiations', coalesce((select jsonb_agg(jsonb_build_object('parent', f.parent_id, 'enfant', f.enfant_id, 'nature', f.nature) order by f.parent_id, f.enfant_id)
                                from public.filiations f
                                join public.individus p on p.id = f.parent_id and not p.vivant
                                join public.individus e on e.id = f.enfant_id and not e.vivant
                                where f.arbre_id = p_arbre), '[]'::jsonb),
        'unions', coalesce((select jsonb_agg(jsonb_build_object('a', u.partenaire_a, 'b', u.partenaire_b, 'nature', u.nature, 'statut', u.statut, 'debut', u.debut, 'fin', u.fin) order by u.id)
                            from public.unions u
                            join public.individus x on x.id = u.partenaire_a and not x.vivant
                            join public.individus y on y.id = u.partenaire_b and not y.vivant
                            where u.arbre_id = p_arbre), '[]'::jsonb),
        'documents', coalesce((select jsonb_agg(to_jsonb(d) - 'arbre_id' || jsonb_build_object('individus',
                                   coalesce((select jsonb_agg(di.individu_id order by di.individu_id) from public.document_individus di
                                             join public.individus z on z.id = di.individu_id and not z.vivant
                                             where di.document_id = d.id), '[]'::jsonb)) order by d.titre, d.id)
                               from public.documents d where d.arbre_id = p_arbre), '[]'::jsonb))
    into v_contenu
    from public.arbres a where a.id = p_arbre;

    v_texte := v_contenu::text;
    v_empreinte := encode(extensions.digest(convert_to(v_texte, 'UTF8'), 'sha256'), 'hex');
    insert into public.exports_certifies (arbre_id, empreinte, nb_individus, nb_documents, cree_par, cree_le)
    values (p_arbre, v_empreinte, v_nb_i, v_nb_d, auth.uid(), v_quand)
    on conflict (empreinte) do nothing;
    return jsonb_build_object('empreinte', v_empreinte, 'texte', v_texte, 'cree_le', v_quand,
                              'nb_individus', v_nb_i, 'nb_documents', v_nb_d);
end;
$$;

create or replace function public.verifier_export(p_empreinte text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
    select coalesce((
        select jsonb_build_object('valide', true, 'arbre', a.nom, 'territoire', a.territoire, 'cree_le', e.cree_le,
                                  'nb_individus', e.nb_individus, 'nb_documents', e.nb_documents)
        from public.exports_certifies e join public.arbres a on a.id = e.arbre_id
        where e.empreinte = lower(btrim(p_empreinte))
    ), jsonb_build_object('valide', false));
$$;

-- ---------------------------------------------------------------------
-- 10. TABLEAU DE BORD DE L'OFFRE (plus de gestion de membres par e-mail : 30/09)
-- ---------------------------------------------------------------------

-- 30/09/2026, sa demande : « Supprime immédiatement et définitivement la page Membres (avec les
-- invitations par e-mail et les rôles d'éditeur) ». Les fonctions d'invitation par e-mail sont
-- retirées (rejouer ce script les supprime d'une base existante). Le propriétaire de l'arbre reste
-- le seul à écrire ; les visiteurs passent par le lien partagé et les propositions.
drop function if exists public.ajouter_membre(uuid, text, text);
drop function if exists public.membres_de(uuid);
drop function if exists public.retirer_membre(uuid, uuid);

-- Tableau « mes arbres » (gestion multi-arbres, mode Pro / collectivités) :
-- chaque arbre dont on est membre, avec ses chiffres. Les propositions en
-- attente ne sont comptées que pour les éditeurs (le lecteur ne les voit pas).
create or replace function public.mes_arbres()
returns table (id uuid, nom text, role text, territoire text, public_patrimoine boolean, slug text, cree_le timestamptz,
               individus bigint, propositions_en_attente bigint, partages_ouverts bigint, documents bigint)
language sql stable security definer set search_path = ''
as $$
    select a.id, a.nom, m.role, a.territoire, a.public_patrimoine, a.slug, a.cree_le,
           (select count(*) from public.individus i where i.arbre_id = a.id),
           case when m.role in ('proprietaire', 'editeur')
                then (select count(*) from public.contributions c where c.arbre_id = a.id and c.statut = 'en_attente') end,
           case when m.role in ('proprietaire', 'editeur')
                then (select count(*) from public.invitations v where v.arbre_id = a.id and not v.ferme and v.expire_le > now()) end,
           (select count(*) from public.documents d where d.arbre_id = a.id)
    from public.membres m join public.arbres a on a.id = m.arbre_id
    where m.utilisateur = auth.uid()
    order by a.nom;
$$;

create or replace function public.etat_offre(p_arbre uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
    select case when public.peut_lire(p_arbre) then jsonb_build_object(
        'offre', l.offre, 'libelle', l.libelle,
        'individus', (select count(*) from public.individus i where i.arbre_id = p_arbre),
        'max_individus', l.max_individus,
        'documents', (select count(*) from public.documents d where d.arbre_id = p_arbre),
        'max_documents', l.max_documents,
        'invitations_ouvertes', (select count(*) from public.invitations i where i.arbre_id = p_arbre and not i.ferme and i.expire_le > now()),
        'max_invitations_ouvertes', l.max_invitations_ouvertes,
        'patrimoine_public', l.patrimoine_public,
        'export_certifie', l.export_certifie)
    end
    from public.limites_arbre(p_arbre) l;
$$;

-- ---------------------------------------------------------------------
-- 11. SÉCURITÉ PAR LIGNE (RLS) ET DROITS
-- ---------------------------------------------------------------------

do $$
declare
    v_table text;
begin
    foreach v_table in array array['limites_offres', 'abonnements', 'arbres', 'membres', 'individus', 'unions', 'foyers',
                                   'foyer_parents', 'filiations', 'documents', 'document_individus', 'familles_historiques',
                                   'invitations', 'contributions', 'essais_pin', 'exports_certifies'] loop
        execute format('alter table public.%I enable row level security', v_table);
    end loop;
end;
$$;

-- On repart de zéro sur les droits, puis on ouvre au plus juste.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- ---- PORTE PUBLIQUE DU SITE (01/10/2026) ----
-- Sa demande : « pour qu'une personne puisse y accéder il faut un bloc de formule pour
-- l'inscription selon les restrictions formulées dans le journal ». L'adresse du site
-- s'ouvre sur l'inscription (nom, prénom, e-mail ou téléphone, Charte) ; une fois
-- inscrit, le visiteur lit l'arbre public par le chemin des liens partagés
-- (arbre_public : décédés seulement, sans notes ni lieux), et sa demande d'accès
-- arrive dans les propositions (soumettre_contribution : inscription obligatoire).
-- Ce lien est l'invitation « Porte du site » de l'arbre qui a le plus de fiches
-- (le sien), créée une fois pour 365 jours (la règle des partages) ; expirée ou
-- fermée par lui comme n'importe quel lien partagé, la porte en ouvre une neuve.
-- Bloc refait le 01/10 (audit de l'écosystème, point 2, son « CORRIGE ») : le lien ne
-- sort QUE d'une inscription valide. Un anonyme ne peut plus le demander seul (l'ancienne
-- jeton_porte_publique, ouverte au public, est retirée) ; porte_du_site est interne,
-- appelée par inscrire_visiteur APRÈS le contrôle de l'inscription et du débit : un
-- appel incomplet ne crée aucune invitation.
drop function if exists public.jeton_porte_publique();

create or replace function public.porte_du_site()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
    v_arbre public.arbres;
    v_jeton text;
begin
    select a.* into v_arbre from public.arbres a
        left join public.individus i on i.arbre_id = a.id
        group by a.id order by count(i.id) desc, a.cree_le limit 1;
    if not found then
        return null;
    end if;
    select jeton into v_jeton from public.invitations
        where arbre_id = v_arbre.id and libelle = 'Porte du site' and not ferme and expire_le > now()
        order by cree_le limit 1;
    if v_jeton is null then
        insert into public.invitations (arbre_id, libelle, expire_le, cree_par)
            values (v_arbre.id, 'Porte du site', now() + interval '365 days', v_arbre.proprietaire)
            returning jeton into v_jeton;
    end if;
    return v_jeton;
end;
$$;
revoke execute on function public.porte_du_site() from public, anon, authenticated;

-- Les inscrits de la porte (loi 2 : zéro anonymat). Même règle que les propositions
-- (defaut_inscription : nom, prénom, e-mail ou téléphone valides) ; la version de la
-- Charte acceptée est gardée. Lui seul (propriétaire / éditeurs de l'arbre) les lit ;
-- personne ne les écrit autrement que par inscrire_visiteur.
create table if not exists public.inscriptions_acces (
    id        uuid primary key default gen_random_uuid(),
    arbre_id  uuid not null references public.arbres (id) on delete cascade,
    nom       text not null check (char_length(btrim(nom)) between 1 and 80),
    prenom    text not null check (char_length(btrim(prenom)) between 1 and 80),
    contact   text not null check (char_length(contact) between 3 and 200),
    charte    text not null check (char_length(btrim(charte)) between 1 and 40),
    origine   text,
    cree_le   timestamptz not null default now()
);
create index if not exists inscriptions_acces_arbre on public.inscriptions_acces (arbre_id, cree_le desc);
alter table public.inscriptions_acces enable row level security;
drop policy if exists "lecture par lui" on public.inscriptions_acces;
create policy "lecture par lui" on public.inscriptions_acces for select to authenticated using (public.peut_ecrire(arbre_id));
revoke all on public.inscriptions_acces from anon, public;
grant select on public.inscriptions_acces to authenticated;

-- p_jeton : le lien partagé reçu, ou null (adresse du site : le lien de la porte).
-- Rend { ok, id, jeton } : le site entre avec ce jeton, et seulement après ce « ok ».
create or replace function public.inscrire_visiteur(p_jeton text, p_nom text, p_prenom text, p_contact text, p_charte text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_origine   text := public.origine_appel();
    v_jeton     text := p_jeton;
    v_ouverture jsonb;
    v_id        uuid;
begin
    if public.defaut_inscription(jsonb_build_object('inscrit', jsonb_build_object('nom', p_nom, 'prenom', p_prenom)), p_contact) is not null
       or p_charte is null or char_length(btrim(p_charte)) not between 1 and 40 then
        return jsonb_build_object('ok', false, 'raison', 'inscription_requise');
    end if;
    if (select count(*) from public.inscriptions_acces where origine = v_origine and cree_le > now() - interval '1 hour') >= 10 then
        return jsonb_build_object('ok', false, 'raison', 'trop_d_envois');
    end if;
    if v_jeton is null then
        v_jeton := public.porte_du_site();
        if v_jeton is null then
            return jsonb_build_object('ok', false, 'raison', 'aucun_arbre');
        end if;
    end if;
    v_ouverture := public.ouvrir_invitation(v_jeton, null);
    if not (v_ouverture ->> 'ok')::boolean then
        return v_ouverture;
    end if;
    insert into public.inscriptions_acces (arbre_id, nom, prenom, contact, charte, origine)
        values ((v_ouverture ->> 'arbre_id')::uuid, btrim(p_nom), btrim(p_prenom), btrim(p_contact), btrim(p_charte), v_origine)
        returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'jeton', v_jeton);
end;
$$;
-- ---- FIN PORTE PUBLIQUE DU SITE ----

grant select on public.limites_offres to anon, authenticated;
grant select on public.abonnements to authenticated;
grant select, insert, update, delete on public.arbres to authenticated;
grant select on public.membres to authenticated;
grant select, insert, update, delete on public.individus, public.unions, public.foyers, public.foyer_parents,
    public.filiations, public.documents, public.document_individus, public.familles_historiques to authenticated;
grant select (id, arbre_id, jeton, libelle, avec_pin, expire_le, ferme, cree_par, cree_le) on public.invitations to authenticated;
grant update (libelle, ferme, expire_le) on public.invitations to authenticated;
grant delete on public.invitations to authenticated;
grant select, delete on public.contributions to authenticated;
grant update (statut, motif, traitee_par, traitee_le) on public.contributions to authenticated;
grant select on public.exports_certifies to authenticated;
-- essais_pin : aucun accès direct.

grant execute on function
    public.plat(text), public.date_max(date, text), public.thematiques_valides(text[]),
    public.role_dans(uuid), public.peut_lire(uuid), public.peut_ecrire(uuid), public.limites_arbre(uuid),
    public.descendants_de(uuid, uuid, uuid), public.ascendants_de(uuid, uuid, uuid), public.incoherence_dates(uuid, uuid, text),
    public.rattacher_au_foyer(uuid, uuid, text),
    public.ajouter_individu_lie(uuid, jsonb, text, uuid, text, jsonb), public.creer_foyer(uuid, text, text, uuid[], text[]),
    public.ajouter_frere_soeur(uuid, uuid, jsonb, uuid, text, uuid), public.remplacer_parent_a_trouver(uuid, uuid),
    public.creer_invitation(uuid, text, text, integer), public.individu_depuis_json(uuid, jsonb),
    public.accepter_contribution(uuid), public.refuser_contribution(uuid, text),
    public.exporter_patrimoine(uuid),
    public.etat_offre(uuid),
    public.mes_arbres()
    to authenticated;
grant execute on function
    public.plat(text), public.date_max(date, text), public.thematiques_valides(text[]),
    public.invitation_publique(text, text), public.arbre_public(text), public.soumettre_contribution(text, text, jsonb, text, text),
    public.patrimoine_public(text), public.patrimoine_recherche(text, text, text, boolean, text),
    public.patrimoine_individu(text, uuid), public.patrimoine_carte(text), public.verifier_export(text),
    public.inscrire_visiteur(text, text, text, text, text) -- porte publique du site (01/10 ; le lien ne sort que de l'inscription)
    to anon, authenticated;

-- Politiques : lecture pour les membres, écriture pour propriétaire et éditeurs.
do $$
declare
    v_table text;
begin
    foreach v_table in array array['individus', 'unions', 'foyers', 'foyer_parents', 'filiations', 'documents',
                                   'document_individus', 'familles_historiques'] loop
        execute format('drop policy if exists "lecture membres" on public.%I', v_table);
        execute format('create policy "lecture membres" on public.%I for select to authenticated using (public.peut_lire(arbre_id))', v_table);
        execute format('drop policy if exists "ajout editeurs" on public.%I', v_table);
        execute format('create policy "ajout editeurs" on public.%I for insert to authenticated with check (public.peut_ecrire(arbre_id))', v_table);
        execute format('drop policy if exists "modification editeurs" on public.%I', v_table);
        execute format('create policy "modification editeurs" on public.%I for update to authenticated using (public.peut_ecrire(arbre_id)) with check (public.peut_ecrire(arbre_id))', v_table);
        execute format('drop policy if exists "suppression editeurs" on public.%I', v_table);
        execute format('create policy "suppression editeurs" on public.%I for delete to authenticated using (public.peut_ecrire(arbre_id))', v_table);
    end loop;
end;
$$;

drop policy if exists "offres lisibles" on public.limites_offres;
create policy "offres lisibles" on public.limites_offres for select to anon, authenticated using (true);

drop policy if exists "mon abonnement" on public.abonnements;
create policy "mon abonnement" on public.abonnements for select to authenticated using (utilisateur = auth.uid());

-- « or proprietaire = auth.uid() » : insert … returning relit la ligne
-- AVANT que le déclencheur n'ait inscrit le propriétaire comme membre.
drop policy if exists "arbres lus" on public.arbres;
create policy "arbres lus" on public.arbres for select to authenticated using (public.peut_lire(id) or proprietaire = auth.uid());
drop policy if exists "arbres crees" on public.arbres;
create policy "arbres crees" on public.arbres for insert to authenticated with check (proprietaire = auth.uid());
drop policy if exists "arbres modifies" on public.arbres;
create policy "arbres modifies" on public.arbres for update to authenticated using (proprietaire = auth.uid()) with check (proprietaire = auth.uid());
drop policy if exists "arbres supprimes" on public.arbres;
create policy "arbres supprimes" on public.arbres for delete to authenticated using (proprietaire = auth.uid());

drop policy if exists "membres lus" on public.membres;
create policy "membres lus" on public.membres for select to authenticated using (public.peut_lire(arbre_id));

drop policy if exists "invitations lues" on public.invitations;
create policy "invitations lues" on public.invitations for select to authenticated using (public.peut_ecrire(arbre_id));
drop policy if exists "invitations modifiees" on public.invitations;
create policy "invitations modifiees" on public.invitations for update to authenticated using (public.peut_ecrire(arbre_id)) with check (public.peut_ecrire(arbre_id));
drop policy if exists "invitations supprimees" on public.invitations;
create policy "invitations supprimees" on public.invitations for delete to authenticated using (public.peut_ecrire(arbre_id));

drop policy if exists "contributions lues" on public.contributions;
create policy "contributions lues" on public.contributions for select to authenticated using (public.peut_ecrire(arbre_id));
drop policy if exists "contributions modifiees" on public.contributions;
create policy "contributions modifiees" on public.contributions for update to authenticated using (public.peut_ecrire(arbre_id)) with check (public.peut_ecrire(arbre_id));
drop policy if exists "contributions supprimees" on public.contributions;
-- 7 bis : une contribution VALIDÉE reste (elle est la trace de qui a apporté quoi) ; seule une refusée se retire.
create policy "contributions supprimees" on public.contributions for delete to authenticated using (public.peut_ecrire(arbre_id) and statut = 'refusee');

drop policy if exists "exports lus" on public.exports_certifies;
create policy "exports lus" on public.exports_certifies for select to authenticated using (public.peut_ecrire(arbre_id));

-- ---------------------------------------------------------------------
-- 12. TEMPS RÉEL (Supabase Realtime)
-- ---------------------------------------------------------------------

do $$
declare
    v_table text;
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        foreach v_table in array array['individus', 'unions', 'foyers', 'foyer_parents', 'filiations', 'documents',
                                       'document_individus', 'contributions'] loop
            if not exists (select 1 from pg_publication_tables
                           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table) then
                execute format('alter publication supabase_realtime add table public.%I', v_table);
            end if;
        end loop;
    end if;
end;
$$;

-- =====================================================================
-- FIN DU SCHÉMA
-- =====================================================================
