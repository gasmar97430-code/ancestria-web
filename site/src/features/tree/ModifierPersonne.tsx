import { useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import type { Individu } from './graphe';
import type { AvecStatut } from './StatutVie';
import { champ, etiquette } from './ChoixPersonne';
import { messageErreur } from './edition';
import { ChampDate, dateEcrite } from './ChampDate';
import { ConjointsExistants } from './ConjointsExistants';
import { DeplacerEnfants } from './DeplacerEnfants';
const jour = (d?: string | null) => (d ? d.slice(0, 10) : '');
const statutDe = (p: AvecStatut) => (p.decede === true ? 'decede' : p.decede === false ? 'vivant' : 'inconnu');
type Champs = {
    prenom: string;
    nom: string;
    genre: string;
    dateNaissance: string;
    lieuNaissance: string;
    dateDeces: string;
    lieuDeces: string;
    statut: string;
    notes: string;
};
const LIBELLES: Record<keyof Champs, string> = {
    prenom: 'Prénom',
    nom: 'Nom',
    genre: 'Sexe',
    dateNaissance: 'Naissance',
    lieuNaissance: 'Lieu de naissance',
    dateDeces: 'Décès',
    lieuDeces: 'Lieu de décès',
    statut: 'Vivant / décédé',
    notes: 'Notes',
};
const GENRES: Record<string, string> = { M: 'Homme', F: 'Femme', Unknown: 'Non renseigné', Other: 'Autre' };
const STATUTS: Record<string, string> = { vivant: 'Vivant', decede: 'Décédé', inconnu: 'Non renseigné' };
export function champsDe(p: AvecStatut): Champs {
    return {
        prenom: p.prenom,
        nom: p.nom,
        genre: p.genre,
        dateNaissance: jour(p.dateNaissance),
        lieuNaissance: p.lieuNaissance ?? '',
        dateDeces: jour(p.dateDeces),
        lieuDeces: p.lieuDeces ?? '',
        statut: statutDe(p),
        notes: p.notes ?? '',
    };
}
export function differences(avant: Champs, apres: Champs): {
    cle: keyof Champs;
    avant: string;
    apres: string;
}[] {
    return (Object.keys(LIBELLES) as (keyof Champs)[])
        .filter((k) => (k === 'prenom' || k === 'nom' ? avant[k].trim() !== apres[k].trim() : avant[k] !== apres[k]))
        .map((k) => ({ cle: k, avant: avant[k], apres: apres[k] }));
}
export function corpsPatch(diff: ReturnType<typeof differences>): Record<string, unknown> {
    const c: Record<string, unknown> = {};
    for (const d of diff) {
        if (d.cle === 'statut')
            c.decede = d.apres === 'decede' ? true : d.apres === 'vivant' ? false : null;
        else
            c[d.cle] = d.cle === 'prenom' || d.cle === 'nom' ? d.apres.trim() : d.apres;
    }
    return c;
}
const lisible = (cle: keyof Champs, v: string) => v === '' ? '(vide)' : cle === 'genre' ? GENRES[v] ?? v : cle === 'statut' ? STATUTS[v] : cle.startsWith('date') ? dateEcrite(v) : v;
export const ModifierPersonne = ({ personne, onFermer }: {
    personne: Individu;
    onFermer: () => void;
}) => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const avant = useMemo(() => champsDe(personne as AvecStatut), [personne]);
    const [f, setF] = useState<Champs>(avant);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [confirmer, setConfirmer] = useState(false);
    const [datesLisibles, setDatesLisibles] = useState({ naissance: true, deces: true });
    const tree = useTreeStore();
    const liens = tree.relationships.filter((r) => r.parentId === personne.id || r.enfantId === personne.id).length;
    const sesUnions = tree.unions.filter((u) => u.partenaire1Id === personne.id || u.partenaire2Id === personne.id).length;
    const supprimer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.delete(`/people/${personne.id}`);
            await fetchTree();
            onFermer();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const diff = differences(avant, f);
    const pret = diff.length > 0 && f.prenom.trim() !== '' && datesLisibles.naissance && datesLisibles.deces;
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.patch(`/people/${personne.id}`, corpsPatch(diff));
            await fetchTree();
            onFermer();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const c = (k: keyof Champs, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (<input className={champ} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props}/>);
    return (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
                <div className="flex items-start">
                    <h2 className="font-display text-[30px] font-medium leading-none m-0">Modifier</h2>
                    <button type="button" onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                        <X size={20}/>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Prénom(s)</label>
                        {c('prenom', { autoFocus: true })}
                    </div>
                    <div>
                        <label className={etiquette}>Nom</label>
                        {c('nom')}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Sexe</label>
                        <select className={champ} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}>
                            <option value="Unknown">Non renseigné</option>
                            <option value="M">Homme</option>
                            <option value="F">Femme</option>
                            <option value="Other">Autre</option>
                        </select>
                    </div>
                    <div>
                        <label className={etiquette}>Aujourd'hui</label>
                        <select className={champ} value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>
                            <option value="inconnu">Non renseigné</option>
                            <option value="vivant">Vivant</option>
                            <option value="decede">Décédé</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Naissance</label>
                        <ChampDate valeur={f.dateNaissance} onChange={(v) => setF((x) => ({ ...x, dateNaissance: v }))} onValidite={(ok) => setDatesLisibles((x) => ({ ...x, naissance: ok }))}/>
                    </div>
                    <div>
                        <label className={etiquette}>à</label>
                        {c('lieuNaissance')}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Décès</label>
                        <ChampDate valeur={f.dateDeces} onChange={(v) => setF((x) => ({ ...x, dateDeces: v }))} onValidite={(ok) => setDatesLisibles((x) => ({ ...x, deces: ok }))}/>
                    </div>
                    <div>
                        <label className={etiquette}>à</label>
                        {c('lieuDeces')}
                    </div>
                </div>
                <div>
                    <label className={etiquette}>Notes</label>
                    <textarea className={`${champ} h-24 py-2 resize-y`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}/>
                </div>

                {diff.length > 0 && (<div className="rounded-[12px] border border-trait bg-papier px-4 py-3 flex flex-col gap-1">
                        <div className="text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1">Ce qui va changer</div>
                        {diff.map((d) => (<div key={d.cle} className="text-[12.5px] text-encre-2 flex gap-1.5 flex-wrap">
                                <span className="text-encre-3">{LIBELLES[d.cle]} :</span>
                                <span className="line-through">{d.cle === 'notes' ? '…' : lisible(d.cle, d.avant)}</span>
                                <span>→</span>
                                <span className="text-encre font-medium">{d.cle === 'notes' ? 'texte modifié' : lisible(d.cle, d.apres)}</span>
                            </div>))}
                    </div>)}

                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}
                <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={onFermer} className="h-10 px-4 rounded-[10px] border border-trait text-encre-2 text-[13.5px] hover:bg-sepia-tint">
                        Annuler
                    </button>
                    <button type="button" disabled={envoi || !pret} onClick={() => void enregistrer()} className="h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep text-[13.5px] font-medium hover:bg-sepia-tint disabled:opacity-40">
                        Enregistrer{diff.length > 0 ? ` (${diff.length})` : ''}
                    </button>
                </div>

                <ConjointsExistants personne={personne}/>
                <DeplacerEnfants enfantsIds={[personne.id]} titre="Ses parents"/>
                <div className="filet"/>
                {!confirmer ? (<button type="button" onClick={() => setConfirmer(true)} className="self-start text-[12.5px] hover:underline" style={{ color: 'var(--o-afrique)' }}>
                        Supprimer cette personne…
                    </button>) : (<div className="rounded-[12px] border px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--o-afrique)' }}>
                        <div className="text-[13px] text-encre">
                            Supprimer {personne.prenom} {personne.nom} de l'arbre ?
                            {liens + sesUnions > 0
                ? ` Partent aussi : ${liens} lien${liens > 1 ? 's' : ''} de parenté et ${sesUnions} union${sesUnions > 1 ? 's' : ''}. Les autres personnes restent.`
                : ''}
                        </div>
                        <div className="text-[11.5px] text-encre-3">Une copie de sécurité de la base est faite juste avant : rien n'est perdu pour de bon.</div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmer(false)} className="h-9 px-3 rounded-[10px] border border-trait text-encre-2 text-[13px]">
                                Non
                            </button>
                            <button type="button" disabled={envoi} onClick={() => void supprimer()} className="h-9 px-3 rounded-[10px] border text-[13px] font-medium" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }}>
                                Oui, supprimer
                            </button>
                        </div>
                    </div>)}
            </div>
        </div>);
};
