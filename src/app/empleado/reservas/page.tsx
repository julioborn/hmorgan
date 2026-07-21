"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { hoyArgentina, formatArgDate } from "@/lib/argentina-time";
import { CalendarDays, Phone, MapPin, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Loader from "@/components/Loader";

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
};

const ESTADO_COLOR: Record<string, string> = {
    pendiente: "bg-amber-400 text-black",
    confirmada: "bg-emerald-500 text-white",
    cancelada: "bg-gray-300 text-gray-500",
};

function addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

function buildWhatsApp(r: Reserva) {
    const tel = (r.userId?.telefono || r.telefonoContacto)?.replace(/\D/g, "");
    if (!tel) return null;
    const nombre = r.userId ? r.userId.nombre : (r.nombreContacto || "");
    const fecha = formatArgDate(r.fecha, { weekday: "long", day: "numeric", month: "long" });
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

export default function EmpleadoReservasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [fecha, setFecha] = useState(hoyArgentina());
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!loading && user?.role !== "empleado" && user?.role !== "cajero" && user?.role !== "admin" && user?.role !== "superadmin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchReservas = useCallback(async () => {
        setCargando(true);
        try {
            const r = await fetch("/api/reservas", { credentials: "include" });
            const d = await r.json();
            setReservas(Array.isArray(d) ? d : []);
        } catch { setReservas([]); }
        finally { setCargando(false); }
    }, []);

    useEffect(() => { fetchReservas(); }, [fetchReservas]);

    if (loading) return <div className="flex justify-center py-16"><Loader size={48} /></div>;

    const del_dia = reservas
        .filter(r => r.fecha?.slice(0, 10) === fecha && r.estado !== "cancelada")
        .sort((a, b) => a.hora.localeCompare(b.hora));

    const canceladas_dia = reservas.filter(r => r.fecha?.slice(0, 10) === fecha && r.estado === "cancelada");

    const hoyStr = hoyArgentina();
    const fechaLabel = fecha === hoyStr
        ? "Hoy"
        : formatArgDate(fecha, { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 space-y-4" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

            {/* Header */}
            <div className="rounded-2xl bg-black text-white px-5 py-5 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-xl font-extrabold leading-tight">Reservas</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Solo lectura · Ver detalles del día</p>
                </div>
            </div>

            {/* Selector de fecha */}
            <div className="flex items-center gap-3 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <button
                    onClick={() => setFecha(f => addDays(f, -1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1 text-center">
                    <p className="font-black text-gray-900 text-base capitalize">{fechaLabel}</p>
                    <p className="text-xs text-gray-400">{formatArgDate(fecha, { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <button
                    onClick={() => setFecha(f => addDays(f, 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                    <ChevronRight size={18} />
                </button>
            </div>

            {fecha !== hoyStr && (
                <button onClick={() => setFecha(hoyStr)} className="w-full text-center text-xs text-red-600 font-semibold py-1.5">
                    Volver a hoy
                </button>
            )}

            {/* Lista */}
            {cargando ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
            ) : del_dia.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarDays size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400 font-semibold">Sin reservas para este día</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                        {del_dia.length} reserva{del_dia.length !== 1 ? "s" : ""}
                    </p>
                    {del_dia.map(r => {
                        const nombreMostrado = r.userId
                            ? `${r.userId.nombre} ${r.userId.apellido}`
                            : (r.nombreContacto || "Sin nombre");
                        const telefonoMostrado = r.userId?.telefono || r.telefonoContacto;
                        const waUrl = buildWhatsApp(r);

                        return (
                            <div key={r._id} className="bg-white rounded-2xl border-2 border-black shadow-sm overflow-hidden">
                                {/* Header negro */}
                                <div className="bg-black px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-white text-lg leading-tight break-words">{nombreMostrado}</p>
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
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${ESTADO_COLOR[r.estado]}`}>
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

                                {/* Grilla de datos */}
                                <div className="px-5 py-3 grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Horario</p>
                                        <p className="text-base font-black text-gray-900">{r.hora}hs</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Comensales</p>
                                        <p className="text-base font-black text-gray-900">{r.comensales} persona{r.comensales !== 1 ? "s" : ""}</p>
                                    </div>
                                    {r.mesaId ? (
                                        <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                                            <MapPin size={13} className="text-gray-500 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Mesa</p>
                                                <p className="text-sm font-black text-gray-900">Mesa {r.mesaId.nombre}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Mesa</p>
                                            <p className="text-xs text-gray-400 italic">Sin asignar</p>
                                        </div>
                                    )}
                                </div>

                                {/* Notas */}
                                {r.notas && (
                                    <div className="px-5 pb-4">
                                        <div className="border-l-2 border-amber-400 pl-3 py-1 bg-amber-50 rounded-r-xl">
                                            <p className="text-[10px] font-semibold text-amber-600 uppercase mb-0.5">Observaciones</p>
                                            <p className="text-sm text-gray-700">{r.notas}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Canceladas del día (colapsadas al fondo) */}
            {canceladas_dia.length > 0 && (
                <p className="text-center text-xs text-gray-400 pt-2">
                    + {canceladas_dia.length} reserva{canceladas_dia.length !== 1 ? "s" : ""} cancelada{canceladas_dia.length !== 1 ? "s" : ""} este día
                </p>
            )}
        </div>
    );
}
