"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Truck, MapPin, Phone, Clock, PackageCheck, Loader2, Bell, BellRing, Navigation, NavigationOff } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";
import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), { ssr: false });

type Pedido = {
    _id: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    tipoEntrega?: string;
    direccion?: string;
    lat?: number;
    lng?: number;
    notaCliente?: string;
    notaEmpleado?: string;
    createdAt: string;
    userId?: { nombre: string; apellido: string; telefono?: string };
    repartidorAfuera?: boolean;
};

type MiUbicacion = { lat: number; lng: number };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

export default function DeliveryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [avisandoId, setAvisandoId] = useState<string | null>(null);

    // Tracking
    const [tracking, setTracking] = useState(false);
    const [miUbicacion, setMiUbicacion] = useState<MiUbicacion | null>(null);
    const [trackingError, setTrackingError] = useState("");
    const watchIdRef = useRef<number | null>(null);
    const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSentRef = useRef<MiUbicacion | null>(null);

    useEffect(() => {
        if (!loading && user && user.role !== "delivery" && user.role !== "admin" && user.role !== "superadmin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchPedidos = useCallback(async () => {
        const r = await fetch("/api/pedidos", { credentials: "include" });
        const d = await r.json().catch(() => []);
        setPedidos(Array.isArray(d) ? d : []);
    }, []);

    useEffect(() => {
        fetchPedidos().finally(() => setLoadingData(false));
        const iv = setInterval(fetchPedidos, 8000);
        return () => clearInterval(iv);
    }, [fetchPedidos]);

    // Enviar ubicación al servidor
    const enviarUbicacion = useCallback(async (pos: MiUbicacion) => {
        await fetch("/api/delivery/ubicacion", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pos),
        }).catch(() => {});
    }, []);

    const iniciarTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setTrackingError("Tu dispositivo no soporta geolocalización");
            return;
        }
        setTrackingError("");

        // Primer fix inmediato para que llegue rápido la primera posición
        navigator.geolocation.getCurrentPosition(
            pos => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMiUbicacion(coords);
                lastSentRef.current = coords;
                enviarUbicacion(coords);
            },
            err => {
                const msg = err.code === 1
                    ? "Permiso de ubicación denegado. Habilitalo en la configuración del navegador."
                    : err.code === 2
                    ? "No se pudo determinar la ubicación. Verificá tu GPS."
                    : "Tiempo de espera agotado para obtener ubicación.";
                setTrackingError(msg);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );

        // Watch continuo para actualizaciones
        watchIdRef.current = navigator.geolocation.watchPosition(
            pos => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMiUbicacion(coords);
                lastSentRef.current = coords;
            },
            err => {
                if (err.code === 1) {
                    setTrackingError("Permiso denegado. Habilitá la ubicación en tu navegador.");
                    detenerTracking();
                }
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // Enviar al servidor cada 12 segundos
        sendIntervalRef.current = setInterval(() => {
            if (lastSentRef.current) enviarUbicacion(lastSentRef.current);
        }, 12000);

        setTracking(true);
    }, [enviarUbicacion]);

    // Detener tracking
    async function detenerTracking() {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (sendIntervalRef.current) {
            clearInterval(sendIntervalRef.current);
            sendIntervalRef.current = null;
        }
        await fetch("/api/delivery/ubicacion", { method: "DELETE", credentials: "include" }).catch(() => {});
        setTracking(false);
        setMiUbicacion(null);
        lastSentRef.current = null;
    }

    // Auto-iniciar tracking al entrar (solo rol delivery, cuando ya cargó el usuario)
    useEffect(() => {
        if (!loading && user?.role === "delivery" && !loadingData) {
            iniciarTracking();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, loadingData]);

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
        };
    }, []);

    async function avisarCliente(p: Pedido) {
        setAvisandoId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: p._id, repartidorAfuera: true }),
            });
            await fetchPedidos();
        } finally {
            setAvisandoId(null);
        }
    }

    async function marcarEntregado(p: Pedido) {
        const nombreCliente = `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "el cliente";
        const r1 = await swalBase.fire({
            title: "¿Envío completado?",
            html: `Vas a marcar como <b>entregado</b> el pedido de <b>${nombreCliente}</b>.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
        });
        if (!r1.isConfirmed) return;
        const r2 = await swalBase.fire({
            title: "Confirmar entrega",
            text: "Esta acción no se puede deshacer. ¿Confirmás que el pedido ya fue entregado?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, entregado",
            cancelButtonText: "Cancelar",
        });
        if (!r2.isConfirmed) return;
        setUpdatingId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: p._id, estado: "entregado" }),
            });
            await fetchPedidos();
        } finally {
            setUpdatingId(null);
        }
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    const enCamino  = pedidos.filter(p => p.estado === "listo");
    const entregados = pedidos.filter(p => p.estado === "entregado");

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

                <div className="flex items-center gap-3">
                    <div className="bg-black rounded-xl p-2.5">
                        <Truck size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-gray-900 leading-none">Entregas</h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {enCamino.length === 0 ? "Sin envíos en camino" : `${enCamino.length} envío${enCamino.length !== 1 ? "s" : ""} en camino`}
                        </p>
                    </div>
                </div>

                {/* Control de localización */}
                <div className={`rounded-2xl border-2 px-4 py-3 ${tracking ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {tracking
                                ? <Navigation size={18} className="text-emerald-600 shrink-0 animate-pulse" />
                                : <NavigationOff size={18} className="text-gray-400 shrink-0" />}
                            <div className="min-w-0">
                                <p className={`text-sm font-black ${tracking ? "text-emerald-700" : "text-gray-600"}`}>
                                    {tracking ? "Compartiendo ubicación" : "Ubicación desactivada"}
                                </p>
                                {tracking && miUbicacion && (
                                    <p className="text-xs text-emerald-500 font-mono truncate">
                                        {miUbicacion.lat.toFixed(5)}, {miUbicacion.lng.toFixed(5)}
                                    </p>
                                )}
                                {trackingError && <p className="text-xs text-red-500">{trackingError}</p>}
                            </div>
                        </div>
                        <button
                            onClick={tracking ? detenerTracking : iniciarTracking}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-black transition active:scale-95
                                ${tracking
                                    ? "bg-gray-900 text-white hover:bg-gray-700"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                            {tracking ? "Detener" : "Activar"}
                        </button>
                    </div>
                    {!tracking && (
                        <p className="text-xs text-gray-400 mt-2">
                            Activá para que el bar y los clientes vean tu posición en tiempo real 🏍️
                        </p>
                    )}
                </div>

                {enCamino.length === 0 ? (
                    <div className="text-center py-16">
                        <Truck size={56} className="mx-auto text-gray-100 mb-4" />
                        <p className="font-bold text-gray-400">No hay envíos pendientes</p>
                        <p className="text-sm text-gray-300 mt-1">Los pedidos en camino van a aparecer acá</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {enCamino.map(p => (
                            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-gray-900 truncate">
                                            {p.userId?.nombre} {p.userId?.apellido}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0 ml-2">
                                        En camino
                                    </span>
                                </div>

                                <div className="px-4 py-3 space-y-2.5">
                                    {p.direccion && (
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <MapPin size={15} className="text-red-500 mt-0.5 shrink-0" />
                                            <span className="font-semibold">{p.direccion}</span>
                                        </div>
                                    )}
                                    {p.lat && p.lng && (
                                        <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-blue-600 font-semibold">
                                            <MapPin size={15} className="text-blue-500 shrink-0" />
                                            Ver destino en Google Maps
                                        </a>
                                    )}
                                    {p.userId?.telefono && (
                                        <a href={`tel:${p.userId.telefono}`} className="flex items-center gap-2 text-sm text-gray-700">
                                            <Phone size={15} className="text-emerald-600 shrink-0" />
                                            <span className="font-semibold">{p.userId.telefono}</span>
                                        </a>
                                    )}
                                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mt-1">
                                        {p.items.map((it, idx) => (
                                            <li key={idx} className="flex justify-between items-center px-3 py-2 bg-gray-50 text-sm">
                                                <span className="text-gray-700">
                                                    <span className="font-bold text-gray-400 mr-1.5">{it.cantidad}×</span>
                                                    {it.menuItemId?.nombre || "ítem"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    {(p.notaCliente || p.notaEmpleado) && (
                                        <p className="text-xs text-amber-600 italic">📝 {p.notaCliente || p.notaEmpleado}</p>
                                    )}
                                    <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                                        <span>TOTAL</span>
                                        <span>${fmt(p.total)}</span>
                                    </div>

                                    {p.tipoEntrega === "envio" && (
                                        <button disabled={avisandoId === p._id || p.repartidorAfuera}
                                            onClick={() => avisarCliente(p)}
                                            className="w-full mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95">
                                            {avisandoId === p._id ? <Loader2 size={16} className="animate-spin" /> : p.repartidorAfuera ? <BellRing size={16} /> : <Bell size={16} />}
                                            {p.repartidorAfuera ? "Cliente avisado" : "Avisar al cliente"}
                                        </button>
                                    )}
                                    <button disabled={updatingId === p._id} onClick={() => marcarEntregado(p)}
                                        className="w-full mt-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95">
                                        {updatingId === p._id ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                                        Envío completado
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {entregados.length > 0 && (
                    <>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-8 mb-3">
                            Entregados · pendientes de cobro
                        </p>
                        <div className="space-y-2">
                            {entregados.map(p => (
                                <div key={p._id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-700 text-sm truncate">
                                            {p.userId?.nombre} {p.userId?.apellido}
                                        </p>
                                        {p.direccion && <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5"><MapPin size={11} />{p.direccion}</p>}
                                    </div>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 ml-2 flex items-center gap-1">
                                        <Clock size={11} /> Entregado
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
