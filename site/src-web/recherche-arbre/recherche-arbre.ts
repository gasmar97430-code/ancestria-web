// ---- RECHERCHE DE L'ARBRE : LA LOUPE ET UN MESSAGE VRAI (12/10/2026) ----
// Sa capture (Honor, 21:14, « Monique dijoux ») : « y a des incohérences : si je tape un nom et je n'ai pas de loupe
// de recherche, comment je vais pouvoir chercher un nom si ça fonctionne pas » · « corrige ».
// Mesuré : Monique DIJOUX est VIVANTE dans sa base → en ligne « Fiche protégée » (loi 6) → introuvable par son nom ;
// le message « Personne de ce nom dans l'arbre. » était faux et sans issue.
// Sur le site (le bloc de recherche du PC n'est pas modifié) :
//   1. la loupe du champ se touche : elle lance la recherche (= Entrée : la 1re personne trouvée s'ouvre) ;
//      le clavier du téléphone montre « Rechercher » ;
//   2. aucun résultat → à la place de l'ancien message : « Aucune fiche visible à ce nom. Les personnes vivantes
//      sont protégées : leur nom n'apparaît pas en ligne. » + « Chercher le nom « X » parmi les noms de l'île »
//      (va à l'Accueil, le nom tapé dans la recherche).
// Lui connecté en administrateur voit tout : le message ne parle alors pas des vivants.
// Posé par une ligne d'import dans Porte.tsx. Le retirer : la recherche d'avant.

const SELECTEUR_CHAMP = 'input[placeholder^="Nom de famille ou personne"]';
const ANCIEN = 'Personne de ce nom dans l’arbre.';
const ANCIEN_DROIT = "Personne de ce nom dans l'arbre.";

/** Le nom de famille dans une saisie « Monique dijoux » → « DIJOUX » (le dernier mot). */
export function nomDeFamille(saisie: string): string {
    const mots = saisie.trim().split(/\s+/).filter(Boolean);
    return (mots[mots.length - 1] ?? '').toUpperCase();
}

function entree(champ: HTMLInputElement): void {
    champ.focus();
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
}

function allerChercher(nom: string): void {
    const accueil = [...document.querySelectorAll<HTMLElement>('button, a')].find((x) => x.innerText.trim() === 'Accueil' || x.title === 'Accueil');
    accueil?.click();
    let essais = 0;
    const t = window.setInterval(() => {
        const i = document.querySelector<HTMLInputElement>('[data-champ="accueil"]');
        if (i || ++essais > 30) {
            window.clearInterval(t);
            if (!i) return;
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(i, nom);
            i.dispatchEvent(new Event('input', { bubbles: true }));
            i.scrollIntoView({ block: 'center' });
        }
    }, 100);
}

function messageVrai(ancien: HTMLElement, champ: HTMLInputElement | null): void {
    const boite = ancien.parentElement;
    if (!boite) return;
    ancien.style.display = 'none';
    let mien = boite.querySelector<HTMLElement>('[data-message="recherche-vide"]');
    if (!mien) {
        mien = document.createElement('div');
        mien.dataset.message = 'recherche-vide';
        mien.className = 'px-3 py-2.5 flex flex-col gap-2 text-[13px] text-encre';
        boite.appendChild(mien);
    }
    const nom = nomDeFamille(champ?.value ?? '');
    const visiteur = !!document.querySelector('[data-bouton="ajouter-noms"]');
    const cle = `${nom}|${visiteur}`;
    if (mien.dataset.pour === cle) return;
    mien.dataset.pour = cle;
    mien.replaceChildren();
    const t = document.createElement('div');
    t.innerHTML = '<b>Aucune fiche visible à ce nom.</b>';
    mien.appendChild(t);
    if (visiteur) {
        const p = document.createElement('div');
        p.className = 'text-[12.5px] text-encre-2';
        p.textContent = 'Les personnes vivantes sont protégées : leur nom n’apparaît pas en ligne.';
        mien.appendChild(p);
    }
    if (nom) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.bouton = 'chercher-le-nom';
        b.className = 'self-start min-h-11 px-3 rounded-[10px] border border-sepia text-sepia-deep bg-blanc text-[13px] font-medium';
        b.textContent = `Chercher le nom « ${nom} » parmi les noms de l’île`;
        b.addEventListener('mousedown', (e) => e.preventDefault());   // le champ garde la main : la liste ne se ferme pas avant le toucher
        b.addEventListener('click', () => allerChercher(nom));
        mien.appendChild(b);
    }
}

function regarder(): void {
    try {
        const champ = document.querySelector<HTMLInputElement>(SELECTEUR_CHAMP);
        if (champ && champ.getAttribute('enterkeyhint') !== 'search') champ.setAttribute('enterkeyhint', 'search');
        if (champ) {
            const loupe = champ.parentElement?.querySelector('svg');
            if (loupe && !loupe.hasAttribute('data-loupe')) {
                loupe.setAttribute('data-loupe', '');
                loupe.setAttribute('role', 'button');
                loupe.setAttribute('aria-label', 'Rechercher');
                (loupe as unknown as HTMLElement).style.cursor = 'pointer';
                loupe.addEventListener('click', (e) => { e.preventDefault(); entree(champ); });
            }
        }
        for (const el of document.querySelectorAll<HTMLElement>('#root div')) {
            if (el.childElementCount === 0 && (el.textContent === ANCIEN || el.textContent === ANCIEN_DROIT)) messageVrai(el, champ);
        }
        // des résultats sont revenus : le message ajouté s'efface
        for (const m of document.querySelectorAll<HTMLElement>('[data-message="recherche-vide"]')) {
            const ancien = [...(m.parentElement?.children ?? [])].find((x) => x.textContent === ANCIEN || x.textContent === ANCIEN_DROIT);
            if (!ancien) m.remove();
        }
    } catch { /* repli : la recherche d'avant */ }
}

if (typeof window !== 'undefined' && !(window as { __rechercheArbre?: boolean }).__rechercheArbre) {
    (window as { __rechercheArbre?: boolean }).__rechercheArbre = true;
    const o = new MutationObserver(() => regarder());
    const demarrer = () => { regarder(); o.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true, characterData: true }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
}
// ---- FIN RECHERCHE DE L'ARBRE ----
