// ---- FORMULAIRE D'UN INDIVIDU (création / modification) ----
import { useState } from 'react';
import { Alerte, Bouton, Case, Champ, Choix } from '../ui/ui';
import { dateVersSaisie } from '../domaine/dates';
import { GENRE } from '../domaine/libelles';
import { controlerNouvellesDates } from '../domaine/coherence';
import { SAISIE_INDIVIDU_VIDE, validerIndividu, type Erreurs, type IndividuPourBase, type SaisieIndividu } from '../domaine/validation';
import type { DonneesArbre, Genre, Individu } from '../domaine/types';

export function saisieDepuis(i: Individu): SaisieIndividu {
    return {
        prenom: i.prenom, nom: i.nom, genre: i.genre, se_nomme: i.se_nomme ?? '',
        naissance: dateVersSaisie(i.naissance, i.naissance_precision), lieu_naissance: i.lieu_naissance ?? '',
        position_naissance: i.naissance_lat !== null && i.naissance_lng !== null ? `${i.naissance_lat}, ${i.naissance_lng}` : '',
        deces: dateVersSaisie(i.deces, i.deces_precision), lieu_deces: i.lieu_deces ?? '', vivant: i.vivant,
        profession: i.profession ?? '', biographie: i.biographie ?? '', notes: i.notes ?? '', illustre: i.illustre,
        thematiques: i.thematiques.join(', '), photo_url: i.photo_url ?? '',
    };
}

const OPTIONS_GENRE = (Object.entries(GENRE) as [Genre, string][]);

/** Champs d'un individu. `complet` : récit, lieux, patrimoine (sinon l'essentiel). */
export function ChampsIndividu({ s, maj, erreurs, complet }: { s: SaisieIndividu; maj: (c: Partial<SaisieIndividu>) => void; erreurs: Erreurs; complet: boolean }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Prénom(s)" valeur={s.prenom} onChange={(v) => maj({ prenom: v })} erreur={erreurs.prenom} obligatoire max={80} autoFocus autoComplete="off" />
            <Champ libelle="Nom de famille" valeur={s.nom} onChange={(v) => maj({ nom: v })} erreur={erreurs.nom} max={80} aide="Peut rester vide." autoComplete="off" />
            <Choix libelle="Genre" valeur={s.genre} onChange={(v) => maj({ genre: v })} options={OPTIONS_GENRE} />
            {s.genre === 'non_binaire' ? (
                <Champ libelle="Comment la personne se nomme" valeur={s.se_nomme} onChange={(v) => maj({ se_nomme: v })} erreur={erreurs.se_nomme} max={80} placeholder="iel, ille…" />
            ) : <div className="hidden sm:block" />}
            <Champ libelle="Naissance" valeur={s.naissance} onChange={(v) => maj({ naissance: v })} erreur={erreurs.naissance} placeholder="24/04/1962 ou 1962" mode="numeric" aide="JJ/MM/AAAA, JJMMAAAA, ou l’année seule." />
            <Champ libelle="Décès" valeur={s.deces} onChange={(v) => maj({ deces: v, vivant: v.trim() ? false : s.vivant })} erreur={erreurs.deces} placeholder="vide si inconnu" mode="numeric" />
            <div className="sm:col-span-2">
                <Case libelle="Personne décédée (même sans date connue)" coche={!s.vivant} onChange={(v) => maj({ vivant: !v })} aide="Les personnes vivantes ne sont jamais montrées au public." />
            </div>
            {complet && (
                <>
                    <Champ libelle="Lieu de naissance" valeur={s.lieu_naissance} onChange={(v) => maj({ lieu_naissance: v })} erreur={erreurs.lieu_naissance} max={120} />
                    <Champ libelle="Position du lieu (carte)" valeur={s.position_naissance} onChange={(v) => maj({ position_naissance: v })} erreur={erreurs.position_naissance} placeholder="-21.0096, 55.2707" mode="decimal" aide="Latitude, longitude (facultatif)." />
                    <Champ libelle="Lieu de décès" valeur={s.lieu_deces} onChange={(v) => maj({ lieu_deces: v })} erreur={erreurs.lieu_deces} max={120} />
                    <Champ libelle="Profession" valeur={s.profession} onChange={(v) => maj({ profession: v })} erreur={erreurs.profession} max={120} />
                    <div className="sm:col-span-2">
                        <Champ libelle="Biographie / récit mémoriel" valeur={s.biographie} onChange={(v) => maj({ biographie: v })} erreur={erreurs.biographie} multiligne lignes={5} max={20000} />
                    </div>
                    <div className="sm:col-span-2">
                        <Champ libelle="Notes de recherche (privées)" valeur={s.notes} onChange={(v) => maj({ notes: v })} erreur={erreurs.notes} multiligne lignes={3} max={5000} />
                    </div>
                    <Champ libelle="Thématiques" valeur={s.thematiques} onChange={(v) => maj({ thematiques: v })} erreur={erreurs.thematiques} placeholder="migration, engagisme, marine" aide="Séparées par des virgules (10 au plus)." />
                    <Case libelle="Personnalité illustre du territoire" coche={s.illustre} onChange={(v) => maj({ illustre: v })} />
                    <div className="sm:col-span-2">
                        <Champ libelle="Lien de la photo" valeur={s.photo_url} onChange={(v) => maj({ photo_url: v })} erreur={erreurs.photo_url} type="url" mode="url" max={1000}
                            placeholder="https://…" aide="Adresse d’une image déjà en ligne (archives, album…). Facultatif." />
                    </div>
                </>
            )}
        </div>
    );
}

export function FormulaireIndividu({ initial, donnees, idModifie, onValider, libelleBouton }: {
    initial?: SaisieIndividu;
    donnees: DonneesArbre;
    idModifie?: string;
    onValider: (v: IndividuPourBase) => Promise<void>;
    libelleBouton: string;
}) {
    const [s, setS] = useState<SaisieIndividu>(initial ?? SAISIE_INDIVIDU_VIDE);
    const [erreurs, setErreurs] = useState<Erreurs>({});
    const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [complet, setComplet] = useState(Boolean(idModifie));
    const maj = (c: Partial<SaisieIndividu>) => setS((x) => ({ ...x, ...c }));

    const envoyer = async () => {
        setErreurGenerale(null);
        const r = validerIndividu(s);
        if (!r.ok) {
            setErreurs(r.erreurs);
            if (['lieu_naissance', 'position_naissance', 'lieu_deces', 'profession', 'biographie', 'notes', 'thematiques', 'photo_url'].some((c) => c in r.erreurs)) setComplet(true);
            return;
        }
        setErreurs({});
        if (idModifie) {
            const motif = controlerNouvellesDates(donnees, idModifie, r.donnees);
            if (motif) {
                setErreurGenerale(motif);
                return;
            }
        }
        setEnvoi(true);
        try {
            await onValider(r.donnees);
        } catch (e) {
            setErreurGenerale(e instanceof Error ? e.message : String(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <ChampsIndividu s={s} maj={maj} erreurs={erreurs} complet={complet} />
            {!complet && (
                <button type="button" className="self-start text-sm text-sepia underline underline-offset-4 min-h-11" onClick={() => setComplet(true)}>
                    Plus de détails (lieux, récit, patrimoine)…
                </button>
            )}
            {erreurGenerale && <Alerte>{erreurGenerale}</Alerte>}
            <Bouton variante="principal" type="submit" enCours={envoi}>{libelleBouton}</Bouton>
        </form>
    );
}

// ---- FIN FORMULAIRE D'UN INDIVIDU ----
