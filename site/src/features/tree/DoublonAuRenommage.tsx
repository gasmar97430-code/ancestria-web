import type { Id } from '../../types';
import { DoublonPossible } from './DoublonPossible';
import { proposerSexe } from './sexePrenom';
export const DoublonAuRenommage = ({ id, avant, prenom, nom, genre }: {
    id: Id;
    avant: {
        prenom: string;
        nom: string;
    };
    prenom: string;
    nom: string;
    genre: string;
}) => {
    const prenomChange = prenom.trim() !== avant.prenom.trim();
    if (!prenomChange && nom.trim() === avant.nom.trim())
        return null;
    const p = prenomChange ? proposerSexe(prenom) : null;
    const sexeQuiCloche = p && (genre === 'M' || genre === 'F') && p.genre !== genre && p.part >= 90;
    return (<div data-bloc="doublon-au-renommage" className="flex flex-col gap-2">
            {sexeQuiCloche && (<div className="rounded-[12px] border px-4 py-2.5 text-[13px] text-encre" style={{ borderColor: 'var(--o-afrique)' }} data-signe="sexe">
                    <span style={{ color: 'var(--o-afrique)' }}>⚠ </span>« {prenom.trim().split(/\s+/)[0]} » est un prénom de {p.genre === 'F' ? 'fille' : 'garçon'}, mais cette fiche dit {genre === 'M' ? 'Homme' : 'Femme'}.
                </div>)}
            <DoublonPossible prenom={prenom} nom={nom} sauf={id} conseil="Si c’est la même personne, n’enregistrez pas : elle serait deux fois dans l’arbre. Réunissez les deux fiches avec « Fusionner avec », plus bas."/>
        </div>);
};
