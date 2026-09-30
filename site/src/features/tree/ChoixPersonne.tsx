import { useMemo, useState } from 'react';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
import type { Individu } from './graphe';
import { periode } from './graphe';
import { chercherPersonnes } from './RechercheArbre';
import type { ChampsPersonne } from './edition';
import { IndiceSexe, useSexePropose } from './IndiceSexe';
import { ChampDate } from './ChampDate';
import { DoublonPossible } from './DoublonPossible';
export const champ = 'w-full h-10 px-3 bg-blanc border border-trait rounded-[10px] text-sm text-encre outline-none focus:border-sepia';
export const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1';
export const ChoixPersonne = ({ people, exclus, mode, setMode, existant, setExistant, f, setF, genreFixe, }: {
    people: Individu[];
    exclus: Set<Id>;
    mode: 'nouveau' | 'existant';
    setMode: (m: 'nouveau' | 'existant') => void;
    existant: Id | null;
    setExistant: (id: Id | null) => void;
    f: ChampsPersonne;
    setF: (f: ChampsPersonne) => void;
    genreFixe?: boolean;
}) => {
    const [saisie, setSaisie] = useState('');
    const trouves = useMemo(() => chercherPersonnes(people.filter((p) => !exclus.has(p.id)), saisie), [people, exclus, saisie]);
    const choisi = people.find((p) => p.id === existant) ?? null;
    const fem = f.genre === 'F';
    const sexe = useSexePropose(f.prenom, f.genre, (g) => setF({ ...f, genre: g }), mode === 'nouveau' && !genreFixe);
    return (<div className="flex flex-col gap-3">
            <div className="flex bg-papier rounded-[10px] p-[3px] gap-0.5 self-start">
                {(['nouveau', 'existant'] as const).map((m) => (<button key={m} type="button" onClick={() => setMode(m)} className={`h-8 px-3 rounded-lg text-[12.5px] text-encre ${mode === m ? 'bg-blanc shadow-onglet font-medium' : 'text-encre-2'}`}>
                        {m === 'nouveau' ? 'Nouvelle personne' : "Déjà dans l'arbre"}
                    </button>))}
            </div>

            {mode === 'existant' ? (<div className="flex flex-col gap-2">
                    <input className={champ} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Taper son nom ou son prénom…" autoFocus/>
                    {choisi && (<div className="text-[13px] text-encre">
                            Choisi : <span className="font-semibold">{choisi.prenom} {nomLisible(choisi.nom)}</span>
                        </div>)}
                    {saisie.trim() !== '' && (<div className="border border-trait rounded-[10px] overflow-hidden max-h-44 overflow-y-auto">
                            {trouves.length === 0 ? (<div className="px-3 py-2 text-[12.5px] text-encre-3">Personne de ce nom dans l'arbre.</div>) : (trouves.map((p) => (<button key={p.id} type="button" onClick={() => setExistant(p.id)} className={`w-full text-left px-3 py-2 flex gap-2 text-[13px] hover:bg-sepia-tint ${p.id === existant ? 'bg-sepia-tint' : ''}`}>
                                        <span className="truncate">
                                            {p.prenom} <span className="font-semibold">{nomLisible(p.nom)}</span>
                                        </span>
                                        <span className="ml-auto font-mono text-[10.5px] text-encre-3">{periode(p) ?? ''}</span>
                                    </button>)))}
                        </div>)}
                </div>) : (<>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiquette}>Prénom(s)</label>
                            <input className={champ} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoFocus/>
                        </div>
                        <div>
                            <label className={etiquette}>Nom {fem ? 'de naissance' : ''}</label>
                            <input className={champ} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })}/>
                        </div>
                    </div>
                    <DoublonPossible prenom={f.prenom} nom={f.nom} exclus={exclus} onChoisir={(id) => { setMode('existant'); setExistant(id); }}/>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiquette}>Sexe</label>
                            <select className={champ} value={f.genre} disabled={genreFixe} onChange={(e) => {
                sexe.manuel();
                setF({ ...f, genre: e.target.value });
            }}>
                                <option value="Unknown">Non renseigné</option>
                                <option value="M">Homme</option>
                                <option value="F">Femme</option>
                            </select>
                            {!genreFixe && <IndiceSexe prenom={f.prenom} genre={f.genre}/>}
                        </div>
                        <div>
                            <label className={etiquette}>Aujourd'hui</label>
                            <select className={champ} value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value as ChampsPersonne['statut'] })}>
                                <option value="inconnu">On ne sait pas</option>
                                <option value="vivant">{fem ? 'Vivante' : 'Vivant'}</option>
                                <option value="decede">{fem ? 'Décédée' : 'Décédé'}</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiquette}>{fem ? 'Née' : 'Né'} le</label>
                            <ChampDate valeur={f.dateNaissance} onChange={(v) => setF({ ...f, dateNaissance: v })} signalerIllisible/>
                        </div>
                        <div>
                            <label className={etiquette}>à</label>
                            <input className={champ} value={f.lieuNaissance} onChange={(e) => setF({ ...f, lieuNaissance: e.target.value })} placeholder="Le Tampon…"/>
                        </div>
                    </div>
                    {f.statut === 'decede' && (<div>
                            <label className={etiquette}>Décès le (si connu)</label>
                            <ChampDate valeur={f.dateDeces} onChange={(v) => setF({ ...f, dateDeces: v })} signalerIllisible/>
                        </div>)}
                </>)}
        </div>);
};
