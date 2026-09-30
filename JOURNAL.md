# Journal d'Ancestria en ligne (web)

Relevé de ce qui est fait, mesuré, et de ce qui reste. Le plus récent en haut.

## ▶ 30/09/2026 ~13:00 — HISTORIQUE EFFACÉ (SON OUI) + arbre_public — REPRENDRE ICI

- Historique du dépôt public remplacé par UN enregistrement (9ae2f89), après contrôle de tous les fichiers (0 nom de sa famille, hors répertoire public des patronymes et fichier INSEE des prénoms ; noms de famille du journal neutralisés). Ancien historique (27 enregistrements) gardé EN LOCAL : D:/tmp/ancestria-web-historique/historique-avant-effacement-20260930.bundle. 0 fork, 0 PR. Limite mesurée : les anciennes versions restent joignables par leur code chez GitHub (cache) → doc officielle : seul le support GitHub les purge, à la demande du propriétaire → message prêt : Ancestria/MESSAGE_SUPPORT_GITHUB.md (à envoyer par LUI).
- Base : `arbre_public(p_jeton)` (1e17430) = décédés + couples et liens ENTRE décédés, sans vivants, fiches « à trouver », notes ni lieux, dates à l'année ; lien fermé / inventé / avec PIN → rien ; public autorisé à l'appeler (liste de fumee.test.ts). 3 essais ; 128/128. Script mis dans son presse-papiers ; À LUI : Supabase → SQL Editor → coller → Run.
- Suite : 1b dans site/ (visiteur via /c/<jeton> → prise lit arbre_public ; écritures refusées avec « Ajouter une famille »), puis écritures du propriétaire, puis bascule de la mise en ligne sur site/.

## 30/09/2026 ~12:40 — ÉTAPE 1a FAITE (NON PUBLIÉE) : L'ÉCRAN DU BUREAU DANS site/ — REPRENDRE ICI

**Fait (778661a)** : `site/` = le frontend du bureau copié par `scripts/copier-bureau.mjs` (99 fichiers, version b893d44), MÊMES OUTILS que le bureau (Vite 4, React 18, Tailwind 3, package-lock du bureau + @supabase/supabase-js). La copie est faite SANS COMMENTAIRES (compilateur TypeScript, removeComments) : les commentaires du bureau citent des personnes réelles de sa famille (vivantes comprises) et le dépôt est PUBLIC. Preuve que le fonctionnement est intact : les 242 essais du bureau passent sur la copie sans commentaires (essais recopiés puis retirés). Contrôle des noms sur tout ce qui part : 0 (hors répertoire public des patronymes et fichier INSEE des prénoms).
Seule pièce du site dans la copie : `site/src/api/client.ts` = axios avec adaptateur → `site/src-web/prise/routes.ts` (mêmes adresses que le serveur du PC) : /tree (arbre unique = 1er de mes_arbres, lu par pages, ordre cree_le → traduit au format du bureau par `traduction.ts`), /patronymes (répertoire copié du bureau, rangé comme lui), le reste vide ou « pas disponible en ligne ». `site/src-web/Porte.tsx` : connexion du propriétaire (lien e-mail), `entree.tsx` : démarrage du bureau + porte.
**Banc (copie de sa base, local, effacé)** : bureau et site côte à côte à 1600×1000 → Accueil IDENTIQUE (menu, signature, filtres, fiche d’un nom de son arbre : mêmes porteurs, mêmes branches), arbre : même en-tête « Famille … · 261 individus · 8 générations », même menu à icônes. Écarts restants NOMMÉS : Suggestions 0 / Incohérences 0 (étape 5), Suivi du nom (traques du PC), carte « ? » absente (export du bureau), disposition légèrement différente (ordre des liens parent→enfant : le GEDCOM ne porte pas l'ordre de saisie du bureau). Import GEDCOM : unions et liens gardent maintenant l'ordre du fichier (cree_le).
**Aussi** : 2 fichiers DÉJÀ PUBLIÉS le 29/09 (src/arbre-bureau/features/tree/pastille.ts, recentrage.ts) avaient des noms de sa famille en commentaire → retirés. Ils restent dans l'HISTORIQUE git du dépôt public : le purger = réécrire l'historique (force push) → À SA DÉCISION.
**Pas encore publié** : la mise en ligne construit toujours l'ancien site (racine). Suite : 1b visiteurs (RPC publique : décédés + liens entre eux, via le jeton du lien partagé → script SQL à rejouer par lui), « Ajouter une famille » ; étape 2 écritures (/people, /unions, /relationships…) ; étape 4 bascule de la mise en ligne sur site/ + retrait de l'ancien site ; étape 5 incohérences/suggestions (règles du bureau, pures, à recopier).

## 30/09/2026 ~12:00 — SON FEU VERT : LE SITE = L'ÉCRAN DU BUREAU — MÉTHODE (REPRENDRE ICI)

Ses mots : « c'est CETTE interface exacte que je veux conserver et stabiliser » (ses 2 captures du bureau : Accueil + arbre) ; menu latéral Accueil / Arbre / Traque des Noms / Sources / Suggestions / Incohérences + signature ; « Quel nom cherchez-vous ? » + filtres + fiche du nom à droite ; l'arbre fluide. « Gèle cette structure, nettoie tout le reste. » Livres / Chansons / Espace Pro : NON cités (« uniquement ») → en attente.
**Méthode (nœud, pas de redessin)** : 1) copier TEL QUEL le frontend du bureau (Ancestria/frontend/src) dans src/bureau/ (script de copie rejouable) ; 2) UNE pièce remplacée : api/client.ts → adaptateur axios qui sert les mêmes adresses (/tree, /people, /unions, /relationships, /patronymes…) depuis Supabase (ids entiers du bureau ↔ uuid, comme versBureau.ts) ; ce que le site ne peut pas faire (traque réseau, carnet, GEDCOM fichier, sauvegarde, IA) répond « pas disponible en ligne » ; 3) App.tsx : « / » = coquille du bureau (propriétaire connecté : tout ; visiteur : lecture des décédés via le lien partagé) ; accès propriétaire discret ; « Ajouter une famille » = formulaire de proposition existant ; 4) retirer MesArbres, Offres, ArbrePage, Membres (fait), tableaux de bord ; 5) Incohérences / Suggestions : règles du bureau portées. Vérif : mêmes données (copie de sa base importée dans le banc) → image du bureau et image du site côte à côte, même taille.

