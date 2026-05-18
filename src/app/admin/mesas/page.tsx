"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type Mesa = { _id: string; nombre: string; activa: boolean };

export default function MesasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [loadingMesas, setLoadingMesas] = useState(true);
    const [nuevaMesa, setNuevaMesa] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && user?.role !== "admin") router.replace("/");
    }, [user, loading, router]);

    async function fetchMesas() {
        setLoadingMesas(true);
        try {
            const res = await fetch("/api/admin/mesas?all=true", { cache: "no-store" });
            const data = await res.json();
            setMesas(Array.isArray(data) ? data : []);
        } catch {
            setMesas([]);
        } finally {
            setLoadingMesas(false);
        }
    }

    useEffect(() => {
        fetchMesas();
    }, []);

    async function agregarMesa() {
        if (!nuevaMesa.trim()) return;
        setGuardando(true);
        setError("");
        try {
            const res = await fetch("/api/admin/mesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: nuevaMesa.trim() }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || "Error al crear mesa");
                return;
            }
            setNuevaMesa("");
            await fetchMesas();
        } finally {
            setGuardando(false);
        }
    }

    async function eliminarMesa(id: string) {
        await fetch(`/api/admin/mesas?id=${id}`, { method: "DELETE" });
        setMesas(prev => prev.filter(m => m._id !== id));
    }

    async function toggleMesa(id: string) {
        const res = await fetch("/api/admin/mesas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            const updated = await res.json();
            setMesas(prev => prev.map(m => m._id === id ? updated : m));
        }
    }

    if (loading || loadingMesas) {
        return (
            <div className="flex justify-center py-20">
                <Loader size={64} />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen px-4 pb-10 max-w-2xl mx-auto"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
        >
            <h1 className="text-3xl font-extrabold text-center py-8 text-black">Mesas</h1>

            {/* Agregar mesa */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="font-bold text-gray-800 mb-3">Agregar mesa</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nombre o número"
                        value={nuevaMesa}
                        onChange={e => setNuevaMesa(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && agregarMesa()}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                        onClick={agregarMesa}
                        disabled={guardando || !nuevaMesa.trim()}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-semibold transition"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar
                    </button>
                </div>
                {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            </div>

            {/* Lista de mesas */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-700">
                        {mesas.length} {mesas.length === 1 ? "mesa" : "mesas"} registradas
                    </span>
                </div>

                {mesas.length === 0 ? (
                    <p className="text-center py-12 text-gray-400 text-sm">
                        No hay mesas registradas todavía.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {mesas.map(m => (
                            <li key={m._id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${m.activa ? "bg-emerald-500" : "bg-gray-300"}`}
                                    />
                                    <span className={`font-semibold ${m.activa ? "text-gray-900" : "text-gray-400 line-through"}`}>
                                        Mesa {m.nombre}
                                    </span>
                                    {!m.activa && (
                                        <span className="text-xs text-gray-400">inactiva</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleMesa(m._id)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                                        title={m.activa ? "Desactivar" : "Activar"}
                                    >
                                        {m.activa
                                            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                            : <ToggleLeft className="w-5 h-5 text-gray-400" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => eliminarMesa(m._id)}
                                        className="p-2 rounded-lg hover:bg-red-50 transition text-red-500"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
