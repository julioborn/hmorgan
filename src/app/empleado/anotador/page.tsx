"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, ChevronRight, Trash2, LockKeyhole, CalendarDays, Clock, Users } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";
import { hoyArgentina } from "@/lib/argentina-time";

type Comanda = {
    _id: string;
    mesa?: string;
    comensales?: number;
    nombreComanda?: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    createdAt: string;
    notaEmpleado?: string;
};

type Reserva = {
    _id: string;
    userId: { nombre: string; apellido: string; telefono?: string };
    fecha: string;
    hora: string;
    comensales: number;
    zona: "adentro" | "afuera" | "indiferente";
    mesaId?: { nombre: string };
    estado: "pendiente" | "confirmada" | "cancelada";
    notas?: string;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

const ZONA_LABEL: Record<string, string> = { adentro: "Adentro", afuera: "Afuera", indiferente: "Sin preferencia" };

const ESTADO_COLOR: Record<string, string> = {
    pendiente:  "bg-amber-100 text-amber-700 border border-amber-200",
    confirmada: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    cancelada:  "bg-gray-100 text-gray-400 border border-gray-200",
};

export default function AnotadorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<"comandas" | "reservas">("comandas");
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && user && !["empleado", "cajero", "admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchComandas = useCallback(async () => {
        // Cada mozo ve solo sus propias comandas, no las de los demás
        const propias = user?.role === "empleado" ? "&propias=true" : "";
        const r = await fetch(`/api/pedidos?activos=true&fuente=empleado${propias}`, { credentials: "include" });
        const d = await r.json().catch(() => []);
        setComandas(Array.isArray(d) ? d : []);
    }, [user?.role]);

    const fetchReservas = useCallback(async () => {
        const r = await fetch("/api/reservas", { credentials: "include" });
        const d = await r.json().catch(() => []);
        if (!Array.isArray(d)) return;
        const hoy = hoyArgentina();
        const hoyFiltradas = d
            .filter((r: Reserva) => r.fecha?.slice(0, 10) === hoy && r.estado !== "cancelada")
            .sort((a: Reserva, b: Reserva) => a.hora.localeCompare(b.hora));
        setReservas(hoyFiltradas);
    }, []);

    useEffect(() => {
        Promise.all([
            fetchComandas(),
            fetchReservas(),
            fetch("/api/caja/status", { credentials: "include" })
                .then(r => r.json())
                .then(d => setCajaAbierta(!!d.abierta))
                .catch(() => setCajaAbierta(false)),
        ]).finally(() => setLoadingData(false));

        const iv = setInterval(fetchComandas, 8000);
        return () => clearInterval(iv);
    }, [fetchComandas, fetchReservas]);

    async function eliminarComanda(id: string) {
        const r = await swalBase.fire({
            title: "¿Eliminar comanda?",
            text: "Se borrará definitivamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos?id=${id}`, { method: "DELETE", credentials: "include" });
        setComandas(prev => prev.filter(c => c._id !== id));
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="max-w-2xl mx-auto px-4">

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
                    {(["comandas", "reservas"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                            {t === "comandas" ? `Comandas${comandas.length > 0 ? ` (${comandas.length})` : ""}` : `Reservas hoy${reservas.length > 0 ? ` (${reservas.length})` : ""}`}
                        </button>
                    ))}
                </div>

                {/* ── COMANDAS ── */}
                {tab === "comandas" && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-400">
                                {comandas.length === 0 ? "Sin comandas activas" : `${comandas.length} activa${comandas.length !== 1 ? "s" : ""}`}
                            </p>
                            {cajaAbierta === false ? (
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
                                    <LockKeyhole size={13} />
                                    Caja cerrada — solo lectura
                                </div>
                            ) : (
                                <button
                                    onClick={() => router.push("/empleado/anotador/menu")}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-sm active:scale-95">
                                    <Plus size={18} /> Nueva comanda
                                </button>
                            )}
                        </div>

                        {comandas.length === 0 ? (
                            <div className="text-center py-20">
                                <UtensilsCrossed size={56} className="mx-auto text-gray-100 mb-4" />
                                <p className="font-bold text-gray-400">Sin comandas activas</p>
                                {cajaAbierta !== false && (
                                    <p className="text-sm text-gray-300 mt-1">Presioná "Nueva comanda" para empezar</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {comandas.map(c => (
                                    <div key={c._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-gray-900">
                                                        {c.mesa ? `Mesa ${c.mesa}` : "Sin mesa"}
                                                    </p>
                                                    {!!c.comensales && (
                                                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                            {c.comensales}p
                                                        </span>
                                                    )}
                                                </div>
                                                {c.nombreComanda && (
                                                    <p className="text-base font-bold text-gray-800 mt-0.5 truncate">{c.nombreComanda}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(c.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    {" · "}{c.estado}
                                                </p>
                                            </div>
                                            <p className="text-lg font-black text-gray-900 shrink-0 ml-3">${fmt(c.total)}</p>
                                        </div>

                                        <div className="px-4 py-3 space-y-1">
                                            {c.items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">
                                                        <span className="font-bold text-gray-400 mr-1.5">{it.cantidad}×</span>
                                                        {it.menuItemId?.nombre || "ítem"}
                                                    </span>
                                                    <span className="text-gray-400 shrink-0 ml-2">
                                                        ${fmt((it.menuItemId?.precio || 0) * it.cantidad)}
                                                    </span>
                                                </div>
                                            ))}
                                            {c.notaEmpleado && (
                                                <p className="text-xs text-amber-600 italic mt-1.5">📝 {c.notaEmpleado}</p>
                                            )}
                                            <div className="flex justify-between text-xs font-black text-gray-900 pt-2 mt-1 border-t border-gray-100">
                                                <span>TOTAL</span>
                                                <span>${fmt(c.total)}</span>
                                            </div>
                                        </div>

                                        {cajaAbierta !== false && (
                                            <div className="px-4 pb-3 flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() => eliminarComanda(c._id)}
                                                    className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-sm transition active:scale-95">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/empleado/anotador/menu?id=${c._id}`)}
                                                    className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition active:scale-95">
                                                    <Plus size={14} /> Agregar ítems
                                                    <ChevronRight size={13} className="opacity-60" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── RESERVAS ── */}
                {tab === "reservas" && (
                    <>
                        <p className="text-sm text-gray-400 mb-4">
                            {reservas.length === 0 ? "Sin reservas para hoy" : `${reservas.length} reserva${reservas.length !== 1 ? "s" : ""} para hoy`}
                        </p>

                        {reservas.length === 0 ? (
                            <div className="text-center py-20">
                                <CalendarDays size={56} className="mx-auto text-gray-100 mb-4" />
                                <p className="font-bold text-gray-400">Sin reservas para hoy</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reservas.map(r => (
                                    <div key={r._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-black rounded-xl p-2">
                                                    <Clock size={15} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-lg leading-none">{r.hora}hs</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {r.userId.nombre} {r.userId.apellido}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${ESTADO_COLOR[r.estado]}`}>
                                                {r.estado}
                                            </span>
                                        </div>

                                        <div className="px-4 py-3 space-y-2">
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1.5">
                                                    <Users size={13} className="text-gray-400" />
                                                    {r.comensales} {r.comensales === 1 ? "persona" : "personas"}
                                                </span>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-gray-600">{ZONA_LABEL[r.zona]}</span>
                                            </div>
                                            {r.mesaId && (
                                                <p className="text-sm font-semibold text-gray-700">
                                                    Mesa asignada: <span className="text-black">{r.mesaId.nombre}</span>
                                                </p>
                                            )}
                                            {r.notas && (
                                                <p className="text-xs text-amber-600 italic">📝 {r.notas}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
