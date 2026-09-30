// ---- CERTIFICAT D'EXPORT PATRIMONIAL (imprimable) ----
// Page publique : les données viennent du registre des exports (verifier_export),
// pas du navigateur de celui qui l'imprime. Le QR code renvoie à cette même
// page : quiconque tient le papier peut vérifier l'export d'un coup de téléphone.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { nombre } from '../domaine/libelles';
import { Alerte, Bouton, Chargement } from '../ui/ui';

interface Verdict {
    valide: boolean;
    arbre?: string;
    territoire?: string | null;
    cree_le?: string;
    nb_individus?: number;
    nb_documents?: number;
}

export function Certificat() {
    const { empreinte = '' } = useParams();
    const [v, setV] = useState<Verdict | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const qr = useRef<HTMLCanvasElement>(null);
    const adresse = `${config.adressePublique}certificat/${empreinte}`;

    useEffect(() => {
        if (!/^[0-9a-f]{64}$/.test(empreinte)) {
            setV({ valide: false });
            return;
        }
        void supabase.rpc('verifier_export', { p_empreinte: empreinte }).then(({ data, error }) => {
            if (error) setErreur('Pas de connexion au serveur.');
            else setV(data as Verdict);
        });
    }, [empreinte]);

    useEffect(() => {
        if (v?.valide && qr.current) void QRCode.toCanvas(qr.current, adresse, { errorCorrectionLevel: 'M', margin: 1, width: 150 });
    }, [v, adresse]);

    if (erreur) return <main className="p-6"><Alerte>{erreur}</Alerte></main>;
    if (!v) return <Chargement />;
    if (!v.valide) return <main className="max-w-xl mx-auto p-6"><Alerte>Aucun export certifié ne porte cette empreinte.</Alerte></main>;

    return (
        <main className="certificat max-w-3xl mx-auto p-6 sm:p-10">
            <div className="rounded-3xl border-2 border-sepia p-6 sm:p-10 flex flex-col gap-5 bg-carte">
                <div className="text-xs uppercase tracking-[0.25em] text-encre-3">Ancestria · registre des exports certifiés</div>
                <h1 className="font-display text-3xl sm:text-4xl">Certificat d’export patrimonial</h1>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
                    <dt className="text-encre-3">Fonds</dt><dd className="font-semibold">{v.arbre}</dd>
                    {v.territoire && <><dt className="text-encre-3">Territoire</dt><dd>{v.territoire}</dd></>}
                    <dt className="text-encre-3">Certifié le</dt><dd>{new Date(v.cree_le!).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</dd>
                    <dt className="text-encre-3">Contenu</dt><dd>{nombre(v.nb_individus!, 'personne décédée', 'personnes décédées')}, {nombre(v.nb_documents!, 'document d’archives', 'documents d’archives')}</dd>
                </dl>
                <div>
                    <div className="text-encre-3 text-sm mb-1">Empreinte SHA-256 du fichier exporté</div>
                    <code className="block break-all text-sm rounded-xl border border-trait p-3">{empreinte}</code>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <canvas ref={qr} width={150} height={150} className="rounded-lg bg-white" aria-label="QR code de vérification" role="img" />
                    <p className="text-sm text-encre-2">
                        Ce certificat atteste que le fichier dont l’empreinte figure ci-dessus a été produit par Ancestria à la date indiquée.
                        Toute modification du fichier, même d’un seul caractère, change son empreinte. Pour vérifier : scanner le QR code,
                        ou déposer le fichier sur la page « Vérifier un export » ({config.adressePublique}verifier).
                        Les personnes vivantes ne figurent jamais dans un export patrimonial.
                    </p>
                </div>
            </div>
            <div className="pas-imprime mt-6 flex flex-wrap gap-3">
                <Bouton variante="principal" onClick={() => window.print()}>Imprimer / enregistrer en PDF</Bouton>
                <Link to="/verifier"><Bouton variante="discret">Vérifier un fichier</Bouton></Link>
            </div>
        </main>
    );
}

// ---- FIN CERTIFICAT ----
