import type { Id, Person, Relationship, Union, UnionChild } from '../../../types';
export type Couple = Union & {
    virtuelle?: true;
};
export type Raison = 'enregistre' | 'deux-parents' | 'coparents-sans-union' | 'foyer-du-parent';
export interface Constat {
    genre: 'coparents-sans-union' | 'autre-parent-non-enregistre' | 'parent-a-plusieurs-couples' | 'plusieurs-rattachements' | 'plusieurs-couples-possibles';
    enfantId: Id;
    parents: Id[];
    coupleId: Id | null;
}
export interface Topologie {
    couples: Couple[];
    rattachements: UnionChild[];
    raisons: Map<Id, Raison>;
    constats: Constat[];
}
const BASE = 1000000;
export const idCoupleVirtuel = (a: Id, b: Id): Id => -(Math.min(a, b) * BASE + Math.max(a, b));
export const estVirtuel = (u: {
    id: Id;
}): boolean => u.id < 0;
export const unionsEnregistrees = <U extends {
    id: Id;
}>(unions: U[]): U[] => unions.filter((u) => !estVirtuel(u));
const paire = (a: Id, b: Id) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const croissant = (a: Id, b: Id) => a - b;
export function normaliserFoyers(people: Person[], unions: Union[], relationships: Relationship[], unionChildren: UnionChild[]): Topologie {
    const connus = new Set(people.map((p) => p.id));
    const valides = unions
        .filter((u) => connus.has(u.partenaire1Id) && connus.has(u.partenaire2Id) && u.partenaire1Id !== u.partenaire2Id)
        .sort((a, b) => a.id - b.id);
    const unionParId = new Map(valides.map((u) => [u.id, u]));
    const unionDeLaPaire = new Map<string, Union>();
    for (const u of valides) {
        const k = paire(u.partenaire1Id, u.partenaire2Id);
        if (!unionDeLaPaire.has(k))
            unionDeLaPaire.set(k, u);
    }
    const parentsDe = new Map<Id, Map<Id, Set<string>>>();
    for (const r of relationships) {
        if (!connus.has(r.parentId) || !connus.has(r.enfantId) || r.parentId === r.enfantId)
            continue;
        const m = parentsDe.get(r.enfantId) ?? parentsDe.set(r.enfantId, new Map()).get(r.enfantId)!;
        (m.get(r.parentId) ?? m.set(r.parentId, new Set()).get(r.parentId)!).add(r.typeLien);
    }
    const explicites = new Map<Id, Set<Id>>();
    for (const uc of unionChildren) {
        if (!connus.has(uc.enfantId) || !unionParId.has(uc.unionId))
            continue;
        (explicites.get(uc.enfantId) ?? explicites.set(uc.enfantId, new Set()).get(uc.enfantId)!).add(uc.unionId);
    }
    const enfants = [...new Set([...parentsDe.keys(), ...explicites.keys()])].sort(croissant);
    const rattache = new Map<Id, Id>();
    const raisons = new Map<Id, Raison>();
    const constats: Constat[] = [];
    const virtuels = new Map<Id, Couple>();
    const seuls: Id[] = [];
    for (const enfant of enfants) {
        const liens = parentsDe.get(enfant) ?? new Map<Id, Set<string>>();
        const parents = [...liens.keys()].sort(croissant);
        const biologique = (p: Id) => liens.get(p)?.has('Biological') ?? false;
        const rangPaire = (a: Id, b: Id) => (biologique(a) && biologique(b) ? 0 : 1) * BASE * BASE + Math.min(a, b) * BASE + Math.max(a, b);
        const dits = [...(explicites.get(enfant) ?? [])].sort(croissant);
        if (dits.length > 0) {
            const score = (id: Id) => {
                const u = unionParId.get(id)!;
                return 2 - Number(liens.has(u.partenaire1Id)) - Number(liens.has(u.partenaire2Id));
            };
            const choisi = dits.reduce((m, id) => (score(id) < score(m) ? id : m), dits[0]);
            rattache.set(enfant, choisi);
            raisons.set(enfant, 'enregistre');
            if (dits.length > 1)
                constats.push({ genre: 'plusieurs-rattachements', enfantId: enfant, parents, coupleId: choisi });
            continue;
        }
        const paires: [
            Id,
            Id
        ][] = [];
        for (let i = 0; i < parents.length; i += 1)
            for (let j = i + 1; j < parents.length; j += 1)
                paires.push([parents[i], parents[j]]);
        paires.sort((x, y) => rangPaire(x[0], x[1]) - rangPaire(y[0], y[1]));
        const unies = paires.filter(([a, b]) => unionDeLaPaire.has(paire(a, b)));
        if (unies.length > 0) {
            const u = unionDeLaPaire.get(paire(unies[0][0], unies[0][1]))!;
            rattache.set(enfant, u.id);
            raisons.set(enfant, 'deux-parents');
            if (unies.length > 1)
                constats.push({ genre: 'plusieurs-couples-possibles', enfantId: enfant, parents, coupleId: u.id });
            continue;
        }
        if (paires.length > 0) {
            const [a, b] = paires[0];
            const id = idCoupleVirtuel(a, b);
            if (!virtuels.has(id))
                virtuels.set(id, { id, partenaire1Id: Math.min(a, b), partenaire2Id: Math.max(a, b), typeUnion: 'Coparents', statut: 'Active', virtuelle: true });
            rattache.set(enfant, id);
            raisons.set(enfant, 'coparents-sans-union');
            constats.push({ genre: 'coparents-sans-union', enfantId: enfant, parents, coupleId: id });
            continue;
        }
        if (parents.length === 1)
            seuls.push(enfant);
    }
    const couplesDe = new Map<Id, Id[]>();
    const compter = (c: {
        id: Id;
        partenaire1Id: Id;
        partenaire2Id: Id;
    }) => {
        for (const p of [c.partenaire1Id, c.partenaire2Id])
            (couplesDe.get(p) ?? couplesDe.set(p, []).get(p)!).push(c.id);
    };
    for (const u of unionDeLaPaire.values())
        compter(u);
    for (const c of virtuels.values())
        compter(c);
    const partenaires = (id: Id) => {
        const c = unionParId.get(id) ?? virtuels.get(id)!;
        return [c.partenaire1Id, c.partenaire2Id];
    };
    for (const enfant of seuls) {
        const parent = [...parentsDe.get(enfant)!.keys()][0];
        const siens = couplesDe.get(parent) ?? [];
        if (siens.length === 1 && !partenaires(siens[0]).includes(enfant)) {
            rattache.set(enfant, siens[0]);
            raisons.set(enfant, 'foyer-du-parent');
            constats.push({ genre: 'autre-parent-non-enregistre', enfantId: enfant, parents: [parent], coupleId: siens[0] });
        }
        else if (siens.length > 1) {
            constats.push({ genre: 'parent-a-plusieurs-couples', enfantId: enfant, parents: [parent], coupleId: null });
        }
    }
    return {
        couples: [...valides, ...[...virtuels.values()].sort((a, b) => a.partenaire1Id - b.partenaire1Id || a.partenaire2Id - b.partenaire2Id)],
        rattachements: [...rattache.entries()].sort((a, b) => a[0] - b[0]).map(([enfantId, unionId]) => ({ enfantId, unionId })),
        raisons,
        constats,
    };
}
export function relationsDePlacement(relationships: Relationship[], couples: {
    id: Id;
    partenaire1Id: Id;
    partenaire2Id: Id;
}[], rattachements: UnionChild[]): Relationship[] {
    const parId = new Map(couples.map((c) => [c.id, c]));
    const deja = new Set(relationships.map((r) => `${r.parentId}>${r.enfantId}`));
    const ajouts: Relationship[] = [];
    for (const r of rattachements) {
        const c = parId.get(r.unionId);
        if (!c)
            continue;
        for (const p of [c.partenaire1Id, c.partenaire2Id]) {
            const cle = `${p}>${r.enfantId}`;
            if (p === r.enfantId || deja.has(cle))
                continue;
            deja.add(cle);
            ajouts.push({ parentId: p, enfantId: r.enfantId, typeLien: 'Foyer' });
        }
    }
    return ajouts.length > 0 ? [...relationships, ...ajouts] : relationships;
}
