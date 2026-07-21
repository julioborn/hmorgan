"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { swalBase } from "@/lib/swalConfig";
import { hoyArgentina, formatArgDate } from "@/lib/argentina-time";
import {
    MapPin, Check, X,
    Loader2, Phone, ChevronDown, Plus, Search, Users, Pencil,
} from "lucide-react";

type Reserva = {
    _id: string;
    userId?: { _id: string; nombre: string; apellido: string; telefono?: string } | null;
    nombreContacto?: string;
    telefonoContacto?: string;
    fecha: string;
    hora: string;
    comensales: number;
    mesaId?: { _id: string; nombre: string };
    estado: "pendiente" | "confirmada" | "cancelada";
    notas?: string;
    createdAt: string;
};
type Mesa = { _id: string; nombre: string; forma: string; activa: boolean; tipo?: string; zona?: string; capacidad?: number; x: number; y: number; ancho?: number; alto?: number; rotacion?: number };
type SalonEl = { _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string };
type ClienteResult = { _id: string; nombre: string; apellido: string; telefono?: string };

const ESTADO_BADGE: Record<string, string> = {
    pendiente:  "bg-amber-400 text-black",
    confirmada: "bg-white text-black",
    cancelada:  "bg-white/20 text-white/60",
};
const HORAS = ["19:00","19:30","20:00","20:30","21:00","21:30","22:00"];

