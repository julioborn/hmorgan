"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/auth-context";
import { CalendarDays, Clock, Users, CheckCircle, XCircle, Loader2, Plus, Home, Leaf, HelpCircle, X } from "lucide-react";
import { hoyArgentina, formatArgDate } from "@/lib/argentina-time";

type Reserva = {
    _id: string;
    fecha: string;
    hora: string;
    comensales: number;
    zona: "adentro" | "afuera" | "indiferente";
    mesaId?: { nombre: string };
    estado: "pendiente" | "confirmada" | "cancelada";
    notas?: string;
};

const ZONA_OPTIONS = [
    { value: "adentro",     label: "Adentro",         icon: Home },
    { value: "afuera",      label: "Afuera",           icon: Leaf },
    { value: "indiferente", label: "Sin preferencia",  icon: HelpCircle },
] as const;

const HORAS = ["19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00"];

const ESTADO_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
    pendiente:  { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",   icon: Clock,         label: "Pendiente"  },
    confirmada: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle, label: "Confirmada" },
    cancelada:  { bg: "bg-gray-50 border-gray-200",    text: "text-gray-500",    icon: XCircle,       label: "Cancelada"  },
};

function formatFecha(fechaStr: string) {
    return formatArgDate(fechaStr, { weekday: "long", day: "numeric", month: "long" });
}

