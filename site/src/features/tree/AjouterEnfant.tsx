import { useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu, UnionComplete } from './graphe';
import { IndiceSexe, useSexePropose } from './IndiceSexe';
import { ChoixAutreParent } from './ChoixAutreParent';
import { ChampDate, datesLisibles } from './ChampDate';
import { DoublonPossible } from './DoublonPossible';
export function nomPropose(parent: Individu, autre: Individu | null): string {
    if (parent.genre === 'M')
        return parent.nom;
    if (autre?.genre === 'M')
        return autre.nom;
    return parent.nom;
}
export const AjouterEnfant = ({ parent, people, unions, unionInitiale, onFermer, }: {
    parent: Individu;
    people: Individu[];
    unions: UnionComplete[];
    unionInitiale?: Id | null;
    onFermer: () => void;
}) => {
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const sesUnions = useMemo(() => unions.filter((u) => u.partenaire1Id === parent.id || u.partenaire2Id === parent.id), [unions, parent.id]);
    const conjointDe = (u: UnionComplete) => people.find((p) => p.id === (u.partenaire1Id === parent.id ? u.partenaire2Id : u.partenaire1Id)) ?? null;
    const [choix, setChoix] = useState<Id | null | undefined>(unionInitiale ?? (sesUnions.length === 1 ? sesUnions[0].id : sesUnions.length === 0 ? null : undefined));
    const unionId = choix ?? null;
    const autre = unionId === null ? null : conjointDe(sesUnions.find((u) => u.id === unionId)!);
    const [nomTouche, setNomTouche] = useState(false);
    const [f, setF] = useState({ prenom: '', nom: nomPropose(parent, autre), genre: 'Unknown', dateNaissance: '', lieuNaissance: '', statut: 'vivant', dateDeces: '' });
    const nom = nomTouche ? f.nom : nomPropose(parent, autre);
    const sexe = useSexePropose(f.prenom, f.genre, (g) => setF((x) => ({ ...x, genre: g })));
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [ajoutes, setAjoutes] = useState<string[]>([]);
    const enregistrer = async (encore: boolean) => {
        setEnvoi(true);
        setErreur(null);
        let creeId: Id | null = null;
        try {
            const corps: Record<string, unknown> = { prenom: f.prenom, nom, genre: f.genre };
            if (f.dateNaissance)
                corps.dateNaissance = f.dateNaissance;
            if (f.lieuNaissance)
                corps.lieuNaissance = f.lieuNaissance;
            if (f.statut === 'vivant')
                corps.decede = false;
            if (f.statut === 'decede') {
                corps.decede = true;
                if (f.dateDeces)
                    corps.dateDeces = f.dateDeces;
            }
            creeId = (await apiClient.post('/people', corps)).data.id as Id;
            await apiClient.post('/relationships', { parentId: parent.id, childId: creeId });
            if (autre)
                await apiClient.post('/relationships', { parentId: autre.id, childId: creeId });
            if (unionId !== null)
                await apiClient.post('/union-children', { childId: creeId, unionId });
            await fetchTree();
            if (encore) {
                setAjoutes((a) => [...a, f.prenom]);
                setF((x) => ({ ...x, prenom: '', dateNaissance: '', lieuNaissance: '', dateDeces: '', genre: 'Unknown', statut: 'vivant' }));
                sexe.reinit();
            }
            else
                onFermer();
        }
        catch (err: any) {
            if (creeId !== null)
                await apiClient.delete(`/people/${creeId}`).catch(() => undefined);
            const d = err?.response?.data;
            setErreur(d?.details?.map((x: any) => x.message).join(' · ') ?? d?.error ?? err.message);
        }
        finally {
            setEnvoi(false);
        }
    };
    const champ = 'w-full h-10 px-3 bg-blanc border border-trait rounded-[10px] text-sm text-encre outline-none focus:border-sepia';
    const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1';
    const accordE = (m: string, fe: string) => (f.genre === 'F' ? fe : m);
    return (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
            <form onSubmit={(e) => {
            e.preventDefault();
            void enregistrer(false);
        }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-4 shadow-carte max-h-[92vh] overflow-y-auto">
                <div className="flex items-start">
                    <div>
                        <h2 className="font-display text-[30px] font-medium leading-none m-0">Nouvel enfant</h2>
                        <div className="text-[13px] text-encre-2 mt-1.5">
                            de {parent.prenom} {nomLisible(parent.nom)}
                            {autre ? ` et ${autre.prenom} ${nomLisible(autre.nom)}` : ''}
                        </div>
                    </div>
                    <button type="button" onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                        <X size={20}/>
                    </button>
                </div>

                {ajoutes.length > 0 && (<div className="text-[12.5px] text-encre-2">Déjà ajoutés : {ajoutes.join(', ')}</div>)}

                <ChoixAutreParent unions={sesUnions} conjointDe={conjointDe} valeur={choix} onChange={setChoix}/>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Prénom(s)</label>
                        <input className={champ} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required autoFocus/>
                    </div>
                    <div>
                        <label className={etiquette}>Nom</label>
                        <input className={champ} value={nom} onChange={(e) => {
            setNomTouche(true);
            setF({ ...f, nom: e.target.value });
        }} required/>
                    </div>
                </div>

                <DoublonPossible prenom={f.prenom} nom={nom}/>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Sexe</label>
                        <select className={champ} value={f.genre} onChange={(e) => {
            sexe.manuel();
            setF({ ...f, genre: e.target.value });
        }}>
                            <option value="Unknown">Non renseigné</option>
                            <option value="M">Garçon</option>
                            <option value="F">Fille</option>
                        </select>
                        <IndiceSexe prenom={f.prenom} genre={f.genre}/>
                    </div>
                    <div>
                        <label className={etiquette}>Aujourd'hui</label>
                        <select className={champ} value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>
                            <option value="vivant">{accordE('Vivant', 'Vivante')}</option>
                            <option value="decede">{accordE('Décédé', 'Décédée')}</option>
                            <option value="inconnu">On ne sait pas</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Né(e) le</label>
                        <ChampDate valeur={f.dateNaissance} onChange={(v) => setF((x) => ({ ...x, dateNaissance: v }))} signalerIllisible/>
                    </div>
                    <div>
                        <label className={etiquette}>à</label>
                        <input className={champ} value={f.lieuNaissance} onChange={(e) => setF({ ...f, lieuNaissance: e.target.value })} placeholder="Saint-Pierre…"/>
                    </div>
                </div>

                {f.statut === 'decede' && (<div>
                        <label className={etiquette}>Décès le (si connu)</label>
                        <ChampDate valeur={f.dateDeces} onChange={(v) => setF((x) => ({ ...x, dateDeces: v }))} signalerIllisible/>
                    </div>)}

                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}

                <div className="flex gap-2 justify-end pt-1">
                    <button type="button" disabled={envoi || !f.prenom.trim() || choix === undefined || !datesLisibles(f.dateNaissance, f.statut === 'decede' ? f.dateDeces : '')} onClick={() => void enregistrer(true)} className="h-10 px-4 rounded-[10px] border border-trait text-encre-2 text-[13.5px] hover:bg-sepia-tint disabled:opacity-40">
                        Enregistrer et en ajouter un autre
                    </button>
                    <button type="submit" disabled={envoi || !f.prenom.trim() || choix === undefined || !datesLisibles(f.dateNaissance, f.statut === 'decede' ? f.dateDeces : '')} className="h-10 px-4 rounded-[10px] border border-sepia text-sepia-deep text-[13.5px] font-medium hover:bg-sepia-tint disabled:opacity-40">
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>);
};
