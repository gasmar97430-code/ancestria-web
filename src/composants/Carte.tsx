// ---- CARTE (Leaflet + OpenStreetMap) ----
// Points en cercles dessinés (pas d'images de marqueurs : rien à charger,
// rien qui casse à la construction). Tuiles OpenStreetMap, attribution
// obligatoire affichée.

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { ReactNode } from 'react';

export interface Point {
    id: string;
    position: [number, number];
    couleur: string;
    rayon?: number;
    contenu: ReactNode;
}

const valide = (p: [number, number]) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

function Cadrer({ points, centre }: { points: Point[]; centre: [number, number] | null }) {
    const carte = useMap();
    // recadrer seulement si les POSITIONS changent (pas à chaque rendu de la page)
    const cle = JSON.stringify([points.map((p) => p.position), centre]);
    useEffect(() => {
        const [positions, c] = JSON.parse(cle) as [[number, number][], [number, number] | null];
        const ok = positions.filter(valide);
        if (ok.length > 1) carte.fitBounds(ok, { padding: [32, 32], maxZoom: 13 });
        else if (ok.length === 1) carte.setView(ok[0], 12);
        else if (c && valide(c)) carte.setView(c, 11);
    }, [carte, cle]);
    return null;
}

export function Carte({ points, centre, hauteur = 420 }: { points: Point[]; centre: [number, number] | null; hauteur?: number }) {
    const depart: [number, number] = centre && valide(centre) ? centre : [-21.115, 55.536]; // La Réunion par défaut
    return (
        <div className="rounded-2xl overflow-hidden border border-trait" style={{ height: hauteur }}>
            <MapContainer center={depart} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                {points.filter((p) => valide(p.position)).map((p) => (
                    <CircleMarker key={p.id} center={p.position} radius={p.rayon ?? 8} pathOptions={{ color: '#1b1612', weight: 1.5, fillColor: p.couleur, fillOpacity: 0.9 }}>
                        <Popup>{p.contenu}</Popup>
                    </CircleMarker>
                ))}
                <Cadrer points={points} centre={centre} />
            </MapContainer>
        </div>
    );
}

// ---- FIN CARTE ----
