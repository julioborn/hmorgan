"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, Loader2, ChevronRight } from "lucide-react";
import Loader from "@/components/Loader";

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
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && user && user.role !== "empleado" && user.role !== "admin" && user.role !== "superadmin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchComandas = useCallback(async () => {
        const r = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" });
        const d = await r.json().catch(() => []);
        setComandas(Array.isArray(d) ? d : []);
        setLoadingData(false);
    }, []);

    useEffect(() => {
        fetchComandas();
        const iv = setInterval(fetchComandas, 8000);
        return () => clearInterval(iv);
    }, [fetchComandas]);

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-white pb-24" style={{ paddingTop: "calc(env(safe-area-inset-top) + 98px)" }}>
            <div className="max-w-2xl mx-auto px-4 pt-4">

                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Comandas</h1>
                        <p className="text-sm text-gray-400">
                            {comandas.length === 0 ? "Sin comandas activas" : `${comandas.length} activa${comandas.length !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/empleado/anotador/menu")}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-sm active:scale-95">
                        <Plus size={18} /> Nueva comanda
                    </button>
                </div>

                {/* Lista de comandas */}
                {comandas.length === 0 ? (
                    <div className="text-center py-20">
                        <UtensilsCrossed size={56} className="mx-auto text-gray-100 mb-4" />
                        <p className="font-bold text-gray-400">Sin comandas activas</p>
                        <p className="text-sm text-gray-300 mt-1">Presioná "Nueva comanda" para empezar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {comandas.map(c => (
                            <div key={c._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Header comanda */}
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
                                            {c.nombreComanda && (
                                                <span className="text-xs text-gray-400 truncate">{c.nombreComanda}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(c.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                            {" · "}{c.estado}
                                        </p>
                                    </div>
                                    <p className="text-lg font-black text-gray-900 shrink-0 ml-3">${fmt(c.total)}</p>
                                </div>

                                {/* Items */}
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

                                {/* Acción */}
                                <div className="px-4 pb-3 flex justify-end">
                                    <button
                                        onClick={() => router.push(`/empleado/anotador/menu?id=${c._id}`)}
                                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition active:scale-95">
                                        <Plus size={14} /> Agregar ítems
                                        <ChevronRight size={13} className="opacity-60" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
