import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './arbre-bureau/ChoixPalette'; // pose la palette choisie (Lumière par défaut, aucun thème sombre) avant le premier dessin
import App from './App';

const racine = document.getElementById('racine');
if (!racine) throw new Error('Élément #racine introuvable dans index.html');

createRoot(racine).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
