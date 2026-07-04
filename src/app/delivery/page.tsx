"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Truck, MapPin, Phone, Clock, PackageCheck, Loader2, Bell, BellRing, History, ChevronDown, ChevronUp } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type Item = { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number };

type Pedido = {
    _id: string;
    items: Item[];
    total: number;
    costoEnvio?: number;
    estado: string;
    tipoEntrega?: string;
    direccion?: string;
    lat?: number;
    lng?: number;
    notaCliente?: string;
    notaEmpleado?: string;
    horarioPreferido?: string;
    createdAt: string;
    userId?: { nombre: string; apellido: string; telefono?: string };
    repartidorAfuera?: boolean;
    nombreComanda?: string;
    telefonoContacto?: string;
    fuente?: string;
    deliveryNumero?: number;
    metodoPago?: string;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

const METODO_LABEL: Record<string, string> = {
    efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", mercadopago: "MercadoPago",
};

export default function DeliveryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [historial, setHistorial] = useState<Pedido[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [avisandoId, setAvisandoId] = useState<string | null>(null);
    const [historialAbierto, setHistorialAbierto] = useState(true);

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

    const fetchHistorial = useCallback(async () => {
        const r = await fetch("/api/pedidos?terminadosHoy=true", { credentials: "include" });
        const d = await r.json().catch(() => []);
        setHistorial(Array.isArray(d) ? d : []);
    }, []);

    useEffect(() => {
        Promise.all([fetchPedidos(), fetchHistorial()]).finally(() => setLoadingData(false));
        const iv1 = setInterval(fetchPedidos, 8000);
        const iv2 = setInterval(fetchHistorial, 15000);
        return () => { clearInterval(iv1); clearInterval(iv2); };
    }, [fetchPedidos, fetchHistorial]);

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
        } finally { setAvisandoId(null); }
    }

    async function marcarEntregado(p: Pedido) {
        const nombreCliente = `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "el cliente";
        const r1 = await swalBase.fire({
            title: "¿Envío completado?",
            html: `Vas a marcar como <b>entregado</b> el pedido de <b>${nombreCliente}</b>.`,
            icon: "question", showCancelButton: true,
            confirmButtonText: "Sí, continuar", cancelButtonText: "Cancelar",
        });
        if (!r1.isConfirmed) return;
        const r2 = await swalBase.fire({
            title: "Confirmar entrega",
            text: "Esta acción no se puede deshacer. ¿Confirmás que el pedido ya fue entregado?",
            icon: "warning", showCancelButton: true,
            confirmButtonText: "Sí, entregado", cancelButtonText: "Cancelar",
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
        } finally { setUpdatingId(null); }
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    const enCamino  = pedidos.filter(p => p.estado === "listo");
    const entregados = pedidos.filter(p => p.estado === "entregado");

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="max-w-2xl mx-auto px-4">

                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-black rounded-xl p-2.5">
                        <Truck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Entregas</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {enCamino.length === 0 ? "Sin envíos en camino" : `${enCamino.length} envío${enCamino.length !== 1 ? "s" : ""} en camino`}
                        </p>
                    </div>
                </div>

                {enCamino.length === 0 ? (
                    <div className="text-center py-10">
                        <Truck size={56} className="mx-auto text-gray-100 mb-4" />
                        <p className="font-bold text-gray-400">No hay envíos pendientes</p>
                        <p className="text-sm text-gray-300 mt-1">Los pedidos en camino van a aparecer acá</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {enCamino.map(p => (
                            <PedidoCard key={p._id} p={p}
                                avisandoId={avisandoId} updatingId={updatingId}
                                onAvisar={avisarCliente} onEntregado={marcarEntregado}
                            />
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
                                            {p.nombreComanda || `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "Cliente"}
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

                {/* ── Historial del día ─────────────────────────────── */}
                <div className="mt-8">
                    <button
                        onClick={() => setHistorialAbierto(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 text-white rounded-2xl mb-3 transition hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                            <History size={16} />
                            <span className="font-black text-sm tracking-wide">Historial del día</span>
                            {historial.length > 0 && (
                                <span className="bg-white text-gray-900 text-xs font-black px-2 py-0.5 rounded-full">{historial.length}</span>
                            )}
                        </div>
                        {historialAbierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    {historialAbierto && (
                        historial.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-8">Sin entregas completadas hoy</p>
                        ) : (
                            <div className="space-y-3">
                                {[...historial].reverse().map(p => (
                                    <ComandaHistorial key={p._id} p={p} />
                                ))}
                            </div>
                        )
                    )}
                </div>

            </div>
        </div>
    );
}

