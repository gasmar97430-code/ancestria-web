import { describe, expect, it } from 'vitest';
import { etatReponse } from './avisPanne';

// 12/10 : « prévenir que momentanément nous avons un souci … remis en service dans les plus brefs délais »
describe('avis de panne', () => {
    it('réseau coupé ou réponse 5xx : panne', () => {
        expect(etatReponse(true, null)).toBe(true);
        expect(etatReponse(false, 500)).toBe(true);
        expect(etatReponse(false, 503)).toBe(true);
    });
    it('réponse normale (même un refus 4xx) : plus de panne', () => {
        expect(etatReponse(false, 200)).toBe(false);
        expect(etatReponse(false, 401)).toBe(false);
    });
});
