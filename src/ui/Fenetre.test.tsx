// Son image du 30/09 : dans « Nouvel arbre », seule la 1re lettre s'écrivait.
// La page redonne une nouvelle fonction « fermer » à chaque lettre ; la fenêtre ne doit
// pas reprendre la main sur le champ pour autant.
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Champ, Fenetre } from './ui';

function PageEssai() {
    const [nom, setNom] = useState('');
    const [ouverte, setOuverte] = useState(true);
    return ouverte ? (
        <Fenetre titre="Nouvel arbre" onFermer={() => setOuverte(false)}>
            <Champ libelle="Nom de l’arbre" valeur={nom} onChange={setNom} autoFocus />
        </Fenetre>
    ) : (
        <p>fermée</p>
    );
}

afterEach(cleanup);

describe('Fenetre', () => {
    it('le champ garde la main pendant la saisie (plusieurs lettres)', () => {
        render(<PageEssai />);
        const champ = screen.getByLabelText('Nom de l’arbre') as HTMLInputElement;
        champ.focus();
        for (const valeur of ['F', 'Fa', 'Fam', 'Famille']) {
            fireEvent.change(champ, { target: { value: valeur } });
            expect(document.activeElement).toBe(champ);
        }
        expect(champ.value).toBe('Famille');
    });

    it('à l’ouverture, le curseur est dans le champ (autoFocus respecté)', () => {
        render(<PageEssai />);
        expect(document.activeElement).toBe(screen.getByLabelText('Nom de l’arbre'));
    });

    it('Échap ferme toujours la fenêtre', () => {
        render(<PageEssai />);
        const champ = screen.getByLabelText('Nom de l’arbre');
        fireEvent.change(champ, { target: { value: 'F' } });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.getByText('fermée')).toBeTruthy();
    });
});
