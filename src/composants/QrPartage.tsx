// ---- QR CODE DE PARTAGE ----
// Généré dans le navigateur (bibliothèque qrcode, correction d'erreur « M »),
// aucun service extérieur. Téléchargeable en PNG 1080 × 1080 prêt pour
// Facebook (QR + nom de la famille + lien en clair + consigne « appui long »)
// et en SVG net pour l'impression.

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Bouton } from '../ui/ui';

const FOND = '#ffffff';
const ENCRE = '#1b1612';

async function dessinerAffiche(lien: string, titre: string): Promise<HTMLCanvasElement> {
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1080;
    const g = c.getContext('2d');
    if (!g) throw new Error('Dessin impossible sur cet appareil.');
    g.fillStyle = FOND;
    g.fillRect(0, 0, 1080, 1080);
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, lien, { errorCorrectionLevel: 'M', margin: 2, width: 700, color: { dark: ENCRE, light: FOND } });
    g.drawImage(qr, 190, 170, 700, 700);
    g.fillStyle = ENCRE;
    g.textAlign = 'center';
    g.font = '600 56px Georgia, serif';
    g.fillText(titre.length > 32 ? `${titre.slice(0, 31)}…` : titre, 540, 110);
    g.font = '32px system-ui, sans-serif';
    g.fillText('Aidez-nous à compléter l’arbre de la famille', 540, 925);
    g.font = '24px system-ui, sans-serif';
    g.fillStyle = '#6b5a48';
    g.fillText(lien.length > 70 ? `${lien.slice(0, 69)}…` : lien, 540, 975);
    g.fillText('Sur téléphone : appui long sur l’image, puis « ouvrir le lien »', 540, 1020);
    return c;
}

function telecharger(url: string, nom: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

const nomFichier = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'partage';

export function QrPartage({ lien, titre }: { lien: string; titre: string }) {
    const apercu = useRef<HTMLCanvasElement>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [copie, setCopie] = useState(false);

    useEffect(() => {
        if (!apercu.current) return;
        QRCode.toCanvas(apercu.current, lien, { errorCorrectionLevel: 'M', margin: 2, width: 240, color: { dark: ENCRE, light: FOND } })
            .catch(() => setErreur('QR code impossible à dessiner.'));
    }, [lien]);

    const png = async () => {
        try {
            const c = await dessinerAffiche(lien, titre);
            telecharger(c.toDataURL('image/png'), `qr-${nomFichier(titre)}.png`);
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        }
    };
    const svg = async () => {
        const texte = await QRCode.toString(lien, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: ENCRE, light: FOND } });
        const url = URL.createObjectURL(new Blob([texte], { type: 'image/svg+xml' }));
        telecharger(url, `qr-${nomFichier(titre)}.svg`);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    const copier = async () => {
        try {
            await navigator.clipboard.writeText(lien);
            setCopie(true);
            setTimeout(() => setCopie(false), 2000);
        } catch {
            window.prompt('Copiez le lien :', lien);
        }
    };
    const partager = async () => {
        try {
            await navigator.share({ title: titre, text: 'Aidez-nous à compléter l’arbre de la famille', url: lien });
        } catch {
            /* partage annulé par la personne : rien à faire */
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <canvas ref={apercu} width={240} height={240} className="rounded-xl bg-white" aria-label={`QR code du lien ${lien}`} role="img" />
            <div className="flex flex-col gap-2 w-full min-w-0">
                <code className="text-xs break-all text-encre-2 bg-nuit rounded-lg p-2 border border-trait">{lien}</code>
                <div className="flex flex-wrap gap-2">
                    <Bouton variante="principal" onClick={() => void png()}>Image pour Facebook (PNG)</Bouton>
                    <Bouton variante="secondaire" onClick={() => void svg()}>Pour imprimer (SVG)</Bouton>
                    <Bouton variante="discret" onClick={() => void copier()}>{copie ? 'Lien copié ✓' : 'Copier le lien'}</Bouton>
                    {'share' in navigator && <Bouton variante="discret" onClick={() => void partager()}>Partager…</Bouton>}
                </div>
                <p className="text-xs text-encre-3">Sur Facebook, publiez l’image ET le lien en clair : un QR affiché sur l’écran d’un téléphone ne se scanne pas avec ce même téléphone.</p>
                {erreur && <p className="text-xs text-rouge">{erreur}</p>}
            </div>
        </div>
    );
}

// ---- FIN QR CODE DE PARTAGE ----
