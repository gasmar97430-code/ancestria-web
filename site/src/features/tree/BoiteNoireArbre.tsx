import { useEffect } from 'react';
import apiClient from '../../api/client';
let dernierClic = { texte: '', t: 0 };
export const BoiteNoireArbre = () => {
    useEffect(() => {
        const surClic = (e: MouseEvent) => {
            const el = (e.target as HTMLElement | null)?.closest('button, .react-flow__node, a, label');
            dernierClic = { texte: (el?.getAttribute('title') || el?.textContent || '').trim().slice(0, 60), t: performance.now() };
        };
        document.addEventListener('click', surClic, true);
        let vides = 0;
        let derniereEcriture = 0;
        const minuterie = window.setInterval(() => {
            try {
                const pane = document.querySelector('.react-flow');
                if (!pane)
                    return;
                const r = pane.getBoundingClientRect();
                const noeuds = [...document.querySelectorAll<HTMLElement>('.react-flow__node')];
                const cartes = noeuds.filter((n) => n.classList.contains('react-flow__node-carte'));
                if (cartes.length === 0) {
                    vides = 0;
                    return;
                }
                const cachees = noeuds.filter((n) => getComputedStyle(n).visibility === 'hidden').length;
                const dansCadre = cartes.filter((n) => {
                    const q = n.getBoundingClientRect();
                    return getComputedStyle(n).visibility !== 'hidden' && q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom;
                }).length;
                const vide = dansCadre === 0 || cachees * 2 >= noeuds.length;
                vides = vide ? vides + 1 : 0;
                const maintenant = performance.now();
                if (vides >= 2 && maintenant - derniereEcriture > 5000) {
                    derniereEcriture = maintenant;
                    void apiClient.post('/boite-noire', {
                        cartes: cartes.length,
                        noeuds: noeuds.length,
                        cachees,
                        dansCadre,
                        traits: document.querySelectorAll('.react-flow__edge').length,
                        vue: (document.querySelector('.react-flow__viewport') as HTMLElement | null)?.style.transform ?? '',
                        cadre: `${Math.round(r.width)}x${Math.round(r.height)}`,
                        formulaireOuvert: !!document.querySelector('.fixed.inset-0'),
                        dernierClic: dernierClic.texte,
                        depuisClicMs: Math.round(maintenant - dernierClic.t),
                    }).catch(() => undefined);
                }
            }
            catch {
            }
        }, 150);
        return () => { window.clearInterval(minuterie); document.removeEventListener('click', surClic, true); };
    }, []);
    return null;
};
