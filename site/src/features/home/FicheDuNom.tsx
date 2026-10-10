import { useEffect, useState } from 'react';
import { NotePencil } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useLectureSeule } from '../../lib/lectureSeule';
import { normaliser } from '../../lib/origins';
import { sansRecherche } from './accueilNeutre';
import { useNomFrance } from './NomsDeFrance';
interface Fiche {
    nom: string;
    communaute: string | null;
    communauteAutre: string | null;
    pays: string | null;
    region: string | null;
    ville: string | null;
    source: string | null;
    note: string | null;
}
const VIDE = { communaute: '', communauteAutre: '', pays: '', region: '', ville: '', source: '', note: '' };
type Saisie = typeof VIDE;
const PAYS = ['Inde', 'France', 'Madagascar', 'Chine', 'Comores', 'Mayotte', 'Mozambique', 'Tanzanie', 'Afrique de l’Est', 'Pakistan', 'Viêt Nam', 'Maurice'];
let communautes: Promise<string[]> | null = null;
const chargerCommunautes = () => (communautes ??= apiClient
    .get('/fiche-du-nom/communautes')
    .then((r) => r.data as string[])
    .catch(() => {
    communautes = null;
    return [];
}));
const champ = 'w-full min-w-0 h-9 px-3 rounded-[9px] border border-trait bg-papier text-sm text-encre outline-none focus:border-sepia';
export const FicheDuNom = ({ nom }: {
    nom: string;
}) => {
    const lecture = useLectureSeule((s) => s.actif);
    const [fiche, setFiche] = useState<Fiche | null>(null);
    const [serveur, setServeur] = useState(false);
    const [ouvert, setOuvert] = useState(false);
    const [saisie, setSaisie] = useState<Saisie>(VIDE);
    const [liste, setListe] = useState<string[]>([]);
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    useEffect(() => {
        let vivant = true;
        setOuvert(false);
        setErreur(null);
        apiClient
            .get('/fiche-du-nom', { params: { nom } })
            .then((r) => vivant && (setFiche(r.data ?? null), setServeur(true)))
            .catch(() => vivant && (setFiche(null), setServeur(false)));
        void chargerCommunautes().then((l) => vivant && setListe(l));
        return () => {
            vivant = false;
        };
    }, [nom]);
    if (!serveur || !nom.trim())
        return null;
    const ouvrir = () => {
        setSaisie({ ...VIDE, ...Object.fromEntries(Object.entries(fiche ?? {}).map(([k, v]) => [k, v ?? ''])) } as Saisie);
        setErreur(null);
        setOuvert(true);
    };
    const enregistrer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            const r = await apiClient.put('/fiche-du-nom', { nom, ...saisie });
            setFiche(r.data ?? null);
            setOuvert(false);
        }
        catch (e) {
            const msg = (e as {
                response?: {
                    data?: {
                        error?: string;
                    };
                };
            }).response?.data?.error;
            setErreur(msg ?? 'La fiche n’a pas pu être enregistrée.');
        }
        finally {
            setEnvoi(false);
        }
    };
    const maj = (k: keyof Saisie) => (e: {
        target: {
            value: string;
        };
    }) => setSaisie((s) => ({ ...s, [k]: e.target.value }));
    const communaute = fiche ? (fiche.communaute === 'Autre' ? fiche.communauteAutre || 'Autre' : fiche.communaute) : null;
    const lieux = fiche ? [fiche.ville, fiche.region, fiche.pays].filter(Boolean).join(', ') : '';
    return (<section className="flex flex-col gap-2.5 px-5 py-4 bg-papier rounded-[14px]" data-bloc="fiche-du-nom">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10.5px] tracking-[.12em] uppercase text-sepia whitespace-nowrap">Fiche du nom</span>
                {fiche && <span className="text-xs text-encre-3">renseigné par vous — à documenter</span>}
            </div>

            {!ouvert && fiche && (<div className="flex flex-col gap-1 text-sm text-encre">
                    {communaute && <div><span className="text-encre-3">Communauté · </span>{communaute}</div>}
                    {lieux && <div><span className="text-encre-3">Origine · </span>{lieux}</div>}
                    {fiche.source && <div><span className="text-encre-3">Source indiquée · </span>{fiche.source}</div>}
                    {fiche.note && <p className="m-0 text-encre-2 whitespace-pre-line">{fiche.note}</p>}
                </div>)}
            {!ouvert && !fiche && <div className="text-xs text-encre-3">Communauté et lieu d'origine pas encore renseignés.</div>}
            {!lecture && !ouvert && (<button onClick={ouvrir} data-geste="completer-fiche-du-nom" className="self-start flex items-center gap-1.5 h-8 px-3 rounded-[9px] border border-trait text-[12.5px] font-medium text-encre-2 whitespace-nowrap transition-colors hover:border-sepia hover:bg-sepia-tint">
                    <NotePencil size={14}/>
                    {fiche ? 'Modifier la fiche' : 'Compléter la fiche du nom'}
                </button>)}

            {ouvert && (<div className="flex flex-col gap-3" data-formulaire="fiche-du-nom">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1 text-xs text-encre-3" role="radiogroup" aria-label="Communauté" data-champ="communaute">
                            Communauté
                            <div className="flex flex-wrap gap-1.5">
                                {liste.map((c) => {
                const pris = saisie.communaute === c;
                return (<button key={c} type="button" role="radio" aria-checked={pris} data-communaute={c} onClick={() => setSaisie((s) => ({ ...s, communaute: pris ? '' : c }))} className={`px-2.5 py-1 rounded-[13px] border text-[12.5px] text-left transition-colors ${pris ? 'bg-sepia-tint border-sepia text-encre font-medium' : 'bg-papier border-trait text-encre-2 hover:border-sepia'}`}>
                                            {c}
                                        </button>);
            })}
                            </div>
                        </div>
                        {saisie.communaute === 'Autre' ? (<label className="flex flex-col gap-1 text-xs text-encre-3">
                                Laquelle ?
                                <input value={saisie.communauteAutre} onChange={maj('communauteAutre')} className={champ} maxLength={80} data-champ="communauteAutre"/>
                            </label>) : null}
                        <label className="flex flex-col gap-1 text-xs text-encre-3">
                            Pays d'origine
                            <input value={saisie.pays} onChange={maj('pays')} list="ancestria-pays" className={champ} maxLength={80} data-champ="pays"/>
                            <datalist id="ancestria-pays">{PAYS.map((p) => <option key={p} value={p}/>)}</datalist>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-encre-3">
                            Région
                            <input value={saisie.region} onChange={maj('region')} className={champ} maxLength={80} data-champ="region"/>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-encre-3">
                            Ville
                            <input value={saisie.ville} onChange={maj('ville')} className={champ} maxLength={80} data-champ="ville"/>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-encre-3">
                            Source (facultative)
                            <input value={saisie.source} onChange={maj('source')} className={champ} maxLength={300} placeholder="livre, acte, archive…" data-champ="source"/>
                        </label>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-encre-3">
                        Note
                        <textarea value={saisie.note} onChange={maj('note')} rows={3} maxLength={2000} className="px-3 py-2 rounded-[9px] border border-trait bg-papier text-sm text-encre outline-none focus:border-sepia resize-y" data-champ="note"/>
                    </label>
                    {erreur && <div className="text-sm text-red-700">{erreur}</div>}
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => void enregistrer()} disabled={envoi} data-geste="enregistrer-fiche-du-nom" className="h-9 px-4 rounded-[9px] bg-sepia text-white text-sm font-medium disabled:opacity-60">
                            Enregistrer
                        </button>
                        <button onClick={() => setOuvert(false)} className="h-9 px-4 rounded-[9px] text-encre-2 text-sm hover:bg-sepia-tint">
                            Annuler
                        </button>
                        <span className="basis-full text-xs text-encre-3">Tout vider puis enregistrer retire la fiche.</span>
                    </div>
                </div>)}
        </section>);
};
export const FicheNomHorsRepertoire = ({ saisie, dansRepertoire }: {
    saisie: string;
    dansRepertoire: boolean;
}) => {
    const choisi = useNomFrance((s) => (s.pour === saisie ? s.nom : null));
    if (sansRecherche(normaliser(saisie)))
        return null;
    const nom = choisi ?? (dansRepertoire ? null : saisie.trim());
    if (!nom)
        return null;
    return (<div className="bg-carte border border-trait-leger rounded-2xl p-1.5" data-bloc="fiche-nom-hors-repertoire">
            <div className="px-3.5 pt-2 pb-1 font-display text-[19px] text-encre">{nom.toLocaleUpperCase('fr-FR')}</div>
            <FicheDuNom nom={nom}/>
        </div>);
};
