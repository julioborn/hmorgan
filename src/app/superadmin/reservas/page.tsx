"use client";
import { useEffect, useState, useCallback } from "react";
import {
    CalendarDays, Users, MapPin, MessageCircle, Check, X,
    ToggleLeft, ToggleRight, ChevronDown, Clock, SlidersHorizontal,
    Loader2, Phone,
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

type Mesa = { _id: string; nombre: string; forma: string; activa: boolean };

const ZONA_LABEL: Record<string, string> = { adentro: "Adentro", afuera: "Afuera", indiferente: "Sin preferencia" };
const ZONA_COLOR: Record<string, string> = { adentro: "bg-blue-100 text-blue-700", afuera: "bg-emerald-100 text-emerald-700", indiferente: "bg-gray-100 text-gray-600" };
const ESTADO_COLOR: Record<string, string> = {
    pendiente:   "bg-amber-100 text-amber-700 border-amber-200",
    confirmada:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelada:   "bg-gray-100 text-gray-500 border-gray-200",
};

function formatFecha(fechaStr: string) {
    return new Date(fechaStr).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function buildWhatsApp(r: Reserva) {
    const tel = r.userId.telefono?.replace(/\D/g, "");
    if (!tel) return null;
    const mesa = r.mesaId?.nombre ? `Mesa ${r.mesaId.nombre}` : "a confirmar";
    const fecha = formatFecha(r.fecha);
    const msg = `¡Hola ${r.userId.nombre}! 🍻\n\nTu reserva en *H. Morgan Bar* fue confirmada:\n\n📅 *Fecha:* ${fecha}\n🕐 *Hora:* ${r.hora}hs\n👥 *Comensales:* ${r.comensales}\n🪑 *Mesa:* ${mesa}\n📍 *Zona:* ${ZONA_LABEL[r.zona]}\n${r.notas ? `📝 ${r.notas}\n` : ""}\n¡Te esperamos! 🎉`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default function SuperAdminReservasPage() {
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [activo, setActivo] = useState(true);
    const [tab, setTab] = useState<"pendiente" | "confirmada" | "cancelada">("pendiente");
    const [saving, setSaving] = useState<string | null>(null);
    const [mesaOpen, setMesaOpen] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [rRes, mRes, cRes] = await Promise.all([
                fetch("/api/reservas", { credentials: "include" }),
                fetch("/api/admin/mesas?all=true", { credentials: "include" }),
                fetch("/api/config/reservas"),
            ]);
            const [rData, mData, cData] = await Promise.all([rRes.json(), mRes.json(), cRes.json()]);
            setReservas(Array.isArray(rData) ? rData : []);
            setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa) : []);
            setActivo(cData.activo ?? true);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function toggleActivo() {
        const next = !activo;
        setActivo(next);
        await fetch("/api/config/reservas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: next }) });
    }

    async function updateReserva(id: string, updates: Partial<Reserva>) {
        setSaving(id);
        try {
            const res = await fetch("/api/reservas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, ...updates }) });
            if (res.ok) { const updated = await res.json(); setReservas(p => p.map(r => r._id === id ? updated : r)); }
        } finally { setSaving(null); }
    }

    async function deleteReserva(id: string) {
        if (!confirm("¿Cancelar y eliminar esta reserva?")) return;
        await fetch(`/api/reservas?id=${id}`, { method: "DELETE", credentials: "include" });
        setReservas(p => p.filter(r => r._id !== id));
    }

    const filtered = reservas.filter(r => r.estado === tab);
    const counts = { pendiente: reservas.filter(r => r.estado === "pendiente").length, confirmada: reservas.filter(r => r.estado === "confirmada").length, cancelada: reservas.filter(r => r.estado === "cancelada").length };

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-gray-500 shrink-0" />
                        <div>
                            <h1 className="font-black text-gray-900">Reservas</h1>
                            <p className="text-xs text-gray-400">{reservas.length} total · {counts.pendiente} pendientes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">Reservas</span>
                        <button onClick={toggleActivo}>
                            {activo ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-4">
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                    {(["pendiente", "confirmada", "cancelada"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                            {t} {counts[t] > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"}`}>{counts[t]}</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 py-16 text-sm">Sin reservas {tab === "pendiente" ? "pendientes" : tab === "confirmada" ? "confirmadas" : "canceladas"}</p>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(r => {
                            const waUrl = buildWhatsApp(r);
                            const isLoading = saving === r._id;
                            return (
                                <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Top bar */}
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-gray-900">{r.userId.nombre} {r.userId.apellido}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTADO_COLOR[r.estado]}`}>{r.estado}</span>
                                            </div>
                                            {r.userId.telefono && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} />{r.userId.telefono}
                                                </p>
                                            )}
                                        </div>
                                        {/* WhatsApp */}
                                        {waUrl && (
                                            <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0">
                                                <MessageCircle size={13} /> WhatsApp
                                            </a>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="px-4 py-3 grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-1.5 text-gray-700">
                                            <CalendarDays size={14} className="text-gray-400 shrink-0" />
                                            <span className="font-semibold">{formatFecha(r.fecha)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-700">
                                            <Clock size={14} className="text-gray-400 shrink-0" />
                                            <span className="font-semibold">{r.hora}hs</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users size={14} className="text-gray-400 shrink-0" />
                                            <span className="text-gray-700">{r.comensales} persona{r.comensales !== 1 ? "s" : ""}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-gray-400 shrink-0" />
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ZONA_COLOR[r.zona]}`}>{ZONA_LABEL[r.zona]}</span>
                                        </div>
                                    </div>

                                    {r.notas && (
                                        <div className="px-4 pb-3">
                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">📝 {r.notas}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {r.estado !== "cancelada" && (
                                        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-gray-50 pt-3">
                                            {/* Assign mesa */}
                                            <div className="relative">
                                                <button onClick={() => setMesaOpen(mesaOpen === r._id ? null : r._id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition">
                                                    🪑 {r.mesaId?.nombre ? `Mesa ${r.mesaId.nombre}` : "Asignar mesa"}
                                                    <ChevronDown size={12} />
                                                </button>
                                                {mesaOpen === r._id && (
                                                    <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] max-h-48 overflow-y-auto">
                                                        <button onClick={() => { updateReserva(r._id, { mesaId: undefined } as any); setMesaOpen(null); }}
                                                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-500">
                                                            Sin asignar
                                                        </button>
                                                        {mesas.map(m => (
                                                            <button key={m._id} onClick={() => { updateReserva(r._id, { mesaId: m._id } as any); setMesaOpen(null); }}
                                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 font-semibold ${r.mesaId?._id === m._id ? "text-red-600 bg-red-50" : "text-gray-700"}`}>
                                                                Mesa {m.nombre}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Confirm */}
                                            {r.estado === "pendiente" && (
                                                <button onClick={() => updateReserva(r._id, { estado: "confirmada" } as any)} disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition">
                                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
                                                </button>
                                            )}

                                            {/* Cancel */}
                                            <button onClick={() => deleteReserva(r._id)} disabled={isLoading}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition ml-auto">
                                                <X size={12} /> Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
