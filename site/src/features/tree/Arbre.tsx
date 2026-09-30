import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, MiniMap, Node, ReactFlowProvider, useReactFlow, useStore, } from 'reactflow';
import 'reactflow/dist/style.css';
import { Binoculars, CornersOut, Image, Minus, Plus, UserPlus } from '@phosphor-icons/react';
import { usePatronymeStore } from '../../store/usePatronymeStore';
import { useAtelierStore } from '../../store/useAtelierStore';
import { nomLisible, normaliser, ORDRE_ORIGINES, TEINTES, teinteDe } from '../../lib/origins';
import type { Id, Patronyme } from '../../types';
import { ascendance, construireArbre, DonneesCarte, Individu, origineDuNom, periode, UnionComplete, } from './graphe';
import { PersonMemorialNode } from './nodes/PersonMemorialNode';
import { UnionPillNode } from './nodes/UnionPillNode';
import { FormulaireMembre } from './FormulaireMembre';
import { appliquerFocus, disposerFocus, liensDeFamille, noeudsLignee, noeudsLumineux, noeudsNets, noyauDe } from './focus';
import { LienLumineux } from './LienLumineux';
import { CadrageFocus } from './CadrageFocus';
import { RechercheArbre } from './RechercheArbre';
import { FilAriane } from './FilAriane';
import { RechercheWeb } from './RechercheWeb';
import { ActionsFiche } from './ActionsFiche';
import { avecBarre, BarreEdition } from './BarreEdition';
import { avecBoutonsEpouses, BarreSansEnfant, BoutonEnfantEpouse } from './BoutonEnfantEpouse';
import { avecPastillesCoparents, useArbreFoyers } from './foyers/useArbreFoyers';
import { relationsDePlacement, unionsEnregistrees } from './foyers/normaliser';
import { useGlissement } from './glissement';
import { cercleResserre } from './cercleResserre';
import { useArriveeDansArbre } from '../../store/versPersonne';
import { ChoixBranche, lumineuxDeLaBranche, netsDeLaBranche, noyauDeLaBranche } from './ChoixBranche';
import { FondArbreDeVie } from './FondArbreDeVie';
import { PhotoFiche } from './Photos';
import { PistesPersonne, useRattachements } from './PistesPersonne';
import { useTaillesConnues } from './taillesConnues';
import { LigneCouples } from './LigneCouples';
import { useTitreFamille } from './titreFamille';
import { EditeurFamille } from './EditeurFamille';
import { CARTE } from './graphe';
import { EnfantsAussiSiens } from './EnfantsAussiSiens';
import { BoiteNoireArbre } from './BoiteNoireArbre';
import { avecCartesInconnues, CarteInconnue, useAvecParentsInconnus } from './ParentInconnu';
import { avecRangsDesUnions, useAvecOrdreUnions } from './OrdreUnions';
import { avecNaturesTraits, useAvecFamillesFormes } from './FamillesFormes';
import { avecPoubelle, BoutonSupprimerCarte } from './SupprimerSurCarte';
import { useAncrage } from './ancrage';
import { usePositionsValides, GardeCamera } from './positionsValides';
import { definitionOrigine } from '../../lib/origineEtablie';
const nodeTypes = { carte: PersonMemorialNode, pastille: UnionPillNode };
const edgeTypes = { lumineux: LienLumineux };
const nodeTypesEdition = { ...nodeTypes, edition: BarreEdition, enfantEpouse: BoutonEnfantEpouse, editionSansEnfant: BarreSansEnfant, inconnu: CarteInconnue, supprimerCarte: BoutonSupprimerCarte };
type Branche = 'Toutes' | 'Paternelle' | 'Maternelle';
export const Arbre = () => (<ReactFlowProvider>
        <ArbreInterieur />
    </ReactFlowProvider>);
