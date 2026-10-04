import { useState } from 'react';
import { CaretDown, CaretRight, Toolbox } from '@phosphor-icons/react';
import { BoutonSauvegarde } from '../app/BoutonSauvegarde';
import { BoutonCarnet } from '../features/carnet/BoutonCarnet';
const CLE = 'ancestria-outils-ouverts';
export const OutilsRepliables = () => {
    const [ouvert, setOuvert] = useState(() => { try {
        return localStorage.getItem(CLE) === 'oui';
    }
    catch {
        return false;
    } });
    const basculer = () => setOuvert((o) => { try {
        localStorage.setItem(CLE, o ? 'non' : 'oui');
    }
    catch { } return !o; });
    return (<div className="flex flex-col gap-2" data-outils={ouvert ? 'ouverts' : 'fermes'}>
            <button type="button" onClick={basculer} aria-expanded={ouvert} data-bouton="outils" className="flex items-center gap-2.5 h-9 px-3 rounded-[10px] text-[13px] text-encre-3 hover:bg-papier hover:text-encre-2 text-left">
                <Toolbox size={16}/>
                <span className="flex-1">Outils</span>
                {ouvert ? <CaretDown size={13}/> : <CaretRight size={13}/>}
            </button>
            {ouvert && (<div className="flex flex-col gap-2 pl-2">
                    <BoutonSauvegarde rail={false}/>
                    <BoutonCarnet rail={false}/>
                </div>)}
        </div>);
};
