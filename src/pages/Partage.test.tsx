// Son texte du 30/09 : le partage = le lien + « Copier le lien » + le QR code, rien d'autre.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const etat = vi.hoisted(() => ({ invitations: [] as Record<string, unknown>[], rpc: [] as unknown[], fermees: [] as string[] }));

vi.mock('../lib/supabase', () => {
    const table = (nom: string) => ({
        select: () => ({
            eq: () => ({
                maybeSingle: async () => ({ data: { nom: 'Famille Essaiville' }, error: null }),
                order: async () => ({ data: nom === 'invitations' ? etat.invitations : [], error: null }),
            }),
        }),
        update: (champs: Record<string, unknown>) => ({
            eq: async (_c: string, id: string) => {
                if (champs.ferme) etat.fermees.push(id);
                return { data: null, error: null };
            },
        }),
    });
    return {
        supabase: {
            from: table,
            rpc: async (nom: string, args: unknown) => {
                etat.rpc.push({ nom, args });
                return { data: { id: 'nouveau', jeton: 'JETONNEUF', avec_pin: false, ferme: false, expire_le: '2099-01-01' }, error: null };
            },
        },
    };
});
vi.mock('qrcode', () => ({ default: { toCanvas: vi.fn(async () => undefined) } }));

import { Partage } from './Partage';

const inv = (jeton: string, avec_pin: boolean, ferme = false, expire_le = '2099-01-01') => ({ id: jeton, arbre_id: 'A', jeton, libelle: 'x', avec_pin, expire_le, ferme, cree_par: 'u', cree_le: '2026-09-30' });

function afficher() {
    return render(
        <MemoryRouter initialEntries={['/arbres/A/partage']}>
            <Routes><Route path="/arbres/:id/partage" element={<Partage />} /></Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    etat.invitations = [];
    etat.rpc = [];
    etat.fermees = [];
});
afterEach(cleanup);

describe('Partager l’arbre', () => {
    it('aucun partage : le lien est créé tout seul, une fois, sans PIN, 365 jours ; plus aucun formulaire', async () => {
        afficher();
        const champ = (await screen.findByLabelText('Lien de l’arbre')) as HTMLInputElement;
        expect(champ.value).toMatch(/\/c\/JETONNEUF$/);
        expect(champ.readOnly).toBe(true);
        expect(etat.rpc).toEqual([{ nom: 'creer_invitation', args: { p_arbre: 'A', p_libelle: 'Lien de l’arbre', p_pin: null, p_jours: 365 } }]);
        expect(screen.queryByText(/PIN|Durée|Nom du partage/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Copier le lien' })).toBeTruthy();
        expect(screen.getByLabelText(/QR code du lien/)).toBeTruthy();
    });

    it('un lien simple déjà ouvert est repris, rien n’est créé', async () => {
        etat.invitations = [inv('FERME', false, true), inv('EXPIRE', false, false, '2000-01-01'), inv('OUVERT', false)];
        afficher();
        const champ = (await screen.findByLabelText('Lien de l’arbre')) as HTMLInputElement;
        expect(champ.value).toMatch(/\/c\/OUVERT$/);
        expect(etat.rpc).toEqual([]);
    });

    it('un ancien partage avec PIN : proposé au remplacement, fermé seulement après son clic', async () => {
        etat.invitations = [inv('AVECPIN', true)];
        afficher();
        const bouton = await screen.findByRole('button', { name: /Remplacer par un lien simple/ });
        expect(etat.rpc).toEqual([]);
        expect(etat.fermees).toEqual([]);
        fireEvent.click(bouton);
        const champ = (await screen.findByLabelText('Lien de l’arbre')) as HTMLInputElement;
        expect(etat.fermees).toEqual(['AVECPIN']);
        expect(champ.value).toMatch(/\/c\/JETONNEUF$/);
    });

    it('« Copier le lien » met le lien dans le presse-papiers', async () => {
        const ecrit = vi.fn(async () => undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: ecrit }, configurable: true });
        afficher();
        const champ = (await screen.findByLabelText('Lien de l’arbre')) as HTMLInputElement;
        fireEvent.click(screen.getByRole('button', { name: 'Copier le lien' }));
        await waitFor(() => expect(ecrit).toHaveBeenCalledWith(champ.value));
        expect(await screen.findByRole('button', { name: 'Lien copié ✓' })).toBeTruthy();
    });
});
