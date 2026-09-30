// ---- PRISE DU SITE : LES ADRESSES DU SERVEUR DU BUREAU, SERVIES DEPUIS SUPABASE ----
//
// L'écran du bureau appelle /api/tree, /api/patronymes… Ici, chaque adresse
// reçoit la réponse que le serveur du PC aurait donnée, de la même forme.
// Étape 1a (30/09) : la LECTURE. Ce qui n'est pas encore branché répond
// « pas encore disponible en ligne » ; ce que le site ne peut pas faire
// (fouiller les archives depuis le PC, carnet du téléphone, fichiers, IA locale)
// le dit clairement. Rien n'est inventé.

import { chargerArbre } from './donnees';
import repertoire from '../copie-serveur/patronymes.json';

export interface Reponse {
    status: number;
    data: unknown;
}

const ok = (data: unknown): Reponse => ({ status: 200, data });
const pasEnLigne = (quoi: string): Reponse => ({ status: 501, data: { error: `${quoi} : pas disponible sur le site en ligne (c'est l'Ancestria de votre ordinateur qui le fait).` } });
const pasEncore = (): Reponse => ({ status: 501, data: { error: 'Pas encore disponible sur le site en ligne.' } });

// Le répertoire, rangé comme le serveur du bureau : les plus répandus d'abord, puis par nom.
type EntreeRepertoire = { nom: string; origine: string; procede?: string | null; certitude?: string; frequence?: number | null; rang?: number | null; notes?: string | null };
const PATRONYMES = (repertoire as { patronymes: EntreeRepertoire[] }).patronymes
    .map((p, k) => ({ id: k + 1, nom: p.nom, origine: p.origine, procede: p.procede ?? null, certitude: p.certitude ?? 'Non documentee', frequence: p.frequence ?? null, rang: p.rang ?? null, notes: p.notes ?? null }))
    .sort((a, b) => (b.frequence ?? -1) - (a.frequence ?? -1) || (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));

const LECTURES: Record<string, (params: Record<string, string>) => Promise<Reponse> | Reponse> = {
    '/tree': async () => {
        const a = await chargerArbre();
        return ok({ ...a, meta: { total: a.people.length, returned: a.people.length, limit: 2000, truncated: false } });
    },
    '/patronymes': () => ok({ total: PATRONYMES.length, items: PATRONYMES }),
    // Étapes suivantes : fiches « ? », rangs des unions, foyers, natures, genres dits par la famille.
    '/parents-inconnus': () => ok([]),
    '/rangs-unions': () => ok([]),
    '/foyers-membres': () => ok([]),
    '/natures-filiation': () => ok([]),
    '/genres-libelles': () => ok([]),
    '/incoherences': () => ok({ incoherences: [], ignorees: 0, dureeMs: 0 }),
    '/suggestions': () => ok({ suggestions: [], refusees: 0, dureeMs: 0 }),
    '/suivi-du-nom': () => ok({ recherches: [], pistesGardees: [] }),
    '/traque/variantes': () => ok([]),
    '/traque/zones': () => ok([]),
    '/traque/sources': () => ok([]),
    '/traque/recherches': () => ok([]),
    '/carnet/notes': () => ok([]),
    '/recherche-globale': () => ok({ personnes: [], patronymes: [], pistes: [], dureeMs: 0 }),
};

export async function repondre(methode: string, chemin: string, params: Record<string, string>, _corps: unknown): Promise<Reponse> {
    try {
        if (methode === 'GET') {
            const lecture = LECTURES[chemin];
            if (lecture) return await lecture(params);
            if (chemin.startsWith('/carnet')) return pasEnLigne('Le carnet du téléphone');
            if (chemin.startsWith('/gedcom')) return pasEnLigne('Les fichiers GEDCOM');
            if (chemin.startsWith('/ia') || chemin.startsWith('/assistant')) return pasEnLigne('L’assistant');
            if (chemin.startsWith('/pistes-personne')) return ok([]);
            return pasEncore();
        }
        if (chemin === '/sauvegarde') return pasEnLigne('La sauvegarde de la base');
        if (chemin.startsWith('/traque')) return pasEnLigne('La traque dans les archives');
        if (chemin.startsWith('/boite-noire')) return ok({ ok: true });
        return pasEncore();
    } catch (e) {
        return { status: 500, data: { error: e instanceof Error ? e.message : String(e) } };
    }
}

// ---- FIN PRISE : ADRESSES ----
