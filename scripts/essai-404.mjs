// ---- ADRESSE D'ESSAI : LIENS DIRECTS VERS /essai/ ----
// Son « oui » du 01/10/2026 : le nouveau site (site/) est publié À PART de l'ancien, sous
// /<dépôt>/essai/. GitHub Pages n'a qu'une page 404 (celle de l'ancien site, pages-404.mjs) :
// on y ajoute, en tête, un renvoi pour les seules adresses sous /essai/ — elles repartent vers
// /essai/?/<chemin>, que site/index.html remet en place. L'ancien site n'est pas modifié.
// Usage : node scripts/essai-404.mjs /<dépôt>/essai/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const base = process.argv[2];
if (!base || !base.startsWith('/') || !base.endsWith('/')) { console.error('usage : node scripts/essai-404.mjs /<dépôt>/essai/'); process.exit(1); }
if (!existsSync('dist/404.html') || !existsSync('dist/essai/index.html')) { console.error('dist/404.html ou dist/essai/index.html introuvable'); process.exit(1); }
const renvoi = `<script>(function(){var b=${JSON.stringify(base)};var p=location.pathname;if(p.indexOf(b)!==0||p===b)return;var r=p.slice(b.length).replace(/&/g,'~and~');var q=location.search?'&'+location.search.slice(1).replace(/&/g,'~and~'):'';location.replace(b+'?/'+r+q+location.hash);})();</script>`;
const html = readFileSync('dist/404.html', 'utf8');
if (html.includes('~and~')) { console.log('dist/404.html : renvoi déjà présent'); process.exit(0); }
writeFileSync('dist/404.html', html.replace(/<head>/i, `<head>${renvoi}`));
console.log(`dist/404.html : renvoi ajouté pour ${base}`);
// ---- FIN ADRESSE D'ESSAI ----
