import { useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import apiClient from '../api/client';
type Etat = {
    t: 'repos';
} | {
    t: 'en cours';
} | {
    t: 'fait';
    fichier: string;
    octets: number;
} | {
    t: 'erreur';
    message: string;
};
export const BoutonSauvegarde = ({ rail }: {
    rail: boolean;
}) => {
    const [e, setE] = useState<Etat>({ t: 'repos' });
    const sauver = async () => {
        setE({ t: 'en cours' });
        try {
            const r = (await apiClient.post('/sauvegarde')).data as {
                fichier: string;
                octets: number;
            };
            setE({ t: 'fait', ...r });
        }
        catch (err: any) {
            setE({ t: 'erreur', message: err?.response?.data?.error ?? err.message });
        }
    };
    const detail = e.t === 'fait'
        ? `Sauvegardé : ${e.fichier} (${Math.round(e.octets / 1024)} Ko)`
        : e.t === 'erreur'
            ? `Sauvegarde impossible : ${e.message}`
            : 'Sauvegarder toute la base dans Documents\\Ancestria\\Sauvegardes';
    if (rail) {
        return (<button onClick={() => void sauver()} disabled={e.t === 'en cours'} title={detail} className={`mt-auto w-10 h-10 rounded-[10px] grid place-items-center text-[19px] ${e.t === 'fait' ? 'text-sepia-deep bg-sepia-tint' : 'text-encre-2 hover:bg-papier'}`}>
                <FloppyDisk />
            </button>);
    }
    return (<div className="mt-auto flex flex-col gap-1.5">
            <button onClick={() => void sauver()} disabled={e.t === 'en cours'} className="flex items-center justify-center gap-2 h-9 rounded-[10px] border border-trait text-encre text-[12.5px] font-medium hover:bg-sepia-tint disabled:opacity-50">
                <FloppyDisk size={15}/>
                {e.t === 'en cours' ? 'Sauvegarde…' : 'Sauvegarder la base'}
            </button>
            {e.t !== 'repos' && e.t !== 'en cours' && <div className="text-[11px] text-encre-3 break-all leading-snug">{detail}</div>}
        </div>);
};