function formatFecha(fechaStr: string) {
    return formatArgDate(fechaStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function buildWhatsApp(r: Reserva) {
    const tel = (r.userId?.telefono || r.telefonoContacto)?.replace(/\D/g, "");
    if (!tel) return null;
    const nombre = r.userId ? r.userId.nombre : (r.nombreContacto || "");
    const fecha = formatFecha(r.fecha);
    const mesaLine = r.mesaId?.nombre ? `Mesa: ${r.mesaId.nombre}` : null;
    const msg = [
        `Hola ${nombre}!`,
        ``,
        `Tu reserva en H. Morgan Bar fue confirmada:`,
        ``,
        `Fecha: ${fecha}`,
        `Hora: ${r.hora}hs`,
        `Comensales: ${r.comensales}`,
        mesaLine,
        ``,
        `Te esperamos!`,
    ].filter(l => l !== null).join("\n");
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

// ── Mini floor plan picker ────────────────────────────────────────
function FloorPlanPicker({
    mesas, elements, ocupadas, reservadasHoy, selectedId, onSelect,
}: {
    mesas: Mesa[]; elements: SalonEl[];
    ocupadas: Set<string>; reservadasHoy: Set<string>;
    selectedId: string | null;
    onSelect: (mesa: Mesa) => void;
}) {
    return (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
            <div className="absolute inset-0" style={{
                backgroundColor: "#f9f5ef",
                backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)",
                backgroundSize: "30px 30px",
            }}>
                {elements.map(el => {
                    const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                    const isBarra = el.tipo === "barra";
                    if (isLine) return (
                        <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: el.tipo === "linea_h" ? `${el.ancho}%` : "3px", height: el.tipo === "linea_v" ? `${el.alto}%` : "3px", backgroundColor: el.color, borderRadius: "2px", transform: el.tipo === "linea_h" ? "translateY(-50%)" : "translateX(-50%)" }} />
                    );
                    return (
                        <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%,-50%)", width: `${el.ancho}%`, height: `${el.alto}%`, minWidth: "32px", minHeight: "14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", backgroundColor: isBarra ? "#b45309" : el.color, border: isBarra ? "2px solid #92400e" : `1px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}60` }}>
                            {el.label && <span style={{ fontSize: "clamp(6px,0.9vw,9px)", fontWeight: 700, color: isBarra ? "#fef3c7" : "#374151", whiteSpace: "nowrap" }}>{el.label}</span>}
                        </div>
                    );
                })}

                {mesas.map(mesa => {
                    const isOcupada   = mesa.activa && ocupadas.has(mesa.nombre);
                    const isReservada = mesa.activa && reservadasHoy.has(mesa._id);
                    const isSelected  = selectedId === mesa._id;
                    const isRound     = mesa.forma === "round" || mesa.forma === "oval";
                    const isBanq      = mesa.tipo === "banqueta";
                    const rot         = mesa.rotacion ?? 0;
                    const w = mesa.ancho || (mesa.forma === "oval" ? 11 : mesa.forma === "round" ? 5.5 : 7);
                    const h = mesa.alto  || (mesa.forma === "oval" ? 5  : mesa.forma === "round" ? 5.5 : 5);

                    let bg: string;
                    if (!mesa.activa) bg = "bg-gray-200 border-gray-300 text-gray-400";
                    else if (isSelected) bg = "bg-blue-500 border-blue-600 text-white";
                    else if (isBanq) bg = "bg-amber-700 border-amber-800 text-amber-100";
                    else if (isOcupada || isReservada) bg = "bg-red-500 border-red-600 text-white";
                    else bg = "bg-emerald-500 border-emerald-600 text-white";

                    return (
                        <div key={mesa._id}
                            onClick={() => mesa.activa && onSelect(mesa)}
                            style={{ position: "absolute", left: `${mesa.x ?? 10}%`, top: `${mesa.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: mesa.activa ? "pointer" : "default", userSelect: "none", zIndex: 2 }}
                            className={`flex items-center justify-center border-2 ${bg} ${mesa.activa ? "hover:brightness-110 active:scale-95 transition-all" : ""}`}
                        >
                            <div style={{ transform: `rotate(${-rot}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "clamp(5px,0.8vw,9px)", fontWeight: 900 }}>{mesa.nombre}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Reservas management (lista + asignación de mesa) ──────────────
export default function ReservasManager({ onPendingCountChange }: { onPendingCountChange?: (n: number) => void }) {
    const [reservas, setReservas]         = useState<Reserva[]>([]);
    const [mesas, setMesas]               = useState<Mesa[]>([]);
    const [elements, setElements]         = useState<SalonEl[]>([]);
    const [ocupadas, setOcupadas]         = useState<Set<string>>(new Set());
    const [reservadasHoy, setReservadasHoy] = useState<Set<string>>(new Set());
    const [loading, setLoading]           = useState(true);
    const [tab, setTab]                   = useState<"pendiente" | "confirmada">("pendiente");
    const [saving, setSaving]             = useState<string | null>(null);

    // Mesa picker
    const [pickerReservaId, setPickerReservaId]   = useState<string | null>(null);
    const [pickerSelected, setPickerSelected]     = useState<Mesa | null>(null);

    // ── Crear reserva ──────────────────────────────────────────────
    const [crearModal, setCrearModal]     = useState(false);
    const [crearTipo, setCrearTipo]       = useState<"usuario" | "libre">("libre");
    const [crearBusqueda, setCrearBusqueda] = useState("");
    const [crearResultados, setCrearResultados] = useState<ClienteResult[]>([]);
    const [crearUsuario, setCrearUsuario] = useState<ClienteResult | null>(null);
    const [buscandoUsuario, setBuscandoUsuario] = useState(false);
    const [crearNombre, setCrearNombre]   = useState("");
    const [crearTelefono, setCrearTelefono] = useState("");
    const [crearFecha, setCrearFecha]     = useState("");
    const [crearHora, setCrearHora]       = useState("");
    const [crearComensales, setCrearComensales] = useState(2);
    const [crearNotas, setCrearNotas]     = useState("");
    const [crearSaving, setCrearSaving]   = useState(false);
    const [crearError, setCrearError]     = useState("");
    const busquedaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Editar reserva ─────────────────────────────────────────────
    const [editModal, setEditModal]         = useState<Reserva | null>(null);
    const [editNombre, setEditNombre]       = useState("");
    const [editTelefono, setEditTelefono]   = useState("");
    const [editFecha, setEditFecha]         = useState("");
    const [editHora, setEditHora]           = useState("");
    const [editComensales, setEditComensales] = useState(2);
    const [editNotas, setEditNotas]         = useState("");
    const [editSaving, setEditSaving]       = useState(false);
    const [editError, setEditError]         = useState("");

    const fetchReservas = useCallback(async () => {
        try {
            const r = await fetch("/api/reservas", { credentials: "include" });
            if (!r.ok) return;
            const d = await r.json();
            if (Array.isArray(d)) {
                setReservas(d);
                const hoy = hoyArgentina();
                setReservadasHoy(new Set(
                    d.filter((r: any) => r.estado !== "cancelada" && r.mesaId && r.fecha?.slice(0, 10) === hoy)
                     .map((r: any) => String(r.mesaId?._id || r.mesaId))
                ));
            }
        } catch { }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const [mRes, elRes] = await Promise.all([
                    fetch("/api/admin/mesas?all=true", { credentials: "include" }),
                    fetch("/api/superadmin/salon", { credentials: "include" }),
                ]);
                const [mData, elData] = await Promise.all([
                    mRes.ok ? mRes.json() : [],
                    elRes.ok ? elRes.json() : [],
                ]);
                setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa) : []);
                setElements(Array.isArray(elData) ? elData : []);

                const pData = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" }).then(r => r.json()).catch(() => []);
                if (Array.isArray(pData)) setOcupadas(new Set(pData.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));

                await fetchReservas();
            } catch { }
            finally { setLoading(false); }
        };
        init();
        const iv = setInterval(fetchReservas, 8000);
        return () => clearInterval(iv);
    }, [fetchReservas]);

    useEffect(() => {
        onPendingCountChange?.(reservas.filter(r => r.estado === "pendiente").length);
    }, [reservas, onPendingCountChange]);

    // Búsqueda de usuario con debounce
    useEffect(() => {
        if (crearTipo !== "usuario") return;
        if (busquedaRef.current) clearTimeout(busquedaRef.current);
        if (crearBusqueda.trim().length < 2) { setCrearResultados([]); return; }
        busquedaRef.current = setTimeout(async () => {
            setBuscandoUsuario(true);
            try {
                const r = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(crearBusqueda)}`, { credentials: "include" });
                const d = await r.json();
                setCrearResultados(Array.isArray(d) ? d : []);
            } finally { setBuscandoUsuario(false); }
        }, 350);
    }, [crearBusqueda, crearTipo]);

    function resetCrearForm() {
        setCrearTipo("libre");
        setCrearBusqueda(""); setCrearResultados([]); setCrearUsuario(null);
        setCrearNombre(""); setCrearTelefono("");
        setCrearFecha(""); setCrearHora("");
        setCrearComensales(2); setCrearNotas("");
        setCrearError("");
    }

    async function crearReserva() {
        setCrearError("");
        if (!crearFecha || !crearHora) { setCrearError("Fecha y hora son obligatorias"); return; }
        if (crearTipo === "usuario" && !crearUsuario) { setCrearError("Seleccioná un usuario"); return; }
        if (crearTipo === "libre" && !crearNombre.trim()) { setCrearError("El nombre es obligatorio"); return; }

        setCrearSaving(true);
        try {
            const body: Record<string, unknown> = {
                fecha: crearFecha,
                hora: crearHora,
                comensales: crearComensales,
                notas: crearNotas.trim() || undefined,
            };
            if (crearTipo === "usuario" && crearUsuario) {
                body.userId = crearUsuario._id;
            } else {
                body.nombreContacto = crearNombre.trim();
                body.telefonoContacto = crearTelefono.trim() || undefined;
            }
            const res = await fetch("/api/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (res.ok) {
                await fetchReservas();
                setCrearModal(false);
                resetCrearForm();
            } else {
                const err = await res.json();
                setCrearError(err.error || "Error al crear la reserva");
            }
        } finally { setCrearSaving(false); }
    }

    async function updateReserva(id: string, updates: Record<string, unknown>) {
        setSaving(id);
        try {
            const res = await fetch("/api/reservas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, ...updates }) });
            if (res.ok) { const updated = await res.json(); setReservas(p => p.map(r => r._id === id ? updated : r)); }
        } finally { setSaving(null); }
    }

    async function deleteReserva(id: string) {
        const r = await swalBase.fire({ title: "¿Cancelar reserva?", text: "Se notificará al cliente si tiene cuenta.", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, cancelar", cancelButtonText: "No" });
        if (!r.isConfirmed) return;
        await fetch(`/api/reservas?id=${id}`, { method: "DELETE", credentials: "include" });
        setReservas(p => p.filter(r => r._id !== id));
    }

    function openPicker(reservaId: string, currentMesaId?: string) {
        setPickerReservaId(reservaId);
        setPickerSelected(mesas.find(m => m._id === currentMesaId) ?? null);
    }

    function confirmPicker() {
        if (!pickerReservaId) return;
        updateReserva(pickerReservaId, { mesaId: pickerSelected?._id ?? null });
        setPickerReservaId(null);
        setPickerSelected(null);
    }

    function openEdit(r: Reserva) {
        setEditModal(r);
        setEditNombre(r.nombreContacto || "");
        setEditTelefono(r.telefonoContacto || r.userId?.telefono || "");
        setEditFecha(r.fecha.slice(0, 10));
        setEditHora(r.hora);
        setEditComensales(r.comensales);
        setEditNotas(r.notas || "");
        setEditError("");
    }

    async function guardarEdicion() {
        if (!editModal) return;
        if (!editFecha || !editHora) { setEditError("Fecha y hora son obligatorias"); return; }
        setEditSaving(true);
        const updates: Record<string, unknown> = {
            fecha: editFecha,
            hora: editHora,
            comensales: editComensales,
            notas: editNotas.trim() || undefined,
        };
        if (!editModal.userId) {
            updates.nombreContacto = editNombre.trim();
            updates.telefonoContacto = editTelefono.trim() || undefined;
        }
        await updateReserva(editModal._id, updates);
        setEditSaving(false);
        setEditModal(null);
    }

    const hoy = hoyArgentina();
    const filtered = reservas.filter(r => r.estado === tab && r.fecha?.slice(0, 10) >= hoy);
    const counts = {
        pendiente:  reservas.filter(r => r.estado === "pendiente" && r.fecha?.slice(0, 10) >= hoy).length,
        confirmada: reservas.filter(r => r.estado === "confirmada" && r.fecha?.slice(0, 10) >= hoy).length,
    };

    return (
        <div>
            {/* Botón nueva reserva */}
            <button
                onClick={() => { resetCrearForm(); setCrearModal(true); }}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-black text-white font-bold py-3 rounded-xl text-sm tracking-wide hover:bg-gray-800 transition">
                <Plus size={16} /> Nueva reserva
            </button>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                {(["pendiente", "confirmada"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                        {t}
                        {counts[t] > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"}`}>
                                {counts[t]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-16 text-sm">Sin reservas {tab === "pendiente" ? "pendientes" : "confirmadas"}</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const waUrl = buildWhatsApp(r);
                        const isLoading = saving === r._id;
                        const mesaAsignada = mesas.find(m => m._id === r.mesaId?._id);
                        const nombreMostrado = r.userId ? `${r.userId.nombre} ${r.userId.apellido}` : (r.nombreContacto || "Sin nombre");
                        const telefonoMostrado = r.userId?.telefono || r.telefonoContacto;
                        return (
                            <div key={r._id} className="bg-white rounded-2xl border-2 border-black shadow-sm overflow-hidden">
                                {/* Header negro */}
                                <div className="bg-black px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-white text-lg leading-tight break-words">
                                                {nombreMostrado}
                                            </p>
                                            {!r.userId && (
                                                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white/70 uppercase tracking-wide">Sin app</span>
                                            )}
                                        </div>
                                        {telefonoMostrado && (
                                            <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                                                <Phone size={10} />{telefonoMostrado}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${ESTADO_BADGE[r.estado]}`}>
                                            {r.estado}
                                        </span>
                                        {waUrl && (
                                            <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] transition active:scale-95">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16">
                                                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Detalle en fila */}
                                <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Fecha</p>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{formatArgDate(r.fecha, { day:"numeric", month:"short", year:"2-digit" })}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Horario</p>
                                        <p className="text-sm font-bold text-gray-900">{r.hora}hs</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Comensales</p>
                                        <p className="text-sm font-bold text-gray-900">{r.comensales} persona{r.comensales !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>

                                {/* Mesa asignada */}
                                {mesaAsignada && (
                                    <div className="px-5 pb-3">
                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                            <MapPin size={13} className="text-gray-500 shrink-0" />
                                            <span className="text-sm font-semibold text-gray-800">Mesa {mesaAsignada.nombre}</span>
                                            {mesaAsignada.zona && <span className="text-xs text-gray-500">· {mesaAsignada.zona}</span>}
                                            {mesaAsignada.capacidad ? <span className="text-xs text-gray-400 ml-auto">{mesaAsignada.capacidad}p</span> : null}
                                        </div>
                                    </div>
                                )}

                                {/* Notas */}
                                {r.notas && (
                                    <div className="px-5 pb-3">
                                        <div className="border-l-2 border-amber-400 pl-3 py-1">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Observaciones</p>
                                            <p className="text-xs text-gray-600">{r.notas}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {r.estado !== "cancelada" && (
                                    <div className="px-5 pb-4 flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
                                        <button onClick={() => openPicker(r._id, r.mesaId?._id)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition border border-gray-200">
                                            <MapPin size={12} />
                                            {r.mesaId?.nombre ? `Mesa ${r.mesaId.nombre}` : "Asignar mesa"}
                                            <ChevronDown size={11} className="text-gray-400" />
                                        </button>

                                        <button onClick={() => openEdit(r)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition border border-gray-200">
                                            <Pencil size={12} /> Editar
                                        </button>

                                        {r.estado === "pendiente" && (
                                            <button onClick={() => updateReserva(r._id, { estado: "confirmada" })} disabled={isLoading}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition">
                                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar reserva
                                            </button>
                                        )}

                                        <button onClick={() => deleteReserva(r._id)} disabled={isLoading}
                                            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition ml-auto">
                                            <X size={12} /> Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal crear reserva ─────────────────────────────── */}
            {crearModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1 text-lg">Nueva reserva</h2>
                            <button onClick={() => { setCrearModal(false); resetCrearForm(); }} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            {/* Toggle tipo */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipo de cliente</p>
                                <div className="flex gap-2">
                                    <button onClick={() => { setCrearTipo("libre"); setCrearUsuario(null); setCrearBusqueda(""); setCrearResultados([]); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition ${crearTipo === "libre" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600"}`}>
                                        <Phone size={14} /> Sin cuenta
                                    </button>
                                    <button onClick={() => { setCrearTipo("usuario"); setCrearNombre(""); setCrearTelefono(""); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition ${crearTipo === "usuario" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600"}`}>
                                        <Users size={14} /> Usuario app
                                    </button>
                                </div>
                            </div>

                            {/* Sin cuenta: nombre + teléfono */}
                            {crearTipo === "libre" && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nombre *</label>
                                        <input
                                            value={crearNombre}
                                            onChange={e => setCrearNombre(e.target.value)}
                                            placeholder="Nombre del cliente"
                                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Teléfono</label>
                                        <input
                                            value={crearTelefono}
                                            onChange={e => setCrearTelefono(e.target.value)}
                                            placeholder="Opcional"
                                            type="tel"
                                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Usuario app: buscador */}
                            {crearTipo === "usuario" && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Buscar usuario *</label>
                                    {crearUsuario ? (
                                        <div className="flex items-center gap-3 bg-gray-50 border-2 border-black rounded-xl px-3 py-2.5">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-900">{crearUsuario.nombre} {crearUsuario.apellido}</p>
                                                {crearUsuario.telefono && <p className="text-xs text-gray-500">{crearUsuario.telefono}</p>}
                                            </div>
                                            <button onClick={() => { setCrearUsuario(null); setCrearBusqueda(""); }}
                                                className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={crearBusqueda}
                                                onChange={e => setCrearBusqueda(e.target.value)}
                                                placeholder="Nombre, apellido o teléfono..."
                                                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-black focus:outline-none"
                                            />
                                            {buscandoUsuario && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                                        </div>
                                    )}
                                    {!crearUsuario && crearResultados.length > 0 && (
                                        <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                            {crearResultados.map(u => (
                                                <button key={u._id}
                                                    onClick={() => { setCrearUsuario(u); setCrearBusqueda(""); setCrearResultados([]); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0 transition">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-gray-900">{u.nombre} {u.apellido}</p>
                                                        {u.telefono && <p className="text-xs text-gray-500">{u.telefono}</p>}
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0">Seleccionar</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!crearUsuario && crearBusqueda.length >= 2 && !buscandoUsuario && crearResultados.length === 0 && (
                                        <p className="mt-2 text-xs text-gray-400 text-center">Sin resultados</p>
                                    )}
                                </div>
                            )}

                            {/* Fecha */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha *</label>
                                <input
                                    type="date"
                                    min={hoyArgentina()}
                                    value={crearFecha}
                                    onChange={e => setCrearFecha(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                                />
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Horario *</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {HORAS.map(h => (
                                        <button key={h}
                                            onClick={() => setCrearHora(h)}
                                            className={`py-2 rounded-xl text-sm font-bold border-2 transition ${crearHora === h ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}>
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comensales */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Comensales</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setCrearComensales(c => Math.max(1, c - 1))}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:border-gray-400 transition">−</button>
                                    <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">{crearComensales}</span>
                                    <button onClick={() => setCrearComensales(c => Math.min(20, c + 1))}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:border-gray-400 transition">+</button>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Observaciones</label>
                                <textarea
                                    value={crearNotas}
                                    onChange={e => setCrearNotas(e.target.value)}
                                    placeholder="Opcional"
                                    rows={2}
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none resize-none"
                                />
                            </div>

                            {crearError && (
                                <p className="text-sm text-red-600 font-semibold text-center bg-red-50 rounded-xl px-3 py-2">{crearError}</p>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                            <button onClick={crearReserva} disabled={crearSaving}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-3.5 rounded-xl text-sm tracking-wide hover:bg-gray-800 disabled:opacity-50 transition">
                                {crearSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Crear reserva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal editar reserva ────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1 text-lg">Editar reserva</h2>
                            <button onClick={() => setEditModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            {/* Nombre/teléfono solo si es sin cuenta */}
                            {!editModal.userId && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nombre *</label>
                                        <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Teléfono</label>
                                        <input value={editTelefono} onChange={e => setEditTelefono(e.target.value)} type="tel"
                                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none" />
                                    </div>
                                </div>
                            )}

                            {/* Fecha */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha *</label>
                                <input type="date" min={hoyArgentina()} value={editFecha} onChange={e => setEditFecha(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none" />
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Horario *</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {HORAS.map(h => (
                                        <button key={h} onClick={() => setEditHora(h)}
                                            className={`py-2 rounded-xl text-sm font-bold border-2 transition ${editHora === h ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}>
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comensales */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Comensales</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setEditComensales(c => Math.max(1, c - 1))}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:border-gray-400 transition">−</button>
                                    <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">{editComensales}</span>
                                    <button onClick={() => setEditComensales(c => Math.min(20, c + 1))}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:border-gray-400 transition">+</button>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Observaciones</label>
                                <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)}
                                    rows={2} placeholder="Opcional"
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-black focus:outline-none resize-none" />
                            </div>

                            {editError && (
                                <p className="text-sm text-red-600 font-semibold text-center bg-red-50 rounded-xl px-3 py-2">{editError}</p>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                            <button onClick={guardarEdicion} disabled={editSaving}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-3.5 rounded-xl text-sm tracking-wide hover:bg-gray-800 disabled:opacity-50 transition">
                                {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floor plan picker modal */}
            {pickerReservaId && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden" style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Asignar mesa</h2>
                            <button onClick={() => { setPickerReservaId(null); setPickerSelected(null); }} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <FloorPlanPicker
                                mesas={mesas}
                                elements={elements}
                                ocupadas={ocupadas}
                                reservadasHoy={reservadasHoy}
                                selectedId={pickerSelected?._id ?? null}
                                onSelect={m => setPickerSelected(prev => prev?._id === m._id ? null : m)}
                            />

                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Libre</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Ocupada/Reservada hoy</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Seleccionada</span>
                                {pickerSelected && <span className="ml-auto font-semibold text-gray-700">Mesa {pickerSelected.nombre} seleccionada</span>}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => { updateReserva(pickerReservaId, { mesaId: null }); setPickerReservaId(null); setPickerSelected(null); }}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                Sin mesa
                            </button>
                            <button onClick={confirmPicker} disabled={!pickerSelected}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition">
                                {pickerSelected ? `Asignar Mesa ${pickerSelected.nombre}` : "Seleccioná una mesa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
