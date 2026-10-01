"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut, ChevronLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { swalBase } from "@/lib/swalConfig";
import Loader from "@/components/Loader";

interface Turno {
    _id: string;
    ingreso: string;
    salida: string | null;
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatFecha(iso: string) {
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

function horaActual() {
    const now = new Date();
    return now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
}

export default function TurnosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [cargando, setCargando] = useState(true);
    const [marcando, setMarcando] = useState(false);
    const [form, setForm] = useState<{ accion: "ingreso" | "salida"; hora: string } | null>(null);

    useEffect(() => {
        if (!loading && user && !["empleado", "cocina", "limpieza", "admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    const cargar = useCallback(async () => {
        const r = await fetch("/api/turnos", { credentials: "include", cache: "no-store" });
        if (r.ok) setTurnos(await r.json());
        setCargando(false);
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const turnoAbierto = turnos.find(t => !t.salida);

    function abrirForm(accion: "ingreso" | "salida") {
        setForm({ accion, hora: horaActual() });
    }

    async function confirmar() {
        if (!form) return;
        setMarcando(true);
        try {
            const r = await fetch("/api/turnos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: form.accion, horaManual: form.hora }),
            });
            const data = await r.json();
            if (!r.ok) {
                await swalBase.fire({ icon: "error", title: "Error", text: data.error });
                return;
            }
            setForm(null);
            await cargar();
        } finally {
            setMarcando(false);
        }
    }

    if (loading || cargando) return <div className="flex justify-center py-20"><Loader size={48} /></div>;
    if (!user) return null;

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Mis Turnos</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Registrá tu horario de entrada y salida</p>
                </div>
            </div>

            {/* Estado actual */}
            <div className={`rounded-2xl px-5 py-5 flex items-center justify-between shadow-sm ${turnoAbierto ? "bg-emerald-600 text-white" : "bg-gray-900 text-white"}`}>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold opacity-75">{turnoAbierto ? "En turno desde" : "Fuera de turno"}</p>
                        <p className="text-lg font-black">
                            {turnoAbierto ? `${formatHora(turnoAbierto.ingreso)} · ${duracion(turnoAbierto.ingreso, null)}` : "—"}
                        </p>
                    </div>
                </div>
                {turnoAbierto ? <LogOut size={20} className="opacity-60" /> : <LogIn size={20} className="opacity-60" />}
            </div>

            {/* Formulario de marcado */}
            {form ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-black text-gray-700">
                        {form.accion === "ingreso" ? "¿A qué hora entraste?" : "¿A qué hora salís?"}
                    </p>
                    <div className="flex items-center gap-3">
                        <Clock size={18} className="text-gray-400 shrink-0" />
                        <input
                            type="time"
                            value={form.hora}
                            onChange={e => setForm(f => f ? { ...f, hora: e.target.value } : f)}
                            className="flex-1 text-3xl font-black text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-400 transition"
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Podés ajustar la hora si lo marcás tarde</p>
                    <div className="flex gap-2">
                        <button
                            onClick={confirmar}
                            disabled={marcando}
                            className={`flex-1 flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl text-white transition disabled:opacity-50 ${form.accion === "ingreso" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                            <Check size={18} /> Confirmar
                        </button>
                        <button
                            onClick={() => setForm(null)}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-600 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition">
                            <X size={18} /> Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                turnoAbierto ? (
                    <button
                        onClick={() => abrirForm("salida")}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-lg transition shadow-md active:scale-[0.97]">
                        <LogOut size={22} /> Marcar salida
                    </button>
                ) : (
                    <button
                        onClick={() => abrirForm("ingreso")}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-lg transition shadow-md active:scale-[0.97]">
                        <LogIn size={22} /> Marcar horario
                    </button>
                )
            )}

            {/* Historial */}
            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Historial</h2>
                {turnos.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin turnos registrados</p>
                ) : (
                    <div className="space-y-2">
                        {turnos.map(t => (
                            <div key={t._id} className={`bg-white rounded-2xl border px-4 py-3 flex items-center justify-between shadow-sm ${!t.salida ? "border-emerald-300" : "border-gray-200"}`}>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 capitalize">{formatFecha(t.ingreso)}</p>
                                    <p className="text-sm font-black text-gray-900">
                                        {formatHora(t.ingreso)} → {t.salida ? formatHora(t.salida) : <span className="text-emerald-600">En turno</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Duración</p>
                                    <p className="text-sm font-black text-gray-700">{duracion(t.ingreso, t.salida)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
