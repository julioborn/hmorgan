"use client";
import { useEffect, useRef, useState } from "react";

type DeliveryUser = {
    _id: string;
    nombre: string;
    apellido: string;
    ubicacionDelivery: { lat: number; lng: number; updatedAt: string };
};

type Props = {
    destLat?: number;
    destLng?: number;
};

export default function DeliveryMap({ destLat, destLng }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<any>(null);
    const markersRef   = useRef<Map<string, any>>(new Map());
    const [deliveries, setDeliveries] = useState<DeliveryUser[]>([]);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [sinSenal, setSinSenal]     = useState(false);

    // Fetch de posición del delivery
    async function fetchDeliveries() {
        try {
            const res = await fetch("/api/delivery/ubicacion", { credentials: "include" });
            if (!res.ok) return;
            const data = await res.json();
            const list: DeliveryUser[] = Array.isArray(data) ? data : [];
            setDeliveries(list);
            setSinSenal(list.length === 0);
            setLastUpdate(new Date());
        } catch {}
    }

    // Fetch inicial + polling cada 10s
    useEffect(() => {
        fetchDeliveries();
        const iv = setInterval(fetchDeliveries, 10000);
        return () => clearInterval(iv);
    }, []);

    // Inicializar mapa una sola vez
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        import("leaflet").then(L => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const center: [number, number] = destLat && destLng
                ? [destLat, destLng]
                : [-31.63, -60.7];

            const map = L.map(containerRef.current!, { zoomControl: true }).setView(center, 15);
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 19,
            }).addTo(map);

            // Pin destino
            if (destLat && destLng) {
                const destIcon = L.divIcon({
                    html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</div>`,
                    className: "",
                    iconSize: [28, 28],
                    iconAnchor: [14, 28],
                });
                L.marker([destLat, destLng], { icon: destIcon })
                    .addTo(map)
                    .bindPopup("Destino del cliente");
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current.clear();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Actualizar marcadores de moto cuando cambia deliveries
    useEffect(() => {
        if (!mapRef.current) return;

        import("leaflet").then(L => {
            const motoIcon = L.divIcon({
                html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🏍️</div>`,
                className: "",
                iconSize: [34, 34],
                iconAnchor: [17, 17],
            });

            // Actualizar o agregar marcadores
            for (const d of deliveries) {
                const latlng: [number, number] = [d.ubicacionDelivery.lat, d.ubicacionDelivery.lng];
                if (markersRef.current.has(d._id)) {
                    markersRef.current.get(d._id).setLatLng(latlng);
                } else {
                    const m = L.marker(latlng, { icon: motoIcon })
                        .addTo(mapRef.current)
                        .bindPopup(`<b>${d.nombre} ${d.apellido}</b><br>En camino 🏍️`);
                    markersRef.current.set(d._id, m);
                }
            }

            // Ajustar vista para mostrar moto + destino si hay los dos
            if (deliveries[0] && destLat && destLng) {
                const bounds = L.latLngBounds(
                    [deliveries[0].ubicacionDelivery.lat, deliveries[0].ubicacionDelivery.lng],
                    [destLat, destLng]
                );
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            } else if (deliveries[0]) {
                mapRef.current.setView(
                    [deliveries[0].ubicacionDelivery.lat, deliveries[0].ubicacionDelivery.lng],
                    15
                );
            }
        });
    }, [deliveries, destLat, destLng]);

    return (
        <>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

            {sinSenal && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 gap-2 pointer-events-none">
                    <span className="text-4xl">🏍️</span>
                    <p className="text-sm font-bold text-gray-500">El delivery aún no activó su ubicación</p>
                </div>
            )}

            {lastUpdate && !sinSenal && (
                <div className="absolute top-2 right-2 z-[1000] bg-white/90 text-[10px] text-gray-500 px-2 py-1 rounded-full shadow flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    {lastUpdate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
            )}

            <div ref={containerRef} className="w-full h-full" style={{ minHeight: "280px" }} />
        </>
    );
}
