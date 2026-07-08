"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tablet, List, LayoutGrid, X, CheckCircle, UserPlus } from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = { _id: string; nombre: string; activa: boolean; zona?: string; x?: number; y?: number; forma?: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string };
type SalonEl = { _id: string; tipo: string; label?: string; x: number; y: number; ancho: number; alto: number; color: string };
type Sesion = { _id: string; mesasNombres: string[]; usuariosIds: { _id: string; nombre: string; apellido: string; username: string }[] };
type UsuarioSug = { _id: string; nombre: string; apellido: string; username: string };

export default function EmpleadoAutoservicioPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [elementos, setElementos] = useState<SalonEl[]>([]);
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"lista" | "plano">("lista");

    const [mesasSeleccionadas, setMesasSeleccionadas] = useState<string[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [usernames, setUsernames] = useState<string[]>([]);
    const [sugerencias, setSugerencias] = useState<UsuarioSug[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function cargar() {
        const [mRes, elRes, sRes] = await Promise.all([
            fetch("/api/admin/mesas", { credentials: "include" }),
            fetch("/api/superadmin/salon", { credentials: "include" }),
            fetch("/api/autoservicio", { credentials: "include" }),
        ]);
        const [mData, elData, sData] = await Promise.all([mRes.json(), elRes.json(), sRes.json()]);
        setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa).sort((a: Mesa, b: Mesa) => parseInt(a.nombre) - parseInt(b.nombre)) : []);
        setElementos(Array.isArray(elData) ? elData : []);
        setSesiones(Array.isArray(sData) ? sData : []);
        setLoading(false);
    }

    useEffect(() => { cargar(); }, []);

    // Debounce búsqueda de usuarios
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = userInput.trim();
        if (q.length < 2) { setSugerencias([]); return; }
        debounceRef.current = setTimeout(async () => {
            setBuscando(true);
            try {
                const r = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(q)}`, { credentials: "include" });
                const d = await r.json();
                setSugerencias(Array.isArray(d) ? d.filter((u: UsuarioSug) => !usernames.includes(u.username)) : []);
            } finally { setBuscando(false); }
        }, 300);
    }, [userInput, usernames]);

    const mesasConSesion = new Set(sesiones.flatMap(s => s.mesasNombres));

    function toggleMesa(nombre: string) {
        if (mesasConSesion.has(nombre)) return;
        setMesasSeleccionadas(prev =>
            prev.includes(nombre) ? prev.filter(x => x !== nombre) : [...prev, nombre]
        );
    }

    function seleccionarUsuario(u: UsuarioSug) {
        if (!usernames.includes(u.username)) setUsernames(p => [...p, u.username]);
        setUserInput("");
        setSugerencias([]);
    }

    function agregarUsername() {
        const u = userInput.trim().toLowerCase();
        if (!u || usernames.includes(u)) return;
        setUsernames(p => [...p, u]);
        setUserInput("");
        setSugerencias([]);
    }

    function abrirModal() {
        if (mesasSeleccionadas.length === 0) return;
        setModalOpen(true);
        setError("");
    }

    function cerrarModal() {
        setModalOpen(false);
        setUsernames([]);
        setUserInput("");
        setSugerencias([]);
        setError("");
    }

    async function crearSesion() {
        if (mesasSeleccionadas.length === 0 || usernames.length === 0) return;
        setEnviando(true); setError("");
        try {
            const res = await fetch("/api/autoservicio", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mesasNombres: mesasSeleccionadas, usernames }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Error al crear sesión"); return; }
            setMesasSeleccionadas([]);
            cerrarModal();
            await cargar();
        } finally { setEnviando(false); }
    }

    async function cerrarSesion(id: string) {
        await fetch(`/api/autoservicio/${id}`, { method: "PATCH", credentials: "include" });
        await cargar();
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-black px-4 pt-5 pb-4 sticky top-0 z-20">
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
                        <button onClick={() => setVista("plano")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${vista === "plano" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
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
                                        <p className="font-bold text-gray-900">Mesa{s.mesasNombres.length > 1 ? "s" : ""} {s.mesasNombres.join(", ")}</p>
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

                {/* Selección actual */}
                {mesasSeleccionadas.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-purple-500 uppercase">Seleccionadas</p>
                            <p className="font-bold text-purple-900">Mesa{mesasSeleccionadas.length > 1 ? "s" : ""} {mesasSeleccionadas.join(", ")}</p>
                        </div>
                        <button onClick={() => setMesasSeleccionadas([])} className="p-1.5 text-purple-400 hover:text-purple-700"><X size={16} /></button>
                        <button onClick={abrirModal}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition">
                            <UserPlus size={15} /> Asignar
                        </button>
                    </div>
                )}

                {/* Vista lista */}
                {vista === "lista" && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Tocá para seleccionar mesas
                        </p>
                        <div className="space-y-2">
                            {mesas.map(m => {
                                const tieneSession = mesasConSesion.has(m.nombre);
                                const seleccionada = mesasSeleccionadas.includes(m.nombre);
                                return (
                                    <button key={m._id} onClick={() => toggleMesa(m.nombre)} disabled={tieneSession}
                                        className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition shadow-sm
                                            ${tieneSession ? "bg-purple-50 border-purple-200 opacity-60 cursor-default"
                                            : seleccionada ? "bg-purple-600 border-purple-700 text-white active:scale-[0.98]"
                                            : "bg-white border-gray-200 hover:border-purple-300 active:scale-[0.98]"}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
                                            ${tieneSession ? "bg-purple-400 text-white" : seleccionada ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                                            {m.nombre}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold ${seleccionada ? "text-white" : "text-gray-900"}`}>Mesa {m.nombre}</p>
                                        </div>
                                        {tieneSession && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">Activa</span>}
                                        {seleccionada && <CheckCircle size={20} className="text-white shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vista plano real del bar */}
                {vista === "plano" && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tocá las mesas para seleccionarlas</p>
                        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
                            <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                                {elementos.map(el => {
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
                                {mesas.map(m => {
                                    const tieneSession = mesasConSesion.has(m.nombre);
                                    const seleccionada = mesasSeleccionadas.includes(m.nombre);
                                    const isRound = m.forma === "round" || m.forma === "oval";
                                    const rot = m.rotacion ?? 0;
                                    const w = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                                    const h = m.alto || (m.forma === "oval" ? 5 : m.forma === "round" ? 5.5 : 5);
                                    const bg = tieneSession ? "bg-purple-500 border-purple-600 text-white"
                                        : seleccionada ? "bg-purple-600 border-purple-700 text-white ring-2 ring-purple-300"
                                        : "bg-emerald-500 border-emerald-600 text-white";
                                    return (
                                        <div key={m._id}
                                            onClick={() => !tieneSession && toggleMesa(m.nombre)}
                                            style={{ position: "absolute", left: `${m.x ?? 10}%`, top: `${m.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: tieneSession ? "not-allowed" : "pointer", userSelect: "none", zIndex: 2 }}
                                            className={`flex items-center justify-center border-2 ${bg} transition-all active:scale-95`}>
                                            <div style={{ transform: `rotate(${-rot}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <span style={{ fontSize: "clamp(5px,0.8vw,9px)", fontWeight: 900 }}>{m.nombre}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal asignar usuarios */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
                    onClick={cerrarModal}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase">Autoservicio</p>
                                <h2 className="text-xl font-extrabold text-gray-900">
                                    Mesa{mesasSeleccionadas.length > 1 ? "s" : ""} {mesasSeleccionadas.join(", ")}
                                </h2>
                            </div>
                            <button onClick={cerrarModal} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>

                        <div className="px-5 pb-2 space-y-3">
                            <p className="text-sm text-gray-500">Agregá los usuarios que van a pedir desde su teléfono.</p>
                            <div className="relative">
                                <div className="flex gap-2">
                                    <input
                                        value={userInput}
                                        onChange={e => setUserInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregarUsername())}
                                        placeholder="Buscar por nombre o usuario..."
                                        style={{ fontSize: "16px" }}
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                    <button onClick={agregarUsername}
                                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition shrink-0">
                                        <UserPlus size={18} />
                                    </button>
                                </div>
                                {/* Dropdown sugerencias */}
                                {(sugerencias.length > 0 || buscando) && (
                                    <div className="absolute left-0 right-12 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                        {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>}
                                        {sugerencias.map(u => (
                                            <button key={u._id} onClick={() => seleccionarUsuario(u)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 text-left transition">
                                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 font-black text-xs text-purple-700">
                                                    {u.nombre?.[0]?.toUpperCase() ?? "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{u.nombre} {u.apellido}</p>
                                                    <p className="text-xs text-gray-400">@{u.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {usernames.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {usernames.map(u => (
                                        <span key={u} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                            @{u}
                                            <button onClick={() => setUsernames(p => p.filter(x => x !== u))} className="text-purple-400 hover:text-purple-700"><X size={12} /></button>
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
                            <button onClick={cerrarModal}
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
