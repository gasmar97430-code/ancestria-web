import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useLectureSeule } from './lectureSeule';
import { CompteDuSite } from './compteDuSite';
export const CompteEnTete = () => {
    const lecture = useLectureSeule((s) => s.actif);
    const [pc, setPc] = useState(false);
    useEffect(() => { void apiClient.get('/site/etat').then(() => setPc(true)).catch(() => setPc(false)); }, []);
    if (lecture || !pc)
        return <CompteDuSite />;
    return null;
};
