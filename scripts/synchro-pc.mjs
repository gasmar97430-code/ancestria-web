// ---- SYNCHRONISATION : L'ARBRE DU PC VERS LE SITE (01/10/2026) ----
//
// Ordre de mission du 01/10 (point 6 : « sa synchronisation avec Supabase ») et sa règle
// « le site au miroir de l'appli ». Le PC est le MAÎTRE : ce script lit une COPIE de sa base
// (SQLite d'Ancestria) et fabrique un script SQL que LUI colle dans Supabase (SQL Editor → Run).
// Aucune clé secrète, aucun envoi automatique : il valide à la main (ordre de mission, point 4).
//
// CE QUI PART EN LIGNE : les personnes DÉCÉDÉES seulement (données sensibles des vivants gardées
// sur le PC — ordre de mission point 0, loi 6) :
//   · « décédé » coché, OU une date de décès, OU statut non dit ET née il y a 100 ans ou plus
//     (convention des généalogistes) ; « vivant » coché ne part JAMAIS ;
//   · jamais les fiches « ? » (parent inconnu), jamais les notes du PC (seulement le repère « pc:<n°> ») ;
//   · les couples et les liens parent → enfant ENTRE ces personnes.
// En ligne, l'arbre visé est celui de la porte du site (invitation « Porte du site »). Chaque fiche
// venue du PC porte le repère « pc:<n°> » dans ses notes (jamais montrées au public) : rejouer le
// script met à jour, ajoute, et retire ce qui a quitté le PC — sans toucher à ce qui a été saisi
// en ligne. Une ligne refusée par les règles de la base (dates absurdes, 3e parent biologique…)
// est sautée et listée à la fin ; elle n'arrête pas le reste.
//
// Usage : node scripts/synchro-pc.mjs <copie de sa base .db> <fichier .sql à écrire>
// Le fichier .sql contient des noms : il reste sur le PC (jamais dans ce dépôt public).

import { createHash } from 'node:crypto';

const ESPACE = 'ancestria-pc:'; // espace des identifiants : le même n° du PC donne toujours le même identifiant en ligne

