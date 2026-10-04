import { useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { Comparaison } from '../../app/Incoherences';
import { useTreeStore } from '../../store/useTreeStore';
import { nomLisible } from '../../lib/origins';
import type { Individu } from './graphe';
const plat = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const FusionnerAvec = ({ personne, onFini }: {
    personne: Individu;
    onFini: () => void;
}) => {
    const tree = useTreeStore();
    const [ouvert, setOuvert] = useState(false);
    const [cherche, setCherche] = useState('');
    const [paire, setPaire] = useState<{
        garder: number;
        retirer: number;
    } | null>(null);
    const [enCours, setEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const trouves = useMemo(() => {
        const mots = plat(cherche).split(/\s+/).filter(Boolean);
        if (!mots.length)
            return [];
        return tree.people
            .filter((p) => p.id !== personne.id && mots.every((m) => plat(`${p.prenom} ${p.nom}`).includes(m)))
            .slice(0, 8);
    }, [cherche, tree.people, personne.id]);
    if (!ouvert) {
        return (<button type="button" onClick={() => setOuvert(true)} className="self-start text-[12.5px] text-sepia-deep hover:underline" data-action="fusionner-avec">
                Fusionner avec une autre fiche (la même personne saisie deux fois)…
            </button>);
    }
    if (paire) {
        return (<div className="rounded-[12px] border border-trait flex flex-col" data-bloc="fusionner-avec">
                <Comparaison garder={paire.garder} retirer={paire.retirer} enCours={enCours} erreur={erreur} onInverser={() => setPaire({ garder: paire.retirer, retirer: paire.garder })} onRetour={() => { setPaire(null); setErreur(null); }} onFusionner={() => {
                setEnCours(true);
                setErreur(null);
                void apiClient.post('/fusion', paire)
                    .then(async () => { await tree.fetchTree(); onFini(); })
                    .catch((e) => setErreur(e?.response?.data?.error ?? e.message))
                    .finally(() => setEnCours(false));
            }}/>
            </div>);
    }
    return (<div className="flex flex-col gap-2 rounded-[12px] border border-trait px-3 py-3" data-bloc="fusionner-avec">
            <div className="text-[13px] text-encre">Avec quelle fiche fusionner <b>{personne.prenom} {nomLisible(personne.nom)}</b> (n° {personne.id}) ?</div>
            <input autoFocus value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Prénom ou nom de l'autre fiche…" data-champ="fusion-cherche" className="h-9 px-3 rounded-[10px] bg-blanc border border-trait text-encre text-[13px] outline-none focus:border-sepia"/>
            {cherche.trim() && trouves.length === 0 && <div className="text-[12.5px] text-encre-3">Aucune fiche trouvée.</div>}
            <div className="flex flex-col gap-1">
                {trouves.map((p) => (<button key={p.id} type="button" onClick={() => setPaire({ garder: personne.id, retirer: p.id })} data-choix={p.id} className="text-left text-[13px] px-2.5 py-1.5 rounded-[8px] hover:bg-sepia-tint text-encre">
                        {p.prenom} {nomLisible(p.nom)} <span className="text-encre-3 text-[12px]">n° {p.id}</span>
                    </button>))}
            </div>
            <button type="button" onClick={() => { setOuvert(false); setCherche(''); }} className="self-start text-[12.5px] text-encre-3 underline">Annuler</button>
        </div>);
};
