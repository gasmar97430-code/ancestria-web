import { memo, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
type Incoherence = {
    genre: string;
    texte: string;
    personnes: number[];
};
export const DOUTEUX = new Set(['doublon', 'dates', 'trois-parents']);
export function raisonsParPersonne(liste: Incoherence[]): Map<number, string[]> {
    const m = new Map<number, string[]>();
    for (const x of liste)
        if (DOUTEUX.has(x.genre))
            for (const id of x.personnes)
                if (id > 0)
                    m.set(id, [...(m.get(id) ?? []), x.texte]);
    return m;
}
export function reglesAVerifier(ids: number[]): string {
    if (ids.length === 0)
        return '';
    const cartes = ids.map((id) => `.react-flow__node[data-id="p-${id}"] > div`).join(',\n');
    return `${cartes} { background: #ffe8d6 !important; outline: 2px dashed #c2410c; outline-offset: 3px; position: relative; }\n`
        + ids.map((id) => `.react-flow__node[data-id="p-${id}"] > div::after`).join(',\n')
        + ` { content: 'à vérifier'; position: absolute; top: -9px; right: 8px; padding: 0 6px; border-radius: 6px; background: #c2410c; color: #fff; font: 600 9.5px/16px system-ui, sans-serif; letter-spacing: .04em; pointer-events: none; }\n`;
}
export const FichesAVerifier = memo(() => {
    const people = useTreeStore((s) => s.people);
    const [raisons, setRaisons] = useState<Map<number, string[]>>(new Map());
    useEffect(() => {
        let vivant = true;
        apiClient.get<{
            incoherences: Incoherence[];
        }>('/incoherences')
            .then((r) => { if (vivant)
            setRaisons(raisonsParPersonne(Array.isArray(r.data?.incoherences) ? r.data.incoherences : [])); })
            .catch(() => { if (vivant)
            setRaisons(new Map()); });
        return () => { vivant = false; };
    }, [people]);
    useEffect(() => {
        if (raisons.size === 0)
            return;
        const poser = () => {
            for (const [id, r] of raisons) {
                const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="p-${id}"] > div`);
                const texte = `À vérifier :\n• ${r.join('\n• ')}`;
                if (el && el.title !== texte)
                    el.title = texte;
            }
        };
        poser();
        const flux = document.querySelector('.react-flow');
        if (!flux)
            return;
        const o = new MutationObserver(poser);
        o.observe(flux, { childList: true, subtree: true });
        return () => o.disconnect();
    }, [raisons]);
    let css = '';
    try {
        css = reglesAVerifier([...raisons.keys()]);
    }
    catch {
        css = '';
    }
    return css ? <style>{css}</style> : null;
});
FichesAVerifier.displayName = 'FichesAVerifier';
