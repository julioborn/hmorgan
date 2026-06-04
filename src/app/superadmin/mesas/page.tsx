"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    Plus, Trash2, ToggleLeft, ToggleRight, Move, X,
    Circle, Square, Users, MapPin, Minus,
    DoorOpen, MoveHorizontal, MoveVertical, LayoutTemplate, UtensilsCrossed,
} from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = {
    _id: string; nombre: string; activa: boolean;
    x: number; y: number; forma: "rect" | "round" | "oval"; capacidad: number;
};
type SalonEl = {
    _id: string; tipo: "puerta" | "linea_h" | "linea_v" | "zona" | "barra";
    label: string; x: number; y: number; ancho: number; alto: number; color: string;
};

const EL_DEFAULTS: Record<SalonEl["tipo"], Partial<SalonEl>> = {
    puerta:  { label: "PUERTA",  ancho: 6,  alto: 4,  color: "#fef3c7" },
    barra:   { label: "BARRA",   ancho: 22, alto: 9,  color: "#b45309" },
    linea_h: { label: "",        ancho: 20, alto: 1,  color: "#374151" },
    linea_v: { label: "",        ancho: 1,  alto: 20, color: "#374151" },
    zona:    { label: "Zona",    ancho: 18, alto: 14, color: "#dbeafe" },
};
const EL_ICONS: Record<SalonEl["tipo"], React.ElementType> = {
    puerta: DoorOpen, barra: UtensilsCrossed,
    linea_h: MoveHorizontal, linea_v: MoveVertical, zona: LayoutTemplate,
};
const EL_LABELS: Record<SalonEl["tipo"], string> = {
    puerta: "Puerta", barra: "Barra",
    linea_h: "Línea H", linea_v: "Línea V", zona: "Zona",
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
    const [mesaModal, setMesaModal] = useState<Mesa | null>(null);
    const [mesaForm, setMesaForm] = useState<{ forma: Mesa["forma"]; capacidad: number; activa: boolean }>({ forma: "rect", capacidad: 4, activa: true });
    const [elModal, setElModal] = useState<SalonEl | null>(null);
    const [elForm, setElForm] = useState<Partial<SalonEl>>({});

    const canvasRef = useRef<HTMLDivElement>(null);
    const mesasRef = useRef<Mesa[]>([]);
    const elementsRef = useRef<SalonEl[]>([]);
    const dragState = useRef<{
        type: "mesa" | "element"; id: string;
        startX: number; startY: number; origX: number; origY: number;
    } | null>(null);
    // Fix: track if a real drag happened so click doesn't open editor
    const movedPx = useRef(0);

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

    // ── Unified drag system ───────────────────────────────────────
    useEffect(() => {
        if (!editMode) return;

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current || !canvasRef.current) return;
            if (e.cancelable) e.preventDefault();
            const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
            const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
            const rect = canvasRef.current.getBoundingClientRect();
            const rawDx = cx - dragState.current.startX;
            const rawDy = cy - dragState.current.startY;
            movedPx.current = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
            const dx = rawDx / rect.width * 100;
            const dy = rawDy / rect.height * 100;
            const nx = Math.max(1, Math.min(97, dragState.current.origX + dx));
            const ny = Math.max(1, Math.min(96, dragState.current.origY + dy));
            if (dragState.current.type === "mesa") {
                setMesas(prev => prev.map(m => m._id === dragState.current!.id ? { ...m, x: nx, y: ny } : m));
            } else {
                setElements(prev => prev.map(el => el._id === dragState.current!.id ? { ...el, x: nx, y: ny } : el));
            }
        };

        const onUp = () => {
            if (!dragState.current) return;
            const { type, id } = dragState.current;
            const moved = movedPx.current;
            dragState.current = null;
            movedPx.current = 0;

            if (moved < 5) {
                // Tap: abrir config — todo en onUp antes de que dispare el click
                if (type === "mesa") {
                    const m = mesasRef.current.find(x => x._id === id);
                    if (m) { setMesaModal(m); setMesaForm({ forma: m.forma ?? "rect", capacidad: m.capacidad ?? 4, activa: m.activa }); }
                } else {
                    const el = elementsRef.current.find(x => x._id === id);
                    if (el) { setElModal(el); setElForm({ label: el.label, ancho: el.ancho, alto: el.alto, color: el.color }); }
                }
                return;
            }

            // Drag: guardar posición
            (async () => {
                if (type === "mesa") {
                    const m = mesasRef.current.find(x => x._id === id);
                    if (m) await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: m._id, x: m.x, y: m.y }) });
                } else {
                    const el = elementsRef.current.find(x => x._id === id);
                    if (el) await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: el._id, x: el.x, y: el.y }) });
                }
            })();
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

    function startDrag(e: React.MouseEvent | React.TouchEvent, type: "mesa" | "element", id: string, ox: number, oy: number) {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        movedPx.current = 0;
        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
        dragState.current = { type, id, startX: cx, startY: cy, origX: ox, origY: oy };
    }

    // ── Mesa config ───────────────────────────────────────────────
    async function saveMesaConfig() {
        if (!mesaModal) return;
        const res = await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: mesaModal._id, ...mesaForm }) });
        if (res.ok) { const u = await res.json(); setMesas(p => p.map(m => m._id === u._id ? u : m)); setMesaModal(null); }
    }

    // ── Element config ────────────────────────────────────────────
    async function saveElConfig() {
        if (!elModal) return;
        const res = await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: elModal._id, ...elForm }) });
        if (res.ok) { const u = await res.json(); setElements(p => p.map(e => e._id === u._id ? u : e)); setElModal(null); }
    }
    async function deleteEl(id: string) {
        await fetch(`/api/superadmin/salon?id=${id}`, { method: "DELETE", credentials: "include" });
        setElements(p => p.filter(e => e._id !== id)); setElModal(null);
    }
    async function addElement(tipo: SalonEl["tipo"]) {
        const def = EL_DEFAULTS[tipo];
        const res = await fetch("/api/superadmin/salon", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tipo, x: 48, y: 48, ...def }) });
        if (res.ok) { const el = await res.json(); setElements(p => [...p, el]); }
    }

    // ── Mesa CRUD ─────────────────────────────────────────────────
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

            {/* ── PLANO ────────────────────────────────────────── */}
            {tab === "plano" && (
                <div className="max-w-5xl mx-auto px-3 pt-3">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Libre</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Ocupada</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />Inactiva</span>
                        </div>
                        <button onClick={() => { setEditMode(e => !e); movedPx.current = 0; }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${editMode ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                            <Move size={13} />{editMode ? "Salir del editor" : "Editar posiciones"}
                        </button>
                    </div>

                    {/* Add elements toolbar */}
                    {editMode && (
                        <div className="flex items-center gap-2 mb-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex-wrap">
                            <span className="text-xs font-semibold text-amber-700 mr-1">Agregar:</span>
                            {(["puerta", "barra", "linea_h", "linea_v", "zona"] as const).map(tipo => {
                                const Icon = EL_ICONS[tipo];
                                return (
                                    <button key={tipo} onClick={() => addElement(tipo)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg text-xs font-semibold text-gray-700 transition">
                                        <Icon size={12} />{EL_LABELS[tipo]}
                                    </button>
                                );
                            })}
                            <span className="text-xs text-gray-400 ml-auto">Arrastrá para mover · Tocá para configurar</span>
                        </div>
                    )}

                    {/* Canvas */}
                    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ paddingBottom: "66%" }}>
                        <div ref={canvasRef} className="absolute inset-0" style={{
                            backgroundColor: "#f9f5ef",
                            backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
                            backgroundSize: "30px 30px",
                        }}>
                            {/* Salon elements (puertas, líneas, zonas, barra) */}
                            {elements.map(el => {
                                const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                                const isBarra = el.tipo === "barra";

                                const baseStyle: React.CSSProperties = {
                                    position: "absolute",
                                    cursor: editMode ? "grab" : "default",
                                    userSelect: "none",
                                    touchAction: editMode ? "none" : "auto",
                                    zIndex: 1,
                                };

                                let style: React.CSSProperties;
                                if (isLine) {
                                    style = {
                                        ...baseStyle,
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        width: el.tipo === "linea_h" ? `${el.ancho}%` : "3px",
                                        height: el.tipo === "linea_v" ? `${el.alto}%` : "3px",
                                        backgroundColor: el.color,
                                        borderRadius: "2px",
                                        transform: el.tipo === "linea_h" ? "translateY(-50%)" : "translateX(-50%)",
                                    };
                                } else {
                                    style = {
                                        ...baseStyle,
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        transform: "translate(-50%, -50%)",
                                        width: `${el.ancho}%`,
                                        height: `${el.alto}%`,
                                        minWidth: "40px",
                                        minHeight: "18px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: isBarra ? "8px" : "6px",
                                        backgroundColor: isBarra ? "#b45309" : el.color,
                                        border: isBarra
                                            ? "2px solid #92400e"
                                            : el.tipo === "zona"
                                                ? `2px dashed ${el.color === "#dbeafe" ? "#3b82f6" : "#6b7280"}99`
                                                : `2px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}80`,
                                    };
                                }

                                return (
                                    <div key={el._id} style={style}
                                        onMouseDown={editMode ? (e) => startDrag(e, "element", el._id, el.x, el.y) : undefined}
                                        onTouchStart={editMode ? (e) => startDrag(e, "element", el._id, el.x, el.y) : undefined}
                                    >
                                        {!isLine && (
                                            <span style={{
                                                fontSize: "clamp(7px, 1.1vw, 11px)",
                                                fontWeight: 700,
                                                color: isBarra ? "#fef3c7" : "#374151",
                                                textAlign: "center",
                                                padding: "0 4px",
                                                letterSpacing: "0.05em",
                                                lineHeight: 1.1,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
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

                                const bg = !mesa.activa
                                    ? "bg-gray-300 border-gray-400 text-gray-500"
                                    : isOcupada
                                        ? "bg-red-500 border-red-600 text-white shadow-md shadow-red-200/50"
                                        : "bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-200/60";

                                const sizeStyle: React.CSSProperties = isOval
                                    ? { width: "min(11%, 66px)", height: "min(5%, 34px)", minWidth: "40px", minHeight: "24px" }
                                    : isRound
                                    ? { width: "min(5.5%, 38px)", height: "min(5.5%, 38px)", minWidth: "26px", minHeight: "26px" }
                                    : { width: "min(7%, 46px)", height: "min(5%, 34px)", minWidth: "30px", minHeight: "22px" };

                                return (
                                    <div key={mesa._id} style={{
                                        position: "absolute",
                                        left: `${mesa.x ?? 10}%`,
                                        top: `${mesa.y ?? 10}%`,
                                        transform: "translate(-50%, -50%)",
                                        cursor: editMode ? "grab" : "default",
                                        touchAction: editMode ? "none" : "auto",
                                        userSelect: "none",
                                        zIndex: 2,
                                        ...sizeStyle,
                                    }}
                                        className={`flex flex-col items-center justify-center border-2 select-none transition-transform
                                            ${isRound || isOval ? "rounded-full" : "rounded-xl"}
                                            ${bg} ${editMode ? "hover:scale-110 active:scale-95" : ""}`}
                                        onMouseDown={editMode ? (e) => startDrag(e, "mesa", mesa._id, mesa.x ?? 10, mesa.y ?? 10) : undefined}
                                        onTouchStart={editMode ? (e) => startDrag(e, "mesa", mesa._id, mesa.x ?? 10, mesa.y ?? 10) : undefined}
                                    >
                                        <span style={{ fontSize: "clamp(7px, 1vw, 10px)", fontWeight: 900, lineHeight: 1 }}>{mesa.nombre}</span>
                                        {mesa.capacidad > 0 && !isRound && (
                                            <span style={{ fontSize: "clamp(5px, 0.8vw, 8px)", opacity: 0.75, lineHeight: 1, marginTop: "1px" }}>{mesa.capacidad}p</span>
                                        )}
                                    </div>
                                );
                            })}

                            {mesas.length === 0 && elements.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-gray-400 text-sm text-center px-6">
                                        Sin datos. Ejecutá<br />
                                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">node scripts/seed-mesas.mjs</code>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2 mb-4">{mesas.length} mesas · {elements.length} elementos</p>
                </div>
            )}

            {/* ── GESTIÓN ──────────────────────────────────────── */}
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
                            <span className="text-sm font-semibold text-gray-700">{mesas.length} mesas</span>
                            <button onClick={fetchMesas} className="text-xs text-gray-400 hover:text-gray-600">↻</button>
                        </div>
                        {mesas.length === 0 ? (
                            <p className="text-center py-10 text-gray-400 text-sm">Sin mesas.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {mesas.map(m => {
                                    const isOcupada = m.activa && ocupadas.has(m.nombre);
                                    return (
                                        <li key={m._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className={`w-9 h-9 flex items-center justify-center text-[9px] font-black shrink-0 border-2
                                                ${m.forma === "round" || m.forma === "oval" ? "rounded-full" : "rounded-lg"}
                                                ${!m.activa ? "bg-gray-100 border-gray-200 text-gray-400" : isOcupada ? "bg-red-500 border-red-600 text-white" : "bg-emerald-500 border-emerald-600 text-white"}`}>
                                                {m.nombre}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${!m.activa ? "text-gray-400 line-through" : "text-gray-900"}`}>Mesa {m.nombre}</p>
                                                <p className="text-xs text-gray-400">
                                                    {m.forma === "round" ? "Redonda" : m.forma === "oval" ? "Ovalada" : "Rectangular"} · {m.capacidad}p
                                                    {isOcupada && <span className="text-red-500 font-semibold"> · ocupada</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => { setMesaModal(m); setMesaForm({ forma: m.forma ?? "rect", capacidad: m.capacidad ?? 4, activa: m.activa }); }}
                                                    className="p-2 rounded-lg hover:bg-gray-100 transition"><Users className="w-4 h-4 text-gray-500" /></button>
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

            {/* ── Modal mesa ───────────────────────────────────── */}
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
                                            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition ${mesaForm.capacidad === n ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200"}`}>
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
                            <button onClick={() => setMesaModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={saveMesaConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal elemento ───────────────────────────────── */}
            {elModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">{EL_LABELS[elModal.tipo]}</h2>
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
                                {(["ancho", "alto"] as const).map(dim => (
                                    <div key={dim}>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{dim === "ancho" ? "Ancho (%)" : "Alto (%)"}</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setElForm(p => ({ ...p, [dim]: Math.max(1, ((p[dim] as number) ?? 8) - 1) }))}>
                                                <Minus size={14} className="text-gray-500" />
                                            </button>
                                            <span className="text-sm font-bold w-8 text-center">{(elForm[dim] as number) ?? 8}</span>
                                            <button onClick={() => setElForm(p => ({ ...p, [dim]: Math.min(95, ((p[dim] as number) ?? 8) + 1) }))}>
                                                <Plus size={14} className="text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {elModal.tipo !== "barra" && (
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
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => deleteEl(elModal._id)} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition">
                                <Trash2 size={15} />
                            </button>
                            <button onClick={() => setElModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={saveElConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
