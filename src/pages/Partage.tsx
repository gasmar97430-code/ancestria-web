// ---- PARTAGE DE L'ARBRE : LE LIEN, « COPIER LE LIEN », LE QR CODE ----
//
// Son texte du 30/09 : « supprime tout le formulaire lourd actuel (PIN, durée,
// nom). Remplace-le par un affichage propre et direct comprenant uniquement :
// 1. un champ avec l'URL de l'arbre et un bouton 'Copier le lien' en un clic
// (c'est moi qui pilote et diffuse où je veux sur mes réseaux) ; 2. un QR Code
// propre en dessous, pour un usage éventuel sur écran ou support papier. Rien
// de plus. »
// Le lien est prêt à l'ouverture de la page : le partage ouvert sans PIN le
// plus récent, sinon un nouveau (365 jours, la durée maximale de la base),
// créé une seule fois. Un ancien partage protégé par PIN encore ouvert : on
// propose de le remplacer par un lien simple (l'offre gratuite n'en garde
// qu'un d'ouvert) — rien n'est fermé sans son clic.
// Ce que voit le visiteur ne change pas (personnes décédées seulement,
// propositions à valider dans « Propositions »).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { lienDePartage } from '../lib/config';
import { ecrire } from '../donnees/arbre';
import { messageErreur } from '../domaine/erreurs';
import { COLONNES_INVITATION, type Invitation } from '../domaine/types';
import { LienRetour, Alerte, Bouton, Chargement, EnTetePage } from '../ui/ui';

const DUREE_JOURS = 365;
const ouverte = (i: Invitation) => !i.ferme && new Date(i.expire_le) > new Date();

export function Partage() {
    const { id = '' } = useParams();
    const [nomArbre, setNomArbre] = useState('');
    const [lien, setLien] = useState<string | null>(null);
    const [avecPin, setAvecPin] = useState<Invitation[]>([]);
    const [erreur, setErreur] = useState<string | null>(null);
    const [copie, setCopie] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const creation = useRef(false);
    const qr = useRef<HTMLCanvasElement>(null);
    const champ = useRef<HTMLInputElement>(null);

    const creer = useCallback(async () => {
        const inv = await ecrire(supabase.rpc('creer_invitation', { p_arbre: id, p_libelle: 'Lien de l’arbre', p_pin: null, p_jours: DUREE_JOURS }));
        return inv as unknown as Invitation;
    }, [id]);

    const charger = useCallback(async () => {
        setErreur(null);
        try {
            const [a, i] = await Promise.all([
                supabase.from('arbres').select('nom').eq('id', id).maybeSingle(),
                supabase.from('invitations').select(COLONNES_INVITATION).eq('arbre_id', id).order('cree_le', { ascending: false }),
            ]);
            if (i.error) throw i.error;
            setNomArbre((a.data as { nom: string } | null)?.nom ?? '');
            const liste = ((i.data ?? []) as unknown as Invitation[]).filter(ouverte);
            const simple = liste.find((x) => !x.avec_pin);
            if (simple) {
                setLien(lienDePartage(simple.jeton));
                setAvecPin([]);
                return;
            }
            if (liste.length > 0) {
                setAvecPin(liste);
                return;
            }
            if (creation.current) return; // une seule création, même si la page se dessine deux fois
            creation.current = true;
            setLien(lienDePartage((await creer()).jeton));
        } catch (e) {
            setErreur(e instanceof Error ? e.message : messageErreur(e));
        }
    }, [id, creer]);

    useEffect(() => {
        void charger();
    }, [charger]);

    useEffect(() => {
        if (!lien || !qr.current) return;
        QRCode.toCanvas(qr.current, lien, { errorCorrectionLevel: 'M', margin: 2, width: 240, color: { dark: '#1b1612', light: '#ffffff' } })
            .catch(() => setErreur('QR code impossible à dessiner sur cet appareil.'));
    }, [lien]);

    const copier = async () => {
        if (!lien) return;
        try {
            await navigator.clipboard.writeText(lien);
        } catch {
            champ.current?.select();
            document.execCommand('copy');
        }
        setCopie(true);
        setTimeout(() => setCopie(false), 2000);
    };

    const remplacer = async () => {
        setEnvoi(true);
        setErreur(null);
        try {
            for (const inv of avecPin) await ecrire(supabase.from('invitations').update({ ferme: true }).eq('id', inv.id));
            setAvecPin([]);
            setLien(lienDePartage((await creer()).jeton));
        } catch (e) {
            setErreur(e instanceof Error ? e.message : messageErreur(e));
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <main className="max-w-xl mx-auto p-5 sm:p-8">
            <EnTetePage titre="Partager l’arbre" sousTitre={<LienRetour vers={`/arbres/${id}`}>{nomArbre || 'retour à l’arbre'}</LienRetour>} />
            <section className="rounded-2xl border border-trait bg-carte p-4 sm:p-6 flex flex-col gap-5">
                {erreur && <Alerte>{erreur}</Alerte>}
                {avecPin.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <Alerte genre="info">Un ancien partage protégé par un code PIN est encore ouvert. Le remplacer par un lien simple, sans PIN ?</Alerte>
                        <Bouton variante="principal" enCours={envoi} onClick={() => void remplacer()}>Remplacer par un lien simple</Bouton>
                    </div>
                )}
                {!lien && avecPin.length === 0 && !erreur && <Chargement />}
                {lien && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="lien-arbre" className="text-sm text-encre-2">Lien de l’arbre</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input id="lien-arbre" ref={champ} readOnly value={lien} onFocus={(e) => e.currentTarget.select()}
                                    className="flex-1 min-w-0 min-h-11 rounded-xl bg-nuit border border-trait px-3 text-[15px] text-encre" />
                                <Bouton variante="principal" onClick={() => void copier()}>{copie ? 'Lien copié ✓' : 'Copier le lien'}</Bouton>
                            </div>
                        </div>
                        <canvas ref={qr} aria-label={`QR code du lien de l’arbre ${nomArbre}`} className="self-center rounded-xl bg-white w-[240px] h-[240px]" />
                    </>
                )}
            </section>
        </main>
    );
}

// ---- FIN PARTAGE DE L'ARBRE ----
