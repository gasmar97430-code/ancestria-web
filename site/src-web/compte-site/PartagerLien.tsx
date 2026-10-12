// ---- « PARTAGER LE LIEN » POUR L'ADMINISTRATEUR CONNECTÉ (12/10/2026) ----
//
// Ses mots : « comme je suis administrateur et que j'ai déjà un mot de passe administrateur, pour moi ça devrait être
// une connexion différente sur mon téléphone, mais une fois connecté je vais avoir accès directement sur le site et
// je pourrai copier le lien et le partager directement sur les réseaux » · « n'oublie pas ma version administrateur
// pour mon téléphone, que j'installerai avec un QR code » (QR : medias/Ancestria_QR_administrateur.png → adresse
// …/ancestria-web/?administrateur).
// Un toucher : le message + le lien public (avec « ?partage », la carte Facebook) sont COPIÉS, et le menu de partage
// du téléphone s'ouvre (Facebook, WhatsApp, SMS…). Même fonction que « Faire connaître Ancestria » (partage/partager.ts).
// Ligne d'appel : compte-site/CompteSite.tsx (quand il est connecté).

import { useState } from 'react';
import { ShareNetwork } from '@phosphor-icons/react';
import { partagerAncestria, CONSIGNE_COLLER } from '../partage/partager';
import { MESSAGE_PARTAGE } from '../appli-telephone/AppliTelephone';

export function PartagerLien({ classe }: { classe: string }) {
    const [dit, setDit] = useState<string | null>(null);
    const partager = async () => {
        try {
            const r = await partagerAncestria(MESSAGE_PARTAGE);
            setDit(r.menu ? (r.copie ? 'Lien copié — et le partage est ouvert.' : 'Partage ouvert.') : r.copie ? CONSIGNE_COLLER : 'Partage indisponible ici.');
        } catch { /* partage fermé sans choisir : rien à dire */ }
        setTimeout(() => setDit(null), 5000);
    };
    return (
        <span className="relative inline-flex">
            <button type="button" className={classe} onClick={() => void partager()} data-bouton="partager-lien" title="Copier le lien d'Ancestria et le partager sur les réseaux">
                <ShareNetwork size={16} />
                Partager le lien
            </button>
            {dit && <span className="absolute right-0 top-full mt-1 z-50 w-64 rounded-[10px] bg-carte border border-trait shadow-carte px-3 py-2 text-[12.5px] text-encre whitespace-normal" data-message="partager-lien">{dit}</span>}
        </span>
    );
}

// ---- FIN « PARTAGER LE LIEN » ----
