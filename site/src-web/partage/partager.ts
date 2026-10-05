// ---- PARTAGER ANCESTRIA (05/10/2026) ----
//
// Ses mots (capture « Créer une publication » de Facebook, vide) : « pas assez fluide le partage ».
// Facebook IGNORE le texte qu'un site lui passe (sa règle : la personne écrit elle-même) et sa carte
// était vide (aucune balise de partage dans index.html — ajoutées le même jour, image public/partage-ancestria.png).
// Ici, pour les deux boutons (inviter-amis/, appli-telephone/) :
//   1. le message + le lien sont COPIÉS d'abord (il n'y a plus qu'à « Coller » dans Facebook) ;
//   2. le menu de partage du téléphone s'ouvre (WhatsApp, Facebook, SMS…) ;
//   3. le lien porte « ?partage » : Facebook le lit comme une page neuve et montre la nouvelle carte
//      (l'adresse simple garde en mémoire, chez Facebook, l'ancienne carte vide).
// Rend ce qui s'est passé, pour le petit mot affiché.

export const lienDePartage = () => `${window.location.origin}${import.meta.env.BASE_URL}?partage`;

export const CONSIGNE_COLLER = 'Le message est copié : dans Facebook, appuyez longuement dans « Quoi de neuf ? » puis « Coller ».';

/** Copie le message, puis ouvre le partage. Rejette si la personne ferme le menu sans choisir. */
export async function partagerAncestria(texte: string): Promise<{ menu: boolean; copie: boolean }> {
    const url = lienDePartage();
    let copie = false;
    try { await navigator.clipboard.writeText(`${texte} ${url}`); copie = true; } catch { /* presse-papiers refusé : le menu suffit */ }
    if (navigator.share) {
        await navigator.share({ title: 'Ancestria', text: texte, url });
        return { menu: true, copie };
    }
    return { menu: false, copie };
}

// ---- FIN PARTAGER ANCESTRIA ----
