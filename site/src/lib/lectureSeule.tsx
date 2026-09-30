import { create } from 'zustand';
export const ADMINISTRATEUR = 'M’astel Marius Gastellier';
export const MOT_CORRECTION = 'CORRECTION';
export const useLectureSeule = create<{
    actif: boolean;
    email: string | null;
}>(() => ({ actif: false, email: null }));
export const MessageLectureSeule = () => {
    const email = useLectureSeule((s) => s.email);
    const objet = encodeURIComponent(`${MOT_CORRECTION} — Ancestria`);
    return (<div className="rounded-[12px] border border-trait bg-papier px-4 py-3 text-[13px] leading-relaxed text-encre-2" data-message="lecture-seule">
            <b className="text-encre">Cette fiche est verrouillée</b> : elle ne se modifie pas ici. Pour toute correction, écrivez à
            l’administrateur, {ADMINISTRATEUR}, en commençant votre message par le mot « {MOT_CORRECTION} » : il vérifie et fait la
            modification lui-même.
            {email && (<>
                    {' '}
                    <a className="text-sepia-deep underline underline-offset-4 break-all" href={`mailto:${email}?subject=${objet}`}>
                        {email}
                    </a>
                </>)}
        </div>);
};
