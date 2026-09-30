// ---- ORIGINES : SUR LA CARTE (EXTRAIT) ----
//
// EXTRAIT EXACT de Ancestria/frontend/src/features/tree/Origines.tsx : seuls
// COURT_CARTE et OrigineCarte (la carte en a besoin). Le reste du fichier du
// bureau (origines de l'ascendance) lit ses magasins de données, absents ici.

import { teinteDe } from '../../lib/origins';

/** Libelle court pour la carte : il tient sous le medaillon (55 px de large). */
export const COURT_CARTE: Record<string, string> = {
    Europe: 'Europe',
    Malgache: 'Madagascar',
    'Inde tamoule': 'Inde tam.',
    'Inde musulmane': 'Inde mus.',
    Chine: 'Chine',
    'Affranchi 1848': 'Affr. 1848',
    'Non documentee': 'Non doc.',
    'Hors repertoire': 'Hors rép.',
};

// Sous le medaillon des initiales (colonne gauche, 12 + 44 px) : la seule place
// libre de la carte. En bas a droite, il recouvrait le lieu et le compteur
// (« Le Tampon 📄0 », « Maurice ») — vu a l'image le 26/09.
export const OrigineCarte = ({ origine }: { origine: string }) => {
    const t = teinteDe(origine);
    return (
        <span
            className="absolute bottom-[4px] left-[12px] w-[44px] flex justify-center text-[8.5px] leading-none whitespace-nowrap"
            style={{ color: t.c }}
            title={`Patronyme d'origine ${t.adjectif} (origine du nom, pas forcément de la personne)`}
        >
            {COURT_CARTE[origine] ?? origine}
        </span>
    );
};

// ---- FIN ORIGINES : SUR LA CARTE (EXTRAIT) ----
