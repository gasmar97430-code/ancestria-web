import { useEffect, useState } from 'react';
import { User } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { allerALaPersonne } from '../../store/versPersonne';
import { nomLisible } from '../../lib/origins';
import type { Id } from '../../types';
interface Trouvee {
    id: Id;
    prenom: string;
    nom: string;
    naissance: number | null;
    deces: number | null;
    lieu: string | null;
}
export const PersonnesTapees = ({ saisie, aucunNom }: {
    saisie: string;
    aucunNom: boolean;
}) => {
    const [gens, setGens] = useState<Trouvee[]>([]);
    const mots = saisie.trim().split(/\s+/).filter((m) => m.length >= 2);
    const actif = mots.length >= 2 || (aucunNom && mots.length === 1);
    useEffect(() => {
        if (!actif) {
            setGens([]);
            return;
        }
        let vivant = true;
        const t = setTimeout(() => {
            apiClient
                .get('/recherche-globale', { params: { q: saisie } })
                .then((r) => vivant && setGens(((r.data as {
                personnes: Trouvee[];
            }).personnes ?? []).slice(0, 8)))
                .catch(() => vivant && setGens([]));
        }, 150);
        return () => {
            vivant = false;
            clearTimeout(t);
        };
    }, [saisie, actif]);
    useEffect(() => {
        const touche = (e: KeyboardEvent) => {
            const champ = document.activeElement as HTMLInputElement | null;
            if (e.key !== 'Enter' || !champ?.placeholder?.startsWith('Payet') || gens.length === 0 || !actif)
                return;
            e.preventDefault();
            e.stopPropagation();
            allerALaPersonne(gens[0].id, gens[0].nom);
        };
        window.addEventListener('keydown', touche, true);
        return () => window.removeEventListener('keydown', touche, true);
    }, [gens, actif]);
    if (!actif || gens.length === 0)
        return null;
    return (<div className="bg-carte border border-trait-leger rounded-2xl p-1.5 flex flex-col" data-bloc="personnes-tapees">
            <div className="px-3.5 pt-2 pb-1 text-[10.5px] tracking-[.12em] uppercase text-sepia">Personnes de votre arbre · Entrée ouvre la première</div>
            {gens.map((p, i) => (<button key={p.id} onClick={() => allerALaPersonne(p.id, p.nom)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[11px] text-left hover:bg-sepia-tint ${i === 0 ? 'bg-sepia-tint' : ''}`} data-personne-tapee={p.id}>
                    <User size={16} className="text-sepia flex-none"/>
                    <span className="flex flex-col min-w-0">
                        <span className="text-[17px] text-encre"><span className="font-medium">{p.prenom}</span> {nomLisible(p.nom)}</span>
                        <span className="text-xs text-encre-3">
                            {[p.naissance || p.deces ? `${p.naissance ?? '?'} – ${p.deces ?? ''}` : null, p.lieu, `n° ${p.id}`].filter(Boolean).join(' · ')}
                        </span>
                    </span>
                </button>))}
        </div>);
};
