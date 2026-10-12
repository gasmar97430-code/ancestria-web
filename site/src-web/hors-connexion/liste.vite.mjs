// ---- HORS CONNEXION : LA LISTE DES FICHIERS À GARDER (12/10/2026) ----
// Sa demande (texte collé, « pas le jeu mais ancestria ») : l'appli s'ouvre et marche hors connexion après une première
// ouverture en ligne ; un bouton « Mettre à jour » quand une nouvelle version est publiée.
// À la fin de chaque construction (vite build), ce greffon écrit dist/precache.js :
//   self.__ANCESTRIA_VERSION = empreinte de tous les fichiers gardés (change à chaque publication qui change quelque chose)
//   self.__ANCESTRIA_FICHIERS = la liste de ces fichiers (adresses relatives)
// public/sw.js le lit (importScripts) : la page, le programme, la feuille de style, les polices .woff2, l'image de l'arbre,
// l'icône. Pas gardés : l'image de partage (1,2 Mo, pour Facebook), les grandes icônes (installation seulement), les
// .woff (doublons des .woff2), 404.html, le dossier essai/.
// Ligne d'appel : vite.config.ts (plugins). La retirer = plus de precache.js : sw.js retombe sur « tout vient du réseau ».
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const GARDER = /\.(html|js|css|woff2|webp|png|jpg|jpeg|svg|webmanifest|json|mp3|ogg|wav)$/i;
const ECARTER = /^(sw\.js|precache\.js|404\.html|partage-ancestria\.png|icone-512\.png|icone-masque-512\.png)$|^essai\//;

function parcourir(dossier) {
    const sortie = [];
    for (const nom of readdirSync(dossier)) {
        const p = join(dossier, nom);
        if (statSync(p).isDirectory()) sortie.push(...parcourir(p));
        else sortie.push(p);
    }
    return sortie;
}

export function listeHorsConnexion() {
    let dossier = 'dist';
    return {
        name: 'ancestria-liste-hors-connexion',
        apply: 'build',
        configResolved(c) { dossier = c.build.outDir.startsWith('/') || /^[A-Za-z]:/.test(c.build.outDir) ? c.build.outDir : join(c.root, c.build.outDir); },
        closeBundle() {
            try {
                const fichiers = parcourir(dossier)
                    .map((p) => relative(dossier, p).split(sep).join('/'))
                    .filter((r) => GARDER.test(r) && !ECARTER.test(r))
                    .sort();
                const h = createHash('sha256');
                for (const r of fichiers) { h.update(r); h.update(readFileSync(join(dossier, r))); }
                const version = h.digest('hex').slice(0, 16);
                writeFileSync(join(dossier, 'precache.js'),
                    `// écrit par src-web/hors-connexion/liste.vite.mjs à la construction — ne pas modifier à la main\n` +
                    `self.__ANCESTRIA_VERSION = ${JSON.stringify(version)};\n` +
                    `self.__ANCESTRIA_FICHIERS = ${JSON.stringify(['./', ...fichiers.filter((r) => r !== 'index.html')], null, 0)};\n`);
                console.log(`hors connexion : ${fichiers.length} fichiers, version ${version}`);
            } catch (e) {
                console.warn('hors connexion : liste non écrite (' + e.message + ') — le site marche, mais pas hors connexion');
            }
        },
    };
}
// ---- FIN HORS CONNEXION : LA LISTE ----
