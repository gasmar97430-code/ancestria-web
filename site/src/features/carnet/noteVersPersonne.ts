import type { Person } from '../../types';
const PARTICULES = new Set(['de', 'du', 'des', "d'", 'd’', 'la', "l'", 'l’', 'le']);
const enCapitales = (m: string) => /\p{L}.*\p{L}/u.test(m) && m === m.toLocaleUpperCase('fr') && m !== m.toLocaleLowerCase('fr');
export function decouperNom(texte: string): {
    prenom: string;
    nom: string;
} {
    const mots = texte.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (mots.length === 0)
        return { prenom: '', nom: '' };
    if (mots.length === 1)
        return { prenom: '', nom: mots[0] };
    const caps = mots.map(enCapitales);
    const nbCaps = caps.filter(Boolean).length;
    if (nbCaps > 0 && nbCaps < mots.length) {
        if (caps[0]) {
            let fin = 0;
            while (fin + 1 < mots.length && caps[fin + 1])
                fin += 1;
            return { nom: mots.slice(0, fin + 1).join(' '), prenom: mots.slice(fin + 1).join(' ') };
        }
        if (caps[mots.length - 1]) {
            let debut = mots.length - 1;
            while (debut - 1 >= 0 && caps[debut - 1])
                debut -= 1;
            while (debut - 1 > 0 && PARTICULES.has(mots[debut - 1].toLowerCase()))
                debut -= 1;
            return { prenom: mots.slice(0, debut).join(' '), nom: mots.slice(debut).join(' ') };
        }
    }
    let debut = mots.length - 1;
    while (debut - 1 > 0 && PARTICULES.has(mots[debut - 1].toLowerCase()))
        debut -= 1;
    return { prenom: mots.slice(0, debut).join(' '), nom: mots.slice(debut).join(' ') };
}
export const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
export function dejaDansLArbre(people: Person[], prenom: string, nom: string): Person[] {
    const n = normaliser(nom);
    if (!n)
        return [];
    const premier = normaliser(prenom).split(/[ -]/)[0] ?? '';
    return people
        .filter((p) => normaliser(p.nom) === n && (!premier || normaliser(p.prenom).split(/[ -]/)[0] === premier))
        .slice(0, 6);
}
const date = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};
export function notesDeLaPersonne(note: {
    texte: string;
    precisions: string | null;
    noteeLe: string;
}): string {
    const origine = `Carnet du téléphone : « ${note.texte} », noté le ${date(note.noteeLe)}.`;
    return note.precisions ? `${note.precisions}\n\n${origine}` : origine;
}