export default function ClienteReservasPage() {
    const { user, loading } = useAuth();
    const [reservasActivas, setReservasActivas] = useState(true);
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        fecha: hoyArgentina(),
        hora: "19:00",
        comensales: 2,
        zona: "indiferente" as "adentro" | "afuera" | "indiferente",
        notas: "",
    });
    const [confirmando, setConfirmando] = useState(false);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const iv = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(iv);
    }, []);

    const isToday = form.fecha === hoyArgentina();
    const horasDisponibles = useMemo(() => {
        if (!isToday) return HORAS;
        return HORAS.filter(h => {
            const [hh, mm] = h.split(":").map(Number);
            const horaSlot = new Date();
            horaSlot.setHours(hh, mm, 0, 0);
            return horaSlot > now;
        });
    }, [isToday, now]);

    // Si la hora seleccionada ya pasó (o cambió el día), elegir la primera disponible
    useEffect(() => {
        if (horasDisponibles.length > 0 && !horasDisponibles.includes(form.hora)) {
            setForm(p => ({ ...p, hora: horasDisponibles[0] }));
        }
    }, [horasDisponibles]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!user) return;
        // Carga inicial
        Promise.all([
            fetch("/api/config/reservas").then(r => r.json()),
            fetch("/api/reservas", { credentials: "include" }).then(r => r.json()),
        ]).then(([cfg, data]) => {
            setReservasActivas(cfg.activo ?? true);
            setReservas(Array.isArray(data) ? data : []);
        }).finally(() => setLoadingData(false));

        // Polling tiempo real: actualiza estado (ej: pendiente → confirmada)
        const iv = setInterval(async () => {
            const data = await fetch("/api/reservas", { credentials: "include" }).then(r => r.json()).catch(() => null);
            if (Array.isArray(data)) setReservas(data);
        }, 8000);
        return () => clearInterval(iv);
    }, [user]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setConfirmando(true);
    }

    async function ejecutarReserva() {
        setConfirmando(false);
        setSending(true); setError("");
        try {
            const res = await fetch("/api/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form),
            });
            if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Error al reservar"); return; }
            const nueva = await res.json();
            setReservas(p => [nueva, ...p]);
            setShowForm(false);
            setSuccess(true);
            setForm({ fecha: hoyArgentina(), hora: "19:00", comensales: 2, zona: "indiferente", notas: "" });
            setTimeout(() => setSuccess(false), 4000);
        } finally { setSending(false); }
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={40} /></div>;

    const proximas = reservas.filter(r => r.estado !== "cancelada" && new Date(r.fecha) >= new Date(hoyArgentina()));
    const pasadas  = reservas.filter(r => r.estado === "cancelada" || new Date(r.fecha) < new Date(hoyArgentina()));

    return (
        <div className="min-h-screen bg-white pb-20" style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Reservas</h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {reservasActivas ? "Reservas disponibles" : "Reservas desactivadas temporalmente"}
                        </p>
                    </div>
                    {reservasActivas && !showForm && (
                        <button onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition">
                            <Plus size={16} /> Reservar
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                {/* Success banner */}
                {success && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-800">¡Reserva enviada!</p>
                            <p className="text-xs text-emerald-600">Te avisamos cuando esté confirmada.</p>
                        </div>
                    </div>
                )}

                {/* Disabled notice */}
                {!reservasActivas && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-8 text-center">
                        <CalendarDays size={40} className="text-amber-400 mx-auto mb-3" />
                        <p className="font-bold text-amber-800">Las reservas no están disponibles</p>
                        <p className="text-sm text-amber-600 mt-1">Consultanos por las redes o visitanos directamente.</p>
                    </div>
                )}

                {/* Form */}
                {reservasActivas && showForm && (
                    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-black text-gray-900">Nueva reserva</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Fecha */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Fecha</label>
                                <div className="relative">
                                    <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        min={hoyArgentina()}
                                        value={form.fecha}
                                        onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                                        required
                                        style={{ fontSize: "16px" }}
                                        className="w-full appearance-none px-4 py-2.5 pl-11 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 bg-white box-border"
                                    />
                                </div>
                                {form.fecha && (
                                    <p className="text-xs text-gray-500 mt-1.5 ml-1 font-semibold capitalize">
                                        {formatArgDate(form.fecha, { weekday: "long", day: "numeric", month: "long" })}
                                    </p>
                                )}
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Horario <span className="text-gray-400 normal-case font-normal">(19hs–23hs)</span></label>
                                {horasDisponibles.length === 0 ? (
                                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                        No quedan horarios disponibles para hoy. Elegí otra fecha.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {horasDisponibles.map(h => (
                                            <button type="button" key={h} onClick={() => setForm(p => ({ ...p, hora: h }))}
                                                className={`py-2.5 rounded-xl text-sm font-bold border transition ${form.hora === h ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Comensales */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Comensales</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setForm(p => ({ ...p, comensales: Math.max(1, p.comensales - 1) }))}
                                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition text-lg">−</button>
                                    <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">{form.comensales}</span>
                                    <button type="button" onClick={() => setForm(p => ({ ...p, comensales: Math.min(20, p.comensales + 1) }))}
                                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center font-bold text-white transition text-lg">+</button>
                                    <span className="text-sm text-gray-500">persona{form.comensales !== 1 ? "s" : ""}</span>
                                </div>
                            </div>

                            {/* Zona */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Preferencia de lugar</label>
                                <div className="flex gap-2">
                                    {ZONA_OPTIONS.map(z => {
                                        const Icon = z.icon;
                                        return (
                                        <button type="button" key={z.value} onClick={() => setForm(p => ({ ...p, zona: z.value }))}
                                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${form.zona === z.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            <Icon size={18} />
                                            <span>{z.label}</span>
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Observaciones <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                                    placeholder="Ej: cumpleaños, silla para bebé, alergias..."
                                    rows={2}
                                    style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                            </div>

                            {error && <p className="text-red-600 text-xs">{error}</p>}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100">
                            <button type="submit" disabled={sending || horasDisponibles.length === 0}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                                {sending ? <><Loader2 size={18} className="animate-spin" />Enviando...</> : <><CalendarDays size={18} />Solicitar reserva</>}
                            </button>
                        </div>
                    </form>
                )}

                {/* Próximas */}
                {proximas.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Próximas</p>
                        <div className="space-y-3">
                            {proximas.map(r => {
                                const st = ESTADO_STYLES[r.estado];
                                const Icon = st.icon;
                                return (
                                    <div key={r._id} className={`rounded-2xl border p-4 ${st.bg}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon size={15} className={st.text} />
                                                    <span className={`text-xs font-bold ${st.text}`}>{st.label}</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{formatFecha(r.fecha)}</p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1"><Clock size={13} />{r.hora}hs</span>
                                                    <span className="flex items-center gap-1"><Users size={13} />{r.comensales}p</span>
                                                    <span>{ZONA_OPTIONS.find(z => z.value === r.zona)?.label}</span>
                                                </div>
                                                {r.notas && <p className="text-xs text-gray-500 mt-1.5 italic">📝 {r.notas}</p>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Historial */}
                {pasadas.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Historial</p>
                        <div className="space-y-2">
                            {pasadas.map(r => (
                                <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 opacity-60">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-700 text-sm">{formatFecha(r.fecha)} · {r.hora}hs</p>
                                        <p className="text-xs text-gray-400">{r.comensales}p · {ESTADO_STYLES[r.estado].label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {reservas.length === 0 && !showForm && reservasActivas && (
                    <div className="text-center py-12">
                        <CalendarDays size={48} className="text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500 font-semibold">Aún no tenés reservas</p>
                        <p className="text-sm text-gray-400 mt-1">Tocá "Reservar" para hacer tu primera reserva</p>
                    </div>
                )}
            </div>

            {/* Modal de confirmación */}
            {confirmando && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
                    onClick={() => setConfirmando(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <button onClick={() => setConfirmando(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 pb-2 space-y-1">
                            <h2 className="text-xl font-extrabold text-gray-900 leading-tight">¿Confirmamos la reserva?</h2>
                            <p className="text-sm text-gray-500">Revisá los datos antes de enviar.</p>
                        </div>
                        <div className="px-5 py-3 space-y-2">
                            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                                <CalendarDays size={18} className="text-red-500 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Fecha y hora</p>
                                    <p className="font-bold text-gray-900 capitalize">
                                        {formatArgDate(form.fecha, { weekday: "long", day: "numeric", month: "long" })} · {form.hora}hs
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                                <Users size={18} className="text-red-500 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Comensales</p>
                                    <p className="font-bold text-gray-900">{form.comensales} persona{form.comensales !== 1 ? "s" : ""}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                                {(() => { const z = ZONA_OPTIONS.find(z => z.value === form.zona)!; const Icon = z.icon; return <Icon size={18} className="text-red-500 shrink-0" />; })()}
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Lugar</p>
                                    <p className="font-bold text-gray-900">{ZONA_OPTIONS.find(z => z.value === form.zona)?.label}</p>
                                </div>
                            </div>
                            {form.notas && (
                                <div className="flex items-start gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                                    <span className="text-base shrink-0 mt-0.5">📝</span>
                                    <div>
                                        <p className="text-xs text-gray-400 font-semibold uppercase">Observaciones</p>
                                        <p className="font-bold text-gray-900 text-sm">{form.notas}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
                            <button onClick={ejecutarReserva}
                                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl text-sm transition active:scale-[0.98]">
                                <CalendarDays size={15} />
                                Sí, solicitar reserva
                            </button>
                            <button onClick={() => setConfirmando(false)}
                                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">
                                Revisar datos
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