/* ── Card activa (en camino) ─────────────────────────────────────── */
function PedidoCard({ p, avisandoId, updatingId, onAvisar, onEntregado }: {
    p: Pedido;
    avisandoId: string | null;
    updatingId: string | null;
    onAvisar: (p: Pedido) => void;
    onEntregado: (p: Pedido) => void;
}) {
    const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="min-w-0 flex-1">
                    <p className="font-black text-gray-900 truncate">
                        {p.nombreComanda || `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "Cliente"}
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
                        Ver en Google Maps
                    </a>
                )}
                {(p.telefonoContacto || p.userId?.telefono) && (
                    <a href={`tel:${p.telefonoContacto || p.userId?.telefono}`} className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone size={15} className="text-emerald-600 shrink-0" />
                        <span className="font-semibold">{p.telefonoContacto || p.userId?.telefono}</span>
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
                    <button disabled={avisandoId === p._id || p.repartidorAfuera} onClick={() => onAvisar(p)}
                        className="w-full mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95">
                        {avisandoId === p._id ? <Loader2 size={16} className="animate-spin" /> : p.repartidorAfuera ? <BellRing size={16} /> : <Bell size={16} />}
                        {p.repartidorAfuera ? "Cliente avisado" : "Avisar al cliente"}
                    </button>
                )}
                <button disabled={updatingId === p._id} onClick={() => onEntregado(p)}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95">
                    {updatingId === p._id ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                    Envío completado
                </button>
            </div>
        </div>
    );
}

/* ── Comanda de historial (solo lectura) ─────────────────────────── */
function ComandaHistorial({ p }: { p: Pedido }) {
    const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    const nombreCliente = p.nombreComanda || `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "Cliente";
    const telefono = p.telefonoContacto || p.userId?.telefono;
    const subtotal = p.total - (p.costoEnvio ?? 0);

    return (
        <div className="bg-white rounded-2xl border-2 border-black shadow-sm overflow-hidden">
            {/* Header negro */}
            <div className="bg-black px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white text-base leading-tight">{nombreCliente}</p>
                        {p.deliveryNumero && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white/80">
                                #{p.deliveryNumero}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-white/50 flex items-center gap-1">
                            <Clock size={10} />{hora}
                        </span>
                        {telefono && (
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <Phone size={10} />{telefono}
                            </span>
                        )}
                    </div>
                </div>
                <span className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-400 text-black uppercase tracking-wide">
                    Cobrado
                </span>
            </div>

            <div className="px-4 py-3 space-y-2">
                {/* Dirección */}
                {p.direccion && (
                    <div className="flex items-start gap-1.5 text-sm text-gray-700">
                        <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <span className="font-semibold">{p.direccion}</span>
                    </div>
                )}
                {/* Horario preferido */}
                {p.horarioPreferido && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                        <Clock size={12} className="shrink-0" />
                        Entregar: {p.horarioPreferido}
                    </div>
                )}

                {/* Items tipo comanda */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {p.items.map((it, idx) => (
                        <div key={idx} className={`flex items-center gap-3 px-3 py-2 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                            <span className="text-base font-black text-black min-w-[1.5rem] text-center">{it.cantidad}×</span>
                            <span className="text-sm font-semibold text-gray-800 flex-1">{it.menuItemId?.nombre || "ítem"}</span>
                            <span className="text-xs text-gray-400 shrink-0">${fmt(it.menuItemId?.precio * it.cantidad)}</span>
                        </div>
                    ))}
                </div>

                {/* Nota */}
                {(p.notaCliente || p.notaEmpleado) && (
                    <p className="text-xs text-amber-600 italic border-l-2 border-amber-300 pl-2">📝 {p.notaCliente || p.notaEmpleado}</p>
                )}

                {/* Totales */}
                <div className="border-t border-gray-100 pt-2 space-y-1">
                    {(p.costoEnvio ?? 0) > 0 && (
                        <>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal</span>
                                <span>${fmt(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>🛵 Recargo delivery</span>
                                <span>${fmt(p.costoEnvio ?? 0)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-gray-900">TOTAL</span>
                        <span className="text-sm font-black text-gray-900">${fmt(p.total)}</span>
                    </div>
                </div>

                {/* Método de pago */}
                {p.metodoPago && (
                    <div className="flex justify-end">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">
                            {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
