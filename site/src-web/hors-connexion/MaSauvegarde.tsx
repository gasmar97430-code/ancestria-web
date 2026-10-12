// ---- « MA SAUVEGARDE » : EXPORTER / IMPORTER (12/10/2026) ----
// Sa demande : « une sauvegarde locale de la progression, avec export et import au format JSON ».
// Deux portes visibles :
//   - pour un inscrit, dans la fenêtre « Ajouter des noms » (au-dessus de « Me désinscrire… ») : « Enregistrer ma
//     sauvegarde » (un fichier .json dans les Téléchargements) et « Reprendre une sauvegarde » ;
//   - pour un nouveau téléphone, sur la page d'inscription : « J'ai déjà une sauvegarde Ancestria » (seulement
//     reprendre).
// Après la reprise, la page se recharge : l'appli relit ce que l'appareil garde. Le mot de passe n'est jamais dans le
// fichier (le téléphone ne le garde pas) ; la connexion administrateur non plus.
// Lignes d'appel : compte-site/AjouterNomsEnTete.tsx et porte-inscription/PorteInscription.tsx.

import { useRef, useState } from 'react';
import { faireSauvegarde, lireSauvegarde, nomDuFichier, remettreSauvegarde } from './sauvegarde';

export function MaSauvegarde({ exporter = true }: { exporter?: boolean }) {
    const fichier = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

    const enregistrer = () => {
        try {
            const sv = faireSauvegarde(localStorage);
            const url = URL.createObjectURL(new Blob([JSON.stringify(sv, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url; a.download = nomDuFichier(); document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            setMessage({ ok: true, texte: `Sauvegarde enregistrée (${Object.keys(sv.donnees).length} réglages) : le fichier ${nomDuFichier()} est dans vos Téléchargements.` });
        } catch {
            setMessage({ ok: false, texte: 'La sauvegarde n’a pas pu être enregistrée sur cet appareil.' });
        }
    };

    const reprendre = async (f: File | undefined) => {
        if (!f) return;
        try {
            const r = lireSauvegarde(await f.text());
            if (!r.ok) return setMessage({ ok: false, texte: r.raison });
            const n = remettreSauvegarde(localStorage, r.sauvegarde);
            setMessage({ ok: true, texte: `Sauvegarde reprise (${n} réglages). Ancestria se recharge…` });
            setTimeout(() => window.location.reload(), 1200);
        } catch {
            setMessage({ ok: false, texte: 'Ce fichier n’a pas pu être lu.' });
        } finally {
            if (fichier.current) fichier.current.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-2 rounded-[12px] border border-trait bg-carte px-3 py-3 text-[14px]" data-bloc="ma-sauvegarde">
            <div className="text-encre-2">
                {exporter ? 'Ma sauvegarde : gardez votre inscription et vos réglages dans un fichier, pour les retrouver sur un autre téléphone.' : 'Vous changez de téléphone ?'}
            </div>
            <div className="flex flex-wrap gap-2">
                {exporter && <button type="button" onClick={enregistrer} className="min-h-11 px-4 rounded-[10px] border border-sepia text-sepia-deep bg-blanc" data-bouton="exporter-sauvegarde">Enregistrer ma sauvegarde</button>}
                <button type="button" onClick={() => fichier.current?.click()} className={exporter ? 'min-h-11 px-4 rounded-[10px] border border-trait text-encre bg-blanc' : 'min-h-11 text-sepia-deep underline underline-offset-4'} data-bouton="importer-sauvegarde">
                    {exporter ? 'Reprendre une sauvegarde' : 'J’ai déjà une sauvegarde Ancestria'}
                </button>
                <input ref={fichier} type="file" accept="application/json,.json" className="hidden" onChange={(e) => reprendre(e.target.files?.[0])} data-champ="fichier-sauvegarde" />
            </div>
            {message && <div role="status" className={message.ok ? 'text-[13.5px] text-encre' : 'text-[13.5px] text-[#a33]'} data-message="sauvegarde">{message.texte}</div>}
        </div>
    );
}
// ---- FIN « MA SAUVEGARDE » ----
