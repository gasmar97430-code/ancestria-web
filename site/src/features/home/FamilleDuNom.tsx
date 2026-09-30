import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, Binoculars, UserPlus } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { useAtelierStore } from '../../store/useAtelierStore';
import { allerALaPersonne } from '../../store/versPersonne';
import { nomLisible, normaliser } from '../../lib/origins';
import { liensDeFamille } from '../tree/focus';
import { periode, type Individu } from '../tree/graphe';
import { FormulaireMembre } from '../tree/FormulaireMembre';
import type { Id } from '../../types';
interface Suivi {
    recherches: {
        id: Id;
        nom: string;
        prenom: string | null;
        commune: string | null;
        lanceeLe: string;
        proposees: number;
        gardees: number;
        ecartees: number;
    }[];
    pistesGardees: {
        id: Id;
        titre: string;
        url: string;
        source: string;
        dateSource: string | null;
        personnes: {
            id: Id;
            prenom: string;
            nom: string;
            role: string;
        }[];
    }[];
}
interface Branche {
    souche: Individu;
    membres: {
        p: Individu;
        generation: number;
    }[];
}
const an = (p: Individu) => (p.dateNaissance ? new Date(p.dateNaissance).getTime() : Number.POSITIVE_INFINITY);
const court = (p: Individu | undefined) => (p ? `${p.prenom} ${nomLisible(p.nom)}` : '?');
export function branchesDuNom(nom: string, people: Individu[], parentsDe: Map<Id, Set<Id>>): Branche[] {
    const n = normaliser(nom);
    const porteurs = people.filter((p) => normaliser(p.nom) === n);
    const ids = new Set(porteurs.map((p) => p.id));
    const chef = new Map<Id, Id>(porteurs.map((p) => [p.id, p.id]));
    const trouver = (x: Id): Id => {
        while (chef.get(x) !== x)
            x = chef.get(x)!;
        return x;
    };
    for (const p of porteurs)
        for (const par of parentsDe.get(p.id) ?? [])
            if (ids.has(par))
                chef.set(trouver(p.id), trouver(par));
    const groupes = new Map<Id, Individu[]>();
    for (const p of porteurs) {
        const c = trouver(p.id);
        groupes.set(c, [...(groupes.get(c) ?? []), p]);
    }
    const branches: Branche[] = [];
    for (const membres of groupes.values()) {
        const dans = new Set(membres.map((m) => m.id));
        const generation = (id: Id, vus = new Set<Id>()): number => {
            if (vus.has(id))
                return 0;
            vus.add(id);
            const hauts = [...(parentsDe.get(id) ?? [])].filter((x) => dans.has(x));
            return hauts.length ? 1 + Math.max(...hauts.map((h) => generation(h, vus))) : 0;
        };
        const tries = membres.map((p) => ({ p, generation: generation(p.id) }));
        const enfants = new Map<Id, Individu[]>();
        for (const m of membres)
            for (const par of parentsDe.get(m.id) ?? [])
                if (dans.has(par))
                    enfants.set(par, [...(enfants.get(par) ?? []), m]);
        const racines = membres.filter((m) => ![...(parentsDe.get(m.id) ?? [])].some((x) => dans.has(x))).sort((a, b) => an(a) - an(b) || a.id - b.id);
        const ordre: Id[] = [];
        const poser = (p: Individu) => {
            if (ordre.includes(p.id))
                return;
            ordre.push(p.id);
            [...(enfants.get(p.id) ?? [])].sort((a, b) => an(a) - an(b) || a.id - b.id).forEach(poser);
        };
        racines.forEach(poser);
        tries.sort((a, b) => ordre.indexOf(a.p.id) - ordre.indexOf(b.p.id));
        branches.push({ souche: racines[0] ?? membres[0], membres: tries });
    }
    return branches.sort((a, b) => b.membres.length - a.membres.length || an(a.souche) - an(b.souche));
}
export const FamilleDuNom = ({ nom }: {
    nom: string;
}) => {
    const tree = useTreeStore();
    const { traquer } = useAtelierStore();
    const people = tree.people as Individu[];
    const [suivi, setSuivi] = useState<Suivi | null>(null);
    const [pistes, setPistes] = useState<Map<Id, number>>(new Map());
    const [ajout, setAjout] = useState(false);
    const liens = useMemo(() => liensDeFamille(tree.unions, tree.relationships, tree.unionChildren), [tree.unions, tree.relationships, tree.unionChildren]);
    const parId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
    const branches = useMemo(() => branchesDuNom(nom, people, liens.parentsDe), [nom, people, liens]);
    const total = branches.reduce((t, b) => t + b.membres.length, 0);
    useEffect(() => {
        let vivant = true;
        setSuivi(null);
        apiClient
            .get('/suivi-du-nom', { params: { nom } })
            .then((r) => vivant && setSuivi(r.data as Suivi))
            .catch(() => vivant && setSuivi({ recherches: [], pistesGardees: [] }));
        apiClient
            .get('/traque/rattachements')
            .then((r) => vivant && setPistes(new Map((r.data as {
            individuId: Id;
            pistes: number;
        }[]).map((x) => [x.individuId, x.pistes]))))
            .catch(() => undefined);
        return () => {
            vivant = false;
        };
    }, [nom]);
    const titre = 'text-[10.5px] tracking-[.12em] uppercase text-sepia';
    return (<section className="flex flex-col gap-5" data-bloc="famille-du-nom">
            
            <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline gap-3">
                    <span className={titre}>Dans votre arbre</span>
                    <span className="text-xs text-encre-3">
                        {total === 0
            ? 'aucun porteur'
            : `${total} porteur${total > 1 ? 's' : ''} · ${branches.length} branche${branches.length > 1 ? 's' : ''}`}
                    </span>
                </div>

                {total === 0 ? (<div className="flex items-center gap-3 flex-wrap bg-papier rounded-[14px] px-5 py-4">
                        <span className="text-sm text-encre-2">Aucun {nomLisible(nom)} dans votre arbre pour l'instant.</span>
                        <button onClick={() => setAjout(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint">
                            <UserPlus size={16}/>
                            Ajouter un {nomLisible(nom)}
                        </button>
                    </div>) : (<div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {branches.map((b) => (<div key={b.souche.id} className="bg-papier rounded-[14px] px-4 py-3 flex flex-col gap-0.5" data-branche={b.souche.id}>
                                <div className="text-xs text-encre-3 pb-1.5">
                                    {branches.length > 1 ? 'Branche de ' : 'Souche : '}
                                    <span className="text-encre font-medium">{court(b.souche)}</span>
                                    {periode(b.souche) ? ` (${periode(b.souche)})` : ''}
                                    {b.membres.length > 1 ? ` · ${b.membres.length} porteurs` : ''}
                                </div>
                                {b.membres.map(({ p, generation }) => {
                    const parents = [...(liens.parentsDe.get(p.id) ?? [])].map((id) => parId.get(id)).filter(Boolean) as Individu[];
                    const conjoints = [...(liens.conjointsDe.get(p.id) ?? [])].map((id) => parId.get(id)).filter(Boolean) as Individu[];
                    const nbEnfants = liens.enfantsDe.get(p.id)?.size ?? 0;
                    const femme = p.genre === 'F';
                    const details = [
                        parents.length ? `${femme ? 'fille' : 'fils'} de ${parents.map(court).join(' et ')}` : 'parents non saisis',
                        conjoints.length ? `${femme ? 'épouse' : 'époux'} de ${conjoints.map(court).join(', ')}` : null,
                        nbEnfants ? `${nbEnfants} enfant${nbEnfants > 1 ? 's' : ''}` : null,
                        pistes.get(p.id) ? `${pistes.get(p.id)} piste${pistes.get(p.id)! > 1 ? 's' : ''} rattachée${pistes.get(p.id)! > 1 ? 's' : ''}` : null,
                    ].filter(Boolean);
                    return (<button key={p.id} onClick={() => allerALaPersonne(p.id, nom)} title="Ouvrir l'arbre sur cette personne" className="text-left rounded-lg px-2 py-1.5 hover:bg-sepia-tint transition-colors flex flex-col" style={{ paddingLeft: 8 + Math.min(generation, 6) * 18 }} data-personne={p.id}>
                                            <span className="text-[14px] text-encre">
                                                {generation > 0 && <span className="text-encre-3 mr-1.5">└</span>}
                                                <span className="font-medium">{p.prenom}</span> {nomLisible(p.nom)}
                                                <span className="font-mono text-[11.5px] text-encre-3 ml-2">
                                                    {[periode(p), p.lieuNaissance].filter(Boolean).join(' · ')}
                                                </span>
                                            </span>
                                            <span className="text-[12px] text-encre-3 leading-snug">{details.join(' · ')}</span>
                                        </button>);
                })}
                            </div>))}
                    </div>)}
            </div>

            
            <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline gap-3">
                    <span className={titre}>Suivi du nom</span>
                    {suivi && (<span className="text-xs text-encre-3">
                            {suivi.recherches.length === 0
                ? 'jamais traqué'
                : `${suivi.recherches.length} traque${suivi.recherches.length > 1 ? 's' : ''} menée${suivi.recherches.length > 1 ? 's' : ''}`}
                        </span>)}
                </div>
                {suivi === null ? (<span className="text-xs text-encre-3">lecture…</span>) : suivi.recherches.length === 0 ? (<div className="flex items-center gap-3 flex-wrap bg-papier rounded-[14px] px-5 py-4">
                        <span className="text-sm text-encre-2">Ce nom n'a pas encore été cherché dans les archives.</span>
                        <button onClick={() => traquer(nom)} className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint">
                            <Binoculars size={16}/>
                            Lancer la traque
                        </button>
                    </div>) : (<div className="bg-papier rounded-[14px] px-4 py-3 flex flex-col gap-1.5">
                        {suivi.recherches.slice(0, 6).map((r) => (<div key={r.id} className="text-[13px] text-encre-2 flex flex-wrap gap-x-2" data-traque={r.id}>
                                <span className="font-mono text-[11.5px] text-encre-3">{new Date(r.lanceeLe).toLocaleDateString('fr-FR')}</span>
                                <span className="text-encre">
                                    {[r.prenom, nomLisible(r.nom)].filter(Boolean).join(' ')}
                                    {r.commune ? ` · ${r.commune}` : ''}
                                </span>
                                <span>
                                    — {r.proposees + r.gardees + r.ecartees} pistes : {r.gardees} gardée{r.gardees > 1 ? 's' : ''}, {r.ecartees} écartée
                                    {r.ecartees > 1 ? 's' : ''}, {r.proposees} à trier
                                </span>
                            </div>))}
                        {suivi.recherches.length > 6 && <span className="text-xs text-encre-3">… et {suivi.recherches.length - 6} plus anciennes</span>}
                        {suivi.pistesGardees.length > 0 && (<div className="flex flex-col gap-1 pt-2 mt-1 border-t border-trait-leger">
                                <span className="text-xs text-encre-3">Pistes gardées</span>
                                {suivi.pistesGardees.map((g) => (<div key={g.id} className="text-[13px] flex flex-wrap items-center gap-x-2">
                                        <a href={g.url} target="_blank" rel="noreferrer" className="text-encre hover:underline inline-flex items-center gap-1">
                                            {g.titre} <ArrowSquareOut size={12}/>
                                        </a>
                                        <span className="text-xs text-encre-3">
                                            {[g.source, g.dateSource].filter(Boolean).join(' · ')}
                                            {g.personnes.length ? ` · rattachée à ${g.personnes.map((x) => `${x.prenom} ${nomLisible(x.nom)}`).join(', ')}` : ' · rattachée à personne'}
                                        </span>
                                    </div>))}
                            </div>)}
                    </div>)}
            </div>

            {ajout && <FormulaireMembre nomInitial={nom} onFermer={() => setAjout(false)}/>}
        </section>);
};