## 30/09/2026 11:45 (suite) — SON « STOP » : LIGNE UNIQUE — REPRENDRE ICI

Fait avant son stop : page Membres + invitations par e-mail retirées (a2d5446, 125/125, publié ; fonctions SQL remplacées par drop function if exists : effectives quand le script est rejoué dans Supabase). Bureau : 1.6.37 installée (en-tête de l'arbre qui passe à la ligne).
SON STOP (mot pour mot dans Ancestria/SES_PROMPTS) : « tu pars dans tous les sens et tu détruis la structure originale » ; supprimer « Mes arbres », déconnexion, profils ; un seul univers ; design ORIGINAL = menu latéral Accueil / Arbre / Traque des Noms / Sources + « Quel nom cherchez-vous ? » ; garder : arbre fluide, recherche des noms, livres, musique, Espace Pro.
**LIGNE UNIQUE désormais** : le site = l'Ancestria du PC en ligne (un seul arbre, le sien), + Livres / Chansons / Espace Pro. Ne plus empiler de demandes du SaaS des 4 premiers textes (multi-arbres, offres, membres). Limite dite : la Traque des Noms interroge les archives depuis son PC ; GitHub Pages ne le peut pas seul.

## 30/09/2026 11:45 — IMPORT GEDCOM + PARTAGE SIMPLIFIÉ EN LIGNE — REPRENDRE ICI

**Import (41a9235)** — sa demande « j'ai déjà des arborescences toutes prêtes » (arbre en ligne vide vs 261 personnes au bureau : deux bases). src/import-gedcom/ : lecture.ts, dates.ts, interpretation.ts COPIÉS du bureau ; versWeb.ts (INDI→individus, FAM à 2 parents→unions dédoublonnées, CHIL→filiations, année seule→précision annee, vivant = règle de l'export du bureau, ordre du fichier gardé par cree_le) ; importer.ts (paquets de 100, repli ligne à ligne, refus avec motif, arrêt sur limite / droit / réseau) ; ImportGedcom.tsx (porte : arbre vide, 1 ligne dans ArbrePage). Essais tests/sql/import-gedcom.test.ts sur le vrai schéma (4). **Mesure sur la COPIE de sa base, en local (rien en ligne)** : export du bureau → 261/261 personnes, 59/59 couples, 370/370 liens (372 − 2 de la fiche « ? »), 0 refus, 313 ms ; arbre dessiné par VueArbreBureau : 320 nœuds, 316 traits, images 10 % et 25 % regardées. Dossiers de banc (contenant ses données) EFFACÉS. À noter : 182 personnes sur 261 comptées « vivantes » (pas de date ni de décès saisis : règle prudente du bureau).

