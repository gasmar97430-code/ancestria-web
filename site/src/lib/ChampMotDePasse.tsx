import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
export const ChampMotDePasse = ({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) => {
    const [voir, setVoir] = useState(false);
    return (<div className="relative" data-champ-mot-de-passe="">
            <input {...props} type={voir ? 'text' : 'password'} className={`${className ?? ''} w-full pr-12`}/>
            <button type="button" onClick={() => setVoir((v) => !v)} aria-label={voir ? 'Cacher le mot de passe' : 'Voir le mot de passe'} title={voir ? 'Cacher le mot de passe' : 'Voir le mot de passe'} aria-pressed={voir} data-bouton="oeil-mot-de-passe" className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-[8px] text-encre-2 hover:bg-sepia-tint">
                {voir ? <EyeSlash size={20}/> : <Eye size={20}/>}
            </button>
        </div>);
};
