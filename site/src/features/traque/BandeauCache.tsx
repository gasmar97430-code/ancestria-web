import apiClient from '../../api/client';
import { bilanCache, motCache, type ReleveCache } from './releveCache';
let sansCacheUneFois = false;
apiClient.interceptors.request.use((config) => {
    if (sansCacheUneFois && config.method === 'post' && config.url === '/traque/recherches' && config.data && typeof config.data === 'object') {
        config.data = { ...config.data, sansCache: true };
        sansCacheUneFois = false;
    }
    return config;
});
interface EtatMin {
    cle: string;
    cache?: ReleveCache | null;
}
interface RechercheMin {
    nom: string;
    prenom: string | null;
    commune: string | null;
    anneeDebut: number | null;
    anneeFin: number | null;
    zone: string | null;
}
interface Demande {
    nom: string;
    prenom: string;
    commune: string;
    anneeDebut: string;
    anneeFin: string;
    zone: string;
}
export const BandeauCache = ({ etats, recherche, enCours, lancer, }: {
    etats: EtatMin[] | null;
    recherche: RechercheMin | null;
    enCours: boolean;
    lancer: (d: Demande) => unknown;
}) => {
    const bilan = bilanCache(etats);
    if (!bilan || !recherche || !etats)
        return null;
    const lues = etats.filter((e) => motCache(e.cache)).map((e) => `${e.cle} ⟲ ${motCache(e.cache)}`);
    const relancer = () => {
        sansCacheUneFois = true;
        void lancer({
            nom: recherche.nom,
            prenom: recherche.prenom ?? '',
            commune: recherche.commune ?? '',
            anneeDebut: recherche.anneeDebut?.toString() ?? '',
            anneeFin: recherche.anneeFin?.toString() ?? '',
            zone: recherche.zone ?? 'reunion',
        });
    };
    return (<>
            {' · '}
            <span title={`Le serveur garde 24 h la réponse de chaque site.\n${lues.join('\n')}`}>{bilan}</span>
            {' · '}
            <button type="button" disabled={enCours} onClick={relancer} className="underline underline-offset-2 text-sepia hover:text-encre disabled:opacity-50">
                relancer sans le cache
            </button>
        </>);
};
