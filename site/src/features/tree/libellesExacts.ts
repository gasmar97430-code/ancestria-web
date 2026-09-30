import { TEINTES } from '../../lib/origins';
import { COURT, COURT_CARTE } from './Origines';
export const LIBELLES_EXACTS: Record<string, {
    court: string;
    adjectif: string;
    carte: string;
}> = {
    'Inde tamoule': { court: 'Inde', adjectif: 'indienne', carte: 'Inde' },
    'Affranchi 1848': { court: 'Nom d’affranchi', adjectif: 'attribuée à un affranchi entre 1832 et 1849 (nom donné, pas une origine)', carte: 'Affranchi' },
};
for (const [origine, l] of Object.entries(LIBELLES_EXACTS)) {
    if (TEINTES[origine])
        TEINTES[origine] = { ...TEINTES[origine], court: l.court, adjectif: l.adjectif };
    COURT[origine] = l.court;
    COURT_CARTE[origine] = l.carte;
}
