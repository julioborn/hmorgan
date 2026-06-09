"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { swalBase } from "@/lib/swalConfig";
import {
    CalendarDays, Users, MapPin, MessageCircle, Check, X,
    Clock, Loader2, Phone, ChevronDown,
} from "lucide-react";

type Reserva = {
    _id: string;
    userId: { _id: string; nombre: string; apellido: string; telefono?: string };
    fecha: string;
    hora: string;
    comensales: number;
    zona: "adentro" | "afuera" | "indiferente";
    mesaId?: { _id: string; nombre: string };
    estado: "pendiente" | "confirmada" | "cancelada";
    notas?: string;
    createdAt: string;
};
type Mesa = { _id: string; nombre: string; forma: string; activa: boolean; tipo?: string; zona?: string; capacidad?: number; x: number; y: number; ancho?: number; alto?: number; rotacion?: number };
type SalonEl = { _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string };

const ZONA_LABEL: Record<string, string> = { adentro: "Adentro", afuera: "Afuera", indiferente: "Sin preferencia" };
const ZONA_COLOR: Record<string, string> = { adentro: "bg-blue-100 text-blue-700", afuera: "bg-emerald-100 text-emerald-700", indiferente: "bg-gray-100 text-gray-600" };
const ESTADO_COLOR: Record<string, string> = {
    pendiente:  "bg-amber-100 text-amber-700 border-amber-200",
    confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelada:  "bg-gray-100 text-gray-500 border-gray-200",
};

