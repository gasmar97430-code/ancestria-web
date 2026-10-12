// ---- SOUTIEN À L'ARBRE DE LUMIÈRE : LE CARTOUCHE EN BAS DE L'ACCUEIL (12/10/2026) ----
//
// Sa demande (texte collé) : des bannières de micro-soutien / dons via Stripe ; son choix : « b » (le cartouche
// « parchemin moderne »). Modèle mesuré dans Ancestria/docs/soutien/ (320 → 1280 px). Posé en bas de l'Accueil,
// sous la recherche : il ne cache rien et n'interrompt personne.
// Loi 4 : un DON est libre et facultatif (jamais un achat, jamais un passage obligé) — le texte le dit.
// SA RÈGLE « pas de bannière sans SON lien » : LIEN_SOUTIEN vide → rien ne s'affiche. Son lien Stripe (Payment Link
// « les clients choisissent le montant ») se met ICI, ou à la construction (VITE_LIEN_SOUTIEN).
// Monté une fois, à part (sa propre racine), par la ligne d'import dans Porte.tsx. Le retirer = le site d'avant.

import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import './soutien.css';

export const LIEN_SOUTIEN: string = ((import.meta.env.VITE_LIEN_SOUTIEN as string | undefined) ?? '').trim();

/** Le bas de l'Accueil (le <main> qui contient la recherche), ou null ailleurs. */
function lieuAccueil(): HTMLElement | null {
    return (document.querySelector('[data-champ="accueil"]')?.closest('main') as HTMLElement | null) ?? null;
}

function Cartouche() {
    return (
        <section className="asl-b" data-bloc="soutien" aria-labelledby="asl-b-titre">
            <div>
                <p className="asl-b__sur">L’Arbre de Lumière</p>
                <h2 id="asl-b-titre">Préserver la mémoire de nos gramounes</h2>
                <p>Ancestria est gratuit et le restera. Si le cœur vous en dit, un petit soutien aide à documenter les noms de l’île et à garder l’arbre en ligne pour tous.</p>
            </div>
            <div className="asl-b__actions">
                <a className="asl-b__bouton" href={LIEN_SOUTIEN} target="_blank" rel="noopener" data-bouton="soutenir">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19Zm0 0 7-7" /></svg>
                    Soutenir l’arbre
                </a>
                <span className="asl-b__mention">Totalement facultatif · paiement sécurisé par Stripe</span>
            </div>
        </section>
    );
}

function SoutienAccueil() {
    const [lieu, setLieu] = useState<HTMLElement | null>(null);
    useEffect(() => {
        let boite: HTMLElement | null = null;
        const suivre = () => {
            try {
                const main = lieuAccueil();
                if (!main) { if (boite) { boite.remove(); boite = null; setLieu(null); } return; }
                if (boite && boite.parentElement === main && main.lastElementChild === boite) return;
                if (!boite) { boite = document.createElement('div'); boite.dataset.lieu = 'soutien'; }
                main.appendChild(boite);   // toujours en dernier : sous la recherche et la fiche du nom
                setLieu(boite);
            } catch { /* repli : pas de cartouche */ }
        };
        suivre();
        const o = new MutationObserver(suivre);
        o.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
        return () => { o.disconnect(); boite?.remove(); };
    }, []);
    return lieu ? createPortal(<Cartouche />, lieu) : null;
}

if (typeof window !== 'undefined' && LIEN_SOUTIEN && !(window as { __soutien?: boolean }).__soutien) {
    (window as { __soutien?: boolean }).__soutien = true;
    try {
        const racine = document.createElement('div');
        racine.id = 'soutien';
        document.body.appendChild(racine);
        createRoot(racine).render(<SoutienAccueil />);
    } catch { /* repli : le site sans cartouche */ }
}
// ---- FIN SOUTIEN À L'ARBRE DE LUMIÈRE ----
