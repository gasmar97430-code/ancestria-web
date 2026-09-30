import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { create } from 'zustand';
import { Image } from '@phosphor-icons/react';
import apiClient from '../../api/client';
import { useTreeStore } from '../../store/useTreeStore';
import { teinteDe } from '../../lib/origins';
import { cadreVignette, taillePortrait } from './photoGeometrie';
import './photos.css';
const MAX_VIGNETTE = 12000;
const MAX_PORTRAIT = 56000;
const QUALITES = [0.85, 0.75, 0.65, 0.5, 0.35];
interface EtatPhotos {
    versions: Record<number, number>;
    charger: () => Promise<void>;
}
export const usePhotos = create<EtatPhotos>((set) => ({
    versions: {},
    charger: async () => {
        try {
            const r = await apiClient.get('/photos');
            const versions: Record<number, number> = {};
            for (const l of r.data as {
                individuId: number;
                version: number;
            }[])
                versions[l.individuId] = l.version;
            set({ versions });
        }
        catch {
        }
    },
}));
try {
    void usePhotos.getState().charger();
    useTreeStore.subscribe((apres, avant) => {
        if (apres.people !== avant.people)
            void usePhotos.getState().charger();
    });
}
catch {
}
export const adressePhoto = (id: number, taille: 'vignette' | 'portrait', version: number) => `/api/photos/${id}/${taille}?v=${version}`;
const enBlob = (toile: HTMLCanvasElement, type: string, qualite: number) => new Promise<Blob | null>((ok) => toile.toBlob(ok, type, qualite));
const enBase64 = (blob: Blob) => new Promise<string>((ok, ko) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result).split(',')[1] ?? '');
    l.onerror = () => ko(new Error('Image illisible'));
    l.readAsDataURL(blob);
});
async function encoder(toile: HTMLCanvasElement, type: string, max: number) {
    for (const q of QUALITES) {
        const b = await enBlob(toile, type, q);
        if (b && b.type === type && b.size <= max)
            return b;
    }
    return null;
}
function dessiner(source: ImageBitmap, sx: number, sy: number, sl: number, sh: number, l: number, h: number) {
    const toile = document.createElement('canvas');
    toile.width = l;
    toile.height = h;
    const c = toile.getContext('2d');
    if (!c)
        throw new Error("Cet écran ne sait pas réduire l'image");
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, 0, l, h);
    c.imageSmoothingQuality = 'high';
    c.drawImage(source, sx, sy, sl, sh, 0, 0, l, h);
    return toile;
}
export async function reduire(fichier: Blob): Promise<{
    type: 'image/webp' | 'image/jpeg';
    vignette: string;
    portrait: string;
}> {
    let source: ImageBitmap;
    try {
        source = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    }
    catch {
        throw new Error("Cette image ne peut pas être lue. Essaie un fichier JPEG ou PNG.");
    }
    try {
        const cadre = cadreVignette(source.width, source.height);
        const toileV = dessiner(source, cadre.x, cadre.y, cadre.cote, cadre.cote, cadre.sortie, cadre.sortie);
        const p = taillePortrait(source.width, source.height);
        const toileP = dessiner(source, 0, 0, source.width, source.height, p.largeur, p.hauteur);
        for (const type of ['image/webp', 'image/jpeg'] as const) {
            const v = await encoder(toileV, type, MAX_VIGNETTE);
            const g = v ? await encoder(toileP, type, MAX_PORTRAIT) : null;
            if (v && g)
                return { type, vignette: await enBase64(v), portrait: await enBase64(g) };
        }
        throw new Error("Cette image reste trop lourde une fois réduite. Essaie une autre photo.");
    }
    finally {
        source.close();
    }
}
export const PhotoCarte = ({ id, origine }: {
    id: number;
    origine: string;
}) => {
    const version = usePhotos((s) => s.versions[id]);
    const [cassee, setCassee] = useState(false);
    useEffect(() => setCassee(false), [version]);
    if (!version || cassee)
        return null;
    return (<img src={adressePhoto(id, 'vignette', version)} alt="" draggable={false} decoding="async" onError={() => setCassee(true)} data-photo-carte className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full object-cover border bg-blanc pointer-events-none select-none" style={{ borderColor: teinteDe(origine).c }}/>);
};
export const PhotoFiche = ({ personne, origine }: {
    personne: {
        id: number;
        prenom: string;
    };
    origine: string;
}) => {
    const version = usePhotos((s) => s.versions[personne.id]);
    const charger = usePhotos((s) => s.charger);
    const champ = useRef<HTMLInputElement>(null);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const [aRetirer, setARetirer] = useState(false);
    const t = teinteDe(origine);
    useEffect(() => {
        setErreur(null);
        setARetirer(false);
    }, [personne.id]);
    const agir = async (geste: () => Promise<unknown>) => {
        setEnvoi(true);
        setErreur(null);
        try {
            await geste();
            await charger();
        }
        catch (err: any) {
            setErreur(err?.response?.data?.error ?? err?.message ?? String(err));
        }
        finally {
            setEnvoi(false);
        }
    };
    const choisie = (e: ChangeEvent<HTMLInputElement>) => {
        const fichier = e.target.files?.[0];
        e.target.value = '';
        if (!fichier)
            return;
        void agir(async () => apiClient.put(`/photos/${personne.id}`, await reduire(fichier)));
    };
    const petit = 'h-8 px-3 rounded-[9px] border border-trait text-encre-2 text-[12.5px] hover:bg-sepia-tint disabled:opacity-50';
    const zone = 'h-[150px] w-full rounded-[14px] border border-trait-leger grid place-items-center relative overflow-hidden';
    return (<div className="flex flex-col gap-2" data-photo-fiche={version ? 'avec' : 'sans'}>
            <input ref={champ} type="file" accept="image/*" className="hidden" onChange={choisie} data-photo-champ/>
            {version ? (<>
                    
                    <div className="h-[150px] w-full rounded-[14px] border border-trait-leger relative overflow-hidden flex items-center justify-center" style={{ background: t.t }} data-photo-zone>
                        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.c }}/>
                        <img src={adressePhoto(personne.id, 'portrait', version)} alt={`Portrait de ${personne.prenom}`} draggable={false} className="block max-w-full max-h-full select-none" data-photo-portrait/>
                    </div>
                    {aRetirer ? (<div className="rounded-[10px] border px-3 py-2 flex flex-col gap-1.5" style={{ borderColor: 'var(--o-afrique)' }}>
                            <div className="text-[12.5px] text-encre">Retirer cette photo de la fiche ? Ton fichier d'origine n'est pas touché.</div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setARetirer(false)} className={petit}>Non</button>
                                <button type="button" disabled={envoi} onClick={() => void agir(async () => { await apiClient.delete(`/photos/${personne.id}`); setARetirer(false); })} className="h-8 px-3 rounded-[9px] border text-[12.5px] font-medium disabled:opacity-50" style={{ borderColor: 'var(--o-afrique)', color: 'var(--o-afrique)' }} data-action="oui-retirer-photo">
                                    Oui, retirer
                                </button>
                            </div>
                        </div>) : (<div className="flex gap-2">
                            <button type="button" disabled={envoi} onClick={() => champ.current?.click()} className={petit} data-action="changer-photo">
                                {envoi ? 'Un instant…' : 'Changer la photo'}
                            </button>
                            <button type="button" disabled={envoi} onClick={() => setARetirer(true)} className={petit} data-action="retirer-photo">
                                Retirer
                            </button>
                        </div>)}
                </>) : (<button type="button" disabled={envoi} onClick={() => champ.current?.click()} title="Choisir une photo d'identité (JPEG, PNG…). Elle est réduite et rangée dans ta base ; ton fichier n'est pas touché." className={`${zone} hover:border-sepia`} style={{ background: t.t }} data-action="ajouter-photo">
                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.c }}/>
                    <div className="flex flex-col items-center gap-1.5 text-encre-3 text-[11.5px]">
                        <Image size={22}/>
                        {envoi ? 'Un instant…' : 'Ajouter une photo'}
                    </div>
                </button>)}
            {erreur && <p className="text-[12.5px] m-0" style={{ color: 'var(--o-afrique)' }} data-photo-erreur>{erreur}</p>}
        </div>);
};
