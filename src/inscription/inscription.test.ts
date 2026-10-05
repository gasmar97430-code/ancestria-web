// Personnes et contacts INVENTÉS (exemple.re, numéros de forme seulement).
import { describe, expect, it } from 'vitest';
import { garderInscription, genreContact, inscriptionComplete, lireInscription, oublierInscription, validerInscription } from './contact';
import { MESSAGE_ACCUEIL, MESSAGE_PRUDENCE, MESSAGE_SOUTIEN } from './messages';

describe('contact : e-mail ou téléphone', () => {
    it('reconnaît une adresse e-mail', () => {
        for (const c of ['ana@exemple.re', '  ana.fictive+arbre@mail.exemple.re  ', 'A_B%c-d@sous-domaine.exemple.fr']) expect(genreContact(c), c).toBe('email');
    });
    it('reconnaît un téléphone (8 à 15 chiffres, espaces, points, tirets, parenthèses, + en tête)', () => {
        for (const c of ['0692 00 00 00', '+262 692 00 00 00', '06.92.00.00.00', '(0262) 00-00-00', '12345678', '+123456789012345']) expect(genreContact(c), c).toBe('telephone');
    });
    it('refuse ce qui n’est ni l’un ni l’autre', () => {
        for (const c of ['', '   ', 'tel 0692', 'ana@exemple', 'ana@@exemple.re', 'ana exemple.re', '@exemple.re', 'ana@.re', '1234567', '+1234567890123456', '06 92 00 00 0a', '++262692000000', 'x'.repeat(201), null, undefined]) {
            expect(genreContact(c as string | null), String(c)).toBeNull();
        }
    });
});

describe('inscription : nom, prénom, contact — tous obligatoires', () => {
    it('complète : rendue nettoyée', () => {
        expect(validerInscription({ nom: '  Fictif ', prenom: ' Ana ', contact: ' ana@exemple.re ' })).toEqual({ ok: true, inscrit: { nom: 'Fictif', prenom: 'Ana', contact: 'ana@exemple.re' } });
    });
    it('chaque manque a son message, sur son champ', () => {
        const r = validerInscription({ nom: ' ', prenom: '', contact: '' });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(['contact', 'nom', 'prenom']);
        const r2 = validerInscription({ nom: 'Fictif', prenom: 'Ana', contact: 'pas un contact' });
        expect(r2.ok).toBe(false);
        if (!r2.ok) expect(Object.keys(r2.erreurs)).toEqual(['contact']);
        const r3 = validerInscription({ nom: 'n'.repeat(81), prenom: 'Ana', contact: '0692000000' });
        expect(r3.ok).toBe(false);
    });
    it('inscriptionComplete : le verdict que la base rendra', () => {
        expect(inscriptionComplete({ nom: 'Fictif', prenom: 'Ana' }, 'ana@exemple.re')).toBe(true);
        expect(inscriptionComplete({ nom: 'Fictif', prenom: 'Ana' }, null)).toBe(false);
        expect(inscriptionComplete({ nom: '', prenom: 'Ana' }, 'ana@exemple.re')).toBe(false);
        expect(inscriptionComplete({ nom: 'Fictif' }, 'ana@exemple.re')).toBe(false);
        expect(inscriptionComplete({ nom: 12, prenom: 'Ana' }, 'ana@exemple.re')).toBe(false);
        expect(inscriptionComplete(undefined, 'ana@exemple.re')).toBe(false);
        expect(inscriptionComplete(['Fictif', 'Ana'], 'ana@exemple.re')).toBe(false);
    });
    it('gardée dans le téléphone ; une inscription abîmée est ignorée', () => {
        const m = new Map<string, string>();
        const stockage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
        expect(lireInscription(stockage)).toBeNull();
        garderInscription(stockage, { nom: 'Fictif', prenom: 'Ana', contact: '0692 00 00 00' });
        expect(lireInscription(stockage)).toEqual({ nom: 'Fictif', prenom: 'Ana', contact: '0692 00 00 00' });
        m.set('ancestria-inscription', JSON.stringify({ nom: 'Fictif', prenom: 'Ana', contact: 'rien' }));
        expect(lireInscription(stockage)).toBeNull();
        m.set('ancestria-inscription', '{pas du json');
        expect(lireInscription(stockage)).toBeNull();
        oublierInscription(stockage);
        expect(m.size).toBe(0);
    });
});

describe('ses deux messages officiels, mot pour mot (texte du 30/09/2026)', () => {
    it('message d’accueil', () => {
        expect(MESSAGE_SOUTIEN).toBe("Un petit coup de pouce pour l'avenir : Ancestria restera toujours gratuit. Cependant, pour nous aider à faire face aux frais d'hébergement et à faire perdurer cet outil, toute contribution, même symbolique à partir d'1 euro, est la bienvenue. Un grand merci pour votre solidarité et votre aide précieuse pour faire vivre notre histoire !");
        expect(MESSAGE_ACCUEIL).toBe("Ancestria est entièrement gratuit et ouvert à la mémoire de tous. Parce que chaque histoire familiale est précieuse, il vous suffit de vous inscrire ci-dessous pour participer à notre grand Arbre de Lumière et faire vivre nos racines ensemble.");
    });
    it('message de prudence', () => {
        expect(MESSAGE_PRUDENCE).toBe("Attention : Ancestria est un espace de mémoire noble et rigoureux. Toute tentative d'insertion de fausses informations, de blagues ou de données fantaisistes est strictement interdite. Par mesure de sécurité et de respect envers les familles, chaque contribution validée est verrouillée et tracée. Restons rigoureux pour honorer nos ancêtres.");
    });
});
