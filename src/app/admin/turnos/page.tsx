"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import Loader from "@/components/Loader";
import { hoyArgentina } from "@/lib/argentina-time";

interface Turno {
    _id: string;
    userId: { _id: string; nombre: string; apellido: string } | null;
    ingreso: string;
    salida: string | null;
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatFechaCorta(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function duracion(ingreso: string, salida: string | null) {
    const fin = salida ? new Date(salida) : new Date();
    const mins = Math.floor((fin.getTime() - new Date(ingreso).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
}

function nombreEmpleado(t: Turno) {
    if (!t.userId) return "Empleado";
    return `${t.userId.nombre} ${t.userId.apellido}`.trim();
}

export default function AdminTurnosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState<"hoy" | "semana" | "todos">("hoy");

    useEffect(() => {
        if (!loading && user && !["admin", "superadmin", "cajero"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    const cargar = useCallback(async () => {
        setCargando(true);
        let url = "/api/turnos";
        if (filtro === "hoy") url += `?desde=${hoyArgentina()}`;
        else if (filtro === "semana") {
            const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7);
            url += `?desde=${hace7.toISOString().slice(0, 10)}`;
        }
        const r = await fetch(url, { credentials: "include", cache: "no-store" });
        if (r.ok) setTurnos(await r.json());
        setCargando(false);
    }, [filtro]);

    useEffect(() => { cargar(); }, [cargar]);

    // Agrupar por fecha
    const grupos = turnos.reduce<Record<string, Turno[]>>((acc, t) => {
        const fecha = new Date(t.ingreso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
        if (!acc[fecha]) acc[fecha] = [];
        acc[fecha].push(t);
        return acc;
    }, {});

    const enTurno = turnos.filter(t => !t.salida);

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;
    if (!user || !["admin", "superadmin", "cajero"].includes(user.role)) return null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Turnos del personal</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Registro de horarios de empleados</p>
                </div>
                {enTurno.length > 0 && (
                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {enTurno.length} en turno
                    </span>
                )}
            </div>

            {/* Filtro */}
            <div className="flex gap-2">
                {(["hoy", "semana", "todos"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${filtro === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {f === "hoy" ? "Hoy" : f === "semana" ? "Últimos 7 días" : "Todos"}
                    </button>
                ))}
            </div>

            {cargando ? (
                <div className="flex justify-center py-10"><Loader size={36} /></div>
            ) : turnos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin registros para este período</p>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grupos).map(([fecha, lista]) => (
                        <div key={fecha}>
                            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 capitalize">{fecha}</h2>
                            <div className="space-y-2">
                                {lista.map(t => (
                                    <div key={t._id} className={`bg-white rounded-2xl border px-4 py-3 flex items-center justify-between shadow-sm ${!t.salida ? "border-emerald-300" : "border-gray-200"}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${!t.salida ? "bg-emerald-100" : "bg-gray-100"}`}>
                                                <Clock size={16} className={!t.salida ? "text-emerald-600" : "text-gray-500"} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{nombreEmpleado(t)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {formatHora(t.ingreso)} → {t.salida ? formatHora(t.salida) : <span className="text-emerald-600 font-semibold">En turno</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Duración</p>
                                            <p className="text-sm font-black text-gray-700">{duracion(t.ingreso, t.salida)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
