"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, ChevronRight, Trash2, LockKeyhole, Star } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

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

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

export default function AnotadorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [eventoActivo, setEventoActivo] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user && !["empleado", "cajero", "admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchComandas = useCallback(async () => {
        const propias = user?.role === "empleado" ? "&propias=true" : "";
        const r = await fetch(`/api/pedidos?activos=true&fuente=empleado${propias}`, { credentials: "include" });
        const d = await r.json().catch(() => []);
        setComandas(Array.isArray(d) ? d : []);
    }, [user?.role]);

    useEffect(() => {
        Promise.all([
            fetchComandas(),
            fetch("/api/caja/status", { credentials: "include" })
                .then(r => r.json())
                .then(d => setCajaAbierta(!!d.abierta))
                .catch(() => setCajaAbierta(false)),
            fetch("/api/eventos?activo=true", { credentials: "include" })
                .then(r => r.json())
                .then(d => setEventoActivo(Array.isArray(d) && d.length > 0 ? d[0].nombre : null))
                .catch(() => null),
        ]).finally(() => setLoadingData(false));

        const iv = setInterval(fetchComandas, 8000);
        return () => clearInterval(iv);
    }, [fetchComandas]);

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
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">

                {eventoActivo && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Star size={14} className="text-amber-500 shrink-0" />
                        <p className="text-sm font-bold text-amber-700 truncate">Evento activo: {eventoActivo}</p>
                    </div>
                )}

                {cajaAbierta === false && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-5 py-4">
                        <LockKeyhole size={18} className="text-gray-400 shrink-0" />
                        <div>
                            <p className="font-bold text-gray-600 text-sm">Caja cerrada</p>
                            <p className="text-xs text-gray-400">Solo lectura hasta que abran la caja</p>
                        </div>
                    </div>
                )}

                {/* Comandas activas */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="font-black text-gray-900 text-sm uppercase tracking-wider">Comandas activas</h2>
                            {comandas.length > 0 && (
                                <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{comandas.length}</span>
                            )}
                        </div>
                        {cajaAbierta !== false && (
                            <button
                                onClick={() => router.push("/empleado/anotador/menu")}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl transition text-sm active:scale-95">
                                <Plus size={15} /> Nueva comanda
                            </button>
                        )}
                    </div>

                    {comandas.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl">
                            <UtensilsCrossed size={40} className="mx-auto text-gray-200 mb-3" />
                            <p className="font-bold text-gray-400 text-sm">Sin comandas activas</p>
                            {cajaAbierta !== false && (
                                <p className="text-xs text-gray-300 mt-1">Presioná "Nueva comanda" para empezar</p>
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
                                        {c.items.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">Sin ítems todavía</p>
                                        ) : c.items.map((it, idx) => (
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
                                        {c.items.length > 0 && (
                                            <div className="flex justify-between text-xs font-black text-gray-900 pt-2 mt-1 border-t border-gray-100">
                                                <span>TOTAL</span>
                                                <span>${fmt(c.total)}</span>
                                            </div>
                                        )}
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
                </div>

            </div>
        </div>
    );
}
