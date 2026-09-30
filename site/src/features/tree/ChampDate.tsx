import { useEffect, useState } from 'react';
import { champ } from './ChoixPersonne';
import { masqueDate } from './masqueDate';
export const DATE_ILLISIBLE = 'illisible';
export function datesLisibles(...valeurs: unknown[]): boolean {
    return !valeurs.includes(DATE_ILLISIBLE);
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const deux = (n: number) => String(n).padStart(2, '0');
export function dateEcrite(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m)
        return '';
    if (m[2] === '01' && m[3] === '01')
        return m[1];
    return `${m[3]}/${m[2]}/${m[1]}`;
}
export function dateEnLettres(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m)
        return '';
    if (m[2] === '01' && m[3] === '01')
        return `année ${m[1]} (sans jour ni mois)`;
    return `${Number(m[3]) === 1 ? '1er' : Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}
export function lireDate(saisie: string, aujourdhui = new Date()): {
    iso: string;
} | {
    erreur: string;
} {
    const s = saisie.trim();
    if (s === '')
        return { iso: '' };
    let j: number, mo: number, a: number;
    let m: RegExpExecArray | null;
    if ((m = /^(\d{4})$/.exec(s))) {
        [j, mo, a] = [1, 1, Number(m[1])];
    }
    else if ((m = /^(\d{1,2})[/.\s-]+(\d{1,2})[/.\s-]+(\d{4})$/.exec(s))) {
        [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
        [j, mo, a] = [Number(m[3]), Number(m[2]), Number(m[1])];
    }
    else {
        return { erreur: 'Écrire l’année seule (1880) ou le jour complet (28/03/1930).' };
    }
    if (a < 1000)
        return { erreur: 'Année à quatre chiffres.' };
    if (mo < 1 || mo > 12)
        return { erreur: `Le mois ${mo} n’existe pas.` };
    const d = new Date(Date.UTC(a, mo - 1, j));
    if (d.getUTCDate() !== j || d.getUTCMonth() !== mo - 1)
        return { erreur: `Le ${j}/${deux(mo)}/${a} n’existe pas.` };
    const iso = `${a}-${deux(mo)}-${deux(j)}`;
    const demain = new Date(aujourdhui);
    demain.setDate(demain.getDate() + 1);
    if (d > demain)
        return { erreur: 'Cette date est dans le futur.' };
    return { iso };
}
export const ChampDate = ({ valeur, onChange, onValidite, signalerIllisible = false, compact = false, }: {
    valeur: string;
    onChange: (iso: string) => void;
    onValidite?: (valide: boolean) => void;
    signalerIllisible?: boolean;
    compact?: boolean;
}) => {
    const [texte, setTexte] = useState(() => dateEcrite(valeur));
    const lu = lireDate(texte);
    useEffect(() => {
        if (valeur === DATE_ILLISIBLE)
            return;
        const courant = lireDate(texte);
        if (!('iso' in courant) || courant.iso !== valeur)
            setTexte(dateEcrite(valeur));
    }, [valeur]);
    const saisir = (t: string) => {
        setTexte(t);
        const r = lireDate(t);
        onValidite?.('iso' in r);
        if ('iso' in r)
            onChange(r.iso);
        else if (signalerIllisible)
            onChange(DATE_ILLISIBLE);
    };
    return (<div className="flex flex-col gap-1">
            <div className="flex gap-1.5">
                <input className={champ} value={texte} placeholder="1880 ou 28/03/1930" inputMode="numeric" onChange={(e) => saisir(masqueDate(e.target.value))} aria-invalid={'erreur' in lu} style={'erreur' in lu ? { borderColor: 'var(--o-afrique)' } : undefined}/>
                {texte !== '' && (<button type="button" onClick={() => saisir('')} className={`shrink-0 h-10 ${compact ? 'w-8' : 'px-2.5'} rounded-[10px] border border-trait text-encre-2 text-[12.5px] hover:bg-sepia-tint`} title="Effacer cette date">
                        {compact ? '×' : 'effacer'}
                    </button>)}
            </div>
            <div className="text-[11.5px] min-h-[16px]" style={{ color: 'erreur' in lu ? 'var(--o-afrique)' : 'var(--encre-3)' }}>
                {'erreur' in lu ? lu.erreur : lu.iso === '' ? (valeur === '' || valeur === DATE_ILLISIBLE ? 'non renseignée' : '') : dateEnLettres(lu.iso)}
            </div>
        </div>);
};
