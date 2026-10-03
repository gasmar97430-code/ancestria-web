import { describe, expect, it } from 'vitest';
import { modeInstallation } from './AppliTelephone';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36';

describe('Ancestria sur le téléphone (sa demande du 03/10)', () => {
    it('déjà ouverte comme appli : rien à installer', () => {
        expect(modeInstallation({ autonome: true, inviteDisponible: true, agent: ANDROID, tactile: true })).toBe('deja-installee');
    });
    it('Android/Chrome qui propose l’installation : un toucher', () => {
        expect(modeInstallation({ autonome: false, inviteDisponible: true, agent: ANDROID, tactile: true })).toBe('un-toucher');
    });
    it('iPhone : les 2 gestes (Apple ne permet pas le toucher unique)', () => {
        expect(modeInstallation({ autonome: false, inviteDisponible: false, agent: IPHONE, tactile: true })).toBe('iphone');
    });
    it('autre téléphone sans invitation : les gestes de Chrome', () => {
        expect(modeInstallation({ autonome: false, inviteDisponible: false, agent: ANDROID, tactile: true })).toBe('autre-telephone');
    });
    it('ordinateur : pas de bouton d’installation (le partage reste), MÊME si Chrome propose d’installer sur le PC', () => {
        expect(modeInstallation({ autonome: false, inviteDisponible: false, agent: PC, tactile: false })).toBe('ordinateur');
        expect(modeInstallation({ autonome: false, inviteDisponible: true, agent: PC, tactile: false })).toBe('ordinateur');
    });
});