const ArbreInterieur = () => {
    const [choisi, setChoisi] = useState<Id | null>(null);
    const tree = useAvecFamillesFormes(useAvecOrdreUnions(useAvecParentsInconnus(useArbreFoyers(choisi))));
    const { patronymes } = usePatronymeStore();
    const { nomDansArbre, traquer } = useAtelierStore();
    const people = tree.people as Individu[];
    const unions = tree.unions as UnionComplete[];
    const [branche, setBranche] = useState<Branche>('Toutes');
    const [eteintes, setEteintes] = useState<Set<string>>(new Set());
    const [ajout, setAjout] = useState(false);
    const sources = useRattachements(people.length);
    const index = useMemo(() => new Map<string, Patronyme>(patronymes.map((p) => [normaliser(p.nom), p])), [patronymes]);
    useArriveeDansArbre(nomDansArbre, people, setChoisi);
    const parentsDe = useMemo(() => {
        const m = new Map<Id, Id[]>();
        for (const r of tree.relationships) {
            const l = m.get(r.enfantId);
            if (l)
                l.push(r.parentId);
            else
                m.set(r.enfantId, [r.parentId]);
        }
        return m;
    }, [tree.relationships]);
    const dansLaBranche = useMemo(() => {
        if (branche === 'Toutes' || choisi === null)
            return null;
        const genreVoulu = branche === 'Paternelle' ? 'M' : 'F';
        const parent = (parentsDe.get(choisi) ?? [])
            .map((id) => people.find((p) => p.id === id))
            .find((p) => p?.genre === genreVoulu);
        const garde = new Set<Id>([choisi]);
        if (parent)
            ascendance(parent.id, parentsDe).forEach((id) => garde.add(id));
        return garde;
    }, [branche, choisi, parentsDe, people]);
    const origines = useMemo(() => {
        const s = new Set(people.map((p) => origineDuNom(p.nom, index)));
        return [...ORDRE_ORIGINES, 'Hors repertoire'].filter((o) => s.has(o));
    }, [people, index]);
    const { nodes, edges, generations } = useMemo(() => construireArbre({
        people,
        unions,
        relationships: tree.relationships,
        unionChildren: tree.unionChildren,
        patronymes: index,
        choisi,
        sources,
        visibles: (i) => !eteintes.has(origineDuNom(i.nom, index)) && (dansLaBranche === null || dansLaBranche.has(i.id)),
    }), [people, unions, tree.relationships, tree.unionChildren, index, choisi, sources, eteintes, dansLaBranche]);
    const liens = useMemo(() => liensDeFamille(unions, tree.relationships, tree.unionChildren), [unions, tree.relationships, tree.unionChildren]);
    const cercle = useMemo(() => (choisi === null ? null : cercleResserre(choisi, liens)), [choisi, liens]);
    const nets = useMemo(() => (cercle ? noeudsNets(cercle, unions) : null), [cercle, unions]);
    const lignee = useMemo(() => (choisi === null ? undefined : noeudsLignee(choisi, liens, unions)), [choisi, liens, unions]);
    const noyau = useMemo(() => noyauDeLaBranche(choisi === null ? null : noyauDe(choisi, liens, unions), dansLaBranche, unions), [choisi, liens, unions, dansLaBranche]);
    const lumineux = useMemo(() => lumineuxDeLaBranche(choisi === null ? null : noeudsLumineux(choisi, liens, unions), dansLaBranche, unions), [choisi, liens, unions, dansLaBranche]);
    const affiche = useMemo(() => appliquerFocus(cercle && nets ? disposerFocus(nodes, nets, cercle, people, unions, relationsDePlacement(tree.relationships, unions, tree.unionChildren)) : nodes, edges, netsDeLaBranche(nets, dansLaBranche, unions), netsDeLaBranche(lignee, dansLaBranche, unions), lumineux), [nodes, edges, nets, lignee, lumineux, cercle, people, unions, tree.relationships, dansLaBranche]);
    const parentsChoisi = useMemo(() => (choisi === null ? [] : [...(liens.parentsDe.get(choisi) ?? [])].map((id) => `p-${id}`)), [choisi, liens]);
    const famille = useTitreFamille(people, nomDansArbre, choisi);
    const doyen = useMemo(() => [...people]
        .filter((p) => p.dateNaissance)
        .sort((a, b) => +new Date(a.dateNaissance!) - +new Date(b.dateNaissance!))[0], [people]);
    const personne = people.find((p) => p.id === choisi) ?? null;
    useEffect(() => {
        if (choisi !== null && people.length > 0 && !people.some((p) => p.id === choisi))
            setChoisi(null);
    }, [choisi, people]);
    const ancres = useAncrage(usePositionsValides(affiche.nodes), choisi);
    const noeudsGlisses = useGlissement(avecPoubelle(avecPastillesCoparents(avecRangsDesUnions(avecCartesInconnues(avecBoutonsEpouses(avecBarre(ancres, choisi, CARTE.width), choisi, people, unionsEnregistrees(unions), CARTE.width), tree.inconnus)))));
    const noeudsAffiches = useTaillesConnues(noeudsGlisses);
    return (<div className="flex-1 min-w-0 flex flex-col">
            
            <div className="min-h-[72px] flex-none flex flex-wrap items-center gap-x-6 gap-y-2.5 py-3 px-7 border-b border-trait-leger bg-carte select-none">
                <div className="flex flex-col gap-px min-w-0 flex-none max-w-[420px]">
                    <div className="font-display text-[28px] font-medium leading-none truncate">
                        {famille ? `Famille ${nomLisible(famille)}` : 'Arbre'}
                    </div>
                    <div className="text-xs text-encre-3">
                        {tree.totalPersonnes} individu{tree.totalPersonnes > 1 ? 's' : ''}
                        {generations > 0 && ` · ${generations} génération${generations > 1 ? 's' : ''}`}
                        {doyen && ` · depuis ${doyen.prenom} ${nomLisible(doyen.nom)}`}
                        {tree.error && ` · arbre indisponible : ${tree.error}`}
                    </div>
                </div>

                <ChoixBranche branche={branche} setBranche={setBranche} choisi={choisi} people={people} parentsDe={parentsDe}/>

                <RechercheArbre people={people} onChoisir={setChoisi} parentsDe={liens.parentsDe}/>

                <div className="flex gap-1.5 flex-wrap ml-auto flex-1 min-w-[260px] justify-end">
                    {origines.map((o) => {
            const on = !eteintes.has(o);
            const t = teinteDe(o);
            return (<button key={o} title={definitionOrigine(o)} onClick={() => setEteintes((s) => {
                    const n = new Set(s);
                    if (on)
                        n.add(o);
                    else
                        n.delete(o);
                    return n;
                })} className="flex items-center gap-1.5 h-[30px] px-[11px] rounded-[15px] border text-xs font-medium transition-all duration-200" style={{
                    borderColor: on ? t.c : 'var(--trait)',
                    background: on ? 'var(--blanc)' : 'transparent',
                    color: on ? 'var(--encre)' : 'var(--encre-3)',
                }}>
                                <span className="w-[7px] h-[7px] rounded-full" style={{ background: on ? t.c : 'var(--inactif)' }}/>
                                {TEINTES[o]?.court ?? o}
                            </button>);
        })}
                </div>

                <button onClick={() => setAjout(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint flex-none">
                    <UserPlus size={16}/>
                    Ajouter un membre
                </button>
            </div>

            <FilAriane people={people} choisi={choisi} onChoisir={setChoisi}/>

            <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 relative bg-papier">
                    <FondArbreDeVie />
                    {people.length === 0 ? (<ArbreVide onAjouter={() => setAjout(true)} charge={!tree.loading}/>) : (<ReactFlow nodes={noeudsAffiches} edges={avecNaturesTraits(affiche.edges)} nodeTypes={nodeTypesEdition} edgeTypes={edgeTypes} onNodeClick={(_, n: Node) => {
                if (n.type === 'carte')
                    setChoisi((n.data as DonneesCarte).individu.id);
            }} onPaneClick={() => setChoisi(null)} nodesConnectable={false} nodesDraggable={false} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.1} maxZoom={1.6} proOptions={{ hideAttribution: true }}>
                            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--points)"/>
                            <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'carte' ? teinteDe((n.data as DonneesCarte).origine).c : 'transparent')} nodeStrokeWidth={0} nodeBorderRadius={3} className="atelier-minimap" style={{ width: 200, height: 132 }}/>
                            <ZoomDock />
                            <CadrageFocus nodes={ancres} noyau={noyau} pivot={choisi === null ? null : `p-${choisi}`} parents={parentsChoisi}/>
                            <BoiteNoireArbre />
                            <GardeCamera />
                        </ReactFlow>)}
                </div>

                {personne && (<PersonDrawer personne={personne} origine={origineDuNom(personne.nom, index)} sources={sources.get(personne.id) ?? 0} onTraquer={() => traquer(personne.nom)}/>)}
            </div>

            <EditeurFamille />
            <EnfantsAussiSiens />
            {ajout && <FormulaireMembre nomInitial={nomDansArbre ?? undefined} onFermer={() => setAjout(false)}/>}
        </div>);
};
const ZoomDock = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const zoom = useStore((s) => s.transform[2]);
    const bouton = 'w-10 h-[38px] grid place-items-center text-encre-2 text-[17px] hover:bg-sepia-tint';
    return (<div className="absolute left-5 bottom-5 z-10 flex flex-col bg-carte border border-trait rounded-xl shadow-carte overflow-hidden">
            <button className={bouton} onClick={() => zoomIn({ duration: 300 })} title="Zoomer">
                <Plus />
            </button>
            <div className="h-[26px] grid place-items-center font-mono text-[10.5px] text-encre-3 border-y border-trait-leger">
                {Math.round(zoom * 100)}%
            </div>
            <button className={bouton} onClick={() => zoomOut({ duration: 300 })} title="Dézoomer">
                <Minus />
            </button>
            <button className={`${bouton} border-t border-trait-leger`} onClick={() => fitView({ duration: 450, padding: 0.15 })} title="Tout voir">
                <CornersOut />
            </button>
        </div>);
};
const PersonDrawer = ({ personne: p, origine, sources, onTraquer, }: {
    personne: Individu;
    origine: string;
    sources: number;
    onTraquer: () => void;
}) => {
    const t = teinteDe(origine);
    const lieu = p.lieuNaissance ?? p.lieuDeces;
    return (<aside className="w-[300px] flex-none bg-carte border-l border-trait-leger px-6 py-7 flex flex-col gap-5 overflow-y-auto *:shrink-0">
            <div className="h-[150px] rounded-[14px] border border-trait-leger grid place-items-center relative overflow-hidden" style={{ background: t.t }}>
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.c }}/>
                <div className="flex flex-col items-center gap-1.5 text-encre-3 text-[11.5px]">
                    <Image size={22}/>
                    Portrait ou document
                </div>
            </div>
            <PhotoFiche personne={p} origine={origine}/>
            <div className="flex flex-col gap-1.5">
                <div className="font-display text-[34px] leading-none font-medium">
                    {p.prenom} {nomLisible(p.nom)}
                </div>
                <div className="font-mono text-xs text-encre-2">{[periode(p) ?? 'dates inconnues', lieu].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-encre">
                <span className="w-2 h-2 rounded-full" style={{ background: t.c }}/>
                Patronyme d'origine {t.adjectif}
            </div>
            <div className="filet"/>
            <div className="flex flex-col gap-2 text-[13px] text-encre-2">
                <LigneCouples personne={p}/>
                <div className="flex justify-between gap-3">
                    <span>Pistes rattachées</span>
                    <span className="text-encre">{sources}</span>
                </div>
            </div>
            {p.notes && <p className="text-[13px] leading-normal text-encre-2 m-0 whitespace-pre-line">{p.notes}</p>}
            <ActionsFiche personne={p}/>
            <PistesPersonne personne={p}/>
            <RechercheWeb personne={p}/>
            <div className="mt-auto flex flex-col gap-2">
                <button onClick={onTraquer} className="flex items-center justify-center gap-2 h-10 rounded-[10px] border border-sepia text-sepia-deep text-[13.5px] font-medium hover:bg-sepia-tint">
                    <Binoculars />
                    Traquer ce nom
                </button>
            </div>
        </aside>);
};
const ArbreVide = ({ onAjouter, charge }: {
    onAjouter: () => void;
    charge: boolean;
}) => (<div className="absolute inset-0 grid place-items-center">
        {charge && (<div className="max-w-md text-center flex flex-col items-center gap-4">
                <div className="font-display text-[34px] leading-tight font-medium">L'arbre attend son premier membre.</div>
                <p className="text-sm text-encre-2 m-0">
                    Chaque personne ajoutée devient une carte mémorielle, colorée par l'origine de son patronyme.
                </p>
                <button onClick={onAjouter} className="flex items-center gap-2 h-[42px] px-[18px] rounded-[10px] border border-sepia text-sepia-deep text-sm font-medium hover:bg-sepia-tint">
                    <UserPlus />
                    Ajouter un membre
                </button>
            </div>)}
    </div>);
