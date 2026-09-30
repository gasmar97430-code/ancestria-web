import type { Individu } from './graphe';
export type AvecStatut = Individu & {
    decede?: boolean | null;
};
export type Statut = 'decede' | 'presume' | 'vivant' | 'inconnu';
export const AGE_MAX_PRESUME = 110;
export function statutDe(i: AvecStatut, maintenant = new Date()): Statut {
    if (i.dateDeces || i.decede === true)
        return 'decede';
    if (i.decede === false)
        return 'vivant';
    if (i.dateNaissance && maintenant.getFullYear() - new Date(i.dateNaissance).getFullYear() > AGE_MAX_PRESUME)
        return 'presume';
    return 'inconnu';
}
const accord = (i: Individu, m: string, f: string) => (i.genre === 'F' ? f : m);
export function libelleStatut(i: AvecStatut, maintenant = new Date()): string {
    const s = statutDe(i, maintenant);
    if (s === 'decede') {
        const an = i.dateDeces ? ` en ${new Date(i.dateDeces).getFullYear()}` : '';
        return `${accord(i, 'Décédé', 'Décédée')}${an}`;
    }
    if (s === 'vivant')
        return accord(i, 'Vivant', 'Vivante');
    if (s === 'presume')
        return `${accord(i, 'Décédé', 'Décédée')} (présumé : ${accord(i, 'né', 'née')} il y a plus de ${AGE_MAX_PRESUME} ans)`;
    return 'Vivant ou décédé : non renseigné';
}
export const MarqueStatut = ({ individu }: {
    individu: AvecStatut;
}) => {
    const s = statutDe(individu);
    const titre = libelleStatut(individu);
    if (s === 'vivant')
        return <span title={titre} className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full border-[1.5px] border-encre-2"/>;
    if (s === 'decede' || s === 'presume')
        return (<span title={titre} className="absolute top-1 right-2 font-display text-[13px] leading-none text-encre-3" style={{ opacity: s === 'presume' ? 0.5 : 1 }}>
                †
            </span>);
    return null;
};
export const StatutFiche = ({ individu, onChange }: {
    individu: AvecStatut;
    onChange: (decede: boolean | null) => Promise<void>;
}) => {
    const s = statutDe(individu);
    const fige = !!individu.dateDeces;
    const choix: {
        v: boolean | null;
        t: string;
    }[] = [
        { v: false, t: accord(individu, 'Vivant', 'Vivante') },
        { v: true, t: accord(individu, 'Décédé', 'Décédée') },
        { v: null, t: '?' },
    ];
    const actuel = individu.decede ?? (fige ? true : null);
    return (<div className="flex flex-col gap-1.5">
            <div className="text-[13px] text-encre">
                {s === 'decede' || s === 'presume' ? '† ' : ''}
                {libelleStatut(individu)}
            </div>
            {!fige && (<div className="flex bg-papier rounded-[9px] p-[3px] gap-0.5 self-start">
                    {choix.map((c) => (<button key={String(c.v)} onClick={() => void onChange(c.v)} className={`h-7 px-2.5 rounded-md text-[12px] text-encre ${actuel === c.v ? 'bg-blanc shadow-onglet font-medium' : 'text-encre-2'}`}>
                            {c.t}
                        </button>))}
                </div>)}
        </div>);
};