**Partage (c0601a4)** — son texte : lien + Copier le lien + QR, rien d'autre. Partage.tsx refait en entier : lien prêt à l'ouverture (invitation ouverte sans PIN reprise, sinon creer_invitation sans PIN, 365 j, une seule fois) ; ancienne invitation à PIN : remplacement proposé. 4 essais (Partage.test.tsx), images PC + téléphone. 126/126.

**Au plan, dans l'ordre** : interface identique à l'Ancestria du PC (aussi au téléphone) ; son 5e cahier (CAHIER_5_PORTAIL_2026-09-30.md) en lots A–F ; règle éthique des partenaires ; boutons d'achat (livres, Espace Pro) vers SES liens Stripe / PayPal.

## 30/09/2026 11:05 — « NOUVEL ARBRE » : SEULE LA 1re LETTRE S'ÉCRIVAIT — CORRIGÉ, PUBLIÉ (80877e7) — REPRENDRE ICI

Cause (src/ui/ui.tsx, Fenetre) : l'effet d'ouverture dépendait de onFermer, fonction neuve à chaque rendu (onFermer={() => setCreation(false)}) → rejoué à chaque lettre → boite.focus() reprenait la main. 2e défaut vu au banc : même à l'ouverture, la boîte prenait la main au champ autoFocus. Correction dans le bloc Fenetre : onFermer dans une référence, effet joué une fois ([]), et pas de focus sur la boîte si le focus est déjà dedans. Seul .focus() du site. Vaut pour TOUTES les fenêtres (arbre, fiche, patrimoine…). Essai src/ui/Fenetre.test.tsx (3 : saisie de plusieurs lettres — TOMBE sans la correction —, autoFocus, Échap) ; banc Edge sans affichage + vraie fenêtre du site, vraies touches : ancien code clic+frappe = « F » (reproduit son image), corrigé = « Famille Gastellier » en frappe directe et après clic ; image regardée. Types 0, 118/118, robot : succès, site en ligne vérifié (bundle index-0Siw9ZiX.js). Dossier jetable _banc-fenetre retiré. Prochaine action : il crée son 1er arbre.

## 30/09/2026 10:45 — PREMIÈRE CONNEXION RÉUSSIE (PC) — REPRENDRE ICI

Il a fait lui-même le réglage URL Configuration (Site URL + Redirect URLs) ; sonde : Supabase renvoie vers le site (avec et sans redirect_to). Lien demandé depuis le site à 10:27 (e-mail « Your sign-in link », arrivé cette fois en Boîte de réception) → « Se connecter » → écran « Mes arbres » avec gasmar97430@gmail.com, 0 arbre (son image). Prochaine action : + Nouvel arbre, puis QR réel, connexion du téléphone (lien demandé depuis le téléphone), « en direct » téléphone ↔ PC. Reste à regarder : les 2 premiers e-mails Supabase étaient dans sa Corbeille (filtre Gmail ?).

## 30/09/2026 10:35 — LE LIEN MENAIT À SON DEVBLOG : « SITE URL » DE SUPABASE = http://localhost:3000 — REPRENDRE ICI

Il a trouvé l'e-mail « Confirm your email address » (09:59) dans la CORBEILLE (les 2 e-mails Supabase y sont : filtre Gmail probable, à regarder). Au clic : son DevBlog (qui tourne sur localhost:3000). Mesuré sans rien toucher : GET /auth/v1/verify avec un faux jeton et redirect_to = le site → 303 Location: http://localhost:3000#error=… → la Site URL est restée celle par défaut et l'adresse du site n'est pas dans les Redirect URLs (l'entrée du 29/09 « Site URL posée par lui » ne s'est pas enregistrée). Son adresse est désormais CONFIRMÉE (jeton consommé). À LUI (réglage de son compte) : Authentication → URL Configuration : Site URL = https://gasmar97430-code.github.io/ancestria-web/ ; Redirect URLs + https://gasmar97430-code.github.io/ancestria-web/** ; Save. Contrôle après : même sonde → Location doit être le site. Puis nouveau lien depuis le site (PC).

