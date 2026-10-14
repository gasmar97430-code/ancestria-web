// ---- BASCULE DU 14/10/2026 : LA NOUVELLE APPLI À L'ADRESSE PRINCIPALE ----
// Ses mots : « l'appli doit avoir une seule page », « si tu penses que sur le PC ce n'est plus la bonne, alors
// pourquoi tu ne la remplaces pas ». Une seule Ancestria en ligne : la nouvelle appli (essai-pwa/, son paquet PWA)
// prend l'adresse principale. L'ancien site (site/) n'est plus publié ; il reste dans le dépôt, rien n'est effacé.
//   · dist/            = essai-pwa/ (la nouvelle appli) + le fichier de Google, le plan du site, l'image de partage ;
//   · dist/essai-pwa/  = la même appli (les liens d'essai déjà donnés continuent de marcher) ;
//   · dist/404.html    = toute ancienne adresse (/c/<jeton>, /essai/, …) renvoie vers la nouvelle appli.
// Le service de la nouvelle appli (sw.js, même adresse que l'ancien) remplace l'ancien sur les appareils.
// Ligne d'appel : .github/workflows/deploiement.yml. La retirer = l'ancien site revient tel quel.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const racine = process.argv[2];
if (!racine || !racine.startsWith('/') || !racine.endsWith('/')) { console.error('usage : node scripts/nouvelle-appli-a-la-racine.mjs /<dépôt>/'); process.exit(1); }
if (!existsSync('essai-pwa/index.html')) { console.error('essai-pwa/index.html introuvable'); process.exit(1); }

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('essai-pwa', 'dist', { recursive: true });
cpSync('essai-pwa', 'dist/essai-pwa', { recursive: true });
for (const f of ['googlef6b466605fb4e4b6.html', 'sitemap.xml', 'partage-ancestria.png']) {
  if (existsSync(`site/public/${f}`)) cpSync(`site/public/${f}`, `dist/${f}`); // le fichier Google : à ne jamais retirer
}
writeFileSync('dist/404.html', `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Ancestria</title>
<script>location.replace(${JSON.stringify(racine)});</script></head>
<body><p>Ancestria a changé d'adresse : <a href="${racine}">ouvrir Ancestria</a>.</p></body></html>
`);
console.log(`nouvelle appli à ${racine} (+ essai-pwa/, 404 → ${racine})`);
// ---- FIN BASCULE DU 14/10/2026 ----
