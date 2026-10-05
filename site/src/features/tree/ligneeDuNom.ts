import { create } from 'zustand';
import type { Id } from '../../types';
import { normaliser } from '../../lib/origins';
import { useTreeStore } from '../../store/useTreeStore';
import { useAtelierStore } from '../../store/useAtelierStore';
import { allerALaPersonne } from '../../store/versPersonne';
type PersonneMin = {
    id: Id;
    nom: string;
    prenom?: string;
    dateNaissance?: string | null;
};
type Lien = {
    parentId: Id;
    enfantId: Id;
};
const an = (d?: string | null) => (d ? new Date(d).getUTCFullYear() : null);
export interface Racine {
    id: Id;
    raison: string;
}
export function racineDuNom(nom: string, people: PersonneMin[], liens: Lien[]): Racine | null {
    const cle = normaliser(nom);
    const porte = new Set(people.filter((p) => normaliser(p.nom) === cle).map((p) => p.id));
    if (porte.size === 0)
        return null;
    const parId = new Map(people.map((p) => [p.id, p]));
    const parentsDe = new Map<Id, Id[]>();
    const enfantsDe = new Map<Id, Id[]>();
    for (const l of liens) {
        parentsDe.set(l.enfantId, [...(parentsDe.get(l.enfantId) ?? []), l.parentId]);
        enfantsDe.set(l.parentId, [...(enfantsDe.get(l.parentId) ?? []), l.enfantId]);
    }
    const racines = [...porte].filter((id) => !(parentsDe.get(id) ?? []).some((p) => porte.has(p)));
    const mesure = (r: Id) => {
        let gen = 0, nb = 0, plusAncienne = Infinity;
        let rang = [r];
        const vus = new Set<Id>();
        while (rang.length) {
            gen++;
            const suivant: Id[] = [];
            for (const id of rang) {
                if (vus.has(id))
                    continue;
                vus.add(id);
                nb++;
                const a = an(parId.get(id)?.dateNaissance);
                if (a !== null && a < plusAncienne)
                    plusAncienne = a;
                for (const e of enfantsDe.get(id) ?? [])
                    if (porte.has(e) && !vus.has(e))
                        suivant.push(e);
            }
            rang = suivant;
        }
        return { r, gen, nb, plusAncienne };
    };
    const tri = racines.map(mesure).sort((a, b) => b.gen - a.gen || b.nb - a.nb || a.plusAncienne - b.plusAncienne || a.r - b.r);
    const m = tri[0];
    const p = parId.get(m.r)!;
    const qui = `${p.prenom ?? ''} ${p.nom}`.trim();
    const egal = tri[1] && tri[1].gen === m.gen && tri[1].nb === m.nb && tri[1].plusAncienne === m.plusAncienne;
    const raison = racines.length === 1
        ? `${qui} : l'ancêtre le plus ancien de ce nom dans l'arbre.`
        : `${qui} : sa lignée est la plus longue de ce nom (${m.gen} génération${m.gen > 1 ? 's' : ''}, ${m.nb} porteur${m.nb > 1 ? 's' : ''}) ; ${racines.length} branches de ce nom ne sont pas reliées entre elles.`
            + (egal ? ' Deux branches sont à égalité : la fiche la plus ancienne (numéro) est prise.' : '');
    return { id: m.r, raison };
}
export function cercleLigneeDuNom(racine: Id, nom: string, people: PersonneMin[], l: {
    enfantsDe: Map<Id, Set<Id>>;
    conjointsDe: Map<Id, Set<Id>>;
}): Set<Id> {
    const cle = normaliser(nom);
    const porte = new Set(people.filter((p) => normaliser(p.nom) === cle).map((p) => p.id));
    const net = new Set<Id>([racine]);
    const enfantsRacine = l.enfantsDe.get(racine) ?? new Set<Id>();
    for (const c of l.conjointsDe.get(racine) ?? [])
        if ([...(l.enfantsDe.get(c) ?? [])].some((e) => enfantsRacine.has(e)))
            net.add(c);
    const pile = [racine];
    const vus = new Set<Id>();
    while (pile.length) {
        const id = pile.pop()!;
        if (vus.has(id))
            continue;
        vus.add(id);
        for (const e of l.enfantsDe.get(id) ?? []) {
            net.add(e);
            if (porte.has(e))
                pile.push(e);
        }
    }
    return net;
}
export const useLigneeDuNom = create<{
    racine: Id | null;
    nom: string | null;
    raison: string | null;
}>(() => ({ racine: null, nom: null, raison: null }));
export function poserLignee(nom: string, r: Racine | null): void {
    useLigneeDuNom.setState({ racine: r?.id ?? null, nom: r ? nom : null, raison: r?.raison ?? null });
}
export function cercleSelonArrivee(choisi: Id | null, people: PersonneMin[], l: {
    enfantsDe: Map<Id, Set<Id>>;
    conjointsDe: Map<Id, Set<Id>>;
}): Set<Id> | null {
    const { racine, nom } = useLigneeDuNom.getState();
    if (racine !== null && choisi !== racine)
        poserLignee('', null);
    if (choisi === null || racine === null || nom === null || choisi !== racine)
        return null;
    const tous = useTreeStore.getState().people as PersonneMin[];
    return cercleLigneeDuNom(racine, nom, tous.length ? tous : people, l);
}
const estLeNom = (saisie: string, nom: string) => normaliser(saisie.trim()) === normaliser(nom);
export function racineEnTete<T extends {
    id: Id;
    nom: string;
}>(saisie: string, gens: T[]): T[] {
    if (gens.length < 2 || !estLeNom(saisie, gens[0].nom))
        return gens;
    const { people, relationships } = useTreeStore.getState();
    const r = racineDuNom(gens[0].nom, people as PersonneMin[], relationships);
    const i = r ? gens.findIndex((g) => g.id === r.id) : -1;
    return i > 0 ? [gens[i], ...gens.slice(0, i), ...gens.slice(i + 1)] : gens;
}
export function ouvrirSaisie(saisie: string, p: {
    id: Id;
    nom: string;
}): void {
    if (estLeNom(saisie, p.nom))
        useAtelierStore.getState().ouvrirDansArbre(p.nom);
    else
        allerALaPersonne(p.id, p.nom);
}
