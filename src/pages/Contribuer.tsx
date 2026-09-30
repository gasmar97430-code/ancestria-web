// ---- PAGE DU QR CODE : PROPOSER DES AJOUTS À L'ARBRE ----
// Ouverte depuis Facebook ou un QR code, sans compte ni application à
// installer. Une question par écran, gros boutons, « je ne sais pas »
// toujours permis. Rien n'entre dans l'arbre sans l'accord d'un éditeur.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RELATION } from '../domaine/libelles';
import { validerContribution, type Erreurs, type SaisieContribution, type SaisieProche } from '../domaine/validation';
import type { RelationContribution } from '../domaine/types';
import { enAttente, mettreEnAttente, vider, type EnvoiEnAttente, type Reponse } from '../donnees/fileEnvoi';
import { Alerte, Bouton, Case, Champ, Chargement, Choix } from '../ui/ui';
import { defautProches, liensPossibles } from '../domaine/anneesPlausibles';
import { ChoixPalette } from '../arbre-bureau/ChoixPalette';
import { Signature } from '../arbre-bureau/Signature';

interface PersonnePublique {
    id: string;
    prenom: string;
    nom: string;
    naissance_annee: number | null;
    deces_annee: number | null;
}
interface Invitation {
    ok: boolean;
    raison?: string;
    arbre_nom?: string;
    avec_pin?: boolean;
    individus?: PersonnePublique[];
}

const RAISONS: Record<string, string> = {
    lien_invalide: 'Ce lien n’est pas complet. Demandez-le à nouveau à la personne qui vous l’a envoyé.',
    lien_ferme: 'Ce partage est fermé ou a expiré. Demandez un nouveau lien à la famille.',
    pin_faux: 'Code incorrect.',
    trop_d_essais: 'Trop d’essais de code : réessayez dans une heure.',
    trop_d_envois: 'Beaucoup d’envois depuis ce réseau : réessayez dans une heure.',
    contenu_invalide: 'Une information envoyée n’est pas au bon format.',
    individu_inconnu: 'La personne choisie n’est plus dans l’arbre partagé.',
};

const VIDE: SaisieContribution = {
    prenom: '', nom: '', genre: 'inconnu', naissance_annee: '', relation: '', individu_id: '', texte_lien: '', proches: [], message: '', contact: '', consentement: false,
};

const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function envoyerALaBase(e: EnvoiEnAttente): Promise<Reponse> {
    const { data, error } = await supabase.rpc('soumettre_contribution', { p_jeton: e.jeton, p_pin: e.pin, p_contenu: e.contenu, p_contact: e.contact, p_uid: e.uid });
    if (error) {
        // erreur réseau / serveur : on garde l'envoi pour plus tard
        throw new Error(error.message);
    }
    return data as Reponse;
}

