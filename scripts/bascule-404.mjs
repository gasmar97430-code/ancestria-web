// ---- BASCULE : LIENS DIRECTS SUR L'ADRESSE PRINCIPALE ET L'ADRESSE D'ESSAI ----
// Sa demande du 01/10/2026 : le site en ligne doit être le miroir de l'appli (le nouveau site, site/,
// remplace l'ancien à l'adresse principale). GitHub Pages n'a qu'une page 404 : copie de la page du
// site, avec en tête un renvoi pour les liens directs (/c/<jeton>…) vers <base>?/<chemin>, que
// site/index.html remet en place. L'adresse d'essai (/essai/) est servie d'abord.
// Usage : node scripts/bascule-404.mjs /<dépôt>/
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const racine = process.argv[2];
if (!racine || !racine.startsWith('/') || !racine.endsWith('/')) { console.error('usage : node scripts/bascule-404.mjs /<dépôt>/'); process.exit(1); }
if (!existsSync('dist/index.html')) { console.error('dist/index.html introuvable'); process.exit(1); }
const bases = [...(existsSync('dist/essai/index.html') ? [`${racine}essai/`] : []), racine];
const renvoi = `<script>(function(){var bs=${JSON.stringify(bases)};var p=location.pathname;for(var i=0;i<bs.length;i++){var b=bs[i];if(p.indexOf(b)!==0)continue;if(p===b)return;var r=p.slice(b.length).replace(/&/g,'~and~');var q=location.search?'&'+location.search.slice(1).replace(/&/g,'~and~'):'';location.replace(b+'?/'+r+q+location.hash);return;}})();</script>`;
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/404.html', readFileSync('dist/404.html', 'utf8').replace(/<head>/i, `<head>${renvoi}`));
console.log(`dist/404.html : renvoi pour ${bases.join(' puis ')}`);
// ---- FIN BASCULE ----