/** Identifiant stable (forme uuid) d'un objet du PC. */
export function uuidDe(genre, n) {
    const h = createHash('sha1').update(`${ESPACE}${genre}:${n}`).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const jour = (ms) => (ms === null || ms === undefined ? null : new Date(Number(ms)).toISOString().slice(0, 10));
const precision = (d) => (d && d.endsWith('-01-01') ? 'annee' : 'jour'); // sa convention : 1er janvier = année seule
const GENRES = { F: 'femme', M: 'homme' };
const NATURES = { Marriage: 'mariage', Civil_Partnership: 'pacs', Informal: 'union_libre', Other: 'autre' };
const STATUTS = { Active: 'en_cours', Divorced: 'divorces', Separated: 'separes', Widowed: 'veuvage' };
const LIENS = { Biological: 'biologique', Adoptive: 'adoptive', Adopted: 'adoptive', Step: 'beau_parent', Foster: 'accueil' };

/** La personne part-elle en ligne ? (décédée selon la règle ci-dessus) */
export function estPublique(p, anneeCourante = new Date().getFullYear()) {
    if (!p.prenom || p.prenom.trim() === '' || p.prenom.trim() === '?') return false;
    if (p.decede === 0 || p.decede === false) return false;
    if (p.decede === 1 || p.decede === true) return true;
    if (p.date_deces !== null && p.date_deces !== undefined) return true;
    const n = jour(p.date_naissance);
    return n !== null && Number(n.slice(0, 4)) <= anneeCourante - 100;
}

/** Les données à envoyer, tirées des lignes du PC (individus, unions, parentes). */
export function donneesSynchro({ individus, unions, parentes }, anneeCourante) {
    const publics = individus.filter((p) => estPublique(p, anneeCourante));
    const ids = new Set(publics.map((p) => p.id));
    return {
        individus: publics.map((p) => {
            const n = jour(p.date_naissance), d = jour(p.date_deces);
            return {
                id: uuidDe('individu', p.id), pc: p.id,
                prenom: p.prenom.trim().slice(0, 80), nom: (p.nom.trim() === '?' ? '' : p.nom.trim()).slice(0, 80),
                genre: GENRES[p.genre] ?? 'inconnu',
                naissance: n, naissance_precision: precision(n), lieu_naissance: p.lieu_naissance?.trim().slice(0, 120) || null,
                deces: d, deces_precision: precision(d), lieu_deces: p.lieu_deces?.trim().slice(0, 120) || null,
            };
        }),
        unions: unions.filter((u) => ids.has(u.partenaire_1_id) && ids.has(u.partenaire_2_id) && u.partenaire_1_id !== u.partenaire_2_id).map((u) => ({
            id: uuidDe('union', u.id), a: uuidDe('individu', u.partenaire_1_id), b: uuidDe('individu', u.partenaire_2_id),
            nature: NATURES[u.type_union] ?? 'autre', statut: STATUTS[u.statut] ?? 'en_cours', debut: jour(u.date_debut), fin: jour(u.date_fin),
        })),
        filiations: parentes.filter((l) => ids.has(l.parent_id) && ids.has(l.enfant_id)).map((l) => ({
            parent: uuidDe('individu', l.parent_id), enfant: uuidDe('individu', l.enfant_id), nature: LIENS[l.type_lien] ?? 'biologique',
        })),
    };
}

/** Le script SQL à coller dans Supabase. */
export function sqlSynchro(donnees, quand = new Date().toISOString()) {
    const json = JSON.stringify(donnees);
    if (json.includes('$pc$')) throw new Error('les données contiennent le délimiteur $pc$');
    return `-- =====================================================================
-- ANCESTRIA — SYNCHRONISATION DE L'ARBRE DU PC (${quand})
-- À coller dans Supabase → SQL Editor → Run. Rejouable.
-- ${donnees.individus.length} personnes décédées, ${donnees.unions.length} couples, ${donnees.filiations.length} liens parent → enfant.
-- Aucune personne vivante. Le résultat (en bas) dit ce qui est fait et ce qui est refusé.
-- =====================================================================
create temporary table if not exists synchro_releve (quoi text, detail text) on commit preserve rows;
truncate synchro_releve;
do $synchro$
declare
    v_donnees jsonb := $pc$${json}$pc$::jsonb;
    v_arbre   uuid;
    v_ids     uuid[];
    r         jsonb;
    n_ok      integer := 0;
    n_refus   integer := 0;
begin
    select arbre_id into v_arbre from public.invitations
        where libelle = 'Porte du site' and not ferme and expire_le > now() order by cree_le limit 1;
    if v_arbre is null then
        select a.id into v_arbre from public.arbres a left join public.individus i on i.arbre_id = a.id
            group by a.id order by count(i.id) desc, a.cree_le limit 1;
    end if;
    if v_arbre is null then
        raise exception 'Aucun arbre en ligne : rien à synchroniser.';
    end if;
    v_ids := array(select (x ->> 'id')::uuid from jsonb_array_elements(v_donnees -> 'individus') x);

    -- 1. les liens entre fiches venues du PC sont reposés à neuf
    delete from public.unions u using public.individus a, public.individus b
        where u.arbre_id = v_arbre and a.id = u.partenaire_a and b.id = u.partenaire_b and a.notes like 'pc:%' and b.notes like 'pc:%';
    delete from public.filiations f using public.individus p, public.individus e
        where f.arbre_id = v_arbre and p.id = f.parent_id and e.id = f.enfant_id and p.notes like 'pc:%' and e.notes like 'pc:%';
    -- 2. ce qui a quitté le PC (ou n'est plus décédé) quitte le site
    delete from public.individus where arbre_id = v_arbre and notes like 'pc:%' and id <> all (v_ids);
    get diagnostics n_ok = row_count;
    insert into synchro_releve values ('retirées', n_ok::text);
    n_ok := 0;

    -- 3. les personnes
    for r in select * from jsonb_array_elements(v_donnees -> 'individus') loop
        begin
            insert into public.individus (id, arbre_id, prenom, nom, genre, naissance, naissance_precision, lieu_naissance,
                                          deces, deces_precision, lieu_deces, vivant, notes)
            values ((r ->> 'id')::uuid, v_arbre, r ->> 'prenom', r ->> 'nom', r ->> 'genre',
                    (r ->> 'naissance')::date, r ->> 'naissance_precision', r ->> 'lieu_naissance',
                    (r ->> 'deces')::date, r ->> 'deces_precision', r ->> 'lieu_deces', false, 'pc:' || (r ->> 'pc'))
            on conflict (id) do update set prenom = excluded.prenom, nom = excluded.nom, genre = excluded.genre,
                naissance = excluded.naissance, naissance_precision = excluded.naissance_precision, lieu_naissance = excluded.lieu_naissance,
                deces = excluded.deces, deces_precision = excluded.deces_precision, lieu_deces = excluded.lieu_deces,
                vivant = false, notes = excluded.notes;
            n_ok := n_ok + 1;
        exception when others then
            n_refus := n_refus + 1;
            insert into synchro_releve values ('personne refusée', 'pc:' || (r ->> 'pc') || ' — ' || sqlerrm);
        end;
    end loop;
    insert into synchro_releve values ('personnes', n_ok::text);

    -- 4. les couples
    n_ok := 0;
    for r in select * from jsonb_array_elements(v_donnees -> 'unions') loop
        begin
            insert into public.unions (id, arbre_id, partenaire_a, partenaire_b, nature, statut, debut, fin)
            values ((r ->> 'id')::uuid, v_arbre, (r ->> 'a')::uuid, (r ->> 'b')::uuid, r ->> 'nature', r ->> 'statut',
                    (r ->> 'debut')::date, (r ->> 'fin')::date);
            n_ok := n_ok + 1;
        exception when others then
            n_refus := n_refus + 1;
            insert into synchro_releve values ('couple refusé', (r ->> 'id') || ' — ' || sqlerrm);
        end;
    end loop;
    insert into synchro_releve values ('couples', n_ok::text);

    -- 5. les liens parent → enfant
    n_ok := 0;
    for r in select * from jsonb_array_elements(v_donnees -> 'filiations') loop
        begin
            insert into public.filiations (arbre_id, parent_id, enfant_id, nature)
            values (v_arbre, (r ->> 'parent')::uuid, (r ->> 'enfant')::uuid, r ->> 'nature');
            n_ok := n_ok + 1;
        exception when others then
            n_refus := n_refus + 1;
            insert into synchro_releve values ('lien refusé', (r ->> 'parent') || ' → ' || (r ->> 'enfant') || ' — ' || sqlerrm);
        end;
    end loop;
    insert into synchro_releve values ('liens', n_ok::text);
    insert into synchro_releve values ('refus', n_refus::text);
end;
$synchro$;
select quoi, detail from synchro_releve;
`;
}

// ---- en ligne de commande ----
if (process.argv[1] && process.argv[1].replaceAll('\\', '/').endsWith('/scripts/synchro-pc.mjs')) {
    const [, , base, sortie] = process.argv;
    if (!base || !sortie) { console.error('usage : node scripts/synchro-pc.mjs <copie .db> <sortie .sql>'); process.exit(1); }
    const { DatabaseSync } = await import('node:sqlite');
    const { writeFileSync } = await import('node:fs');
    const db = new DatabaseSync(base, { readOnly: true });
    const lire = (t) => db.prepare(`select * from ${t}`).all();
    const d = donneesSynchro({ individus: lire('individus'), unions: lire('unions'), parentes: lire('parentes') });
    writeFileSync(sortie, sqlSynchro(d), 'utf8');
    console.log(`${sortie} : ${d.individus.length} personnes décédées, ${d.unions.length} couples, ${d.filiations.length} liens`);
}
// ---- FIN SYNCHRONISATION ----