function formatFecha(fechaStr: string) {
    return new Date(fechaStr).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function buildWhatsApp(r: Reserva) {
    const tel = r.userId.telefono?.replace(/\D/g, "");
    if (!tel) return null;
    const fecha = formatFecha(r.fecha);
    const mesaLine = r.mesaId?.nombre ? `Mesa: ${r.mesaId.nombre}` : null;
    const msg = [
        `Hola ${r.userId.nombre}!`,
        ``,
        `Tu reserva en H. Morgan Bar fue confirmada:`,
        ``,
        `Fecha: ${fecha}`,
        `Hora: ${r.hora}hs`,
        `Comensales: ${r.comensales}`,
        `Zona: ${ZONA_LABEL[r.zona]}`,
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
                {/* Elements */}
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

                {/* Mesas */}
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

// ── Main page ─────────────────────────────────────────────────────
export default function SuperAdminReservasPage() {
    const [reservas, setReservas]         = useState<Reserva[]>([]);
    const [mesas, setMesas]               = useState<Mesa[]>([]);
    const [elements, setElements]         = useState<SalonEl[]>([]);
    const [ocupadas, setOcupadas]         = useState<Set<string>>(new Set());
    const [reservadasHoy, setReservadasHoy] = useState<Set<string>>(new Set());
    const [loading, setLoading]           = useState(true);
    const [activo, setActivo]             = useState(true);
    const [tab, setTab]                   = useState<"pendiente" | "confirmada">("pendiente");
    const [saving, setSaving]             = useState<string | null>(null);

    // Mesa picker
    const [pickerReservaId, setPickerReservaId]   = useState<string | null>(null);
    const [pickerSelected, setPickerSelected]     = useState<Mesa | null>(null);

    const fetchReservas = useCallback(async () => {
        const r = await fetch("/api/reservas", { credentials: "include" });
        const d = await r.json();
        if (Array.isArray(d)) {
            setReservas(d);
            // Actualizar reservadas hoy
            const hoy = new Date().toISOString().slice(0, 10);
            setReservadasHoy(new Set(
                d.filter((r: any) => r.estado !== "cancelada" && r.mesaId && r.fecha?.slice(0, 10) === hoy)
                 .map((r: any) => String(r.mesaId?._id || r.mesaId))
            ));
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const [mRes, elRes, cfgRes] = await Promise.all([
                fetch("/api/admin/mesas?all=true", { credentials: "include" }),
                fetch("/api/superadmin/salon", { credentials: "include" }),
                fetch("/api/config/reservas"),
            ]);
            const [mData, elData, cfgData] = await Promise.all([mRes.json(), elRes.json(), cfgRes.json()]);
            setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa) : []);
            setElements(Array.isArray(elData) ? elData : []);
            setActivo(cfgData.activo ?? true);

            // pedidos activos para saber mesas ocupadas en el plano
            const pData = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" }).then(r => r.json()).catch(() => []);
            if (Array.isArray(pData)) setOcupadas(new Set(pData.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));

            await fetchReservas();
            setLoading(false);
        };
        init();
        const iv = setInterval(fetchReservas, 8000);
        return () => clearInterval(iv);
    }, [fetchReservas]);

    async function toggleActivo() {
        const next = !activo;
        setActivo(next);
        await fetch("/api/config/reservas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: next }) });
    }

    async function updateReserva(id: string, updates: Record<string, unknown>) {
        setSaving(id);
        try {
            const res = await fetch("/api/reservas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, ...updates }) });
            if (res.ok) { const updated = await res.json(); setReservas(p => p.map(r => r._id === id ? updated : r)); }
        } finally { setSaving(null); }
    }

    async function deleteReserva(id: string) {
        const r = await swalBase.fire({ title: "¿Cancelar reserva?", text: "Se notificará al cliente.", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, cancelar", cancelButtonText: "No" });
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

    const filtered = reservas.filter(r => r.estado === tab);
    const counts = {
        pendiente:  reservas.filter(r => r.estado === "pendiente").length,
        confirmada: reservas.filter(r => r.estado === "confirmada").length,
    };

    return (
        <div className="min-h-screen pb-16">
            <div className="max-w-3xl mx-auto px-4">
                <h1 className="text-3xl font-extrabold mb-3 text-center text-black">Reservas</h1>

                <div className="flex justify-center items-center gap-3 mb-6">
                    <span className={`text-sm font-semibold ${activo ? "text-gray-900" : "text-gray-400"}`}>
                        Reservas {activo ? "activas" : "desactivadas"}
                    </span>
                    <button
                        onClick={toggleActivo}
                        className={`relative flex h-6 w-10 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${activo ? "bg-red-500" : "bg-gray-300"}`}
                    >
                        <span className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${activo ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>
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
                            return (
                                <div key={r._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* Header con nombre, estado y WA */}
                                    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${ESTADO_COLOR[r.estado]}`}>
                                                    {r.estado}
                                                </span>
                                            </div>
                                            <p className="text-lg font-black text-gray-900 leading-tight">
                                                {r.userId.nombre} {r.userId.apellido}
                                            </p>
                                            {r.userId.telefono && (
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Phone size={10} />{r.userId.telefono}
                                                </p>
                                            )}
                                        </div>
                                        {waUrl && (
                                            <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0">
                                                <MessageCircle size={13} /> WhatsApp
                                            </a>
                                        )}
                                    </div>

                                    {/* Detalle en fila */}
                                    <div className="px-5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Fecha</p>
                                            <p className="text-sm font-bold text-gray-900 leading-tight">{new Date(r.fecha).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"2-digit" })}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Horario</p>
                                            <p className="text-sm font-bold text-gray-900">{r.hora}hs</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Comensales</p>
                                            <p className="text-sm font-bold text-gray-900">{r.comensales} persona{r.comensales !== 1 ? "s" : ""}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Preferencia</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ZONA_COLOR[r.zona]}`}>{ZONA_LABEL[r.zona]}</span>
                                        </div>
                                    </div>

                                    {/* Mesa asignada */}
                                    {mesaAsignada && (
                                        <div className="px-5 pb-3">
                                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                                                <MapPin size={13} className="text-indigo-500 shrink-0" />
                                                <span className="text-sm font-semibold text-indigo-800">Mesa {mesaAsignada.nombre}</span>
                                                {mesaAsignada.zona && <span className="text-xs text-indigo-500">· {mesaAsignada.zona}</span>}
                                                {mesaAsignada.capacidad ? <span className="text-xs text-indigo-400 ml-auto">{mesaAsignada.capacidad}p</span> : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notas (sin emoji, estilo limpio) */}
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

                                            {/* Confirm */}
                                            {r.estado === "pendiente" && (
                                                <button onClick={() => updateReserva(r._id, { estado: "confirmada" })} disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition">
                                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar reserva
                                                </button>
                                            )}

                                                            {/* Eliminar */}
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
            </div>

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

                            {/* Legend */}
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
