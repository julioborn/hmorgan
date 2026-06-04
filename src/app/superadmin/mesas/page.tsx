"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Move, X, Circle, Square, Users, MapPin } from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = {
    _id: string;
    nombre: string;
    activa: boolean;
    x: number;
    y: number;
    forma: "rect" | "round";
    capacidad: number;
};

export default function SuperAdminMesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [ocupadas, setOcupadas] = useState<Set<string>>(new Set());
    const [tab, setTab] = useState<"plano" | "gestion">("plano");
    const [editMode, setEditMode] = useState(false);
    const [nuevaMesa, setNuevaMesa] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [configModal, setConfigModal] = useState<Mesa | null>(null);
    const [configForm, setConfigForm] = useState<{ forma: "rect" | "round"; capacidad: number; activa: boolean }>({
        forma: "rect", capacidad: 4, activa: true,
    });

    const canvasRef = useRef<HTMLDivElement>(null);
    const mesasRef = useRef<Mesa[]>([]);
    const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
    const didDrag = useRef(false);

    useEffect(() => { mesasRef.current = mesas; }, [mesas]);

    const fetchMesas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/mesas?all=true", { credentials: "include", cache: "no-store" });
            const data = await res.json();
            setMesas(Array.isArray(data)
                ? data.sort((a: Mesa, b: Mesa) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
                : []);
        } catch { setMesas([]); }
        finally { setLoading(false); }
    }, []);

    const fetchOcupadas = useCallback(async () => {
        try {
            const res = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" });
            const data = await res.json();
            if (Array.isArray(data))
                setOcupadas(new Set(data.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));
        } catch { }
    }, []);

    useEffect(() => {
        fetchMesas();
        fetchOcupadas();
        const interval = setInterval(fetchOcupadas, 15000);
        return () => clearInterval(interval);
    }, [fetchMesas, fetchOcupadas]);

    // Drag system
    useEffect(() => {
        if (!editMode) return;

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current || !canvasRef.current) return;
            if (e.cancelable) e.preventDefault();
            didDrag.current = true;
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
            const rect = canvasRef.current.getBoundingClientRect();
            const dx = (clientX - dragState.current.startX) / rect.width * 100;
            const dy = (clientY - dragState.current.startY) / rect.height * 100;
            const newX = Math.max(3, Math.min(96, dragState.current.origX + dx));
            const newY = Math.max(3, Math.min(94, dragState.current.origY + dy));
            setMesas(prev => prev.map(m => m._id === dragState.current!.id ? { ...m, x: newX, y: newY } : m));
        };

        const onUp = async () => {
            if (!dragState.current) return;
            const id = dragState.current.id;
            const wasDrag = didDrag.current;
            dragState.current = null;
            didDrag.current = false;
            if (!wasDrag) return;
            const mesa = mesasRef.current.find(m => m._id === id);
            if (!mesa) return;
            await fetch("/api/admin/mesas", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: mesa._id, x: mesa.x, y: mesa.y }),
            });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchend", onUp);
        };
    }, [editMode]);

    function startDrag(e: React.MouseEvent | React.TouchEvent, mesa: Mesa) {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation();
        didDrag.current = false;
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        dragState.current = { id: mesa._id, startX: clientX, startY: clientY, origX: mesa.x ?? 10, origY: mesa.y ?? 10 };
    }

    function handleTableClick(mesa: Mesa) {
        if (!editMode || didDrag.current) return;
        setConfigModal(mesa);
        setConfigForm({ forma: mesa.forma ?? "rect", capacidad: mesa.capacidad ?? 4, activa: mesa.activa });
    }

    async function saveConfig() {
        if (!configModal) return;
        const res = await fetch("/api/admin/mesas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: configModal._id, ...configForm }),
        });
        if (res.ok) {
            const updated = await res.json();
            setMesas(prev => prev.map(m => m._id === updated._id ? updated : m));
            setConfigModal(null);
        }
    }

    async function agregarMesa() {
        if (!nuevaMesa.trim()) return;
        setGuardando(true);
        setError("");
        try {
            const count = mesas.length;
            const x = 8 + (count % 8) * 11;
            const y = 8 + Math.floor(count / 8) * 16;
            const res = await fetch("/api/admin/mesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ nombre: nuevaMesa.trim(), x, y }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || "Error al crear mesa");
                return;
            }
            setNuevaMesa("");
            await fetchMesas();
        } finally { setGuardando(false); }
    }

    async function eliminarMesa(id: string) {
        if (!confirm("¿Eliminar esta mesa?")) return;
        await fetch(`/api/admin/mesas?id=${id}`, { method: "DELETE", credentials: "include" });
        setMesas(prev => prev.filter(m => m._id !== id));
    }

    async function toggleActiva(id: string) {
        const res = await fetch("/api/admin/mesas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            const updated = await res.json();
            setMesas(prev =>
                prev.map(m => m._id === updated._id ? updated : m)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
            );
        }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    const mesasActivas = mesas.filter(m => m.activa).length;
    const ocupadasCount = mesas.filter(m => ocupadas.has(m.nombre)).length;

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Page header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-gray-500 shrink-0" />
                        <div>
                            <h1 className="font-black text-gray-900">Plano del salón</h1>
                            <p className="text-xs text-gray-400">
                                {mesasActivas} activas · <span className="text-red-500 font-semibold">{ocupadasCount} ocupadas</span>
                            </p>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                        {(["plano", "gestion"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                {t === "plano" ? "Plano" : "Gestión"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PLANO */}
            {tab === "plano" && (
                <div className="max-w-4xl mx-auto px-4 pt-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-3">
                        {/* Leyenda */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-emerald-500 inline-block shadow-sm" /> Libre
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-red-500 inline-block shadow-sm" /> Ocupada
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Inactiva
                            </span>
                        </div>
                        <button onClick={() => setEditMode(e => !e)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${editMode ? "bg-red-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                            <Move size={13} />
                            {editMode ? "Salir del editor" : "Editar posiciones"}
                        </button>
                    </div>

                    {editMode && (
                        <p className="text-xs text-center text-gray-400 bg-red-50 border border-red-100 rounded-xl py-2 mb-3">
                            Arrastrá las mesas para reposicionarlas · Tocá una para configurarla
                        </p>
                    )}

                    {/* Canvas */}
                    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white"
                        style={{ paddingBottom: "66%" }}>
                        <div
                            ref={canvasRef}
                            className="absolute inset-0"
                            style={{
                                backgroundColor: "#f9f5ef",
                                backgroundImage:
                                    "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                                backgroundSize: "32px 32px",
                            }}
                        >
                            {/* Barra */}
                            <div className="absolute bottom-[3%] right-[2%] w-[20%] h-[9%] bg-amber-800/20 border-2 border-amber-700/30 rounded-xl flex items-center justify-center">
                                <span className="text-amber-800 text-[10px] sm:text-xs font-bold tracking-widest uppercase">Barra</span>
                            </div>

                            {/* Mesas */}
                            {mesas.map(mesa => {
                                const isOcupada = mesa.activa && ocupadas.has(mesa.nombre);
                                const isRound = mesa.forma === "round";
                                const bg = !mesa.activa
                                    ? "bg-gray-200 border-gray-300 text-gray-400"
                                    : isOcupada
                                        ? "bg-red-500 border-red-600 text-white shadow-md shadow-red-200"
                                        : "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-100";

                                return (
                                    <div
                                        key={mesa._id}
                                        style={{
                                            left: `${mesa.x ?? 10}%`,
                                            top: `${mesa.y ?? 10}%`,
                                            transform: "translate(-50%, -50%)",
                                            cursor: editMode ? "grab" : "default",
                                            touchAction: editMode ? "none" : "auto",
                                            userSelect: "none",
                                            width: isRound ? "min(7.5%, 48px)" : "min(9%, 56px)",
                                            height: isRound ? "min(7.5%, 48px)" : "min(6.5%, 42px)",
                                            minWidth: isRound ? "34px" : "38px",
                                            minHeight: isRound ? "34px" : "30px",
                                        }}
                                        className={`absolute flex flex-col items-center justify-center border-2 select-none transition-transform
                                            ${isRound ? "rounded-full" : "rounded-xl"}
                                            ${bg}
                                            ${editMode ? "hover:scale-110" : ""}
                                        `}
                                        onMouseDown={editMode ? (e) => startDrag(e, mesa) : undefined}
                                        onTouchStart={editMode ? (e) => startDrag(e, mesa) : undefined}
                                        onClick={() => handleTableClick(mesa)}
                                    >
                                        <span className="text-[9px] sm:text-[11px] font-black leading-none">{mesa.nombre}</span>
                                        {mesa.capacidad > 0 && (
                                            <span className="text-[6px] sm:text-[8px] opacity-75 leading-none mt-0.5">{mesa.capacidad}p</span>
                                        )}
                                    </div>
                                );
                            })}

                            {mesas.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-gray-400 text-sm text-center px-4">
                                        Sin mesas. Agregá en la pestaña Gestión.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-xs text-center text-gray-400 mt-2 mb-6">
                        {mesas.length} mesa{mesas.length !== 1 ? "s" : ""} en el plano
                    </p>
                </div>
            )}

            {/* GESTIÓN */}
            {tab === "gestion" && (
                <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <h2 className="font-bold text-gray-800 mb-3 text-sm">Agregar mesa</h2>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Nombre o número" value={nuevaMesa}
                                onChange={e => setNuevaMesa(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && agregarMesa()}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            <button onClick={agregarMesa} disabled={guardando || !nuevaMesa.trim()}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-semibold transition text-sm shrink-0">
                                <Plus className="w-4 h-4" /> Agregar
                            </button>
                        </div>
                        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">
                                {mesas.length} {mesas.length === 1 ? "mesa" : "mesas"} registradas
                            </span>
                            <button onClick={fetchMesas} className="text-xs text-gray-400 hover:text-gray-600">↻ actualizar</button>
                        </div>

                        {mesas.length === 0 ? (
                            <p className="text-center py-12 text-gray-400 text-sm">No hay mesas registradas.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {mesas.map(m => {
                                    const isOcupada = m.activa && ocupadas.has(m.nombre);
                                    return (
                                        <li key={m._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className={`w-9 h-9 flex items-center justify-center text-xs font-black shrink-0 border-2
                                                ${m.forma === "round" ? "rounded-full" : "rounded-lg"}
                                                ${!m.activa ? "bg-gray-100 border-gray-200 text-gray-400"
                                                    : isOcupada ? "bg-red-500 border-red-600 text-white"
                                                    : "bg-emerald-500 border-emerald-600 text-white"}`}>
                                                {m.nombre}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${!m.activa ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                                    Mesa {m.nombre}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {m.forma === "round" ? "Redonda" : "Rectangular"} · {m.capacidad}p
                                                    {isOcupada && <span className="text-red-500 font-semibold"> · ocupada</span>}
                                                    {!m.activa && <span className="text-gray-400"> · inactiva</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => { setConfigModal(m); setConfigForm({ forma: m.forma ?? "rect", capacidad: m.capacidad ?? 4, activa: m.activa }); }}
                                                    className="p-2 rounded-lg hover:bg-gray-100 transition" title="Configurar">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                </button>
                                                <button onClick={() => toggleActiva(m._id)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                                                    {m.activa ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                                </button>
                                                <button onClick={() => eliminarMesa(m._id)} className="p-2 rounded-lg hover:bg-red-50 transition text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Config Modal */}
            {configModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Mesa {configModal.nombre}</h2>
                            <button onClick={() => setConfigModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Forma</label>
                                <div className="flex gap-2">
                                    {(["rect", "round"] as const).map(f => (
                                        <button key={f} onClick={() => setConfigForm(p => ({ ...p, forma: f }))}
                                            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${configForm.forma === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {f === "rect" ? <><Square size={14} /> Rectangular</> : <><Circle size={14} /> Redonda</>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Capacidad</label>
                                <div className="flex gap-2">
                                    {[2, 4, 6, 8, 10].map(n => (
                                        <button key={n} onClick={() => setConfigForm(p => ({ ...p, capacidad: n }))}
                                            className={`flex-1 py-2 rounded-xl border text-sm font-bold transition ${configForm.capacidad === n ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                <span className="text-sm font-semibold text-gray-700">Mesa activa</span>
                                <button onClick={() => setConfigForm(p => ({ ...p, activa: !p.activa }))}>
                                    {configForm.activa
                                        ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                                        : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setConfigModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={saveConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
