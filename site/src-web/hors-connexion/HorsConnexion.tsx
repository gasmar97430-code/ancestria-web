// ---- « PRÊTE HORS CONNEXION » ET « METTRE ANCESTRIA À JOUR » (12/10/2026) ----
// Sa demande : « un message “Prêt hors connexion” une fois les ressources mises en cache » · « un bouton “Mettre à jour”
// lorsqu'une nouvelle version est disponible, avec sauvegarde de la progression avant le rechargement ».
// Va avec public/sw.js. Un petit bandeau en BAS de l'écran (l'avis de panne est en haut) :
//   - « ✓ Ancestria est prête hors connexion » : une fois par version gardée, disparaît seul après 7 s ;
//   - « Une nouvelle version d'Ancestria est prête » + [Mettre Ancestria à jour] : reste jusqu'au toucher ; au toucher,
//     la progression est copiée (clé ancestria-sauvegarde-avant-maj), la nouvelle version prend la main, la page se
//     recharge. Rien d'autre n'est effacé : la progression vit dans l'appareil et reste où elle est.
// Le site cherche une nouvelle version à l'ouverture, au retour sur l'appli, et toutes les 30 min.
// Monté une fois, à part (sa propre racine), par la ligne d'import dans Porte.tsx. Le retirer = le site d'avant.

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CLE_AVANT_MAJ, faireSauvegarde } from './sauvegarde';

const CLE_PRETE = 'ancestria-prete-hors-connexion';

function BandeauHorsConnexion() {
    const [prete, setPrete] = useState(false);
    const [attente, setAttente] = useState<ServiceWorker | null>(null);
    const [encours, setEncours] = useState(false);

    useEffect(() => {
        const sw = navigator.serviceWorker;
        let fini = false;
        const annoncer = (version: string | null) => {
            if (!version) return;
            try { if (localStorage.getItem(CLE_PRETE) === version) return; localStorage.setItem(CLE_PRETE, version); } catch { /* sans stockage : annoncé à chaque fois */ }
            setPrete(true);
            setTimeout(() => !fini && setPrete(false), 7000);
        };
        const surMessage = (e: MessageEvent) => {
            const d = e.data || {};
            if ((d.type === 'ancestria-prete' || d.type === 'ancestria-etat') && (d.type === 'ancestria-prete' || d.prete)) annoncer(d.version ?? null);
        };
        sw.addEventListener('message', surMessage);
        let minuterie = 0;
        sw.getRegistration().then((reg) => {
            if (!reg || fini) return;
            const surveiller = (w: ServiceWorker | null) => {
                if (!w) return;
                const voir = () => { if (w.state === 'installed' && sw.controller) setAttente(w); };
                voir(); w.addEventListener('statechange', voir);
            };
            surveiller(reg.waiting);
            reg.addEventListener('updatefound', () => surveiller(reg.installing));
            // Le navigateur relisait precache.js dans son cache web (10 min sur GitHub Pages, mesuré au banc : la nouvelle
            // version n'était pas vue) : la même inscription, redemandée « sans cache web » pour ses fichiers.
            const script = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL;
            if (script && reg.updateViaCache !== 'none') sw.register(script, { scope: reg.scope, updateViaCache: 'none' }).catch(() => { /* rien */ });
            const chercher = () => { reg.update().catch(() => { /* hors connexion : on réessaiera */ }); };
            chercher();
            minuterie = window.setInterval(chercher, 30 * 60 * 1000);
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') chercher(); });
        }).catch(() => { /* rien */ });
        sw.ready.then((reg) => reg.active?.postMessage({ type: 'etat' })).catch(() => { /* rien */ });
        return () => { fini = true; sw.removeEventListener('message', surMessage); clearInterval(minuterie); };
    }, []);

    const mettreAJour = () => {
        if (!attente) return;
        setEncours(true);
        try { localStorage.setItem(CLE_AVANT_MAJ, JSON.stringify(faireSauvegarde(localStorage))); } catch { /* la progression reste de toute façon dans l'appareil */ }
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
        attente.postMessage({ type: 'maj' });
        setTimeout(() => window.location.reload(), 6000);   // repli si la nouvelle version ne répond pas
    };

    if (!attente && !prete) return null;
    return (
        <div role="status" aria-live="polite" data-avis={attente ? 'mise-a-jour' : 'prete-hors-connexion'}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)', zIndex: 79, pointerEvents: 'none' }} className="px-3">
            <div style={{ pointerEvents: 'auto' }} className="mx-auto max-w-xl rounded-[14px] border border-sepia bg-carte shadow-carte px-4 py-3 text-encre flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                {attente ? (<>
                    <span className="flex-1 min-w-[200px]">🌿 <b>Une nouvelle version d’Ancestria est prête.</b> Votre inscription et vos réglages sont gardés.</span>
                    <button type="button" onClick={mettreAJour} disabled={encours} className="min-h-11 px-4 rounded-[10px] bg-sepia text-blanc font-medium disabled:opacity-60" data-bouton="mettre-a-jour">
                        {encours ? 'Mise à jour…' : 'Mettre Ancestria à jour'}
                    </button>
                </>) : (<span>✓ <b>Ancestria est prête hors connexion</b> : les arbres déjà ouverts restent consultables sans réseau.</span>)}
            </div>
        </div>
    );
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !(window as { __horsConnexion?: boolean }).__horsConnexion) {
    (window as { __horsConnexion?: boolean }).__horsConnexion = true;
    try {
        const lieu = document.createElement('div');
        lieu.id = 'hors-connexion';
        document.body.appendChild(lieu);
        createRoot(lieu).render(<BandeauHorsConnexion />);
    } catch { /* repli : le site sans bandeau */ }
}
// ---- FIN « PRÊTE HORS CONNEXION » ET « METTRE À JOUR » ----
