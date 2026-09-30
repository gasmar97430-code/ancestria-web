// Après la construction : copie index.html en 404.html.
// GitHub Pages n'a pas de réécriture d'adresses : sans ce fichier, un lien
// de partage (/c/…) ouvert directement donnerait une page 404. Les autres
// hébergeurs (Cloudflare Pages, Netlify) lisent public/_redirects.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('dist/index.html')) {
    console.error('dist/index.html introuvable : la construction a échoué.');
    process.exit(1);
}
copyFileSync('dist/index.html', 'dist/404.html');
console.log('dist/404.html écrit (liens directs sur GitHub Pages).');
