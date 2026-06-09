"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, KeyRound, X, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    username: string;
};

type Modal =
    | { type: "nuevo" }
    | { type: "resetPass"; empleado: Empleado }
    | { type: "confirmarEliminar"; empleado: Empleado }
    | null;

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<Modal>(null);

    const cargar = async () => {
        setLoading(true);
        const res = await fetch("/api/superadmin/empleados", { credentials: "include" });
        const data = await res.json();
        setEmpleados(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

    const eliminar = async (id: string) => {
        await fetch(`/api/superadmin/empleados/${id}`, { method: "DELETE", credentials: "include" });
        setModal(null);
        cargar();
    };

    return (
        <div className="mx-auto w-full max-w-screen-sm md:max-w-2xl px-4 py-6 space-y-5"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin" className="p-2 rounded-full hover:bg-gray-100 transition">
                    <ChevronLeft size={22} className="text-gray-700" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-black tracking-tight">Empleados</h1>
                    <p className="text-sm text-gray-400">{empleados.length} mozo{empleados.length !== 1 ? "s" : ""} registrado{empleados.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                    onClick={() => setModal({ type: "nuevo" })}
                    className="flex items-center gap-2 bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition active:scale-95"
                >
                    <UserPlus size={16} />
                    Nuevo
                </button>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
            ) : empleados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                    <UserPlus size={40} className="opacity-30" />
                    <p className="text-sm">No hay empleados registrados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {empleados.map(emp => (
                        <div key={emp._id} className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4">
                            <div className="bg-gray-100 rounded-xl h-11 w-11 flex items-center justify-center shrink-0">
                                <span className="text-lg font-black text-gray-500">
                                    {emp.nombre[0]}{emp.apellido[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-black leading-tight">{emp.nombre} {emp.apellido}</p>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">@{emp.username}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setModal({ type: "resetPass", empleado: emp })}
                                    className="p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                                    title="Cambiar contraseña"
                                >
                                    <KeyRound size={17} />
                                </button>
                                <button
                                    onClick={() => setModal({ type: "confirmarEliminar", empleado: emp })}
                                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                                    title="Eliminar"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modales */}
            {modal?.type === "nuevo" && (
                <NuevoEmpleadoModal
                    onClose={() => setModal(null)}
                    onCreado={() => { setModal(null); cargar(); }}
                />
            )}
            {modal?.type === "resetPass" && (
                <ResetPassModal
                    empleado={modal.empleado}
                    onClose={() => setModal(null)}
                    onGuardado={() => setModal(null)}
                />
            )}
            {modal?.type === "confirmarEliminar" && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                        <h2 className="font-black text-lg">¿Eliminar empleado?</h2>
                        <p className="text-sm text-gray-500">
                            Se eliminará a <span className="font-bold text-black">{modal.empleado.nombre} {modal.empleado.apellido}</span> de forma permanente.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">
                                Cancelar
                            </button>
                            <button onClick={() => eliminar(modal.empleado._id)}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Modal: Nuevo empleado ── */
function NuevoEmpleadoModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
    const [form, setForm] = useState({ nombre: "", apellido: "", username: "", password: "" });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const res = await fetch("/api/superadmin/empleados", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(form),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || "Error al crear"); return; }
        onCreado();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-lg">Nuevo empleado</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre</label>
                            <input value={form.nombre} onChange={set("nombre")} required
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Apellido</label>
                            <input value={form.apellido} onChange={set("apellido")} required
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Usuario</label>
                        <input value={form.username} onChange={set("username")} required placeholder="ej: juanperez"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Contraseña</label>
                        <div className="relative">
                            <input value={form.password} onChange={set("password")} required
                                type={showPass ? "text" : "password"}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
                            <button type="button" onClick={() => setShowPass(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                    <button type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50">
                        {loading ? "Creando..." : "Crear empleado"}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ── Modal: Resetear contraseña ── */
function ResetPassModal({ empleado, onClose, onGuardado }: { empleado: Empleado; onClose: () => void; onGuardado: () => void }) {
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const res = await fetch(`/api/superadmin/empleados/${empleado._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ password }),
        });
        setLoading(false);
        if (!res.ok) { setError("Error al cambiar contraseña"); return; }
        onGuardado();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-black text-lg">Cambiar contraseña</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{empleado.nombre} {empleado.apellido}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                    <div className="relative">
                        <input value={password} onChange={e => setPassword(e.target.value)} required
                            type={showPass ? "text" : "password"} placeholder="Nueva contraseña"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50">
                            {loading ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