export function Contribuer() {
    const { jeton = '' } = useParams();
    const cleBrouillon = `ancestria-brouillon-${jeton}`;
    const [inv, setInv] = useState<Invitation | null>(null);
    const [pin, setPin] = useState('');
    const [pinValide, setPinValide] = useState<string | null>(null);
    const [etape, setEtape] = useState(0);
    const [s, setS] = useState<SaisieContribution>(() => {
        try {
            return { ...VIDE, ...(JSON.parse(localStorage.getItem(cleBrouillon) ?? '{}') as Partial<SaisieContribution>), consentement: false };
        } catch {
            return VIDE;
        }
    });
    const [erreurs, setErreurs] = useState<Erreurs>({});
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [fini, setFini] = useState<'envoye' | 'en_attente' | null>(null);
    const [recherche, setRecherche] = useState('');

    const ouvrir = useCallback(async (code: string | null) => {
        setErreur(null);
        const { data, error } = await supabase.rpc('invitation_publique', { p_jeton: jeton, p_pin: code });
        if (error) {
            setErreur('Pas de connexion au serveur : vérifiez le réseau puis rechargez la page.');
            return;
        }
        const r = data as Invitation;
        setInv(r);
        if (r.ok) setPinValide(code);
        else if (code && r.raison) setErreur(RAISONS[r.raison] ?? 'Refusé.');
    }, [jeton]);

    useEffect(() => {
        void ouvrir(null);
    }, [ouvrir]);

    // Brouillon gardé dans le téléphone (sans le consentement, redemandé à chaque fois).
    useEffect(() => {
        try {
            localStorage.setItem(cleBrouillon, JSON.stringify({ ...s, consentement: false }));
        } catch {
            /* navigation privée */
        }
    }, [s, cleBrouillon]);

    // Envois restés en attente : repartent au retour du réseau.
    useEffect(() => {
        const relancer = () => void vider(localStorage, envoyerALaBase);
        relancer();
        window.addEventListener('online', relancer);
        return () => window.removeEventListener('online', relancer);
    }, []);

    const maj = (c: Partial<SaisieContribution>) => setS((x) => ({ ...x, ...c }));
    const trouves = useMemo(() => {
        const q = plat(recherche.trim());
        const l = inv?.individus ?? [];
        return (q.length < 2 ? [] : l.filter((p) => plat(`${p.prenom} ${p.nom}`).includes(q) || plat(`${p.nom} ${p.prenom}`).includes(q))).slice(0, 30);
    }, [recherche, inv]);
    const cible = inv?.individus?.find((p) => p.id === s.individu_id);

    const envoyer = async () => {
        setErreur(null);
        const v = validerContribution(s);
        if (!v.ok) {
            setErreurs(v.erreurs);
            if (v.erreurs.prenom || v.erreurs.naissance_annee) setEtape(1);
            else if (v.erreurs.individu_id || v.erreurs.relation) setEtape(2);
            else if (v.erreurs.proches) setEtape(4);
            return;
        }
        const dp = defautProches(s.naissance_annee, s.proches);
        if (dp) { setErreurs({ proches: dp }); setEtape(4); return; }
        setErreurs({});
        const e: EnvoiEnAttente = { uid: crypto.randomUUID(), jeton, pin: pinValide, contenu: v.donnees.contenu, contact: v.donnees.contact, le: new Date().toISOString() };
        setEnvoi(true);
        try {
            const r = await envoyerALaBase(e);
            if (r.ok) {
                setFini('envoye');
                localStorage.removeItem(cleBrouillon);
            } else {
                setErreur(RAISONS[r.raison] ?? 'Proposition refusée.');
            }
        } catch {
            mettreEnAttente(localStorage, e);
            setFini('en_attente');
        } finally {
            setEnvoi(false);
        }
    };

    const cadre = (contenu: ReactNode) => (
        <main className="min-h-dvh max-w-lg mx-auto p-5 flex flex-col gap-5">
            <header className="text-center pt-2">
                <div className="mb-4"><Signature centre /></div>
                <div className="text-xs uppercase tracking-widest text-encre-3">Ancestria</div>
                <h1 className="font-display text-3xl mt-1">{inv?.arbre_nom ?? 'Arbre de famille'}</h1>
            </header>
            {contenu}
            <div className="mt-auto pt-6 self-center w-[230px]"><ChoixPalette compact /></div>
        </main>
    );

    if (!inv) return erreur ? cadre(<Alerte>{erreur}</Alerte>) : <Chargement />;
    if (!inv.ok && (inv.raison === 'lien_invalide' || inv.raison === 'lien_ferme')) return cadre(<Alerte>{RAISONS[inv.raison]}</Alerte>);
    if (!inv.ok) {
        return cadre(
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void ouvrir(pin.trim()); }} noValidate>
                <p className="text-encre-2">Ce partage est protégé par un code donné par la famille.</p>
                <Champ libelle="Code" valeur={pin} onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 8))} mode="numeric" autoComplete="one-time-code" autoFocus
                    erreur={erreur ?? (inv.raison === 'trop_d_essais' ? RAISONS.trop_d_essais : undefined)} />
                <Bouton variante="principal" type="submit" disabled={pin.length < 4}>Entrer</Bouton>
            </form>,
        );
    }

    if (fini) {
        return cadre(
            <div className="flex flex-col gap-4 text-center">
                <p className="font-display text-2xl">Merci {s.prenom.trim()} !</p>
                <Alerte genre="succes">
                    {fini === 'envoye' ? 'Votre proposition est arrivée. La famille la vérifiera avant de l’ajouter à l’arbre.'
                        : 'Pas de réseau pour l’instant : votre proposition est gardée dans ce téléphone et partira toute seule dès le retour du réseau (laissez cette page ouverte ou revenez-y).'}
                </Alerte>
                {enAttente(localStorage).length > 0 && <p className="text-xs text-encre-3">{enAttente(localStorage).length} envoi(s) en attente de réseau.</p>}
                <Bouton variante="secondaire" onClick={() => { setS({ ...VIDE }); setFini(null); setEtape(1); }}>Proposer une autre personne</Bouton>
            </div>,
        );
    }

    const etapes = [
        // 0 — accueil
        <div key="0" className="flex flex-col gap-4">
            <p className="text-lg">La famille vous invite à compléter son arbre.</p>
            <ul className="text-encre-2 text-sm flex flex-col gap-2 list-disc pl-5">
                <li>Dites qui vous êtes et à qui vous êtes relié(e).</li>
                <li><b>Tout est vérifié par la famille</b> avant d’entrer dans l’arbre.</li>
                <li>Aucune personne vivante n’est montrée publiquement.</li>
            </ul>
            <Bouton variante="principal" onClick={() => setEtape(1)}>Commencer</Bouton>
        </div>,
        // 1 — qui êtes-vous
        <div key="1" className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">Qui êtes-vous ?</h2>
            <Champ libelle="Prénom" valeur={s.prenom} onChange={(v) => maj({ prenom: v })} erreur={erreurs.prenom} obligatoire max={80} autoComplete="given-name" autoFocus />
            <Champ libelle="Nom de famille" valeur={s.nom} onChange={(v) => maj({ nom: v })} erreur={erreurs.nom} max={80} autoComplete="family-name" aide="Facultatif." />
            <Choix libelle="Vous êtes" valeur={s.genre as 'femme' | 'homme' | 'non_binaire' | 'inconnu'} onChange={(v) => maj({ genre: v })}
                options={[['inconnu', 'Je préfère ne pas le dire'], ['femme', 'Une femme'], ['homme', 'Un homme'], ['non_binaire', 'Non binaire']] as const} />
            <Champ libelle="Année de naissance" valeur={s.naissance_annee} onChange={(v) => maj({ naissance_annee: v.replace(/\D/g, '').slice(0, 4) })} erreur={erreurs.naissance_annee} mode="numeric" placeholder="ex. 1985" aide="Facultatif." />
            <Bouton variante="principal" disabled={!s.prenom.trim()} onClick={() => setEtape(2)}>Suivant</Bouton>
        </div>,
        // 2 — relié à qui
        <div key="2" className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">À qui êtes-vous relié(e) ?</h2>
            <p className="text-sm text-encre-2">Cherchez un parent, grand-parent ou ancêtre disparu déjà présent dans l’arbre.</p>
            <Champ libelle="Chercher un nom" valeur={recherche} onChange={setRecherche} placeholder="ex. Martin Jeanne" autoComplete="off" />
            <ul className="flex flex-col gap-2">
                {trouves.map((p) => (
                    <li key={p.id}>
                        <button type="button" onClick={() => { maj({ individu_id: p.id, relation: s.relation && s.relation !== 'inconnu' ? s.relation : '' }); setEtape(3); }}
                            className={`w-full text-left rounded-xl border px-4 min-h-12 ${s.individu_id === p.id ? 'border-sepia text-sepia' : 'border-trait'}`}>
                            {p.prenom} {p.nom} <span className="text-xs text-encre-3">{p.naissance_annee ?? '?'} – {p.deces_annee ?? '?'}</span>
                        </button>
                    </li>
                ))}
                {recherche.trim().length >= 2 && trouves.length === 0 && <li className="text-sm text-encre-3">Personne de ce nom dans l’arbre partagé.</li>}
            </ul>
            {erreurs.individu_id && <Alerte>{erreurs.individu_id}</Alerte>}
            <Bouton variante="discret" onClick={() => { maj({ relation: 'inconnu', individu_id: '' }); setEtape(4); }}>Je ne le/la trouve pas</Bouton>
        </div>,
        // 3 — quel lien
        <div key="3" className="flex flex-col gap-3">
            <h2 className="font-display text-2xl">Quel est votre lien{cible ? ` avec ${cible.prenom} ${cible.nom}` : ''} ?</h2>
            {(['enfant', 'petit_enfant', 'parent', 'conjoint', 'frere_soeur'] as RelationContribution[]).filter(liensPossibles(s.naissance_annee, cible)).map((r) => (
                <button key={r} type="button" onClick={() => { maj({ relation: r }); setEtape(4); }}
                    className={`w-full text-left rounded-xl border px-4 min-h-12 ${s.relation === r ? 'border-sepia text-sepia bg-sepia/10' : 'border-trait'}`}>
                    {RELATION[r]}
                </button>
            ))}
            <button type="button" onClick={() => { maj({ relation: 'inconnu', individu_id: '' }); setEtape(4); }} className="w-full text-left rounded-xl border border-trait px-4 min-h-12 text-encre-2">
                {RELATION.inconnu}
            </button>
        </div>,
        // 4 — proches
        <div key="4" className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">Vos proches (facultatif)</h2>
            {s.relation === 'inconnu' && (
                <Champ libelle="Comment êtes-vous relié(e) à cette famille ?" valeur={s.texte_lien} onChange={(v) => maj({ texte_lien: v })} erreur={erreurs.texte_lien} multiligne lignes={3} max={300}
                    placeholder="ex. mon grand-père s’appelait Paul Martin, né à Saint-Pierre" />
            )}
            {s.proches.map((p, k) => {
                const changer = (c: Partial<SaisieProche>) => maj({ proches: s.proches.map((x, j) => (j === k ? { ...x, ...c } : x)) });
                return (
                    <fieldset key={k} className="rounded-2xl border border-trait p-3 flex flex-col gap-3">
                        <legend className="px-1 text-sm text-encre-2">Proche {k + 1}</legend>
                        <Choix libelle="C’est mon / ma" valeur={p.relation as 'parent' | 'enfant' | 'conjoint'} onChange={(v) => changer({ relation: v })}
                            options={[['parent', 'parent'], ['enfant', 'enfant'], ['conjoint', 'conjoint·e']] as const} />
                        <Champ libelle="Prénom" valeur={p.prenom} onChange={(v) => changer({ prenom: v })} max={80} />
                        <Champ libelle="Nom" valeur={p.nom} onChange={(v) => changer({ nom: v })} max={80} />
                        <Champ libelle="Année de naissance" valeur={p.naissance_annee} onChange={(v) => changer({ naissance_annee: v.replace(/\D/g, '').slice(0, 4) })} mode="numeric" />
                        <Case libelle="Décédé(e)" coche={!p.vivant} onChange={(v) => changer({ vivant: !v })} />
                        <Bouton variante="discret" onClick={() => maj({ proches: s.proches.filter((_, j) => j !== k) })}>Retirer ce proche</Bouton>
                    </fieldset>
                );
            })}
            {erreurs.proches && <Alerte>{erreurs.proches}</Alerte>}
            {s.proches.length < 20 && (
                <Bouton variante="secondaire" onClick={() => maj({ proches: [...s.proches, { prenom: '', nom: s.nom, relation: 'enfant', naissance_annee: '', vivant: true }] })}>+ Ajouter un proche</Bouton>
            )}
            <Bouton variante="principal" onClick={() => { const d = defautProches(s.naissance_annee, s.proches); setErreurs(d ? { proches: d } : {}); if (!d) setEtape(5); }}>Suivant</Bouton>
        </div>,
        // 5 — contact et envoi
        <form key="5" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} noValidate>
            <h2 className="font-display text-2xl">Un dernier mot</h2>
            <Champ libelle="Message pour la famille (facultatif)" valeur={s.message} onChange={(v) => maj({ message: v })} erreur={erreurs.message} multiligne lignes={4} max={2000} />
            <Champ libelle="Téléphone ou e-mail pour vous recontacter (facultatif)" valeur={s.contact} onChange={(v) => maj({ contact: v })} erreur={erreurs.contact} max={200} autoComplete="email" />
            <Case libelle="J’accepte que la famille garde ces informations pour son arbre." coche={s.consentement} onChange={(v) => maj({ consentement: v })} erreur={erreurs.consentement} />
            {erreur && <Alerte>{erreur}</Alerte>}
            <Bouton variante="principal" type="submit" enCours={envoi} disabled={!s.consentement}>Envoyer ma proposition</Bouton>
        </form>,
    ];

    return cadre(
        <>
            {etape > 0 && (
                <div className="flex items-center justify-between">
                    <button type="button" className="text-sepia min-h-11" onClick={() => setEtape(etape === 4 && s.relation === 'inconnu' ? 2 : etape - 1)}>← Retour</button>
                    <div className="flex gap-1.5" aria-label={`Étape ${etape} sur 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-1.5 w-6 rounded-full ${n <= etape ? 'bg-sepia' : 'bg-trait'}`} />)}
                    </div>
                </div>
            )}
            {etapes[etape]}
        </>,
    );
}

// ---- FIN PAGE DU QR CODE ----