## 30/09/2026 10:10 — « JE N'AI PAS DE MAIL » : ENVOI PROUVÉ, LIEN RENDU VALABLE PARTOUT — REPRENDRE ICI

Doc Supabase (auth-smtp) : le service d'e-mail gratuit n'envoie qu'aux membres de l'équipe du projet, 2 e-mails par heure. Demande de lien faite par moi (API /auth/v1/otp, clé publique du site) pour gasmar97430@gmail.com à 09:59 : **HTTP 200** = adresse autorisée, limite non atteinte, e-mail parti. Défaut trouvé : le site était en flowType 'pkce' → d'après la doc Supabase le lien ne marche que dans le navigateur qui l'a demandé (refusé si Gmail l'ouvre ailleurs ; et mon lien, demandé sans PKCE, aurait été refusé : « Not a valid PKCE flow url », auth-js 2.117.2). Passé en 'implicit' (défaut de supabase-js) — 590a253, tsc 0, 115/115, publié (robot : succès), site en ligne vérifié (flowType implicit). NON vérifié de bout en bout : sa connexion réelle (il faut son e-mail). Le lien de 09:59 vaut 1 h (jusqu'à ~10:59). Prochaine action : sa 1re connexion, puis arbre + QR + « en direct ».

## 29/09/2026 ~17:30 — SA SIGNATURE EN HAUT DE CHAQUE ÉCRAN — REPRENDRE ICI

Ses mots : « je n'ai pas vu mon pseudo affiché dans cette appli », puis « dans tous les projets du groupe de
Zulublanc le pseudo doit être en haut de l'appli, c'est ma signature ». J'avais d'abord compris « pseudo du
compte » et construit un choix de pseudo NON DEMANDÉ : retiré avant tout envoi (jamais publié).
Fait (f03a068, publié) : `src/arbre-bureau/Signature.tsx` = bloc COPIÉ du haut de la barre du bureau
(logo arbre + « M'astel.974 » / « L'Arbre de Lumière ») ; posé par une ligne dans EnTetePage (ui.tsx : Mes
arbres, Partage, Propositions, Membres, Patrimoine, Offres, Vérifier), ArbrePage (en haut à gauche comme au
bureau), Contribuer et Connexion (centrée), PatrimoinePublic. Lien vers « Mes arbres » sur les écrans du
propriétaire, pas de lien sur les pages publiques. NON posée : Certificat (document imprimable).
Contrôle : 7 écrans × téléphone et PC = signature présente partout, 0 erreur ; images regardées.
Règle mémorisée pour TOUS ses projets (memory/signature-en-haut-de-chaque-appli.md).
Piège du banc : le lanceur d'Edge rend la main tout de suite, ses enfants gardaient le profil verrouillé
(9 à 11 processus restés) → tel.mjs ferme maintenant les msedge qui portent le profil du banc.

## 29/09/2026 ~16:45 — LE VRAI SITE EST RELIÉ À SA BASE SUPABASE

Guidé geste par geste (il trouvait GitHub « trop vite ») : compte Supabase par GitHub (gasmar97430-code),
organisation « gasmar97430-code's Org » (FREE), projet `ancestria`, région West EU (Paris), réf.
**jxvsmjgmnfiaphebtqtq** → https://jxvsmjgmnfiaphebtqtq.supabase.co ; « afficher les nouvelles tables »
décoché, RLS auto non coché ; mot de passe de la base généré par lui, gardé par lui (gestionnaire Google),
JAMAIS reçu ni noté ici. schema.sql exécuté (je l'ai mis dans son presse-papiers : il s'effaçait deux fois,
remis) → « Run without RLS » (le script active lui-même la sécurité sur les 16 tables, l. 1674-1678 :
l'outil Supabase ne voit pas la boucle) → « Success. No rows returned ». Site URL posée par lui.
GitHub : adresse du projet = VARIABLE du dépôt posée par moi (non secrète ; workflow b6f7e3a :
`secrets.VITE_SUPABASE_URL || vars.VITE_SUPABASE_URL`) ; clé = secret VITE_SUPABASE_ANON_KEY collé PAR LUI
(clé « publishable » sb_publishable_…, la bonne). Mise en ligne relancée : succès.

**Contrôle du vrai site, vu d'un inconnu (scratchpad controle-en-ligne.mjs) : 18/18** — le site porte
l'adresse de SA base et une clé publique seulement (0 clé secrète, 0 jeton) ; 12 tables : rien ne sort
sans compte ; créer un arbre sans compte : refusé ; fonction du QR installée (lien inventé refusé
proprement) ; connexion par e-mail active. À l'image, vraie simulation de téléphone (390 px, largeur de page
= 390) : page de connexion et « Ce lien n'est pas complet » nettes. (La capture Edge --screenshot à 390
coupait la droite : largeur mini de la fenêtre sans affichage, pas le site.)

