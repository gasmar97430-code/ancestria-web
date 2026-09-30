import { useState } from 'react';
import { ArrowSquareOut, Globe } from '@phosphor-icons/react';
import { liensArbres, liensWeb } from '../tree/RechercheWeb';
import type { Individu } from '../tree/graphe';
export function personneRecherchee(v: {
    nom: string;
    prenom: string;
    annee: string;
    lieu: string;
}): Individu | null {
    const nom = v.nom.trim();
    if (!nom)
        return null;
    const a = /^\d{3,4}$/.test(v.annee.trim()) ? `${v.annee.trim().padStart(4, '0')}-01-01` : null;
    return { id: 0, prenom: v.prenom.trim(), nom, genre: 'Unknown', dateNaissance: a, lieuNaissance: v.lieu.trim() || null };
}
export const RechercheWebLibre = () => {
    const [v, setV] = useState({ nom: '', prenom: '', annee: '', lieu: '' });
    const p = personneRecherchee(v);
    const liens = p ? liensWeb(p) : [];
    const arbres = p ? liensArbres(p) : [];
    const champ = 'h-11 px-3.5 bg-blanc border border-trait rounded-[12px] text-[15px] text-encre outline-none focus:border-sepia placeholder:text-encre-3 min-w-0';
    const entree = (e: React.KeyboardEvent) => {
        const g = arbres[0];
        if (e.key === 'Enter' && g)
            window.open(g.url, '_blank');
    };
    return (<section className="flex flex-col gap-3 rounded-[16px] border border-trait-carte bg-carte p-5 shadow-carte">
            <div className="flex items-baseline gap-3">
                <h2 className="font-display text-[26px] font-medium m-0 flex items-center gap-2">
                    <Globe size={22} className="text-sepia"/>
                    Chercher sur le web
                </h2>
                <span className="text-[12.5px] text-encre-3">Chaque bouton ouvre la recherche dans ton navigateur. Entrée : le premier site d'arbres.</span>
            </div>
            <div className="grid grid-cols-[2fr_2fr_1fr_2fr] gap-2.5">
                <input className={champ} placeholder="Nom de famille" value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} onKeyDown={entree} autoFocus/>
                <input className={champ} placeholder="Prénom" value={v.prenom} onChange={(e) => setV({ ...v, prenom: e.target.value })} onKeyDown={entree}/>
                <input className={champ} placeholder="Année" inputMode="numeric" value={v.annee} onChange={(e) => setV({ ...v, annee: e.target.value })} onKeyDown={entree}/>
                <input className={champ} placeholder="Lieu (ex. Saint-Pierre)" value={v.lieu} onChange={(e) => setV({ ...v, lieu: e.target.value })} onKeyDown={entree}/>
            </div>
            {liens.length === 0 ? (<span className="text-[12.5px] text-encre-3">Tape au moins un nom.</span>) : ([
            { titre: 'Arbres en ligne — pour trouver les arborescences', l: arbres },
            { titre: 'Actes et documents', l: liens },
        ].map((g) => (<div key={g.titre} className="flex flex-col gap-1.5">
                        <div className="text-[11px] tracking-[.08em] uppercase text-encre-3">{g.titre}</div>
                        <div className="flex flex-wrap gap-2">
                            {g.l.map((l) => (<a key={l.titre} href={l.url} target="_blank" rel="noreferrer" title={`S'ouvre dans ton navigateur : ${l.url}`} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-sepia text-sepia-deep text-[13px] font-medium hover:bg-sepia-tint">
                                    {l.titre}
                                    <ArrowSquareOut size={12}/>
                                </a>))}
                        </div>
                    </div>)))}
        </section>);
};
