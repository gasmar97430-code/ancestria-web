import { describe, expect, it } from 'vitest';
import { limiteAtteinte } from './limitePartages';
import type { EtatOffre } from '../domaine/types';

const etat = (ouverts: number, max: number | null) => ({ invitations_ouvertes: ouverts, max_invitations_ouvertes: max }) as EtatOffre;

describe('limite des partages ouverts', () => {
    it('1 / 1 (offre gratuite) : atteinte, le bouton se grise', () => expect(limiteAtteinte(etat(1, 1))).toBe(true));
    it('0 / 1 : libre', () => expect(limiteAtteinte(etat(0, 1))).toBe(false));
    it('sans plafond (offre collectivité) : jamais atteinte', () => expect(limiteAtteinte(etat(40, null))).toBe(false));
    it('état pas encore lu : rien de grisé', () => expect(limiteAtteinte(null)).toBe(false));
});
