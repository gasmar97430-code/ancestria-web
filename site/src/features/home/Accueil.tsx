import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { Binoculars, CaretRight, MagnifyingGlass, TreeStructure } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { usePatronymeStore } from '../../store/usePatronymeStore';
import { useAtelierStore } from '../../store/useAtelierStore';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible, normaliser, ORDRE_ORIGINES, teinteDe } from '../../lib/origins';
import { TitreQuiTient } from '../../lib/TitreQuiTient';
import type { Patronyme } from '../../types';
import { FamilleDuNom } from './FamilleDuNom';
import { PersonnesTapees } from './PersonnesTapees';
import { BulleCommunes } from './BulleCommunes';
import { CarteDeLIle } from './carte-ile/CarteDeLIle';
import { ArbreDeVieAccueil } from './ArbreDeVieAccueil';
import { EXEMPLE_CHAMP, InviteRecherche, MARQUE_CHAMP, sansRecherche, useNomDemande } from './accueilNeutre';
import { useNomTapeAccueil } from '../tree/titreFamille';
import { DEGRES, definitionOrigine } from '../../lib/origineEtablie';
import { SourceOrigine } from './SourceOrigine';
import { BoutonOrigine, NomsDeFrance } from './NomsDeFrance';
import { FicheDuNom, FicheNomHorsRepertoire } from './FicheDuNom';
import { EmplacementAjouterFamille } from '../../lib/ajouterFamille';
const MAX_RESULTATS = 7;
const CERTITUDES: Record<string, string> = {
    Documentee: 'origine documentée',
    Probable: 'origine probable',
    'Non documentee': 'origine non documentée',
};
function decouper(nom: string, terme: string) {
    const i = terme ? normaliser(nom).indexOf(terme) : -1;
    if (i < 0)
        return { avant: nom, dedans: '', apres: '' };
    return { avant: nom.slice(0, i), dedans: nom.slice(i, i + terme.length), apres: nom.slice(i + terme.length) };
}
const rangLisible = (r: number) => (r === 1 ? '1ᵉʳ' : `${r}ᵉ`);
export const Accueil = () => {
    const { patronymes, charge, erreur } = usePatronymeStore();
    const { nomChoisi, choisir, traquer, ouvrirDansArbre } = useAtelierStore();
    const { people } = useTreeStore();
    const [saisie, setSaisie] = useState('');
    const [origine, setOrigine] = useState<string | null>(null);
    const champ = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                champ.current?.focus();
                champ.current?.select();
            }
        };
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    }, []);
    const terme = normaliser(saisie);
    const fuse = useMemo(() => new Fuse(patronymes, { keys: ['nom'], threshold: 0.34, ignoreLocation: true }), [patronymes]);
    const resultats = useMemo(() => {
        const filtres = origine ? patronymes.filter((p) => p.origine === origine) : patronymes;
        if (sansRecherche(terme))
            return [];
        const exacts = filtres.filter((p) => normaliser(p.nom).includes(terme));
        exacts.sort((a, b) => {
            const da = normaliser(a.nom).startsWith(terme) ? 0 : 1;
            const db = normaliser(b.nom).startsWith(terme) ? 0 : 1;
            return da - db || (a.rang ?? 9999) - (b.rang ?? 9999);
        });
        if (exacts.length >= MAX_RESULTATS)
            return exacts.slice(0, MAX_RESULTATS);
        const vus = new Set(exacts.map((p) => p.id));
        const proches = fuse
            .search(saisie.trim())
            .map((r) => r.item)
            .filter((p) => !vus.has(p.id) && (!origine || p.origine === origine));
        return [...exacts, ...proches].slice(0, MAX_RESULTATS);
    }, [patronymes, terme, saisie, origine, fuse]);
    const choisi: Patronyme | undefined = sansRecherche(terme)
        ? undefined
        : resultats.find((p) => p.nom === nomChoisi) ?? resultats[0];
    useNomDemande(nomChoisi, resultats.map((p) => p.nom), saisie, setSaisie);
    useNomTapeAccueil(choisi?.nom, saisie, people);
    const presentes = useMemo(() => {
        const s = new Set(patronymes.map((p) => p.origine));
        return ORDRE_ORIGINES.filter((o) => s.has(o));
    }, [patronymes]);
    return (<main className="flex-1 min-w-0 overflow-y-auto px-16 py-14 flex flex-col gap-9">
            <header className="flex flex-col gap-2.5">
                <h1 className="font-display text-[56px] leading-none font-medium tracking-[-.01em]">
                    Quel nom cherchez-vous&#8239;?
                </h1>
                <p className="text-[15px] text-encre-2">
                    {patronymes.length} patronymes déjà documentés — et chacun peut ajouter les siens.
                    
                </p>
            </header>
            <ArbreDeVieAccueil />

            {erreur && <p className="text-sm text-[color:var(--o-afrique)]">Répertoire indisponible : {erreur}</p>}

            <div className="grid grid-cols-[minmax(0,520px)_minmax(0,1fr)] gap-10 items-start">
                <div className="flex flex-col gap-4">
                    <label className="relative flex items-center h-[60px] bg-blanc border border-trait rounded-2xl shadow-champ px-[18px] gap-3 transition-colors focus-within:border-sepia">
                        <MagnifyingGlass size={20} className="text-sepia"/>
                        <input ref={champ} value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter' && resultats[0])
                choisir(resultats[0].nom);
        }} placeholder={EXEMPLE_CHAMP} data-champ={MARQUE_CHAMP} autoFocus className="flex-1 min-w-0 border-0 bg-transparent font-display text-2xl text-encre outline-none focus-visible:outline-none placeholder:text-encre-3"/>
                    </label>

                    <div className="flex flex-wrap gap-2">
                        {[null, ...presentes].map((o) => {
            const actif = origine === o;
            return (<button key={o ?? 'toutes'} title={definitionOrigine(o)} onClick={() => setOrigine(o)} className={`flex items-center gap-[7px] h-[30px] px-3 rounded-[15px] border text-[12.5px] font-medium text-encre transition-all hover:border-sepia ${actif ? 'bg-sepia-tint border-sepia' : 'bg-carte border-trait'}`}>
                                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: o ? teinteDe(o).c : 'var(--sepia)' }}/>
                                    {o ? teinteDe(o).court : 'Toutes'}
                                </button>);
        })}
                        <BoutonOrigine nomChoisi={choisi?.nom} saisie={saisie}/>
                    </div>

                    {sansRecherche(terme) && <InviteRecherche noms={patronymes.length} filtre={origine ? teinteDe(origine).court : null}/>}
                    <div className={`bg-carte border border-trait-leger rounded-2xl p-1.5 flex flex-col ${sansRecherche(terme) ? 'hidden' : ''}`}>
                        {resultats.map((p) => {
            const { avant, dedans, apres } = decouper(nomLisible(p.nom), terme);
            const t = teinteDe(p.origine);
            return (<button key={p.id} onClick={() => choisir(p.nom)} className={`flex items-center gap-3.5 px-3.5 py-3 rounded-[11px] text-left transition-colors hover:bg-sepia-tint ${choisi?.id === p.id ? 'bg-sepia-tint' : ''}`}>
                                    <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: t.c }}/>
                                    <span className="flex-1 min-w-0 flex flex-col gap-px">
                                        <span className="font-display text-[22px] leading-[1.1] text-encre-2">
                                            {avant}
                                            <span className="text-encre font-semibold">{dedans}</span>
                                            {apres}
                                        </span>
                                        <span className="text-xs text-encre-3">
                                            {t.court}
                                            {p.rang ? ` · ${rangLisible(p.rang)} patronyme de l'île` : ''}
                                        </span>
                                    </span>
                                    <CaretRight style={{ color: 'var(--caret)' }}/>
                                </button>);
        })}
                        {charge && resultats.length === 0 && (<div className="px-4 py-7 text-sm text-encre-3">
                                Aucun patronyme ne correspond. Essayez une variante orthographique.
                            </div>)}
                        {charge && resultats.length === 0 && <EmplacementAjouterFamille nom={saisie.trim()}/>}
                    </div>
                    <PersonnesTapees saisie={saisie} aucunNom={charge && resultats.length === 0}/>
                    <NomsDeFrance saisie={saisie}/>
                    <FicheNomHorsRepertoire saisie={saisie} dansRepertoire={resultats.length > 0}/>
                </div>

                {choisi && (<FichePatronyme p={choisi} individus={people.filter((i) => normaliser(i.nom) === normaliser(choisi.nom)).length} onArbre={() => ouvrirDansArbre(choisi.nom)} onTraque={() => traquer(choisi.nom)}/>)}
            </div>
        </main>);
};
const FichePatronyme = ({ p, individus, onArbre, onTraque, }: {
    p: Patronyme;
    individus: number;
    onArbre: () => void;
    onTraque: () => void;
}) => {
    const t = teinteDe(p.origine);
    const [variantes, setVariantes] = useState<string[]>([]);
    useEffect(() => {
        let vivant = true;
        apiClient
            .get('/traque/variantes', { params: { nom: p.nom } })
            .then((r) => {
            if (!vivant)
                return;
            const autres = (r.data as {
                nom: string;
                origine: string;
            }[])
                .filter((v) => v.origine !== 'saisie')
                .map((v) => v.nom);
            setVariantes(autres.slice(0, 5));
        })
            .catch(() => vivant && setVariantes([]));
        return () => {
            vivant = false;
        };
    }, [p.nom]);
    return (<article className="bg-carte border border-trait-leger rounded-[20px] px-10 py-9 flex flex-col gap-6 shadow-[inset_0_1px_0_var(--blanc)]">
            <div className="flex items-center gap-2 text-xs font-medium tracking-[.06em] uppercase" style={{ color: t.c }}>
                <span className="w-2 h-2 rounded-full" style={{ background: t.c }}/>
                Origine · {t.court}
                <span className="ml-2 normal-case tracking-normal text-encre-3 font-normal">
                    — {DEGRES[p.certitude] ?? CERTITUDES[p.certitude] ?? p.certitude}
                </span>
            </div>

            <TitreQuiTient texte={nomLisible(p.nom)} className="font-display leading-[.95] font-medium tracking-[-.015em] break-words"/>
            <FamilleDuNom nom={p.nom}/>

            <div className="flex items-stretch gap-0 px-5 py-[18px] bg-papier rounded-[14px]">
                <Repere titre="Rang dans l'île" valeur={p.rang ? rangLisible(p.rang) : '—'}/>
                <div className="w-px bg-trait mx-5"/>
                <Repere titre="Naissances 1891–1915" valeur={p.frequence != null ? p.frequence.toLocaleString('fr-FR') : 'non relevé'}/>
                {p.procede && (<>
                        <div className="w-px bg-trait mx-5"/>
                        <Repere titre="Procédé d'attribution" valeur={p.procede}/>
                    </>)}
            </div>

            <div className="flex flex-col gap-2.5">
                <div className="text-[10.5px] tracking-[.12em] uppercase text-sepia">Note historique</div>
                {p.notes ? (<p className="font-display italic text-[22px] leading-[1.4] text-encre m-0">{p.notes}</p>) : (<p className="text-sm text-encre-3 m-0">Aucune note au répertoire pour ce nom.</p>)}
                <FicheDuNom nom={p.nom}/>
                <SourceOrigine nom={p.nom}/>
                <BulleCommunes nom={p.nom}/>
                <CarteDeLIle nom={p.nom}/>
                <div className="text-xs text-encre-3">
                    Répertoire des patronymes réunionnais — l'origine est celle du nom, pas celle des familles qui le
                    portent.
                </div>
            </div>

            <div className="filet"/>

            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-encre-3 mr-1">Variantes</span>
                {variantes.length === 0 && <span className="text-xs text-encre-3">aucune graphie proche retenue</span>}
                {variantes.map((v) => (<span key={v} className="font-display text-[17px] px-2.5 py-0.5 border border-trait rounded-lg">
                        {nomLisible(v)}
                    </span>))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
                <button onClick={onArbre} className="flex items-center gap-2 whitespace-nowrap h-[42px] px-[18px] rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium transition-colors hover:bg-sepia-tint">
                    <TreeStructure />
                    Ouvrir dans l'arbre
                    <span className="text-encre-3 font-normal">· {individus}</span>
                </button>
                <button onClick={onTraque} className="flex items-center gap-2 whitespace-nowrap h-[42px] px-[18px] rounded-[10px] text-encre-2 text-sm font-medium transition-colors hover:bg-papier">
                    <Binoculars />
                    Lancer la traque
                </button>
                
            </div>
        </article>);
};
const Repere = ({ titre, valeur }: {
    titre: string;
    valeur: string;
}) => (<div className="flex flex-col gap-[3px] min-w-0">
        <span className="text-[10.5px] tracking-[.1em] uppercase text-encre-3">{titre}</span>
        <span className="font-display text-[21px] leading-tight">{valeur}</span>
    </div>);
