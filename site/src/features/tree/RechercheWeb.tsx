import { ArrowSquareOut, Globe } from '@phosphor-icons/react';
import type { Individu } from './graphe';
const annee = (d?: string | null) => (d ? new Date(d).getFullYear() : null);
export function prenomSur(prenom: string): string {
    return prenom
        .split(/\s+/)
        .filter((m) => m && !m.includes('…') && !m.includes('"'))
        .join(' ');
}
export function liensWeb(p: Individu): {
    titre: string;
    url: string;
}[] {
    const prenom = prenomSur(p.prenom);
    const nom = p.nom.replace(/…/g, '').trim();
    const n = annee(p.dateNaissance);
    const lieu = p.lieuNaissance ?? null;
    const q = encodeURIComponent;
    const phrase = `"${[prenom, nom].filter(Boolean).join(' ')}"`;
    const fs = new URLSearchParams({ 'q.surname': nom });
    if (prenom)
        fs.set('q.givenName', prenom);
    if (n) {
        fs.set('q.birthLikeDate.from', String(n - 2));
        fs.set('q.birthLikeDate.to', String(n + 2));
    }
    if (lieu)
        fs.set('q.birthLikePlace', lieu);
    return [
        { titre: 'Geneanet', url: `https://www.geneanet.org/fonds/individus/?go=1&nom=${q(nom)}&prenom=${q(prenom)}` },
        { titre: 'FamilySearch', url: `https://www.familysearch.org/search/record/results?${fs.toString()}` },
        { titre: 'Filae', url: `https://www.filae.com/nom-de-famille/${q(nom.toLowerCase())}.html` },
        {
            titre: 'Gallica',
            url: `https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query=${q(`(gallica all ${phrase})`)}`,
        },
        { titre: 'Google', url: `https://www.google.com/search?q=${q([phrase, n, lieu ?? 'Réunion'].filter(Boolean).join(' '))}` },
    ];
}
export function liensArbres(p: Individu): {
    titre: string;
    url: string;
}[] {
    const prenom = prenomSur(p.prenom);
    const nom = p.nom.replace(/…/g, '').trim();
    const q = encodeURIComponent;
    const phrase = `"${[prenom, nom].filter(Boolean).join(' ')}"`;
    return [
        {
            titre: 'Geneanet — arbres',
            url: `https://www.geneanet.org/fonds/individus/?categories_1%5Barbres%5D=arbres&categories_2%5Barbres%23utilisateur%5D=arbres%23utilisateur&go=1&nom=${q(nom)}&prenom=${q(prenom)}`,
        },
        { titre: 'Geni', url: `https://www.geni.com/search?search_type=people&names=${q([prenom.split(/[\s-]+/)[0], nom].filter(Boolean).join(' '))}` },
        { titre: 'WikiTree', url: `https://www.wikitree.com/genealogy/${q(nom.toUpperCase().replace(/\s+/g, '-'))}` },
        { titre: 'Google — arbres Geneanet', url: `https://www.google.com/search?q=${q(`${phrase} site:gw.geneanet.org`)}` },
    ];
}
export const GroupeLiens = ({ titre, liens }: {
    titre: string;
    liens: {
        titre: string;
        url: string;
    }[];
}) => (<div className="flex flex-col gap-1">
        <div className="text-[10.5px] text-encre-3">{titre}</div>
        <div className="flex flex-wrap gap-1.5">
            {liens.map((l) => (<a key={l.titre} href={l.url} target="_blank" rel="noreferrer" title={`S'ouvre dans ton navigateur : ${l.url}`} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-trait text-[12px] text-encre-2 hover:bg-sepia-tint hover:text-encre">
                    {l.titre}
                    <ArrowSquareOut size={11}/>
                </a>))}
        </div>
    </div>);
export const RechercheWeb = ({ personne }: {
    personne: Individu;
}) => (<div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-encre-3">
            <Globe size={13}/>
            Chercher sur le web
        </div>
        <GroupeLiens titre="Arbres en ligne (pour trouver son arborescence)" liens={liensArbres(personne)}/>
        <GroupeLiens titre="Actes et documents" liens={liensWeb(personne)}/>
    </div>);
