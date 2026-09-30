export interface CommuneDuNom {
    commune: string;
    departement: string;
    pays: string;
    individus: number;
}
export interface CommunesDuNom {
    source: string;
    communes: CommuneDuNom[];
}
const c = (commune: string, departement: string, individus: number): CommuneDuNom => ({
    commune,
    departement,
    pays: 'France',
    individus,
});
export const COMMUNES_DU_NOM: Record<string, CommunesDuNom> = {
    GASTELLIER: {
        source: 'Relevé des communes les plus présentes pour le patronyme « GASTELLIER », collé le 30/09/2026.',
        communes: [
            c('Boissy-aux-Cailles', 'Seine-et-Marne', 1376),
            c('Paris', 'Paris', 1217),
            c('Venizy', 'Yonne', 937),
            c('Maisse', 'Essonne', 750),
            c('Villegenon', 'Cher', 594),
            c('Olivet', 'Loiret', 590),
            c('Poitiers', 'Vienne', 205),
            c('Germignonville', 'Eure-et-Loir', 194),
            c('Luzancy', 'Seine-et-Marne', 163),
            c('Aix-en-Othe', 'Aube', 139),
            c('Saint-Gondon', 'Loiret', 103),
            c('Ferrières-en-Gâtinais', 'Loiret', 101),
        ],
    },
};
export function communesDuNom(nom: string): CommunesDuNom | null {
    try {
        const cle = nom
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .trim()
            .toUpperCase();
        return COMMUNES_DU_NOM[cle] ?? null;
    }
    catch {
        return null;
    }
}
