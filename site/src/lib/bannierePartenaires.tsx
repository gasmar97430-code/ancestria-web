import { useEffect, useState } from 'react';
import { BookOpen, Books, Cpu, Cube, Dna, IceCream, Lightning, Desktop, type Icon } from '@phosphor-icons/react';
import { useLectureSeule } from './lectureSeule';
import { useCompteDuSite } from './compteDuSite';
type Partenaire = {
    cle: string;
    marque: string;
    titre: string;
    bouton: string;
    lien: string;
    icone: Icon;
    fond: string;
    encre: string;
    accent: string;
    encreBouton: string;
    enLigneSeulement?: boolean;
    affiliation?: string;
};
export const PARTENAIRES: Partenaire[] = [
    { cle: 'cewe', marque: 'CEWE', titre: 'Imprimez le livre de votre famille', bouton: 'Créer', lien: 'https://www.cewe.fr/livre-photo.html', icone: BookOpen,
        fond: 'linear-gradient(110deg, #fff7f2 0%, #fde3d6 100%)', encre: '#3b1d14', accent: '#c8102e', encreBouton: '#ffffff' },
    { cle: 'myheritage', marque: 'MyHeritage', titre: 'Découvrez vos origines par l’ADN', bouton: 'Découvrir', lien: 'https://www.myheritage.fr/', icone: Dna,
        fond: 'linear-gradient(110deg, #1d2b4f 0%, #2f4c8a 100%)', encre: '#ffffff', accent: '#f26722', encreBouton: '#ffffff' },
    { cle: 'amazon', marque: 'amazon.fr', titre: 'Livres d’histoire de La Réunion', bouton: 'Voir', lien: 'https://www.amazon.fr/s?k=histoire+de+la+r%C3%A9union', icone: Books,
        fond: 'linear-gradient(110deg, #131921 0%, #232f3e 100%)', encre: '#ffffff', accent: '#ff9900', encreBouton: '#131921', enLigneSeulement: true,
        affiliation: 'https://www.amazon.fr/s?k=histoire+de+la+r%C3%A9union&tag=ancestria-21' },
    { cle: 'ldlc', marque: 'LDLC', titre: 'Informatique et bureautique', bouton: 'Voir', lien: 'https://www.ldlc.com/', icone: Desktop,
        fond: 'linear-gradient(110deg, #0a2a5c 0%, #0f4a9c 100%)', encre: '#ffffff', accent: '#1ea7e1', encreBouton: '#ffffff' },
    { cle: 'bambulab', marque: 'Bambu Lab', titre: 'Imprimantes 3D, filaments et pièces', bouton: 'Découvrir', lien: 'https://bambulab.com/fr', icone: Cube,
        fond: 'linear-gradient(110deg, #f4f7f3 0%, #dcebd9 100%)', encre: '#14271a', accent: '#00ae42', encreBouton: '#ffffff' },
    { cle: 'xtool', marque: 'xTool', titre: 'Lasers de gravure et de découpe', bouton: 'Découvrir', lien: 'https://fr.xtool.com/', icone: Lightning,
        fond: 'linear-gradient(110deg, #111111 0%, #2a2a2a 100%)', encre: '#ffffff', accent: '#e8442e', encreBouton: '#ffffff' },
    { cle: 'aliexpress', marque: 'AliExpress', titre: 'Composants 3D, CNC et électronique', bouton: 'Voir', lien: 'https://fr.aliexpress.com/', icone: Cpu,
        fond: 'linear-gradient(110deg, #fff4ee 0%, #ffd9c7 100%)', encre: '#3a1406', accent: '#e62e04', encreBouton: '#ffffff' },
    { cle: 'maisongac', marque: 'Maison GAC', titre: 'Glacier artisanal', bouton: 'Découvrir', lien: 'https://maisongac.com/', icone: IceCream,
        fond: 'linear-gradient(110deg, #fff8ee 0%, #f6e3c8 100%)', encre: '#3b2412', accent: '#8a4b2a', encreBouton: '#ffffff' },
];
export const MENTION = 'Liens partenaires · soutient le projet gratuit';
export const MENTION_AMAZON = 'En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.';
export const useSurLeSite = () => {
    const lecture = useLectureSeule((s) => s.actif);
    const site = useCompteDuSite((s) => s.Composant !== null);
    return lecture || site;
};
export const MentionAmazon = ({ className = '' }: {
    className?: string;
}) => {
    const surLeSite = useSurLeSite();
    if (!partenairesVisibles(PARTENAIRES, surLeSite).some((p) => p.cle === 'amazon'))
        return null;
    return <p className={`text-[10px] leading-snug text-encre-3 m-0 ${className}`} data-mention="amazon">{MENTION_AMAZON}</p>;
};
export const partenairesVisibles = (liste: Partenaire[], surLeSite: boolean) => liste.filter((p) => !!p.affiliation && (surLeSite || !p.enLigneSeulement));
export const PLACES = {
    enTete: ['cewe'],
    colonneAccueil: ['myheritage', 'ldlc', 'bambulab', 'xtool', 'amazon'],
    basDuMenu: ['aliexpress'],
    auDessusDuSite: ['maisongac', 'amazon'],
} as const;
const choisir = (cles: readonly string[], surLeSite: boolean) => {
    const visibles = partenairesVisibles(PARTENAIRES, surLeSite);
    return cles.map((c) => visibles.find((p) => p.cle === c)).filter((p): p is Partenaire => !!p);
};
const Banniere = ({ p, largeur = 234 }: {
    p: Partenaire;
    largeur?: number;
}) => {
    const I = p.icone;
    return (<a href={p.affiliation ?? p.lien} target="_blank" rel="sponsored noopener noreferrer" data-partenaire={p.cle} title={`${p.marque} — ${p.titre}`} className="relative overflow-hidden flex items-center gap-2 h-[46px] pl-2 pr-2 rounded-[8px] shadow-carte transition-transform duration-200 hover:-translate-y-px flex-none" style={{ width: largeur, background: p.fond, color: p.encre }}>
            <span className="w-[34px] h-[34px] rounded-[7px] grid place-items-center flex-none" style={{ background: p.accent, color: p.encreBouton }}><I size={20} weight="fill"/></span>
            <span className="min-w-0 flex-1 flex flex-col">
                <span className="text-[11.5px] font-semibold leading-[1.15]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.titre}</span>
                <span className="text-[10px] font-bold tracking-[.02em] opacity-80 leading-tight">{p.marque}</span>
            </span>
            <span className="flex-none h-[22px] px-2 rounded-full grid place-items-center text-[10.5px] font-semibold" style={{ background: p.accent, color: p.encreBouton }}>{p.bouton}</span>
            <span className="absolute top-[1px] right-[5px] text-[7.5px] uppercase tracking-[.08em] opacity-60">Publicité</span>
        </a>);
};
const Mention = () => <span className="text-[9.5px] leading-none text-encre-3 pl-1" data-mention="partenaires">{MENTION}</span>;
export const BannierePartenaires = () => {
    const surLeSite = useSurLeSite();
    const liste = choisir(PLACES.enTete, surLeSite);
    if (liste.length === 0)
        return null;
    return (<div className="hidden min-[1150px]:flex flex-col gap-[3px] min-w-0" data-bloc="partenaires-en-tete">
            <Banniere p={liste[0]}/>
            <Mention />
        </div>);
};
export const PetiteBanniereEnTete = () => {
    const surLeSite = useSurLeSite();
    const p = choisir(PLACES.auDessusDuSite, surLeSite)[0];
    if (!p)
        return null;
    const I = p.icone;
    return (<a href={p.affiliation ?? p.lien} target="_blank" rel="sponsored noopener noreferrer" data-partenaire={p.cle} data-bloc="petite-banniere" title={`Publicité — ${p.marque} : ${p.titre}`} className="relative overflow-hidden flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-full shadow-carte whitespace-nowrap transition-transform duration-200 hover:-translate-y-px" style={{ background: p.fond, color: p.encre, ['--accent-pub' as string]: p.accent }}>
            
            <style>{`
                @keyframes petite-pub-eclat { 0%, 60% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
                @keyframes petite-pub-halo { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-pub) 35%, transparent); } }
                [data-bloc="petite-banniere"] { animation: petite-pub-halo 2s ease-in-out infinite; }
                [data-bloc="petite-banniere"] .eclat-pub { animation: petite-pub-eclat 4s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) { [data-bloc="petite-banniere"], [data-bloc="petite-banniere"] .eclat-pub { animation: none; } [data-bloc="petite-banniere"] .eclat-pub { opacity: 0; } }
            `}</style>
            <span className="eclat-pub pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,.8) 50%, transparent 60%)', backgroundSize: '250% 100%', backgroundRepeat: 'no-repeat' }}/>
            <span className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none" style={{ background: p.accent, color: p.encreBouton }}><I size={11} weight="fill"/></span>
            <span className="text-[11.5px] font-semibold leading-none">{p.marque}</span>
            <span className="text-[11px] leading-none opacity-80">{p.titre}</span>
            <span className="text-[7.5px] uppercase tracking-[.08em] opacity-55 leading-none">Pub</span>
        </a>);
};
function useAccueilVide() {
    const [vide, setVide] = useState(true);
    useEffect(() => {
        const lire = () => {
            const c = document.querySelector<HTMLInputElement>('[data-champ="accueil"]');
            setVide(!c || c.value.trim() === '');
        };
        lire();
        const t = setInterval(lire, 300);
        return () => clearInterval(t);
    }, []);
    return vide;
}
export const ColonnePartenaires = () => {
    const surLeSite = useSurLeSite();
    const vide = useAccueilVide();
    const liste = choisir(PLACES.colonneAccueil, surLeSite);
    if (!vide || liste.length === 0)
        return null;
    return (<aside className="hidden min-[1150px]:flex w-[262px] flex-none flex-col gap-2.5 py-14 pr-7 overflow-y-auto" data-bloc="partenaires-colonne">
            {liste.map((p) => <Banniere key={p.cle} p={p}/>)}
            <Mention />
            <MentionAmazon className="pl-1"/>
        </aside>);
};
export const BasDuMenuPartenaires = () => {
    const surLeSite = useSurLeSite();
    const liste = choisir(PLACES.basDuMenu, surLeSite);
    if (liste.length === 0)
        return null;
    return (<div className="mt-auto flex flex-col gap-[3px]" data-bloc="partenaires-menu">
            {liste.map((p) => <Banniere key={p.cle} p={p} largeur={236}/>)}
            <Mention />
        </div>);
};
