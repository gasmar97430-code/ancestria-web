// ---- PARTENAIRES : LE DESSIN DES EMPLACEMENTS ----
//
// Deux emplacements (emplacements.ts) autour de l'écran d'Ancestria, jamais dedans :
//   - le bandeau du pied, au bas de la fenêtre ;
//   - la colonne de droite, sur grand écran, Accueil et Sources seulement.
// Chaque bannière est une image et un lien : aucun script d'un tiers, aucun traceur
// posé par le site. Elle est signalée « Publicité » et nomme son annonceur ; le lien
// s'ouvre dans un autre onglet, marqué rel="sponsored".
// Aucune annonce à montrer : CadrePartenaires rend l'écran tel quel, sans rien autour.
// Posé par UNE ligne dans entree.tsx.

import { useEffect, useState, type ReactNode } from 'react';
import { useAtelierStore } from '../../src/store/useAtelierStore';
import { ANNONCES } from './annonces';
import { annoncesPour, FORMATS, type Annonce, type Format, type IdEmplacement } from './emplacements';
import './partenaires.css';

/** Une annonce laisse la place à la suivante toutes les 45 secondes (s'il y en a plusieurs). */
const TOUR_MS = 45_000;

const aujourdhui = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function useLargeurFenetre() {
    const [largeur, setLargeur] = useState(() => window.innerWidth);
    useEffect(() => {
        const mesurer = () => setLargeur(window.innerWidth);
        window.addEventListener('resize', mesurer);
        return () => window.removeEventListener('resize', mesurer);
    }, []);
    return largeur;
}

/** Ce que chaque emplacement montre en ce moment (ou rien). */
function useAffiches(annonces: Annonce[]) {
    const ecran = useAtelierStore((s) => s.ecran);
    const largeur = useLargeurFenetre();
    const [tour, setTour] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => setTour((n) => n + 1), TOUR_MS);
        return () => window.clearInterval(t);
    }, []);
    const pour = (emplacement: IdEmplacement) => {
        const possibles = annoncesPour(annonces, emplacement, ecran, largeur, aujourdhui());
        return possibles.length ? possibles[tour % possibles.length] : null;
    };
    return { pied: pour('pied'), cote: pour('cote') };
}

const Banniere = ({ annonce, format }: { annonce: Annonce; format: Format }) => {
    const [cassee, setCassee] = useState(false);
    const f = FORMATS[format];
    if (cassee) return null;
    return (
        <a
            href={annonce.lien}
            target="_blank"
            rel="sponsored noopener noreferrer"
            title={`Publicité — ${annonce.annonceur}`}
            className="block flex-none rounded-[10px] overflow-hidden border border-trait-leger bg-blanc"
            style={{ width: f.largeur, height: f.hauteur }}
            data-annonce={annonce.id}
            data-format={format}
        >
            <img
                src={`${import.meta.env.BASE_URL}partenaires/${annonce.images[format]}`}
                alt={`${annonce.annonceur} : ${annonce.texte}`}
                width={f.largeur}
                height={f.hauteur}
                draggable={false}
                onError={() => setCassee(true)}
                className="block w-full h-full object-cover"
            />
        </a>
    );
};

const Mention = ({ annonceur }: { annonceur: string }) => (
    <div className="flex-none text-[10px] leading-none tracking-[.12em] uppercase text-encre-3 whitespace-nowrap" data-mention>
        Publicité · <span className="text-encre-2">{annonceur}</span>
    </div>
);

export function CadrePartenaires({ children, annonces = ANNONCES }: { children: ReactNode; annonces?: Annonce[] }) {
    const { pied, cote } = useAffiches(annonces);
    if (!pied && !cote) return <>{children}</>;
    return (
        <div className="cadre-partenaires h-screen w-screen flex flex-col overflow-hidden bg-papier" data-cadre-partenaires>
            <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 relative" data-ecran-ancestria>{children}</div>
                {cote && (
                    <aside className="flex-none flex flex-col items-center gap-2 px-3 py-4 bg-carte border-l border-trait-leger" data-emplacement="cote" aria-label="Publicité">
                        <Mention annonceur={cote.annonce.annonceur} />
                        <Banniere annonce={cote.annonce} format={cote.format} />
                    </aside>
                )}
            </div>
            {pied && (
                <footer className="flex-none flex flex-col min-[960px]:flex-row items-center justify-center gap-1.5 min-[960px]:gap-4 px-2.5 py-2 bg-carte border-t border-trait-leger" data-emplacement="pied" aria-label="Publicité">
                    <Mention annonceur={pied.annonce.annonceur} />
                    <Banniere annonce={pied.annonce} format={pied.format} />
                </footer>
            )}
        </div>
    );
}

// ---- FIN PARTENAIRES : LE DESSIN DES EMPLACEMENTS ----