**NON encore essayé (demande sa boîte mail)** : connexion par lien e-mail, création d'un arbre, QR réel,
temps réel entre deux appareils. Le banc de la maison (8744) est arrêté : ses QR ne marchent plus.

## 29/09/2026 13:30 — AFFICHAGE IDENTIQUE AU BUREAU + PALETTES + ESSAI SUR SON TÉLÉPHONE

Ses mots : « il faut que l'affichage soit identique sur le téléphone et sur le PC », « même arborescence »,
« il faudrait un bouton pour le changement de sombre, clair ou autre », « on peut essayer sur mon téléphone »,
« quand ça sera terminé on ouvre l'appli et j'ouvre mon téléphone ».

**Fait (89141dd, publié) :**
- `src/arbre-bureau/` : les pièces de l'arbre du bureau COPIÉES TELLES QUELLES (vérifié octet pour octet :
  types, lib/buildGraph, lib/origins, disposition par foyers, recentrage, pastille, ordreConjoints, graphe,
  StatutVie, cartes mémorielles, pastilles d'union) ; Origines.tsx = extrait exact (carte seulement) ;
  `ui/theme-bureau.css` = EXTRAIT AUTOMATIQUE du thème du bureau (137 lignes, 0 absente) : polices
  Cormorant Garamond / Instrument Sans / IBM Plex Mono (mêmes paquets, mêmes versions 5.3.0, icônes
  Phosphor 2.1.10) + trois palettes. `versBureau.ts` traduit les données en ligne vers le format du bureau
  (ids entiers dans l'ordre de création, genre, typeLien, typeUnion) ; `VueArbreBureau.tsx` assemble comme
  Arbre.tsx du bureau (trame à points, vue d'ensemble, dock de zoom, carte « à trouver » du bureau).
  Téléphone : départ à 75 % (53 % mesuré sinon : noms illisibles). ArbrePage : 1 ligne (VueArbre gardé).
- index.css : chaque couleur/police de l'appli renvoie aux variables du bureau → la palette change TOUT.
- `ChoixPalette.tsx` : le bloc « Palette » du bureau (Sombre / Ivoire / Parchemin, même clé
  ancestria.palette.v2, sombre par défaut), dans l'en-tête de l'arbre, de « Mes arbres » et en bas de la
  page du QR (visiteurs).
- Mesures : 115 essais, types 0 ; fonds mesurés = valeurs du bureau (ivoire rgb(244,237,224), parchemin
  rgb(228,215,191)) ; police des cartes = Cormorant Garamond ; images PC + téléphone dans les 3 palettes
  regardées ; en-tête PC corrigé (titre écrasé par le bouton Palette → largeur mini 300 px).
- NON repris (propre au bureau) : répertoire des patronymes (cartes « Hors rép. »), rang des unions,
  flou de focus au clic, barre latérale.

**Banc sur le réseau de la maison (pour SON téléphone)** : `BANC_HOTE=0.0.0.0 BANC_PORT=8744
BANC_URL=http://192.168.0.13:8744 node serveur.mjs` (pare-feu : node.exe déjà autorisé en réseau privé,
aucune fenêtre) ; site construit avec VITE_SUPABASE_URL=http://192.168.0.13:8744 ; `/banc-connexion` =
entrée propriétaire (pose la session et ouvre « Mes arbres ») ; QR : `node qr.cjs` (images/QR-1, QR-2 ;
le jeton change à chaque redémarrage du banc). Relais temps réel ajouté au banc (format Realtime 2.0.0 :
phx_join → liaisons, après chaque écriture un « UPDATE » sans contenu) : « ● en direct » et un ajout d'un
autre écran apparaît tout seul (4 → 5 cartes mesuré).

## 29/09/2026 12:20 — LE TÉLÉPHONE : PARCOURS DU QR VÉRIFIÉ DE BOUT EN BOUT

Sa demande : « je veux voir l'avancée pour le téléphone ».

**Banc refait** (l'ancien, `banc-web/` d'une autre session, était effacé) — scratchpad `banc-web/` :
`serveur.mjs` = le VRAI schema.sql dans PGlite préparé par `tests/sql/harnais.ts`, derrière un petit
serveur qui répond comme PostgREST (tables : select/eq/in/order/limit, insert/update/delete ; rpc avec
les types lus dans pg_proc) et GoTrue (session injectée, jeton non signé, local seulement) ; il sert aussi
le site construit contre lui. `tel.mjs` = Edge sans affichage, 390×844 tactile, port DevTools 0.
Famille INVENTÉE (Essaiville). PIÈGE : construire le site depuis PowerShell — sous Git Bash,
`VITE_BASE=/` devient « C:/Program Files/Git/ » (page blanche).

**Parcours regardés à l'image (téléphone), 0 erreur de page :**
- visiteur : accueil du QR → « Qui êtes-vous ? » → recherche d'un ancêtre (seuls les décédés sont montrés,
  règle de la base vérifiée : Essaijean vivant absent) → lien → proches → « Un dernier mot » → « Merci … ! » ;
- propriétaire : Mes arbres (« 1 proposition à modérer ») → arbre → Partager (QR lisible, image Facebook,
  impression, copier) → Propositions → Accepter → l'arbre passe de 4 à 5 personnes (Essailea sous Essaiprosper).
- La base refuse une proposition impossible à l'acceptation, message clair + « rien n'a été ajouté ».

**Défaut trouvé et corrigé (nœud neuf `src/domaine/anneesPlausibles.ts`, 4 lignes dans Contribuer.tsx) :**
né en 1990 face à un ancêtre né en 1900, « Je suis son parent / conjoint / frère » était proposé ; une
« enfant » née en 1962 passait jusqu'au refus de la base chez le propriétaire. Maintenant : les liens
impossibles ne sont plus proposés (10 ans parent-enfant comme la base, 50 ans fratrie, 60 ans conjoints,
années inconnues = tout permis) ; les proches sont contrôlés à « Suivant » (et à l'envoi, pour un vieux
brouillon), message juste (« né avant vous (1990) … (parent ?) »). Essais 111/111, types 0 ; revu à
l'image sur le téléphone ; retirer le fichier + les lignes → la page d'avant compile. Poussé (5f61426).

**Limites du banc, dites :** pas de temps réel (le bandeau « hors ligne (reconnexion…) » est le banc) ;
connexion par e-mail et temps réel ne s'essaient qu'avec SON projet Supabase.

**12:35 — FAIT : limite des partages** : nœud neuf `src/offres/limitePartages.tsx` (limiteAtteinte +
AvisLimitePartages, repli = page d'avant), 2 lignes dans Partage.tsx : à 1 / 1, « Créer le partage » grisé +
« Votre offre permet 1 partage ouvert à la fois : fermez un partage… ou voyez les offres ». 4 essais (115/115),
types 0, revu à l'image sur le téléphone (p08).

**Reste, dans l'ordre :** ses 3 gestes Supabase (PLAN.html) → relancer la mise en ligne → refaire ce
parcours sur le VRAI site (connexion e-mail, temps réel).

## 29/09/2026 11:40 — PUBLIÉE SUR GITHUB PAGES

Ses mots : « il faut que l'appli soit terminée et être en hébergement sur GitHub comme convenu »,
« l'avancée du QR code etc., donc ne perds pas de temps inutilement ».

**Fait et mesuré**
- Relu avant d'envoyer un dépôt PUBLIC : 70 fichiers suivis, 0 nom de sa famille, 0 clé (JWT, sk_), `.env.local` exclu ; auteur des commits = gasmar97430@gmail.com.
- Compte GitHub de la machine vérifié : `gasmar97430-code` (le sien). Dépôt créé :
  https://github.com/gasmar97430-code/ancestria-web — `main` envoyé.
- GitHub Pages activé (build_type = workflow) ; variables : `VITE_ADRESSE_PUBLIQUE` =
  https://gasmar97430-code.github.io/ancestria-web/ , `VITE_STRIPE_ACTIF` = false.
- 1re exécution « Mise en ligne » : SUCCÈS (essais + types + construction, puis publication) —
  https://github.com/gasmar97430-code/ancestria-web/actions/runs/36537421113
- Site : page 200 ; lien de QR direct `/c/essai` → 404.html = l'appli (même script index-DGLsp_b7.js) ;
  image regardée : « Configuration à compléter » (attendu tant que la base n'existe pas).

**Ce qui bloque le QR code en ligne : la base Supabase, à SON nom.** Je n'ai pas le droit de créer un
compte ni de saisir des clés : ses 3 gestes sont écrits en tête de `D:\lab\Projets\Ancestria\PLAN.html`
(projet Supabase Paris/Free ; schema.sql dans SQL Editor + Site URL ; 2 secrets GitHub
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).

**Dès son « fait »** : relancer « Mise en ligne » (Actions → Run workflow, ou API workflow_dispatch),
puis essayer moi-même EN LIGNE : connexion par e-mail (son adresse gasmar97430@gmail.com seulement s'il
le dit), création d'un arbre de démonstration INVENTÉ, QR code, page du contributeur `/c/…` sur téléphone
simulé, proposition → modération. Images regardées, chiffres au journal.

---

## ÉTAT AU 28/09/2026 ~23:55 (après « reprend ») — historique

**Correction du relevé d'hier : 28 écrans parcourus, pas 32.**

**Revue des 28 images (toutes regardées) : 9 défauts trouvés, tous corrigés et revus à l'image**
1. Couples séparés (une carte s'intercalait, le trait la traversait) → groupes dagre ; essai sur 60 ordres
   tirés au hasard — l'essai sur un seul ordre passait même SANS la correction (il ne prouvait rien).
2. Étiquettes des traits et mini-carte en blanc (feuille de React Flow chargée après la nôtre) → styles posés sur chaque trait.
3. Formulaire : une erreur à la fois → toutes ensemble (prénom + date impossible).
4. Liste « parent existant » proposait l'impossible (Lou, née en 2012, parent de Louis, né en 1940) → filtrée par les dates.
5. Modération : « Je suis son petit-enfant de Paul Martin » → « Se dit petit-enfant de Paul Martin ».
6. Accords : « 1 personnalités illustres » → fonction nombre().
7. GRAVE : la carte Leaflet recouvrait les fenêtres → fenêtres au-dessus (z-1100).
8. Téléphone : barre d'outils sur 3 lignes, arbre illisible → une ligne qui défile + zoom de départ lisible ;
   MA première correction avait cassé le titre (écrasé à zéro) → vu au 2e passage, refait en 3 lignes empilées.
9. Barres de défilement / cases blanches → color-scheme: dark. + liens « ← retour » agrandis pour le doigt (44 px).

**Ses demandes de la reprise (faites, essayées)**
- « + Frère / sœur » SANS passer par les parents : germain (mêmes parents, sinon 2 « à trouver »), demi (parent
  commun choisi, sinon 1 « à trouver » partagé — chacun garde ses parents), par adoption (liens adoptifs).
  Fonction de base `ajouter_frere_soeur` tout ou rien ; section « Frères et sœurs » (demi signalé) dans la fiche.
- Parent retrouvé plus tard : « Compléter sa fiche » (tous ses enfants en profitent) OU « C'est une personne
  déjà dans l'arbre… » (`remplacer_parent_a_trouver`, tout ou rien, boucle refusée sans rien bouger).

**Son 4e texte (fait)** : photo (lien https, base + écran, repli initiales vérifié avec une photo introuvable),
tableau « Mes arbres » chiffré (`mes_arbres()`, le lecteur n'a pas les chiffres réservés), certificat
d'export imprimable `/certificat/<empreinte>` (QR vers sa propre vérification), Vercel (`vercel.json` + étape 7 bis).

**Mesures finales**
- 104 essais sur 104 (79 côté base, dont 5 de parité ; 25 unitaires) ; parité écran/base étendue aux fratries (≥ 50 par graine,
  acceptées ET refusées) et prouvée par sabotage ; 8 sabotages du schéma final tous détectés (1 à 11 essais tombent).
- `npm run typecheck` 0 (site + fonctions Stripe) ; `npm run build` OK.
- Banc (fausse base, Edge sans affichage) : 33 écrans (ordinateur + téléphone) : 0 débordement, 0 erreur (hors la
  photo volontairement introuvable), 0 cible tactile < 32 px, arbre toujours entièrement visible.

**Ne s'essaie qu'avec SES comptes** : temps réel et connexion e-mail (projet Supabase à créer par lui, étape 1 du
guide) ; paiement Stripe ; concurrence réelle des verrous (PGlite = une connexion).

---

## ÉTAT À L'ARRÊT DU 28/09/2026 (~20:50) — historique


Projet né ce soir de ses 4 textes collés (gardés mot pour mot dans
`D:\lab\Projets\Ancestria\SES_PROMPTS_2026-09-26.md`). Projet À PART : l'Ancestria de
bureau (SQLite, base chez lui) n'est pas touchée. Familles de démonstration INVENTÉES
seulement (sa règle) : plus aucun nom de sa famille dans ce dossier (vérifié : 0).

**Fait et mesuré**
- `supabase/schema.sql` : individus, foyers (1 à n parents), filiations qualifiées (+ foyer),
  unions, documents géolocalisés, familles historiques, invitations (QR + PIN haché bcrypt),
  contributions modérées, essais de PIN, exports certifiés SHA-256, offres/licences, RLS
  partout, temps réel. Rejouable.
- 92 essais sur 92 : 70 SQL (PGlite préparé comme Supabase), 5 × 420 propositions de
  PARITÉ écran/base (2 100 verdicts identiques), 19 unitaires, 3 Stripe.
  Preuves par sabotage : chaque règle retirée fait tomber au moins un essai (boucle,
  dates, ligne directe, RLS, vivants publics, PIN, licence, réouverture de partage,
  parité 10 ans côté écran).
- Défauts trouvés et corrigés en route : « % » dans la recherche publique renvoyait tout ;
  réouverture d'un partage contournait la limite gratuite ; renvoi hors ligne en double
  (identifiant d'envoi) ; fiche orpheline si lien refusé (fonctions « tout ou rien ») ;
  lenteurs O(n²) dans les listes de choix ; carte recadrée à chaque frappe ; fuite
  offre_de (fermée).
- `npm run typecheck` 0 erreur (site + fonctions Stripe contrôlées avec types Stripe 17.7).
- `npm run build` OK (pages chargées à la demande).
- Banc d'images (scratchpad `banc-web/` : fausse base en mémoire + Edge sans affichage) :
  32 écrans parcourus (ordinateur 1440 px + téléphone 390 px) : **0 erreur de console,
  0 débordement horizontal** ; arbre 15/15 cartes visibles ; parcours QR complet jusqu'à
  « Merci ».

**PAS ENCORE FAIT — dans cet ordre à la reprise**
1. REGARDER les 32 images (`scratchpad/banc-web/images/`) une par une — seule celle de la
   connexion a été regardée. Relevés à creuser : « cibles petites » (1 à 3 par page,
   probablement liens « retirer » à 36 px) ; débord -15 sur les pages patrimoine.
   Le scratchpad est effacé entre sessions : refaire le banc si besoin (faux-supabase.ts,
   vite.banc.config.ts avec greffon « fausse-base », serveur.mjs, cdp.mjs, captures.mjs).
2. Ajouts de son 4e texte : colonne `photo_url` (https, affichée carte + fiche + notice),
   rapport certifié IMPRIMABLE (en plus de l'export JSON), tableau « multi-arbres » pour
   la licence collectivité, section Vercel dans le guide + `vercel.json` (réécriture SPA).
3. Étape 10 : tout rejouer (essais, types, construction, images) avant de lui dire « fini ».
4. Ce qui ne peut PAS s'essayer sans lui : temps réel et connexion par e-mail (il faut SON
   projet Supabase — compte à créer par LUI, étape 1 du guide) ; paiement Stripe (compte
   Stripe à lui) ; concurrence réelle des verrous (PGlite = une seule connexion).
