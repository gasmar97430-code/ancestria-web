// ---- COPIE DE L'ÉCRAN DU BUREAU DANS LE SITE ----
//
// Sa demande du 30/09/2026 : « c'est CETTE interface exacte que je veux
// conserver et stabiliser » (l'Ancestria du PC). Le site ne redessine rien :
// il reprend TEL QUEL le frontend du bureau (Ancestria/frontend/src) dans
// site/src/. Une seule pièce n'est jamais écrasée : site/src/api/client.ts,
// la « prise » qui sert les mêmes adresses depuis Supabase au lieu du PC.
// Les essais (*.test.ts) du bureau ne sont pas copiés (ils vivent au bureau).
// Usage : node scripts/copier-bureau.mjs [chemin du frontend du bureau]

import { cpSync, existsSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = fileURLToPath(new URL('..', import.meta.url));
const source = process.argv[2] ?? 'D:/lab/Projets/Ancestria/frontend/src';
const cible = join(ici, 'site', 'src');
const GARDES = new Set([join('api', 'client.ts')]); // pièces du site, jamais écrasées

if (!existsSync(join(source, 'App.tsx'))) throw new Error(`Frontend du bureau introuvable : ${source}`);

// 1. Retirer l'ancienne copie (sauf les pièces gardées).
const gardees = new Map([...GARDES].map((g) => [g, existsSync(join(cible, g)) ? readFileSync(join(cible, g)) : null]));
rmSync(cible, { recursive: true, force: true });

// 2. Copier, sans les essais.
let n = 0;
cpSync(source, cible, {
    recursive: true,
    filter: (f) => {
        if (statSync(f).isDirectory()) return true;
        const rel = relative(source, f);
        if (/\.test\.tsx?$/.test(f) || GARDES.has(rel)) return false;
        n += 1;
        return true;
    },
});
for (const [g, contenu] of gardees) if (contenu) writeFileSync(join(cible, g), contenu);

// 2 ter. SANS LES COMMENTAIRES (30/09) : ceux du bureau racontent ses séances avec des noms réels
// de sa famille (vivants compris) ; le dépôt du site est PUBLIC. Le compilateur TypeScript réécrit
// le même code sans ses commentaires : le fonctionnement ne change pas.
const ts = (await import('typescript')).default;
const imprimante = ts.createPrinter({ removeComments: true });
const sansCommentaires = (dossier) => {
    for (const nom of readdirSync(dossier)) {
        const f = join(dossier, nom);
        if (statSync(f).isDirectory()) { sansCommentaires(f); continue; }
        if (!/\.(ts|tsx)$/.test(nom) || relative(cible, f) === join('api', 'client.ts')) continue;
        const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, nom.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        writeFileSync(f, imprimante.printFile(sf));
    }
};
sansCommentaires(cible);
for (const f of readdirSync(cible, { recursive: true })) {
    if (/\.css$/.test(f)) writeFileSync(join(cible, f), readFileSync(join(cible, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
}

// 2 bis. Données de référence du serveur du bureau (le répertoire des patronymes, livré avec l'appli).
const serveur = join(source, '..', '..', 'backend', 'prisma', 'patronymes.json');
const copieServeur = join(ici, 'site', 'src-web', 'copie-serveur');
if (existsSync(serveur)) {
    cpSync(serveur, join(copieServeur, 'patronymes.json'));
    console.log('Répertoire des patronymes copié.');
}

// ---- 2 quater. SOURCES DES ORIGINES ----
// Loi 3 (30/09) : une origine « documentée » se montre avec sa source. Au bureau, la table
// patronyme_source est remplie par backend/scripts/sources-des-origines.mjs à partir de
// prisma/patronymes-sources.json ; ici, les MÊMES lignes (même forme, même ordre) sont
// écrites pour la prise du site (route /patronymes/sources).
const releveSources = join(source, '..', '..', 'backend', 'prisma', 'patronymes-sources.json');
try {
    if (existsSync(releveSources)) {
        const r = JSON.parse(readFileSync(releveSources, 'utf8'));
        const lignes = r.etablies.map((e, k) => {
            const s = r.sources[e.source];
            if (!s) throw new Error(`${e.nom} cite une source inconnue (${e.source})`);
            return { id: k + 1, nom: e.nom, titre: s.titre, editeur: s.editeur, adresse: s.adresse ?? null, nature: s.nature, passage: e.passage, repere: e.repere ?? null, etablit: e.etablit, releve: s.releve };
        });
        writeFileSync(join(copieServeur, 'sources-origines.json'), JSON.stringify({ releve_le: r.releve_le, sources: lignes }, null, 2) + '\n');
        console.log(`Sources des origines copiées : ${lignes.length} lignes, ${new Set(lignes.map((l) => l.nom)).size} noms.`);
    } else {
        console.log('Sources des origines : relevé introuvable au bureau, fichier du site laissé tel quel.');
    }
} catch (e) {
    console.error(`Sources des origines NON copiées : ${e.message}`);
    process.exitCode = 1;
}
// ---- FIN 2 quater. SOURCES DES ORIGINES ----

// 3. Tampon : d'où vient la copie.
let version = 'inconnue';
try {
    version = execFileSync('git', ['-C', join(source, '..', '..'), 'log', '-1', '--format=%h %cd', '--date=format:%d/%m/%Y %H:%M'], { encoding: 'utf8' }).trim();
} catch {
    /* pas de git : la date suffit */
}
writeFileSync(join(cible, 'COPIE_DU_BUREAU.txt'),
    `Copie du frontend de l'Ancestria de bureau, SANS SES COMMENTAIRES (noms réels, dépôt public) — même code, même fonctionnement. Ne pas modifier ici : modifier au bureau puis recopier.\n` +
    `Source : ${source}\nVersion du bureau : ${version}\nCopiée le : ${new Date().toLocaleString('fr-FR')}\nFichiers : ${n}\n` +
    `Pièce propre au site, jamais écrasée : ${[...GARDES].join(', ').split(sep).join('/')}\n`);
console.log(`${n} fichiers copiés depuis le bureau (${version}).`);
console.log(readdirSync(cible).join(' '));

// ---- FIN COPIE DE L'ÉCRAN DU BUREAU ----
