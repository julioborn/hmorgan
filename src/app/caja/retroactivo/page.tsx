"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, Search, UserPlus, X, Star, Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PedidoItem = { menuItemId?: { nombre: string; precio: number }; cantidad: number };

type Comanda = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    total: number;
    createdAt: string;
    items: PedidoItem[];
};

type Cliente = {
    _id: string;
    nombre?: string;
    apellido?: string;
    username?: string;
    telefono?: string;
    puntos: number;
};

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function ClienteBuscador({
    selected,
    onAdd,
}: {
    selected: Cliente[];
    onAdd: (c: Cliente) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (debouncedQuery.length < 2) { setResults([]); return; }
        setLoading(true);
        fetch(`/api/puntos/clientes?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" })
            .then(r => r.json())
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    const filtrados = results.filter(r => !selected.find(s => s._id === r._id));

    return (
        <div className="relative">
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white focus-within:border-black transition">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, apellido o teléfono…"
                    className="flex-1 text-sm focus:outline-none bg-transparent"
                />
                {loading && <span className="text-[10px] text-gray-400">Buscando…</span>}
            </div>
            {filtrados.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filtrados.map(c => (
                        <button
                            key={c._id}
                            onClick={() => { onAdd(c); setQuery(""); setResults([]); inputRef.current?.focus(); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0">
                                {(c.nombre?.[0] || c.username?.[0] || "?").toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                    {[c.nombre, c.apellido].filter(Boolean).join(" ") || c.username || "Sin nombre"}
                                </p>
                                {c.telefono && <p className="text-xs text-gray-400 truncate">{c.telefono}</p>}
                            </div>
                            <span className="text-xs font-bold text-amber-600 shrink-0">{c.puntos} pts</span>
                        </button>
                    ))}
                </div>
            )}
            {debouncedQuery.length >= 2 && !loading && filtrados.length === 0 && results.length === 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow px-3 py-2.5">
                    <p className="text-xs text-gray-400 text-center">Sin resultados</p>
                </div>
            )}
        </div>
    );
}

function ComandaCard({ comanda, onAcreditado }: { comanda: Comanda; onAcreditado: () => void }) {
    const [open, setOpen] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [saving, setSaving] = useState(false);

    const titulo = comanda.mesa
        ? `Mesa ${comanda.mesa}${comanda.nombreComanda ? ` · ${comanda.nombreComanda}` : ""}`
        : comanda.nombreComanda || "Comanda";

    const fecha = format(new Date(comanda.createdAt), "dd/MM/yyyy HH:mm", { locale: es });
    const totalItems = comanda.items.reduce((s, i) => s + i.cantidad, 0);

    async function otorgarPuntos() {
        if (clientes.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch("/api/puntos/retroactivo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ pedidoId: comanda._id, userIds: clientes.map(c => c._id) }),
            });
            const data = await res.json();
            if (res.ok) {
                await swalBase.fire({
                    icon: "success",
                    title: "¡Puntos acreditados!",
                    html: `<p class="text-sm">${data.acreditados.length} cliente${data.acreditados.length !== 1 ? "s" : ""} recibieron <strong>${data.puntos} puntos</strong> cada uno.</p>`,
                    timer: 2500,
                    showConfirmButton: false,
                });
                onAcreditado();
            } else {
                await swalBase.fire({ icon: "error", title: "Error", text: data.error || "No se pudo acreditar", timer: 2200, showConfirmButton: false });
            }
        } catch {
            await swalBase.fire({ icon: "error", title: "Error de conexión", timer: 2000, showConfirmButton: false });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Fila principal */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
            >
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} />{fecha}</span>
                        <span className="text-[11px] text-gray-500">{totalItems} ítem{totalItems !== 1 ? "s" : ""}</span>
                    </div>
                </div>
                <span className="font-black text-gray-900 text-sm shrink-0">{fmt(comanda.total)}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform ${open ? "rotate-180 border-black" : "border-gray-300"}`}>
                    <ChevronLeft size={10} className="rotate-[-90deg]" />
                </div>
            </button>

            {/* Panel expandido */}
            {open && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-1">
                        {comanda.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-600">
                                <span>{it.menuItemId?.nombre || "Ítem"}</span>
                                <span className="font-bold">×{it.cantidad}</span>
                            </div>
                        ))}
                    </div>

                    {/* Buscador de clientes */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Asignar clientes ({clientes.length} seleccionado{clientes.length !== 1 ? "s" : ""})
                        </p>
                        <ClienteBuscador selected={clientes} onAdd={c => setClientes(prev => [...prev, c])} />
                    </div>

                    {/* Clientes seleccionados */}
                    {clientes.length > 0 && (
                        <div className="space-y-1.5">
                            {clientes.map(c => (
                                <div key={c._id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                    <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0">
                                        {(c.nombre?.[0] || c.username?.[0] || "?").toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {[c.nombre, c.apellido].filter(Boolean).join(" ") || c.username}
                                        </p>
                                    </div>
                                    <span className="text-xs text-amber-600 font-bold shrink-0">{c.puntos} pts</span>
                                    <button onClick={() => setClientes(prev => prev.filter(x => x._id !== c._id))} className="text-gray-400 hover:text-red-500 transition p-0.5">
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Botón otorgar */}
                    <button
                        onClick={otorgarPuntos}
                        disabled={clientes.length === 0 || saving}
                        className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 transition hover:bg-gray-800 active:scale-[0.98]"
                    >
                        <Star size={15} />
                        {saving ? "Acreditando…" : `Otorgar puntos a ${clientes.length || "..."} cliente${clientes.length !== 1 ? "s" : ""}`}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function RetroactivoPage() {
    const router = useRouter();
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [loading, setLoading] = useState(true);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/puntos/retroactivo", { credentials: "include" });
            const data = await res.json();
            setComandas(Array.isArray(data) ? data : []);
        } catch {
            setComandas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    return (
        <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-extrabold text-black leading-tight">Puntos a asignar</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Asigná puntos a clientes que consumieron antes de crear su cuenta</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                </div>
            ) : comandas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                        <Check size={28} className="text-gray-400" />
                    </div>
                    <p className="font-bold text-gray-700">Todo al día</p>
                    <p className="text-sm text-gray-400 max-w-xs">No hay comandas de los últimos 30 días con puntos pendientes de asignar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{comandas.length} comanda{comandas.length !== 1 ? "s" : ""} pendiente{comandas.length !== 1 ? "s" : ""}</p>
                    {comandas.map(c => (
                        <ComandaCard
                            key={c._id}
                            comanda={c}
                            onAcreditado={cargar}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
