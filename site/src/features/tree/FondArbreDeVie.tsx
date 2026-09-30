import { useState } from 'react';
import './fond-arbre-de-vie.css';
const IMAGE = new URL('./arbre-de-vie.webp', import.meta.url).href;
export const FondArbreDeVie = () => {
    const [absente, setAbsente] = useState(false);
    if (absente)
        return null;
    return (<div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden data-fond-arbre>
            <img src={IMAGE} alt="" draggable={false} onError={() => setAbsente(true)} className="block w-full h-full object-cover" style={{ objectPosition: '50% 42%' }}/>
        </div>);
};
