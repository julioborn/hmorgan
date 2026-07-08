"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Tablet, List, LayoutGrid, X, Plus, Trash2, CheckCircle, UserPlus } from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = { _id: string; nombre: string; activa: boolean; zona?: string };
type Sesion = {
    _id: string;
    mesaNombre: string;
    usuariosIds: { _id: string; nombre: string; apellido: string; username: string }[];
};

export default function EmpleadoAutoservicioPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"lista" | "plan">("lista");

    // Modal asignar
    const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
    const [userInput, setUserInput] = useState("");
    const [usernames, setUsernames] = useState<string[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");

    async function cargar() {
        const [mRes, sRes] = await Promise.all([
            fetch("/api/admin/mesas", { credentials: "include" }),
            fetch("/api/autoservicio", { credentials: "include" }),
        ]);
        const mData = await mRes.json();
        const sData = await sRes.json();
        setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa) : []);
        setSesiones(Array.isArray(sData) ? sData : []);
        setLoading(false);
    }

    useEffect(() => { cargar(); }, []);

    const sesionPorMesa = (mesaId: string) => sesiones.find(s => (s as any).mesaId === mesaId || (s as any).mesaId?._id === mesaId);

    function agregarUsername() {
        const u = userInput.trim().toLowerCase();
        if (!u || usernames.includes(u)) return;
        setUsernames(p => [...p, u]);
        setUserInput("");
    }

    async function crearSesion() {
        if (!mesaSeleccionada || usernames.length === 0) return;
        setEnviando(true); setError("");
        try {
            const res = await fetch("/api/autoservicio", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mesaId: mesaSeleccionada._id, usernames }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Error al crear sesión"); return; }
            setMesaSeleccionada(null);
            setUsernames([]);
            setUserInput("");
            await cargar();
        } finally { setEnviando(false); }
    }

    async function cerrarSesion(id: string) {
        await fetch(`/api/autoservicio/${id}`, { method: "PATCH", credentials: "include" });
        await cargar();
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-black px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tablet size={22} className="text-white" />
                        <h1 className="text-xl font-black text-white">Autoservicio</h1>
                    </div>
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                        <button onClick={() => setVista("lista")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${vista === "lista" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
                            <List size={14} /> Lista
                        </button>
                        <button onClick={() => setVista("plan")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${vista === "plan" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
                            <LayoutGrid size={14} /> Plano
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                {/* Sesiones activas */}
                {sesiones.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sesiones activas</p>
                        <div className="space-y-2">
                            {sesiones.map(s => (
                                <div key={s._id} className="bg-white rounded-2xl border border-purple-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                        <Tablet size={18} className="text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900">Mesa {s.mesaNombre}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {s.usuariosIds.map(u => u.nombre || u.username).join(", ")}
                                        </p>
                                    </div>
                                    <button onClick={() => cerrarSesion(s._id)}
                                        className="shrink-0 p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-400 transition">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vista lista */}
                {vista === "lista" && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mesas disponibles</p>
                        <div className="space-y-2">
                            {mesas.map(m => {
                                const tieneSession = !!sesionPorMesa(m._id);
                                return (
                                    <button key={m._id} onClick={() => !tieneSession && setMesaSeleccionada(m)} disabled={tieneSession}
                                        className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition shadow-sm
                                            ${tieneSession
                                                ? "bg-purple-50 border-purple-200 opacity-70 cursor-default"
                                                : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 active:scale-[0.98]"}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
                                            ${tieneSession ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700"}`}>
                                            {m.nombre}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">Mesa {m.nombre}</p>
                                            {m.zona && <p className="text-xs text-gray-400">{m.zona}</p>}
                                        </div>
                                        {tieneSession
                                            ? <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">Activa</span>
                                            : <Plus size={18} className="text-gray-400 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vista plano — grid simple */}
                {vista === "plan" && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Plano de mesas</p>
                        <div className="grid grid-cols-3 gap-3">
                            {mesas.map(m => {
                                const tieneSession = !!sesionPorMesa(m._id);
                                return (
                                    <button key={m._id} onClick={() => !tieneSession && setMesaSeleccionada(m)} disabled={tieneSession}
                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 font-black text-sm border-2 transition active:scale-[0.95]
                                            ${tieneSession
                                                ? "bg-purple-500 border-purple-600 text-white"
                                                : "bg-white border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50"}`}>
                                        <Tablet size={20} className={tieneSession ? "text-white/80" : "text-gray-400"} />
                                        <span>{m.nombre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal asignar usuarios */}
            {mesaSeleccionada && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
                    onClick={() => { setMesaSeleccionada(null); setUsernames([]); setUserInput(""); setError(""); }}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase">Autoservicio</p>
                                <h2 className="text-xl font-extrabold text-gray-900">Mesa {mesaSeleccionada.nombre}</h2>
                            </div>
                            <button onClick={() => { setMesaSeleccionada(null); setUsernames([]); setUserInput(""); setError(""); }}
                                className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>

                        <div className="px-5 pb-2 space-y-3">
                            <p className="text-sm text-gray-500">Agregá los usuarios que van a pedir desde su teléfono.</p>

                            <div className="flex gap-2">
                                <input
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregarUsername())}
                                    placeholder="nombre de usuario"
                                    style={{ fontSize: "16px" }}
                                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                                <button onClick={agregarUsername}
                                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition shrink-0">
                                    <UserPlus size={18} />
                                </button>
                            </div>

                            {usernames.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {usernames.map(u => (
                                        <span key={u} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                            @{u}
                                            <button onClick={() => setUsernames(p => p.filter(x => x !== u))} className="text-purple-400 hover:text-purple-700">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
                            <button onClick={crearSesion} disabled={enviando || usernames.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm transition active:scale-[0.98]">
                                <CheckCircle size={16} />
                                {enviando ? "Activando..." : "Activar autoservicio"}
                            </button>
                            <button onClick={() => { setMesaSeleccionada(null); setUsernames([]); setUserInput(""); setError(""); }}
                                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
