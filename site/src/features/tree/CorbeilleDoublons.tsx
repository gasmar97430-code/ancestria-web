import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useDoublonsVrais } from './doublonsVrais';
import type { Node } from 'reactflow';
import { Trash } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import { messageErreur } from './edition';
import { CARTE } from './graphe';
const COTE = 24;
const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s\-'’]+/g, ' ').trim();
const cle = (p: {
    prenom: string;
    nom: string;
}) => `${plat(p.prenom)}|${plat(p.nom)}`;
export function idsEnDouble(people: {
    id: number;
    prenom: string;
    nom: string;
}[]): Set<number> {
    const parCle = new Map<string, number[]>();
    for (const p of people) {
        if (plat(p.nom) === '?' || !plat(p.prenom) || plat(p.prenom) === '?')
            continue;
        const l = parCle.get(cle(p));
        if (l)
            l.push(p.id);
        else
            parCle.set(cle(p), [p.id]);
    }
    return new Set([...parCle.values()].filter((l) => l.length > 1).flat());
}
export const ConfirmationSurCarte = ({ personneId, fermer }: {
    personneId: number;
    fermer: () => void;
}) => {
    const tree = useTreeStore();
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const boite = useRef<HTMLDivElement>(null);
    const [enHaut, setEnHaut] = useState(false);
    useLayoutEffect(() => {
        const b = boite.current?.getBoundingClientRect();
        if (b && !enHaut && b.bottom > window.innerHeight - 8)
            setEnHaut(true);
    }, [enHaut]);
    const personne = tree.people.find((p) => p.id === personneId);
    if (!personne)
        return null;
    const parents = tree.relationships.filter((r) => r.enfantId === personneId).length;
    const enfants = tree.relationships.filter((r) => r.parentId === personneId).length;
    const couples = tree.unions.filter((u) => u.partenaire1Id === personneId || u.partenaire2Id === personneId).length;
    const jumelles = tree.people.filter((p) => p.id !== personneId && cle(p) === cle(personne));
    const qui = `${personne.prenom} ${nomLisible(personne.nom)}`;
    const supprimer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            await apiClient.delete(`/people/${personneId}`);
            fermer();
            await tree.fetchTree();
        }
        catch (err) {
            setErreur(messageErreur(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    return (<div ref={boite} className={`nodrag nopan nowheel absolute right-0 ${enHaut ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-[300px] rounded-[12px] border bg-carte shadow-lg px-3 py-2.5 flex flex-col gap-2 text-[12.5px] text-left cursor-default`} style={{ borderColor: 'var(--o-afrique)' }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} data-noeud="confirmation-sur-carte">
            <div className="text-encre">
                Supprimer <b>{qui}</b> (n° {personneId}) ? Partent avec la fiche : {parents} lien{parents > 1 ? 's' : ''} vers ses parents, {enfants} lien{enfants > 1 ? 's' : ''} vers ses enfants, {couples} couple{couples > 1 ? 's' : ''}.
            </div>
            {jumelles.length > 0 && (<div className="text-encre-2">
                    Même nom : fiche{jumelles.length > 1 ? 's' : ''} n° {jumelles.map((j) => j.id).join(', ')}.
                    {(enfants > 0 || couples > 0) && <> Si c'est la même personne, mieux vaut <b>fusionner</b> (« Incohérences » → « Comparer et fusionner… ») : ses liens seront gardés.</>}
                </div>)}
            <div className="text-encre-3 text-[11px]">Copie de sécurité de la base faite juste avant.</div>
            <div className="flex gap-2">
                <button onClick={fermer} className="h-8 px-3 rounded-[9px] border border-trait text-encre-2">Non</button>
                <button disabled={envoi} onClick={() => void supprimer()} className="min-h-8 py-1 px-3 rounded-[9px] border disabled:opacity-40 text-left" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} data-action="confirmer-sur-carte">
                    Oui, supprimer {qui}
                </button>
            </div>
            {erreur && <div style={{ color: 'var(--o-afrique)' }}>La suppression n'a pas été faite : {erreur}</div>}
        </div>);
};
export const BoutonCorbeilleDoublon = memo(({ data }: {
    data: {
        personneId: number;
    };
}) => {
    const [ouvert, setOuvert] = useState(false);
    return (<div className="relative" style={{ width: COTE, height: COTE }}>
            <button className="nodrag nopan grid place-items-center rounded-[7px] bg-carte border hover:bg-sepia-tint" style={{ width: COTE, height: COTE, borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} onClick={(e) => {
            e.stopPropagation();
            setOuvert((o) => !o);
        }} title="Nom en double : supprimer cette fiche (la confirmation dit ce qui part)" data-action="corbeille-doublon">
                <Trash size={13}/>
            </button>
            {ouvert && <ConfirmationSurCarte personneId={data.personneId} fermer={() => setOuvert(false)}/>}
        </div>);
});
BoutonCorbeilleDoublon.displayName = 'BoutonCorbeilleDoublon';
export function avecCorbeillesDoublons(nodes: Node[], people: {
    id: number;
    prenom: string;
    nom: string;
}[] = useTreeStore.getState().people as never[]): Node[] {
    const vrais = useDoublonsVrais.getState().ids;
    const doubles = new Set([...idsEnDouble(people)].filter((id) => vrais?.has(id)));
    if (doubles.size === 0)
        return nodes;
    const ajouts: Node[] = [];
    for (const n of nodes) {
        if (n.type !== 'carte' || n.hidden)
            continue;
        const brut = (n.data as {
            individu?: {
                id?: number | string;
            };
        })?.individu?.id ?? (n.id.startsWith('p-') ? n.id.slice(2) : undefined);
        const id = Number(brut);
        if (!Number.isFinite(id) || !doubles.has(id))
            continue;
        ajouts.push({
            id: `doublon-${id}`,
            type: 'corbeilleDoublon',
            position: { x: n.position.x + (n.width ?? CARTE.width) - COTE - 6, y: n.position.y + (n.height ?? CARTE.height) - COTE - 6 },
            data: { personneId: id },
            width: COTE,
            height: COTE,
            selectable: false,
            draggable: false,
            zIndex: 20,
        });
    }
    return ajouts.length ? [...nodes, ...ajouts] : nodes;
}
