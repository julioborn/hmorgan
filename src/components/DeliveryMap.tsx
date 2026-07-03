"use client";
import { useEffect, useRef } from "react";

type DeliveryUser = {
    _id: string;
    nombre: string;
    apellido: string;
    ubicacionDelivery: { lat: number; lng: number; updatedAt: string };
};

type Props = {
    deliveries: DeliveryUser[];
    destLat?: number;
    destLng?: number;
};

export default function DeliveryMap({ deliveries, destLat, destLng }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const destMarkerRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Leaflet solo funciona en cliente
        import("leaflet").then(L => {
            // Fix default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const center: [number, number] = deliveries[0]
                ? [deliveries[0].ubicacionDelivery.lat, deliveries[0].ubicacionDelivery.lng]
                : destLat && destLng
                ? [destLat, destLng]
                : [-31.63, -60.7];

            const map = L.map(containerRef.current!, { zoomControl: true }).setView(center, 15);
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 19,
            }).addTo(map);

            // Ícono moto
            const motoIcon = L.divIcon({
                html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🏍️</div>`,
                className: "",
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            // Ícono destino (casa del cliente)
            const destIcon = L.divIcon({
                html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>`,
                className: "",
                iconSize: [28, 28],
                iconAnchor: [14, 28],
            });

            // Poner marcadores delivery
            for (const d of deliveries) {
                const marker = L.marker(
                    [d.ubicacionDelivery.lat, d.ubicacionDelivery.lng],
                    { icon: motoIcon }
                ).addTo(map).bindPopup(`<b>${d.nombre} ${d.apellido}</b><br>En camino`);
                markersRef.current.push(marker);
            }

            // Poner marcador destino si hay coords
            if (destLat && destLng) {
                const dm = L.marker([destLat, destLng], { icon: destIcon })
                    .addTo(map)
                    .bindPopup("Tu dirección");
                destMarkerRef.current = dm;

                // Ajustar zoom para mostrar ambos puntos
                if (deliveries[0]) {
                    const bounds = L.latLngBounds(
                        [deliveries[0].ubicacionDelivery.lat, deliveries[0].ubicacionDelivery.lng],
                        [destLat, destLng]
                    );
                    map.fitBounds(bounds, { padding: [40, 40] });
                }
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current = [];
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Actualizar posición de marcadores cuando cambia deliveries
    useEffect(() => {
        if (!mapRef.current || markersRef.current.length === 0) return;
        import("leaflet").then(() => {
            deliveries.forEach((d, i) => {
                if (markersRef.current[i]) {
                    markersRef.current[i].setLatLng([
                        d.ubicacionDelivery.lat,
                        d.ubicacionDelivery.lng,
                    ]);
                }
            });
        });
    }, [deliveries]);

    return (
        <>
            {/* Leaflet CSS */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            />
            <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "280px" }} />
        </>
    );
}
