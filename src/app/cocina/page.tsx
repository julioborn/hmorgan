"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ChefHat, LogOut, Clock } from "lucide-react";

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
                }, 4000);
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

    async function marcarListo(id: string) {
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

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ChefHat size={22} className="text-amber-400" />
                    <span className="text-lg font-black tracking-tight">Cocina</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">
                        {pedidos.length} comanda{pedidos.length !== 1 ? "s" : ""}
                    </span>
                    <button onClick={logout} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-zinc-500 text-sm">
                    Cargando...
                </div>
            ) : pedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3 text-zinc-600">
                    <ChefHat size={52} className="opacity-30" />
                    <p className="text-lg font-semibold">Sin comandas pendientes</p>
                    <p className="text-sm">Actualizando cada 5 segundos...</p>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                    {pedidos.map(p => {
                        const comida = foodItems(p.items);
                        const mesaLabel = p.mesa
                            ? `Mesa ${p.mesa}`
                            : p.nombreComanda
                            ? p.nombreComanda
                            : "Sin mesa";
                        const mozo = p.userId ? `${p.userId.nombre} ${p.userId.apellido}` : null;
                        const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        const isNuevo = nuevosIds.has(p._id);
                        const isMarcando = marcando === p._id;

                        return (
                            <div
                                key={p._id}
                                className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
                                    isNuevo
                                        ? "border-amber-400 bg-zinc-900 shadow-lg shadow-amber-400/20"
                                        : "border-zinc-800 bg-zinc-900"
                                }`}
                            >
                                {/* Card header */}
                                <div className={`px-4 py-3 flex items-center justify-between border-b border-zinc-800 ${isNuevo ? "bg-amber-400/10" : ""}`}>
                                    <div className="flex items-center gap-3">
                                        {isNuevo && (
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400 text-black px-2 py-0.5 rounded-full animate-pulse">
                                                Nuevo
                                            </span>
                                        )}
                                        <span className="text-xl font-black text-white">{mesaLabel}</span>
                                        {mozo && (
                                            <span className="text-sm text-zinc-400">{mozo}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-500">
                                        <Clock size={13} />
                                        <span className="text-sm">{hora}</span>
                                    </div>
                                </div>

                                {/* Food items */}
                                <div className="px-4 py-3 space-y-2">
                                    {comida.map((it, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <span className="text-2xl font-black text-white min-w-[2rem] text-center leading-tight">
                                                {it.cantidad}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-lg font-bold text-white leading-tight">
                                                    {it.menuItemId?.nombre || "Ítem"}
                                                </p>
                                                {it.nota && (
                                                    <p className="text-sm text-amber-300 mt-0.5 italic">
                                                        ✏ {it.nota}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Listo button */}
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => marcarListo(p._id)}
                                        disabled={isMarcando}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-black text-lg py-4 rounded-xl transition active:scale-[0.98]"
                                    >
                                        <CheckCircle size={22} />
                                        {isMarcando ? "Marcando..." : "LISTO"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
