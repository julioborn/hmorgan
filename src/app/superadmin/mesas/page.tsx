"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    Plus, Trash2, ToggleLeft, ToggleRight, Move, X,
    Circle, Square, Users, MapPin, Minus, DoorOpen,
    MoveHorizontal, MoveVertical, LayoutTemplate,
} from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = {
    _id: string; nombre: string; activa: boolean;
    x: number; y: number; forma: "rect" | "round" | "oval"; capacidad: number;
};

type SalonEl = {
    _id: string; tipo: "puerta" | "linea_h" | "linea_v" | "zona";
    label: string; x: number; y: number; ancho: number; alto: number; color: string;
};

const ELEMENT_DEFAULTS: Record<SalonEl["tipo"], Partial<SalonEl>> = {
    puerta:   { label: "PUERTA",  ancho: 6,  alto: 4,  color: "#fef3c7" },
    linea_h:  { label: "",        ancho: 20, alto: 1,  color: "#374151" },
    linea_v:  { label: "",        ancho: 1,  alto: 20, color: "#374151" },
    zona:     { label: "Zona",    ancho: 18, alto: 14, color: "#dbeafe" },
};

const ELEMENT_ICONS: Record<SalonEl["tipo"], React.ElementType> = {
    puerta: DoorOpen, linea_h: MoveHorizontal, linea_v: MoveVertical, zona: LayoutTemplate,
};
const ELEMENT_LABELS: Record<SalonEl["tipo"], string> = {
    puerta: "Puerta", linea_h: "Línea H", linea_v: "Línea V", zona: "Zona",
};

