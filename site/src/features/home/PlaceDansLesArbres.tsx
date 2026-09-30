import { Users } from '@phosphor-icons/react';
import { CLASSEMENT_REUNION, classementDe, RELEVE_CLASSEMENT } from './classementReunion';
export const PlaceDansLesArbres = ({ nom }: {
    nom: string;
}) => {
    let c: ReturnType<typeof classementDe> = null;
    try {
        c = classementDe(nom);
    }
    catch {
        return null;
    }
    return (<div className="flex items-start gap-2.5 text-[13.5px] text-encre-2" data-bloc="classement-reunion" title={`Relevé transmis par l'administrateur le ${RELEVE_CLASSEMENT.date} — ${RELEVE_CLASSEMENT.quoi}`}>
            <Users size={16} className="text-sepia mt-0.5 flex-none"/>
            <span>
                {c ? (<>
                        Dans les arbres généalogiques en ligne : <b className="text-encre">{c.rang === 1 ? '1ᵉʳ' : `${c.rang}ᵉ`} nom de La Réunion</b>,{' '}
                        <b className="text-encre">{c.nombre.toLocaleString('fr-FR')}</b> personnes.
                    </>) : (<>Hors des {CLASSEMENT_REUNION.length} noms les plus présents à La Réunion dans les arbres généalogiques en ligne.</>)}
                <span className="block text-[11.5px] text-encre-3">Relevé du {RELEVE_CLASSEMENT.date}, transmis par l'administrateur.</span>
            </span>
        </div>);
};
