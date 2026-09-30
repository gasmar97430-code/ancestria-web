// ---- PORTRAIT ----
// La photo (lien https) si elle charge ; sinon les initiales sur la couleur du
// genre. Aucune image cassée n'est jamais affichée. L'adresse de la page n'est
// pas envoyée au site de l'image (referrerPolicy).
import { useState } from 'react';
import { initiales } from '../domaine/libelles';
import type { Individu } from '../domaine/types';

export const COULEUR_GENRE: Record<Individu['genre'], string> = {
    femme: '#d68fb0', homme: '#7fa7d6', non_binaire: '#b99be0', inconnu: '#9a8b7b',
};

export function Portrait({ individu, taille, texte }: { individu: Pick<Individu, 'prenom' | 'nom' | 'genre' | 'photo_url'>; taille: number; texte?: string }) {
    const [ratee, setRatee] = useState<string | null>(null);
    const photo = individu.photo_url && individu.photo_url !== ratee ? individu.photo_url : null;
    return (
        <div className="shrink-0 rounded-full grid place-items-center font-semibold text-nuit overflow-hidden"
            style={{ width: taille, height: taille, background: COULEUR_GENRE[individu.genre], fontSize: Math.round(taille * 0.33) }} aria-hidden="true">
            {photo
                ? <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setRatee(photo)} />
                : texte ?? initiales(individu)}
        </div>
    );
}

// ---- FIN PORTRAIT ----
