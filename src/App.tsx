// ---- ROUTES ----
// Publiques : la page du QR code (/c/…), l'espace patrimonial
// (/patrimoine/…), la vérification d'un export. Le reste demande d'être
// connecté. Chaque page est chargée à la demande (le téléphone qui ouvre un
// QR code ne télécharge pas l'éditeur d'arbre).

import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { FournisseurSession, useSession } from './lib/session';
import { configurationManquante } from './lib/config';
import { Chargement } from './ui/ui';
import { Connexion } from './pages/Connexion';

const MesArbres = lazy(() => import('./pages/MesArbres').then((m) => ({ default: m.MesArbres })));
const ArbrePage = lazy(() => import('./pages/ArbrePage').then((m) => ({ default: m.ArbrePage })));
const Partage = lazy(() => import('./pages/Partage').then((m) => ({ default: m.Partage })));
const Propositions = lazy(() => import('./pages/Propositions').then((m) => ({ default: m.Propositions })));
const GestionPatrimoine = lazy(() => import('./pages/GestionPatrimoine').then((m) => ({ default: m.GestionPatrimoine })));
const Contribuer = lazy(() => import('./pages/Contribuer').then((m) => ({ default: m.Contribuer })));
const PatrimoinePublic = lazy(() => import('./pages/PatrimoinePublic').then((m) => ({ default: m.PatrimoinePublic })));
const Verifier = lazy(() => import('./pages/Verifier').then((m) => ({ default: m.Verifier })));
const Offres = lazy(() => import('./pages/Offres').then((m) => ({ default: m.Offres })));
const Certificat = lazy(() => import('./pages/Certificat').then((m) => ({ default: m.Certificat })));

function Protege({ children }: { children: ReactNode }) {
    const { session, chargement } = useSession();
    if (chargement) return <Chargement />;
    return session ? <>{children}</> : <Connexion />;
}

function Introuvable() {
    return (
        <main className="max-w-md mx-auto p-8 text-center flex flex-col gap-4">
            <h1 className="font-display text-3xl">Page introuvable</h1>
            <Link to="/" className="text-sepia underline underline-offset-4">Revenir à l’accueil</Link>
        </main>
    );
}

export function ConfigurationManquante({ manque }: { manque: string[] }) {
    return (
        <main className="max-w-xl mx-auto p-8 flex flex-col gap-4">
            <h1 className="font-display text-3xl">Configuration à compléter</h1>
            <p className="text-encre-2">Ancestria ne sait pas encore à quelle base se connecter. Renseignez dans le fichier <code>.env.local</code> (ou dans les secrets GitHub) :</p>
            <ul className="list-disc pl-6 text-encre">{manque.map((m) => <li key={m}><code>{m}</code></li>)}</ul>
            <p className="text-sm text-encre-3">Voir GUIDE_DEPLOIEMENT.md, étape 3.</p>
        </main>
    );
}

export default function App() {
    const manque = configurationManquante();
    if (manque.length) return <ConfigurationManquante manque={manque} />;
    return (
        <FournisseurSession>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
                <Suspense fallback={<Chargement />}>
                    <Routes>
                        <Route path="/" element={<Protege><MesArbres /></Protege>} />
                        <Route path="/arbres/:id" element={<Protege><ArbrePage /></Protege>} />
                        <Route path="/arbres/:id/partage" element={<Protege><Partage /></Protege>} />
                        <Route path="/arbres/:id/propositions" element={<Protege><Propositions /></Protege>} />
                        <Route path="/arbres/:id/patrimoine" element={<Protege><GestionPatrimoine /></Protege>} />
                        <Route path="/offres" element={<Protege><Offres /></Protege>} />
                        <Route path="/c/:jeton" element={<Contribuer />} />
                        <Route path="/patrimoine/:slug" element={<PatrimoinePublic />} />
                        <Route path="/verifier" element={<Verifier />} />
                        <Route path="/certificat/:empreinte" element={<Certificat />} />
                        <Route path="*" element={<Introuvable />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </FournisseurSession>
    );
}

// ---- FIN ROUTES ----
