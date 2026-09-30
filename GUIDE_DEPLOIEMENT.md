# Ancestria en ligne — mise en service pas à pas

Durée : environ 30 minutes. Coût : 0 € (offres gratuites de Supabase et de
GitHub). Aucune connaissance technique requise au-delà de copier-coller.

Ce qu'il faut avant de commencer : une adresse e-mail, et Node.js 22 ou plus
installé sur l'ordinateur (https://nodejs.org, version « LTS »).

---

## Étape 1 — Créer la base (Supabase)

1. Aller sur https://supabase.com → **Start your project** → se connecter
   (avec GitHub ou une adresse e-mail).
2. **New project** : donner un nom (`ancestria`), choisir un mot de passe
   de base (le noter, il ne servira qu'en cas de besoin), région **West EU
   (Paris)** ou la plus proche, offre **Free**. Attendre ~2 minutes.

## Étape 2 — Installer le schéma

1. Dans le projet : menu de gauche **SQL Editor** → **New query**.
2. Ouvrir le fichier `supabase/schema.sql` de ce dossier, **tout** copier,
   coller dans l'éditeur, cliquer **Run**.
3. Attendu : « Success. No rows returned ». Le script est rejouable : le
   relancer plus tard (après une mise à jour) ne perd aucune donnée.

Contrôle : menu **Table Editor** → on voit 16 tables (`individus`,
`foyers`, `filiations`…), chacune marquée « RLS enabled ».

## Étape 3 — Récupérer les deux valeurs publiques

Menu **Project Settings** → **API** :

- **Project URL** (ex. `https://abcdxyz.supabase.co`)
- **anon public** key (longue chaîne commençant par `eyJ…`)

Ces deux valeurs sont **publiques par nature** : elles vont dans le
navigateur. La sécurité est dans la base (sécurité par ligne), pas dans
leur secret. La clé **service_role**, elle, ne doit JAMAIS être copiée
dans le site.

## Étape 4 — Essayer sur l'ordinateur

Dans le dossier du projet :

```
npm install
copy .env.example .env.local      (sous Windows ; « cp » sur Mac/Linux)
```

Ouvrir `.env.local` et remplacer :

```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…
VITE_ADRESSE_PUBLIQUE=http://localhost:5173
VITE_STRIPE_ACTIF=false
```

Puis :

```
npm test          (tous les essais : ils doivent tous passer)
npm run dev
```

Ouvrir http://localhost:5173 → saisir son e-mail → ouvrir le lien reçu.

## Étape 5 — Réglages de connexion (Supabase)

Menu **Authentication** → **URL Configuration** :

- **Site URL** : l'adresse finale du site (étape 7), par exemple
  `https://votre-nom.github.io/ancestria-web/`
- **Redirect URLs** : ajouter cette même adresse **et**
  `http://localhost:5173` (pour les essais sur l'ordinateur).

Sans cela, le lien de connexion reçu par e-mail renverrait au mauvais
endroit.

## Étape 6 — Mettre le code sur GitHub

1. Créer un compte sur https://github.com si besoin.
2. **New repository** → nom `ancestria-web` → **Public** (GitHub Pages
   gratuit l'exige pour un compte gratuit) → **Create**.
3. Dans le dossier du projet :

```
git init
git add .
git commit -m "Ancestria en ligne"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM/ancestria-web.git
git push -u origin main
```

Le fichier `.env.local` n'est **pas** envoyé (il est dans `.gitignore`).

## Étape 7 — Mise en ligne automatique (GitHub Pages)

1. Sur GitHub, dans le dépôt : **Settings** → **Pages** → **Source** :
   **GitHub Actions**.
2. **Settings** → **Secrets and variables** → **Actions** :
   - onglet **Secrets** → **New repository secret** :
     `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (valeurs de l'étape 3) ;
   - onglet **Variables** → **New repository variable** :
     `VITE_ADRESSE_PUBLIQUE` = `https://VOTRE-NOM.github.io/ancestria-web/`
     et `VITE_STRIPE_ACTIF` = `false`.
3. Onglet **Actions** → **Mise en ligne** → **Run workflow**.
   Le robot rejoue TOUS les essais ; s'ils passent, il publie. ~3 minutes.
4. Le site est en ligne à `https://VOTRE-NOM.github.io/ancestria-web/`.

Ensuite, chaque `git push` republie tout seul (et ne publie rien si un
essai échoue).

> Lien direct vers une page (ex. un QR code `/c/…`) : GitHub Pages n'a pas
> de réécriture d'adresses ; la construction copie `index.html` en
> `404.html`, ce qui fait marcher ces liens. Pour des aperçus Facebook
> parfaits (code 200), on peut plus tard publier le même dossier `dist`
> sur Cloudflare Pages ou Netlify (gratuits) : `public/_redirects` est déjà
> prêt.

## Étape 7 bis — OU mise en ligne sur Vercel (gratuit, adresse sans sous-dossier)

À la place de l'étape 7 (ou en plus) :

1. https://vercel.com → se connecter **avec GitHub** → **Add New… → Project**
   → choisir le dépôt `ancestria-web` → **Import**.
2. Vercel reconnaît Vite (fichier `vercel.json` déjà prêt : construction,
   dossier `dist`, liens directs `/c/…` et `/patrimoine/…` réécrits vers
   l'application). Ne rien changer.
3. **Environment Variables** : ajouter `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (étape 3), `VITE_STRIPE_ACTIF` = `false`.
   (Ne PAS mettre `VITE_BASE` : sur Vercel le site est à la racine.)
4. **Deploy**. Le site est en ligne à `https://ancestria-web-xxxx.vercel.app`.
5. Reporter cette adresse : variable `VITE_ADRESSE_PUBLIQUE` dans Vercel
   (puis **Redeploy**), et dans Supabase → Authentication → URL
   Configuration (Site URL + Redirect URLs, étape 5).

Ensuite, chaque `git push` republie tout seul sur Vercel. (Vercel ne rejoue
pas les essais : la mise en ligne GitHub de l'étape 7 le fait ; garder les
deux permet de voir un essai rouge avant qu'il n'arrive en ligne.)

## Étape 8 — (Plus tard) Paiement Stripe pour l'offre Famille

Tout marche sans Stripe (offre gratuite). Pour l'activer :

1. Compte sur https://stripe.com (mode test d'abord). **Produits** → créer
   « Ancestria Famille », prix récurrent → noter l'identifiant `price_…`.
2. Installer la CLI Supabase (https://supabase.com/docs/guides/cli), puis :

```
supabase login
supabase link --project-ref VOTRE-REF
supabase secrets set STRIPE_CLE_SECRETE=sk_test_… STRIPE_PRIX_FAMILLE=price_… SITE_ADRESSE=https://VOTRE-NOM.github.io/ancestria-web/
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

3. Stripe → **Développeurs** → **Webhooks** → ajouter l'adresse
   `https://VOTRE-REF.supabase.co/functions/v1/stripe-webhook`, événements
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` ;
   copier le **secret de signature** `whsec_…` puis :

```
supabase secrets set STRIPE_SECRET_WEBHOOK=whsec_…
```

4. Sur GitHub, variable `VITE_STRIPE_ACTIF` = `true`, relancer la mise en
   ligne.

Le site ne contient jamais de clé secrète. Seul le webhook (signature
vérifiée) écrit un abonnement ; un navigateur ne peut pas s'offrir une offre.

## Étape 9 — (Collectivités) Licence et espace patrimonial

La licence collectivité s'accorde dans Supabase → **SQL Editor** :

```sql
insert into public.abonnements (utilisateur, offre, statut, organisme, fin_periode)
select id, 'institution', 'actif', 'Mairie de Saint-Paul', now() + interval '1 year'
from auth.users where email = 'patrimoine@mairie-exemple.re'
on conflict (utilisateur) do update
  set offre = excluded.offre, statut = excluded.statut, organisme = excluded.organisme, fin_periode = excluded.fin_periode;
```

Puis, dans le site : arbre → **Patrimoine** → **Espace public** : adresse
(ex. `saint-paul`), territoire, présentation, centre de la carte, case
« Publier ». L'espace est en ligne à `…/patrimoine/saint-paul`, avec son
QR code. À l'échéance de la licence, la publication s'arrête d'elle-même.

---

## En cas de souci

| Ce qu'on voit | Cause | Geste |
| --- | --- | --- |
| « Configuration à compléter » | variables absentes | étape 4 (local) ou 7.2 (GitHub) |
| Le lien de connexion ouvre une autre page (ex. localhost:3000) | « Site URL » de Supabase restée par défaut | Authentication → URL Configuration : Site URL = adresse du site, et la même suivie de ** dans Redirect URLs (étape 5) |
| « Vous n'avez pas le droit… » | ce n'est pas votre arbre | seul le propriétaire modifie son arbre ; les visiteurs envoient des propositions par le lien partagé |
| La mise en ligne est rouge dans Actions | un essai a échoué | ouvrir le détail : le nom de l'essai dit quoi |
| Le QR mène à « Ce partage est fermé » | partage fermé ou expiré | rouvrir la page Partager : un nouveau lien est prêt tout seul |
