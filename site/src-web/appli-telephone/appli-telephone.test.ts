import { describe, expect, it } from 'vitest';
import { gestes, lienChrome, modeInstallation } from './AppliTelephone';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36';
// 12/10 : « ça devrait [marcher] pour tous types de téléphone »
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 13; SM-A136B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0';
const FACEBOOK_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]';
const INSTAGRAM_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0';
const CHROME_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';
const XIAOMI = 'Mozilla/5.0 (Linux; U; Android 13; fr-fr; 2201117TG) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.5';

const m = (agent: string, invite = false, tactile = true) => modeInstallation({ autonome: false, inviteDisponible: invite, agent, tactile });

describe('Ancestria sur le téléphone (sa demande du 03/10)', () => {
    it('déjà ouverte comme appli : rien à installer', () => {
        expect(modeInstallation({ autonome: true, inviteDisponible: true, agent: ANDROID, tactile: true })).toBe('deja-installee');
    });
    it('Android/Chrome qui propose l’installation : un toucher', () => {
        expect(m(ANDROID, true)).toBe('un-toucher');
    });
    it('iPhone : les gestes de Safari (Apple ne permet pas le toucher unique)', () => {
        expect(m(IPHONE)).toBe('iphone');
    });
    it('ordinateur (12/10 « universelle ») : un clic si Chrome/Edge le propose, sinon ses gestes', () => {
        expect(m(PC, true, false)).toBe('un-toucher');
        expect(m(PC, false, false)).toBe('pc');
        expect(m('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', false, false)).toBe('pc-firefox');
        expect(m('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15', false, false)).toBe('pc-safari');
        for (const x of ['pc', 'pc-safari', 'pc-firefox'] as const) expect(gestes(x).length).toBe(3);
    });
});

describe('tous les téléphones (12/10)', () => {
    it('Chrome Android sans invitation (déjà refusée une fois) : les gestes de Chrome', () => expect(m(ANDROID)).toBe('android-chrome'));
    it('navigateur Samsung', () => expect(m(SAMSUNG)).toBe('android-samsung'));
    it('Firefox Android', () => expect(m(FIREFOX_ANDROID)).toBe('android-firefox'));
    it('lien ouvert DANS Facebook (Android) : passer par Chrome', () => expect(m(FACEBOOK_ANDROID)).toBe('android-dans-appli'));
    it('lien ouvert DANS Instagram (iPhone) : passer par Safari', () => expect(m(INSTAGRAM_IPHONE)).toBe('iphone-dans-appli'));
    it('Chrome sur iPhone', () => expect(m(CHROME_IPHONE)).toBe('iphone-chrome'));
    it('iPad (se présente comme un Mac, mais tactile)', () => expect(m(IPAD)).toBe('iphone'));
    it('autre navigateur Android (Xiaomi) : gestes généraux', () => expect(m(XIAOMI)).toBe('autre-telephone'));
    it('chaque cas de téléphone a ses gestes (3 au moins)', () => {
        for (const mode of ['iphone', 'iphone-chrome', 'iphone-autre', 'iphone-dans-appli', 'android-chrome', 'android-samsung', 'android-firefox', 'android-dans-appli', 'autre-telephone'] as const) {
            expect(gestes(mode).length).toBeGreaterThanOrEqual(3);
        }
    });
    it('« Ouvrir dans Chrome » : adresse intent qui garde le site et retombe sur le lien sinon', () => {
        const l = lienChrome('https://gasmar97430-code.github.io/ancestria-web/');
        expect(l).toBe('intent://gasmar97430-code.github.io/ancestria-web/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fgasmar97430-code.github.io%2Fancestria-web%2F;end');
    });
});
