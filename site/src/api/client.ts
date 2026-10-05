// ---- LA PRISE DU SITE (seule pièce du site dans la copie du bureau) ----
//
// Au bureau, ce fichier envoie les demandes de l'écran au serveur du PC (/api).
// Sur le site, le MÊME objet (axios, mêmes adresses, mêmes réponses) est servi
// par src-web/prise/routes.ts depuis Supabase. scripts/copier-bureau.mjs ne
// l'écrase jamais ; tout le reste de src/ est la copie telle quelle du bureau.

import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from 'axios';
import { repondre } from '../../src-web/prise/routes';
import { corpsMisEnForme } from '../../src-web/forme-des-noms/formeDesNoms'; // 06/10

const adaptateur: AxiosAdapter = async (config) => {
    const adresse = new URL(config.url ?? '/', 'http://prise.local');
    const params: Record<string, string> = { ...Object.fromEntries(adresse.searchParams) };
    for (const [k, v] of Object.entries((config.params ?? {}) as Record<string, unknown>)) if (v !== undefined && v !== null) params[k] = String(v);
    let corps: unknown = config.data;
    if (typeof corps === 'string') {
        try {
            corps = JSON.parse(corps);
        } catch {
            /* corps non JSON : gardé tel quel */
        }
    }
    corps = corpsMisEnForme((config.method ?? 'get').toUpperCase(), adresse.pathname, corps); // 06/10 : nom en MAJUSCULES, prénom « Marie-Thérèse » (src-web/forme-des-noms)
    const r = await repondre((config.method ?? 'get').toUpperCase(), adresse.pathname, params, corps);
    const reponse: AxiosResponse = { data: r.data, status: r.status, statusText: String(r.status), headers: new AxiosHeaders(), config, request: null };
    if (r.status >= 400) {
        const message = (r.data as { error?: string } | null)?.error ?? `Erreur ${r.status}`;
        throw new AxiosError(message, String(r.status), config, null, reponse);
    }
    return reponse;
};

const apiClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    adapter: adaptateur,
});

export default apiClient;

// ---- FIN LA PRISE DU SITE ----