export default function SuperAdminMesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [elements, setElements] = useState<SalonEl[]>([]);
    const [loading, setLoading] = useState(true);
    const [ocupadas, setOcupadas] = useState<Set<string>>(new Set());
    const [tab, setTab] = useState<"plano" | "gestion">("plano");
    const [editMode, setEditMode] = useState(false);
    const [nuevaMesa, setNuevaMesa] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    // config modals
    const [mesaModal, setMesaModal] = useState<Mesa | null>(null);
    const [mesaForm, setMesaForm] = useState<{ forma: Mesa["forma"]; capacidad: number; activa: boolean }>({ forma: "rect", capacidad: 4, activa: true });
    const [elModal, setElModal] = useState<SalonEl | null>(null);
    const [elForm, setElForm] = useState<Partial<SalonEl>>({});

    const canvasRef = useRef<HTMLDivElement>(null);
    const mesasRef = useRef<Mesa[]>([]);
    const elementsRef = useRef<SalonEl[]>([]);
    const dragState = useRef<{
        type: "mesa" | "element";
        id: string; startX: number; startY: number; origX: number; origY: number;
    } | null>(null);
    const didDrag = useRef(false);

    useEffect(() => { mesasRef.current = mesas; }, [mesas]);
    useEffect(() => { elementsRef.current = elements; }, [elements]);

    const fetchMesas = useCallback(async () => {
        const res = await fetch("/api/admin/mesas?all=true", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        setMesas(Array.isArray(data) ? data.sort((a: Mesa, b: Mesa) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })) : []);
    }, []);

    const fetchElements = useCallback(async () => {
        const res = await fetch("/api/superadmin/salon", { credentials: "include" });
        const data = await res.json();
        setElements(Array.isArray(data) ? data : []);
    }, []);

    const fetchOcupadas = useCallback(async () => {
        const res = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) setOcupadas(new Set(data.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));
    }, []);

    useEffect(() => {
        Promise.all([fetchMesas(), fetchElements(), fetchOcupadas()]).finally(() => setLoading(false));
        const iv = setInterval(fetchOcupadas, 15000);
        return () => clearInterval(iv);
    }, [fetchMesas, fetchElements, fetchOcupadas]);

    // ── Drag system ──────────────────────────────────────────────
    useEffect(() => {
        if (!editMode) return;
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current || !canvasRef.current) return;
            if (e.cancelable) e.preventDefault();
            didDrag.current = true;
            const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
            const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
            const rect = canvasRef.current.getBoundingClientRect();
            const dx = (cx - dragState.current.startX) / rect.width * 100;
            const dy = (cy - dragState.current.startY) / rect.height * 100;
            const nx = Math.max(1, Math.min(97, dragState.current.origX + dx));
            const ny = Math.max(1, Math.min(96, dragState.current.origY + dy));
            if (dragState.current.type === "mesa") {
                setMesas(prev => prev.map(m => m._id === dragState.current!.id ? { ...m, x: nx, y: ny } : m));
            } else {
                setElements(prev => prev.map(el => el._id === dragState.current!.id ? { ...el, x: nx, y: ny } : el));
            }
        };
        const onUp = async () => {
            if (!dragState.current) return;
            const { type, id } = dragState.current;
            const wasDrag = didDrag.current;
            dragState.current = null;
            didDrag.current = false;
            if (!wasDrag) return;
            if (type === "mesa") {
                const m = mesasRef.current.find(x => x._id === id);
                if (m) await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: m._id, x: m.x, y: m.y }) });
            } else {
                const el = elementsRef.current.find(x => x._id === id);
                if (el) await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: el._id, x: el.x, y: el.y }) });
            }
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

    function startDrag(e: React.MouseEvent | React.TouchEvent, type: "mesa" | "element", id: string, origX: number, origY: number) {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        didDrag.current = false;
        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
        dragState.current = { type, id, startX: cx, startY: cy, origX, origY };
    }

    // ── Mesa config ──────────────────────────────────────────────
    function openMesaConfig(m: Mesa) {
        if (!editMode || didDrag.current) return;
        setMesaModal(m);
        setMesaForm({ forma: m.forma ?? "rect", capacidad: m.capacidad ?? 4, activa: m.activa });
    }
    async function saveMesaConfig() {
        if (!mesaModal) return;
        const res = await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: mesaModal._id, ...mesaForm }) });
        if (res.ok) { const u = await res.json(); setMesas(p => p.map(m => m._id === u._id ? u : m)); setMesaModal(null); }
    }

    // ── Element config ───────────────────────────────────────────
    function openElConfig(el: SalonEl) {
        if (!editMode || didDrag.current) return;
        setElModal(el); setElForm({ label: el.label, ancho: el.ancho, alto: el.alto, color: el.color });
    }
    async function saveElConfig() {
        if (!elModal) return;
        const res = await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: elModal._id, ...elForm }) });
        if (res.ok) { const u = await res.json(); setElements(p => p.map(e => e._id === u._id ? u : e)); setElModal(null); }
    }
    async function deleteEl(id: string) {
        await fetch(`/api/superadmin/salon?id=${id}`, { method: "DELETE", credentials: "include" });
        setElements(p => p.filter(e => e._id !== id));
        setElModal(null);
    }

    async function addElement(tipo: SalonEl["tipo"]) {
        const def = ELEMENT_DEFAULTS[tipo];
        const res = await fetch("/api/superadmin/salon", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tipo, x: 45, y: 45, ...def }) });
        if (res.ok) { const el = await res.json(); setElements(p => [...p, el]); }
    }

    // ── Mesa CRUD ────────────────────────────────────────────────
    async function agregarMesa() {
        if (!nuevaMesa.trim()) return;
        setGuardando(true); setError("");
        try {
            const count = mesas.length;
            const x = 8 + (count % 8) * 11, y = 8 + Math.floor(count / 8) * 16;
            const res = await fetch("/api/admin/mesas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ nombre: nuevaMesa.trim(), x, y }) });
            if (!res.ok) { setError((await res.json().catch(() => ({}))).message || "Error"); return; }
            setNuevaMesa(""); await fetchMesas();
        } finally { setGuardando(false); }
    }
    async function eliminarMesa(id: string) {
        if (!confirm("¿Eliminar esta mesa?")) return;
        await fetch(`/api/admin/mesas?id=${id}`, { method: "DELETE", credentials: "include" });
        setMesas(p => p.filter(m => m._id !== id));
    }
    async function toggleActiva(id: string) {
        const res = await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
        if (res.ok) { const u = await res.json(); setMesas(p => p.map(m => m._id === u._id ? u : m).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))); }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    const mesasActivas = mesas.filter(m => m.activa).length;
    const ocupadasCount = mesas.filter(m => ocupadas.has(m.nombre)).length;

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-gray-500 shrink-0" />
                        <div>
                            <h1 className="font-black text-gray-900">Plano del salón</h1>
                            <p className="text-xs text-gray-400">
                                {mesasActivas} activas · <span className="text-red-500 font-semibold">{ocupadasCount} ocupadas</span>
                            </p>
                        </div>
                    </div>
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

            {/* ── PLANO ─────────────────────────────────────────── */}
            {tab === "plano" && (
                <div className="max-w-5xl mx-auto px-3 pt-3">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Libre</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Ocupada</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />Inactiva</span>
                        </div>
                        <button onClick={() => setEditMode(e => !e)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${editMode ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                            <Move size={13} />{editMode ? "Salir del editor" : "Editar posiciones"}
                        </button>
                    </div>

                    {/* Add element toolbar (edit mode only) */}
                    {editMode && (
                        <div className="flex items-center gap-2 mb-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex-wrap">
                            <span className="text-xs font-semibold text-amber-700 mr-1">Agregar:</span>
                            {(["puerta", "linea_h", "linea_v", "zona"] as const).map(tipo => {
                                const Icon = ELEMENT_ICONS[tipo];
                                return (
                                    <button key={tipo} onClick={() => addElement(tipo)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg text-xs font-semibold text-gray-700 transition">
                                        <Icon size={12} />{ELEMENT_LABELS[tipo]}
                                    </button>
                                );
                            })}
                            <span className="text-xs text-gray-400 ml-1">· Arrastrá para mover · Tocá para configurar</span>
                        </div>
                    )}

                    {/* Canvas */}
                    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white" style={{ paddingBottom: "66%" }}>
                        <div ref={canvasRef} className="absolute inset-0" style={{
                            backgroundColor: "#f9f5ef",
                            backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}>
                            {/* Barra */}
                            <div className="absolute border-2 border-amber-700/30 bg-amber-800/15 rounded-xl flex items-center justify-center"
                                style={{ right: "2%", bottom: "3%", width: "20%", height: "9%" }}>
                                <span className="text-amber-800 text-[9px] sm:text-[11px] font-bold tracking-widest uppercase">Barra</span>
                            </div>

                            {/* Salon elements */}
                            {elements.map(el => {
                                const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                                const isZona = el.tipo === "zona";
                                const isPuerta = el.tipo === "puerta";

                                const style: React.CSSProperties = {
                                    position: "absolute",
                                    left: `${el.x}%`,
                                    top: `${el.y}%`,
                                    cursor: editMode ? "grab" : "default",
                                    userSelect: "none",
                                    touchAction: editMode ? "none" : "auto",
                                };

                                if (isLine) {
                                    style.width = el.tipo === "linea_h" ? `${el.ancho}%` : "3px";
                                    style.height = el.tipo === "linea_v" ? `${el.alto}%` : "3px";
                                    style.backgroundColor = el.color;
                                    style.borderRadius = "2px";
                                    style.transform = "translate(0, -50%)";
                                    if (el.tipo === "linea_v") style.transform = "translate(-50%, 0)";
                                } else {
                                    style.width = `${el.ancho}%`;
                                    style.height = `${el.alto}%`;
                                    style.transform = "translate(-50%, -50%)";
                                    style.minWidth = isPuerta ? "36px" : "48px";
                                    style.minHeight = "18px";
                                    style.backgroundColor = el.color;
                                    style.border = isZona ? `2px dashed ${el.color === "#dbeafe" ? "#3b82f6" : "#6b7280"}80` : `2px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}80`;
                                    style.borderRadius = "6px";
                                    style.display = "flex";
                                    style.alignItems = "center";
                                    style.justifyContent = "center";
                                }

                                return (
                                    <div key={el._id} style={style}
                                        onMouseDown={editMode ? (e) => startDrag(e, "element", el._id, el.x, el.y) : undefined}
                                        onTouchStart={editMode ? (e) => startDrag(e, "element", el._id, el.x, el.y) : undefined}
                                        onClick={() => openElConfig(el)}
                                    >
                                        {!isLine && el.label && (
                                            <span className="text-[7px] sm:text-[9px] font-bold text-gray-700 px-1 text-center leading-tight">
                                                {el.label}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Mesas */}
                            {mesas.map(mesa => {
                                const isOcupada = mesa.activa && ocupadas.has(mesa.nombre);
                                const isRound = mesa.forma === "round";
                                const isOval = mesa.forma === "oval";
                                const bg = !mesa.activa ? "bg-gray-300 border-gray-400 text-gray-500"
                                    : isOcupada ? "bg-red-500 border-red-600 text-white shadow-md"
                                    : "bg-emerald-500 border-emerald-600 text-white shadow-sm";

                                const sizeStyle: React.CSSProperties = isOval
                                    ? { width: "min(12%, 70px)", height: "min(5.5%, 38px)", minWidth: "46px", minHeight: "26px" }
                                    : isRound
                                    ? { width: "min(6.5%, 42px)", height: "min(6.5%, 42px)", minWidth: "30px", minHeight: "30px" }
                                    : { width: "min(8%, 50px)", height: "min(5.5%, 38px)", minWidth: "34px", minHeight: "26px" };

                                return (
                                    <div key={mesa._id} style={{
                                        position: "absolute",
                                        left: `${mesa.x ?? 10}%`,
                                        top: `${mesa.y ?? 10}%`,
                                        transform: "translate(-50%, -50%)",
                                        cursor: editMode ? "grab" : "default",
                                        touchAction: editMode ? "none" : "auto",
                                        userSelect: "none",
                                        ...sizeStyle,
                                    }}
                                        className={`flex flex-col items-center justify-center border-2 select-none transition-transform
                                            ${isRound ? "rounded-full" : isOval ? "rounded-full" : "rounded-xl"}
                                            ${bg} ${editMode ? "hover:scale-110" : ""}`}
                                        onMouseDown={editMode ? (e) => startDrag(e, "mesa", mesa._id, mesa.x ?? 10, mesa.y ?? 10) : undefined}
                                        onTouchStart={editMode ? (e) => startDrag(e, "mesa", mesa._id, mesa.x ?? 10, mesa.y ?? 10) : undefined}
                                        onClick={() => openMesaConfig(mesa)}
                                    >
                                        <span className="text-[8px] sm:text-[10px] font-black leading-none">{mesa.nombre}</span>
                                        {mesa.capacidad > 0 && !isRound && (
                                            <span className="text-[6px] sm:text-[8px] opacity-75 leading-none mt-0.5">{mesa.capacidad}p</span>
                                        )}
                                    </div>
                                );
                            })}

                            {mesas.length === 0 && elements.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-gray-400 text-sm text-center px-4">
                                        Sin mesas. Ejecutá el script o agregalas en Gestión.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2 mb-4">{mesas.length} mesas · {elements.length} elementos</p>
                </div>
            )}

            {/* ── GESTIÓN ───────────────────────────────────────── */}
            {tab === "gestion" && (
                <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <h2 className="font-bold text-gray-800 mb-3 text-sm">Agregar mesa</h2>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Número o nombre" value={nuevaMesa}
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
                            <span className="text-sm font-semibold text-gray-700">{mesas.length} mesas registradas</span>
                            <button onClick={fetchMesas} className="text-xs text-gray-400 hover:text-gray-600">↻</button>
                        </div>
                        {mesas.length === 0 ? (
                            <p className="text-center py-10 text-gray-400 text-sm">No hay mesas.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {mesas.map(m => {
                                    const isOcupada = m.activa && ocupadas.has(m.nombre);
                                    return (
                                        <li key={m._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className={`w-9 h-9 flex items-center justify-center text-[10px] font-black shrink-0 border-2
                                                ${m.forma === "round" ? "rounded-full" : m.forma === "oval" ? "rounded-full" : "rounded-lg"}
                                                ${!m.activa ? "bg-gray-100 border-gray-200 text-gray-400" : isOcupada ? "bg-red-500 border-red-600 text-white" : "bg-emerald-500 border-emerald-600 text-white"}`}>
                                                {m.nombre}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${!m.activa ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                                    Mesa {m.nombre}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {m.forma === "round" ? "Redonda" : m.forma === "oval" ? "Ovalada" : "Rectangular"} · {m.capacidad}p
                                                    {isOcupada && <span className="text-red-500 font-semibold"> · ocupada</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => { setMesaModal(m); setMesaForm({ forma: m.forma ?? "rect", capacidad: m.capacidad ?? 4, activa: m.activa }); }}
                                                    className="p-2 rounded-lg hover:bg-gray-100 transition">
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

            {/* ── Modal config mesa ─────────────────────────────── */}
            {mesaModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Mesa {mesaModal.nombre}</h2>
                            <button onClick={() => setMesaModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Forma</label>
                                <div className="flex gap-2">
                                    {(["rect", "round", "oval"] as const).map(f => (
                                        <button key={f} onClick={() => setMesaForm(p => ({ ...p, forma: f }))}
                                            className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition ${mesaForm.forma === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {f === "rect" ? <><Square size={12} />Rect</> : f === "round" ? <><Circle size={12} />Redonda</> : <>⬭ Oval</>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Capacidad</label>
                                <div className="flex gap-2">
                                    {[1, 2, 4, 6, 8, 10].map(n => (
                                        <button key={n} onClick={() => setMesaForm(p => ({ ...p, capacidad: n }))}
                                            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition ${mesaForm.capacidad === n ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                <span className="text-sm font-semibold text-gray-700">Mesa activa</span>
                                <button onClick={() => setMesaForm(p => ({ ...p, activa: !p.activa }))}>
                                    {mesaForm.activa ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setMesaModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={saveMesaConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal config elemento ────────────────────────── */}
            {elModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">{ELEMENT_LABELS[elModal.tipo]}</h2>
                            <button onClick={() => setElModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {elModal.tipo !== "linea_h" && elModal.tipo !== "linea_v" && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Etiqueta</label>
                                    <input value={elForm.label ?? ""} onChange={e => setElForm(p => ({ ...p, label: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Ancho (%)</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setElForm(p => ({ ...p, ancho: Math.max(1, (p.ancho ?? 8) - 1) }))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Minus size={12} /></button>
                                        <span className="text-sm font-bold text-center w-8">{elForm.ancho ?? 8}</span>
                                        <button onClick={() => setElForm(p => ({ ...p, ancho: Math.min(95, (p.ancho ?? 8) + 1) }))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Plus size={12} /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Alto (%)</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setElForm(p => ({ ...p, alto: Math.max(1, (p.alto ?? 4) - 1) }))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Minus size={12} /></button>
                                        <span className="text-sm font-bold text-center w-8">{elForm.alto ?? 4}</span>
                                        <button onClick={() => setElForm(p => ({ ...p, alto: Math.min(95, (p.alto ?? 4) + 1) }))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Plus size={12} /></button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {["#fef3c7", "#fed7aa", "#dbeafe", "#dcfce7", "#f3e8ff", "#374151", "#9ca3af", "#ef4444"].map(c => (
                                        <button key={c} onClick={() => setElForm(p => ({ ...p, color: c }))}
                                            style={{ backgroundColor: c }}
                                            className={`w-7 h-7 rounded-lg border-2 transition ${elForm.color === c ? "border-gray-900 scale-110" : "border-transparent hover:border-gray-400"}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => deleteEl(elModal._id)} className="py-2.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition">
                                <Trash2 size={15} />
                            </button>
                            <button onClick={() => setElModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={saveElConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
