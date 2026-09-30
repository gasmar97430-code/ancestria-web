// Vérifier qu'un export patrimonial n'a pas été modifié : l'empreinte du
// fichier est calculée DANS le navigateur (le fichier ne quitte pas
// l'appareil), puis comparée au registre des exports certifiés.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Alerte, Bouton, Champ, EnTetePage } from '../ui/ui';

interface Verdict {
    valide: boolean;
    arbre?: string;
    territoire?: string | null;
    cree_le?: string;
    nb_individus?: number;
    nb_documents?: number;
}

async function empreinteFichier(f: File): Promise<string> {
    const h = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function Verifier() {
    const [empreinte, setEmpreinte] = useState('');
    const [verdict, setVerdict] = useState<Verdict | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const verifier = async (e: string) => {
        setErreur(null);
        setVerdict(null);
        const h = e.trim().toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(h)) {
            setErreur('Une empreinte SHA-256 fait 64 caractères (chiffres et lettres a à f).');
            return;
        }
        const { data, error } = await supabase.rpc('verifier_export', { p_empreinte: h });
        if (error) setErreur('Pas de connexion au serveur.');
        else setVerdict(data as Verdict);
    };

    return (
        <main className="max-w-xl mx-auto p-5 sm:p-8 flex flex-col gap-5">
            <EnTetePage titre="Vérifier un export" sousTitre="Un export patrimonial certifié n’a-t-il pas été modifié ?" />
            <label className="flex flex-col gap-2 text-sm text-encre-2">
                Choisir le fichier exporté (.json)
                <input type="file" accept="application/json,.json" className="text-sm" onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    const h = await empreinteFichier(f);
                    setEmpreinte(h);
                    await verifier(h);
                }} />
            </label>
            <form className="flex flex-col gap-3" onSubmit={(ev) => { ev.preventDefault(); void verifier(empreinte); }} noValidate>
                <Champ libelle="…ou coller son empreinte" valeur={empreinte} onChange={setEmpreinte} placeholder="64 caractères" autoComplete="off" />
                <Bouton variante="principal" type="submit">Vérifier</Bouton>
            </form>
            {erreur && <Alerte>{erreur}</Alerte>}
            {verdict && (verdict.valide ? (
                <Alerte genre="succes">
                    Export authentique : « {verdict.arbre} »{verdict.territoire ? ` (${verdict.territoire})` : ''}, certifié le {new Date(verdict.cree_le!).toLocaleString('fr-FR')} —
                    {' '}{verdict.nb_individus} personne(s), {verdict.nb_documents} document(s). Le fichier n’a pas été modifié.
                    <div className="mt-2"><Link to={`/certificat/${empreinte.trim().toLowerCase()}`} className="underline underline-offset-4">Voir le certificat</Link></div>
                </Alerte>
            ) : (
                <Alerte>Aucun export certifié ne correspond : le fichier a été modifié, ou il ne vient pas d’Ancestria.</Alerte>
            ))}
        </main>
    );
}
