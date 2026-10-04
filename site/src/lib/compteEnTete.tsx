import { useEffect, useState } from 'react';
import { UserCircle } from '@phosphor-icons/react';
import apiClient from '../api/client';
import { Fenetre } from './envoiSite';
import { useLectureSeule } from './lectureSeule';
import { CompteDuSite } from './compteDuSite';
type Etat = {
    connecte: boolean;
    email: string | null;
    dernierEnvoi: string | null;
    changements: number;
    rappel: boolean;
    coffre: boolean;
};
export const CompteEnTete = () => {
    const lecture = useLectureSeule((s) => s.actif);
    const [etat, setEtat] = useState<Etat | null>(null);
    const [ouvert, setOuvert] = useState(false);
    const relire = () => apiClient.get<Etat>('/site/etat').then((r) => setEtat(r.data)).catch(() => setEtat(null));
    useEffect(() => { void relire(); }, []);
    if (lecture || !etat)
        return <CompteDuSite />;
    return (<>
            <button type="button" onClick={() => setOuvert(true)} data-bouton="compte" title={etat.connecte ? `Connecté : ${etat.email ?? ''}` : 'Mon accès au site'} className="flex items-center gap-1.5 h-6 px-2.5 rounded-[10px] text-[13px] leading-none text-encre-2 hover:bg-papier">
                <UserCircle size={16}/>
                {etat.connecte ? 'Connecté' : 'S’inscrire · Se connecter'}
            </button>
            {ouvert && <Fenetre etat={etat} rapatrie={0} onFermer={() => { setOuvert(false); void relire(); }} relire={relire}/>}
        </>);
};
