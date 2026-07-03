"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ChefHat, LogOut, Clock, X } from "lucide-react";

const BEBIDAS_CATS = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);

type Item = {
    menuItemId: { nombre: string; precio: number; categoria?: string };
    cantidad: number;
    nota?: string;
};

type Pedido = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    fuente: string;
    estado: string;
    items: Item[];
    createdAt: string;
    userId?: { nombre: string; apellido: string };
};

function foodItems(items: Item[]) {
    return items.filter(it => {
        const cat = (it.menuItemId?.categoria || "").toUpperCase();
        return !BEBIDAS_CATS.has(cat);
    });
}

export default function CocinaPage() {
    const router = useRouter();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [marcando, setMarcando] = useState<string | null>(null);
    const [confirmarId, setConfirmarId] = useState<string | null>(null);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const [nuevosIds, setNuevosIds] = useState<Set<string>>(new Set());

    const loadPedidos = useCallback(async () => {
        try {
            const res = await fetch("/api/pedidos", { credentials: "include" });
            if (res.status === 401) { router.replace("/login"); return; }
            const data = await res.json();
            if (!Array.isArray(data)) return;

            const conComida = data.filter((p: Pedido) => foodItems(p.items).length > 0);
            conComida.sort((a: Pedido, b: Pedido) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const currentIds = new Set(conComida.map((p: Pedido) => p._id));
            const recienLlegados = new Set<string>();
            if (prevIdsRef.current.size > 0) {
                for (const id of currentIds) {
                    if (!prevIdsRef.current.has(id)) recienLlegados.add(id);
                }
            }
            prevIdsRef.current = currentIds;
            if (recienLlegados.size > 0) {
                setNuevosIds(prev => new Set([...prev, ...recienLlegados]));
                setTimeout(() => {
                    setNuevosIds(prev => {
                        const next = new Set(prev);
                        recienLlegados.forEach(id => next.delete(id));
                        return next;
                    });
                }, 5000);
            }

            setPedidos(conComida);
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        loadPedidos();
        const iv = setInterval(loadPedidos, 5000);
        return () => clearInterval(iv);
    }, [loadPedidos]);

    async function confirmarListo() {
        if (!confirmarId) return;
        const id = confirmarId;
        setConfirmarId(null);
        setMarcando(id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, estado: "listo" }),
            });
            setPedidos(prev => prev.filter(p => p._id !== id));
        } catch { /* silencioso */ }
        finally { setMarcando(null); }
    }

    function logout() {
        fetch("/api/auth/logout", { method: "POST", credentials: "include" })
            .finally(() => router.replace("/login"));
    }

    const pedidoAConfirmar = confirmarId ? pedidos.find(p => p._id === confirmarId) : null;

    return (
        <div className="min-h-screen bg-white pb-10">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <ChefHat size={22} className="text-black" />
                    <span className="text-lg font-black tracking-tight text-black">Cocina</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium">
                        {pedidos.length} comanda{pedidos.length !== 1 ? "s" : ""}
                    </span>
                    <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
                    Cargando...
                </div>
            ) : pedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3 text-gray-300">
                    <ChefHat size={52} />
                    <p className="text-lg font-semibold text-gray-400">Sin comandas en preparación</p>
                    <p className="text-sm text-gray-300">Actualizando cada 5 segundos...</p>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                    {pedidos.map(p => {
                        const comida = foodItems(p.items);
                        const mesaLabel = p.mesa
                            ? `Mesa ${p.mesa}`
                            : p.nombreComanda || "Sin mesa";
                        const mozo = p.userId ? `${p.userId.nombre} ${p.userId.apellido}` : null;
                        const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        const isNuevo = nuevosIds.has(p._id);
                        const isMarcando = marcando === p._id;

                        return (
                            <div
                                key={p._id}
                                className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${
                                    isNuevo ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
                                }`}
                            >
                                {/* Card header */}
                                <div className={`px-4 py-3 flex items-center justify-between border-b ${isNuevo ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {isNuevo && (
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                                Nuevo
                                            </span>
                                        )}
                                        <span className="text-xl font-black text-black">{mesaLabel}</span>
                                        {mozo && (
                                            <span className="text-sm text-gray-400">{mozo}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <Clock size={13} />
                                        <span className="text-sm">{hora}</span>
                                    </div>
                                </div>

                                {/* Food items */}
                                <div className="px-4 py-4 space-y-3 bg-white">
                                    {comida.map((it, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <span className="text-2xl font-black text-black min-w-[2rem] text-center leading-tight">
                                                {it.cantidad}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-lg font-bold text-black leading-tight">
                                                    {it.menuItemId?.nombre || "Ítem"}
                                                </p>
                                                {it.nota && (
                                                    <p className="text-sm text-amber-600 mt-0.5 italic">
                                                        ✏ {it.nota}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Listo button */}
                                <div className="px-4 pb-4 bg-white">
                                    <button
                                        onClick={() => setConfirmarId(p._id)}
                                        disabled={isMarcando}
                                        className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-base py-3.5 rounded-xl transition active:scale-[0.98]"
                                    >
                                        <CheckCircle size={20} />
                                        {isMarcando ? "Marcando..." : "Marcar como listo"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal doble confirmación */}
            {confirmarId && pedidoAConfirmar && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                    onClick={() => setConfirmarId(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-black" />
                                <p className="font-black text-gray-900">Confirmar</p>
                            </div>
                            <button onClick={() => setConfirmarId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-base font-semibold text-gray-900">
                                ¿Marcar como listo?
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {pedidoAConfirmar.mesa ? `Mesa ${pedidoAConfirmar.mesa}` : pedidoAConfirmar.nombreComanda || "Comanda"} — esto avisará al mozo.
                            </p>
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button
                                onClick={() => setConfirmarId(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarListo}
                                className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-800 transition">
                                Sí, listo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
