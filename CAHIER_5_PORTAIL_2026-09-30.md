# Son 5e texte — collé le 30/09/2026 vers 11:20 (gardé MOT POUR MOT)

Suivi de : « Donne-moi l'ensemble du code structuré, propre et prêt à l'emploi. C'est parti ! »

---

Agis en tant que Lead Developer Full-Stack, Architecte Logiciel Senior et Expert en solutions numériques. 

Je veux que tu me conceives l'intégralité du code source pour finaliser et enrichir mon portail artistique, littéraire et mémoriel global nommé **Ancestria**, créé et signé par **M'astel Marius Gastellier**. Une grande partie de l'infrastructure est déjà en ligne, donc le code doit être propre, moderne, robuste, modulaire, et 100% cohérent avec l'existant (zéro "TODO", zéro code à trous, zéro approximation).

Voici le cahier des charges exact à respecter de A à Z :

### 1. ARCHITECTURE TECHNIQUE & BASE DE DONNÉES (SUPABASE)
- Fournis le script SQL complet prêt à l'emploi pour initialiser ou mettre à jour Supabase :
  * Table "individus" (ID, prénom, nom, dates de naissance/décès, genre, biographie, lien photo).
  * Table "foyers" (pour gérer les unités parentales modernes : familles recomposées, homoparentalité, adoption, etc.).
  * Table "filiations" (liens qualifiés entre individus et foyers).
- Écris l'algorithme de vérification en TypeScript/JavaScript pour bloquer instantanément toute boucle logique absurde ou incohérence temporelle dans l'arbre.

### 2. FRONT-END, NAVIGATION ET VITRINE DE CRÉATEUR (M'astel Marius Gastellier)
- Crée une barre de navigation claire, élégante et unifiée donnant accès aux différentes sections :
  1. **L'Arbre (Ancestria)** : L'application principale de généalogie.
  2. **"Racines à l'Histoire" (Bibliothèque d'édition)** : Une page catalogue dédiée à la présentation de mes livres. *Règle de protection stricte : si un utilisateur clique sur un livre, une vue détaillée s'ouvre pour afficher uniquement le résumé (la 4ème de couverture) et une introduction, mais JAMAIS l'ouvrage en entier (car les livres sont protégés et payants). Prévois un emplacement pour un futur bouton d'achat ou lien de commande.*
  3. **Mes Chansons (Espace Musical)** : Un espace de vitrine artistique pour présenter mes titres. *Règle de protection stricte : chaque chanson propose uniquement un court extrait audio (ex: 30 secondes via un lecteur intégré) et non la totalité du morceau, avec un bouton de soutien ou d'accès à l'écoute complète.*
  4. **Espace Pro** : Une section dédiée à la présentation et à la commercialisation des licences professionnelles d'Ancestria (réservée aux mairies, collectivités et structures).

- **Page d'accueil (Landing Page) & Tableaux de bord :** 
  * Une page d'accueil chaleureuse, poétique, mettant fortement en avant mon identité de créateur et mes travaux d'auteur.
  * Un encadré clair expliquant le modèle : 100% gratuit pour les particuliers et les familles, et offre professionnelle dédiée via l'Espace Pro.
  * Des thèmes visuels adaptables (modes Sombre, Ivoire, Par parchemin).

- **Bannières publicitaires et Partenaires :** 
  * Intègre des emplacements élégants et discrets pour des **bannières publicitaires / espaces partenaires** (dans le pied de page ou sur les côtés), me permettant d'accueillir des régies ou des liens d'entreprises partenaires pour générer un petit complément de revenus.

- **Pied de page (Footer) professionnel :** Un footer structuré en colonnes comprenant un résumé de la plateforme à mon nom (M'astel Marius Gastellier), les liens vers nos univers (Arbre, Livres, Chansons, Espace Pro), les mentions institutionnelles et les réseaux sociaux.

### 3. MODULE DE RECHERCHE PATRONYMIQUE ET GÉOLOCALISATION HISTORIQUE
- Intègre une section dédiée à l'analyse des noms de famille :
  * **Fiche Étymologie et Fréquence** : Origine historique, sens, et popularité d'un patronyme.
  * **Toponymie / Communes les plus présentes** : Liste des communes associées au nom avec le nombre d'individus correspondants.
  * **Carte de répartition interactive** : Une carte géographique munie d'un curseur temporel (frise chronologique de 0 à 2026) pour visualiser l'implantation des porteurs du nom au fil des siècles.

### 4. INTERACTIVITÉ TEMPS RÉEL & PARTAGE
- Code complet pour l'affichage interactif et fluide de l'arbre généalogique (responsive et adapté sur mobile).
- Formulaires sécurisés d'ajout et de modification de fiches en temps réel via Supabase Realtime.
- Un composant dynamique de génération de QR Code pour partager l'arbre facilement.

### 5. GUIDE DE DÉPLOIEMENT PAS À PAS
- Rédige un guide clair et direct pour m'expliquer comment connecter le tout, configurer mes clés Supabase, et mettre à jour le site en ligne proprement depuis chez moi.
