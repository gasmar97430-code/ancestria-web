// ---- CHARTE DE L'ARBRE DE LUMIÈRE ET AVIS SUR LES DONNÉES ----
// Demande de l'administrateur (30/09/2026, « consolidation ») :
//   1. « Affiche une charte de bonne conduite claire au moment de l'inscription pour
//      rappeler la rigueur historique, l'exactitude des origines géographiques et
//      l'interdiction stricte des fausses données. »
//   2. « Assure la mise en conformité des données personnelles (noms, e-mails,
//      téléphones) ».
// Il n'a pas dicté le texte de la charte : les articles ci-dessous sont rédigés d'après
// SES règles du même jour (mémoire « noble et rigoureuse », fausses données interdites,
// origines jamais supposées, contribution verrouillée et tracée, neutralité entre les
// familles). C'est lui qui a le dernier mot sur chaque phrase.
// L'avis sur les données suit la liste de la CNIL (« Conformité RGPD : information des
// personnes et transparence » : identité du responsable, finalités, base légale,
// caractère obligatoire, destinataires, durée, droits, réclamation), en deux niveaux.

/** Change dès qu'un article change : l'inscription est alors redemandée. */
export const VERSION_CHARTE = '2026-09-30';

export const TITRE_CHARTE = 'Charte de l’Arbre de Lumière';

export const ARTICLES_CHARTE: { titre: string; texte: string }[] = [
    { titre: 'La rigueur historique', texte: 'Je n’apporte que ce que je sais : un acte, un livret de famille, un document, un témoignage direct des miens. Ce que j’ignore, je le laisse vide — un blanc vaut mieux qu’une erreur.' },
    { titre: 'Aucune fausse donnée', texte: 'Fausses informations, blagues et données fantaisistes sont strictement interdites. Elles sont refusées, et leur auteur est connu.' },
    { titre: 'L’exactitude des origines', texte: 'Une origine géographique ne se suppose pas et ne se devine pas d’après un nom : elle se dit seulement quand un acte ou une source historique l’établit.' },
    { titre: 'Le respect des familles', texte: 'Aucune personne vivante n’est montrée au public. Je n’écris rien qui puisse blesser une famille ou une mémoire, et aucun nom n’est mis au-dessus d’un autre.' },
    { titre: 'Je signe ce que j’apporte', texte: 'Je contribue sous mon nom. Chaque contribution validée est verrouillée et tracée ; pour la corriger, j’écris à l’administrateur, qui vérifie et fait la modification.' },
];

export const ENGAGEMENT_CHARTE = 'J’ai lu la Charte de l’Arbre de Lumière et je m’engage à la respecter.';

/** Avis sur les données, 1er niveau : l'essentiel, en une phrase. */
export const AVIS_COURT =
    'Votre nom, votre prénom et votre e-mail ou téléphone servent à savoir qui a apporté quoi et à vous joindre au sujet de votre contribution. Seul l’administrateur les voit : ils ne sont jamais montrés au public.';

/** Avis sur les données, 2e niveau : chaque point de la liste de la CNIL. */
export function avisDetaille(administrateur: string, email: string | null): { titre: string; texte: string }[] {
    const ecrire = email ? `en écrivant à ${email}` : 'en écrivant à l’administrateur';
    return [
        { titre: 'Qui en est responsable', texte: `${administrateur}, administrateur d’Ancestria${email ? ` — ${email}` : ''}.` },
        { titre: 'À quoi elles servent', texte: 'Identifier l’auteur de chaque contribution, vous joindre à son sujet, et écarter les abus. Rien d’autre : ni publicité, ni revente, ni partage.' },
        { titre: 'Sur quoi cela repose', texte: 'Votre accord, donné en vous inscrivant et en cochant la case à l’envoi. Vous pouvez le retirer à tout moment.' },
        { titre: 'Ce qui est obligatoire', texte: 'Nom, prénom, et e-mail ou téléphone sont obligatoires pour contribuer. Sans eux, aucune contribution n’est acceptée ; la consultation des pages reste libre.' },
        { titre: 'Qui les voit', texte: 'L’administrateur seulement. Une empreinte technique de votre connexion (jamais votre adresse en clair) est gardée avec l’envoi pour limiter les abus.' },
        { titre: 'Combien de temps', texte: 'Aussi longtemps que votre contribution est conservée ; elles sont effacées si vous le demandez.' },
        { titre: 'Vos droits', texte: `Accéder à vos données, les faire corriger, les faire effacer, vous opposer à leur usage : ${ecrire}. Vous pouvez aussi saisir la CNIL (cnil.fr).` },
    ];
}

const CLE = 'ancestria-charte';

/** La charte en vigueur a-t-elle été acceptée sur ce téléphone ? */
export function charteAcceptee(stockage: Pick<Storage, 'getItem'>): boolean {
    try {
        return stockage.getItem(CLE) === VERSION_CHARTE;
    } catch {
        return false;
    }
}

export function garderCharte(stockage: Pick<Storage, 'setItem'>): void {
    try {
        stockage.setItem(CLE, VERSION_CHARTE);
    } catch {
        /* navigation privée : vaut pour cette visite */
    }
}

// ---- FIN CHARTE ET AVIS SUR LES DONNÉES ----
