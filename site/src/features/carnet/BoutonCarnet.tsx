import { useCallback, useEffect, useState } from 'react';
import { DeviceMobile } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { CarnetTelephone } from './CarnetTelephone';
let dejaVues = 0;
const auditeurs = new Set<(ouvert: boolean) => void>();
let boiteOuverte = false;
const ouvrir = (o: boolean) => {
    boiteOuverte = o;
    auditeurs.forEach((f) => f(o));
};
export const BoutonCarnet = ({ rail }: {
    rail: boolean;
}) => {
    const [ouvert, setOuvert] = useState(boiteOuverte);
    const [nouvelles, setNouvelles] = useState(dejaVues);
    useEffect(() => {
        auditeurs.add(setOuvert);
        return () => void auditeurs.delete(setOuvert);
    }, []);
    const compte = useCallback((n: number) => {
        if (n > dejaVues && !boiteOuverte)
            ouvrir(true);
        dejaVues = n;
        setNouvelles(n);
    }, []);
    useEffect(() => {
        const guetter = async () => {
            try {
                compte(((await apiClient.get('/carnet/notes')).data as unknown[]).length);
            }
            catch {
            }
        };
        void guetter();
        const t = setInterval(guetter, 5000);
        return () => clearInterval(t);
    }, [compte]);
    const pastille = nouvelles > 0 && (<span className="min-w-[18px] h-[18px] px-1 rounded-full bg-sepia text-papier text-[10.5px] font-semibold grid place-items-center">
            {nouvelles}
        </span>);
    return (<>
            {rail ? (<button onClick={() => ouvrir(true)} title={nouvelles ? `Carnet du téléphone : ${nouvelles} note(s) à relire` : 'Carnet du téléphone'} className="relative w-10 h-10 rounded-[10px] grid place-items-center text-[19px] text-encre-2 hover:bg-papier">
                    <DeviceMobile />
                    {nouvelles > 0 && <span className="absolute -top-0.5 -right-0.5">{pastille}</span>}
                </button>) : (<button onClick={() => ouvrir(true)} className="flex items-center justify-center gap-2 h-9 rounded-[10px] border border-trait text-encre text-[12.5px] font-medium hover:bg-sepia-tint">
                    <DeviceMobile size={15}/>
                    Carnet du téléphone
                    {pastille}
                </button>)}
            {ouvert && <CarnetTelephone onFermer={() => ouvrir(false)} onCompte={compte}/>}
        </>);
};
