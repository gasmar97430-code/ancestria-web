// ---- ENTRÉE DU SITE ----
// Même démarrage que l'Ancestria du PC (src/index.tsx, copié tel quel), avec la
// porte du site autour. La copie du bureau n'est pas modifiée.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../src/App';
import '../src/index.css';
import '../src/ui/theme.css';
import { Porte } from './Porte';
import { CadrePartenaires } from './partenaires/Partenaires';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Porte>
            <CadrePartenaires><App /></CadrePartenaires>{/* partenaires/Partenaires.tsx : sans annonce, rien autour */}
        </Porte>
    </React.StrictMode>,
);
// ---- FIN ENTRÉE ----
