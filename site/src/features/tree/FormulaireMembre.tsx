import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { usePatronymeStore } from '../../store/usePatronymeStore';
import { useTreeStore } from '../../store/useTreeStore';
import { IndiceSexe, useSexePropose } from './IndiceSexe';
import { ChampDate, datesLisibles } from './ChampDate';
import { DoublonPossible } from './DoublonPossible';
const VIDE = {
    prenom: '',
    nom: '',
    genre: 'Unknown',
    dateNaissance: '',
    lieuNaissance: '',
    dateDeces: '',
    lieuDeces: '',
};
export const FormulaireMembre = ({ nomInitial, onFermer }: {
    nomInitial?: string;
    onFermer: () => void;
}) => {
    const { patronymes } = usePatronymeStore();
    const fetchTree = useTreeStore((s) => s.fetchTree);
    const [f, setF] = useState({ ...VIDE, nom: nomInitial ?? '' });
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const sexe = useSexePropose(f.prenom, f.genre, (g) => setF((x) => ({ ...x, genre: g })));
    const champ = 'w-full h-10 px-3 bg-blanc border border-trait rounded-[10px] text-sm text-encre outline-none focus:border-sepia';
    const etiquette = 'block text-[10.5px] tracking-[.1em] uppercase text-encre-3 mb-1';
    const enregistrer = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnvoi(true);
        setErreur(null);
        try {
            const corps = { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')), nom: f.nom };
            await apiClient.post('/people', corps);
            await fetchTree();
            onFermer();
        }
        catch (err: any) {
            const d = err?.response?.data;
            setErreur(d?.details?.map((x: any) => x.message).join(' · ') ?? d?.error ?? err.message);
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4" onClick={onFermer}>
            <form onSubmit={enregistrer} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-carte border border-trait-leger rounded-[20px] p-8 flex flex-col gap-5 shadow-carte">
                <div className="flex items-center">
                    <h2 className="font-display text-[34px] font-medium leading-none m-0">Nouveau membre</h2>
                    <button type="button" onClick={onFermer} className="ml-auto text-encre-3 hover:text-encre" title="Fermer">
                        <X size={20}/>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Prénom *</label>
                        <input className={champ} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required autoFocus/>
                    </div>
                    <div>
                        <label className={etiquette}>Nom</label>
                        <input className={champ} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} list="membre-patronymes" placeholder="inconnu : laisser vide"/>
                        <datalist id="membre-patronymes">
                            {patronymes.map((p) => (<option key={p.id} value={p.nom}/>))}
                        </datalist>
                    </div>
                </div>

                <DoublonPossible prenom={f.prenom} nom={f.nom}/>
                <div>
                    <label className={etiquette}>Genre</label>
                    <select className={champ} value={f.genre} onChange={(e) => {
            sexe.manuel();
            setF({ ...f, genre: e.target.value });
        }}>
                        <option value="Unknown">Inconnu</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="Other">Autre</option>
                    </select>
                    <IndiceSexe prenom={f.prenom} genre={f.genre}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={etiquette}>Naissance</label>
                        <ChampDate valeur={f.dateNaissance} onChange={(v) => setF((x) => ({ ...x, dateNaissance: v }))} signalerIllisible/>
                    </div>
                    <div>
                        <label className={etiquette}>Lieu</label>
                        <input className={champ} value={f.lieuNaissance} onChange={(e) => setF({ ...f, lieuNaissance: e.target.value })} placeholder="Saint-Paul"/>
                    </div>
                    <div>
                        <label className={etiquette}>Décès</label>
                        <ChampDate valeur={f.dateDeces} onChange={(v) => setF((x) => ({ ...x, dateDeces: v }))} signalerIllisible/>
                    </div>
                    <div>
                        <label className={etiquette}>Lieu</label>
                        <input className={champ} value={f.lieuDeces} onChange={(e) => setF({ ...f, lieuDeces: e.target.value })}/>
                    </div>
                </div>

                {erreur && <p className="text-sm m-0" style={{ color: 'var(--o-afrique)' }}>{erreur}</p>}

                <div className="flex gap-2.5 justify-end">
                    <button type="button" onClick={onFermer} className="h-[42px] px-[18px] rounded-[10px] text-encre-2 text-sm font-medium hover:bg-papier">
                        Annuler
                    </button>
                    <button type="submit" disabled={envoi || !datesLisibles(f.dateNaissance, f.dateDeces)} className="h-[42px] px-[18px] rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium hover:bg-sepia-tint disabled:opacity-50">
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>);
};
