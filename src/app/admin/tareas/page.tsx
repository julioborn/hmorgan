"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import Loader from "@/components/Loader";

type Tarea = {
    _id: string;
    texto: string;
    completada: boolean;
    completadaPor?: { nombre: string; apellido: string } | null;
    completadaAt?: string | null;
};

export default function AdminTareasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [nuevoTexto, setNuevoTexto] = useState("");
    const [agregando, setAgregando] = useState(false);
    const [reseteando, setReseteando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && user && !["admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    async function cargar() {
        const res = await fetch("/api/tareas");
        if (res.ok) setTareas(await res.json());
        setLoadingData(false);
    }

    useEffect(() => { cargar(); }, []);

    async function agregar() {
        if (!nuevoTexto.trim()) return;
        setAgregando(true);
        const res = await fetch("/api/tareas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto: nuevoTexto.trim() }),
        });
        if (res.ok) {
            setNuevoTexto("");
            await cargar();
            inputRef.current?.focus();
        }
        setAgregando(false);
    }

    async function eliminar(id: string) {
        await fetch(`/api/tareas/${id}`, { method: "DELETE" });
        setTareas(prev => prev.filter(t => t._id !== id));
    }

    async function resetear() {
        if (!confirm("¿Reiniciar todas las tareas? Las marcas de completado se borrarán.")) return;
        setReseteando(true);
        await fetch("/api/tareas/reset", { method: "POST" });
        await cargar();
        setReseteando(false);
    }

    if (loading || loadingData) return <Loader />;
    if (!user || !["admin", "superadmin"].includes(user.role)) return null;

    const completadas = tareas.filter(t => t.completada).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Tareas del turno</h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {completadas} de {tareas.length} completadas
                        </p>
                    </div>
                    <button
                        onClick={resetear}
                        disabled={reseteando}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                    >
                        <RotateCcw size={15} />
                        Reiniciar
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-5 space-y-4">
                {/* Agregar tarea */}
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={nuevoTexto}
                        onChange={e => setNuevoTexto(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && agregar()}
                        placeholder="Nueva tarea..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 bg-gray-50"
                    />
                    <button
                        onClick={agregar}
                        disabled={agregando || !nuevoTexto.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition disabled:opacity-40 flex items-center gap-1"
                    >
                        <Plus size={16} />
                        Agregar
                    </button>
                </div>

                {/* Lista */}
                {tareas.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">
                        No hay tareas. Agregá la primera.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {tareas.map(tarea => (
                            <div
                                key={tarea._id}
                                className={`flex items-start gap-3 p-4 rounded-2xl border transition ${
                                    tarea.completada
                                        ? "bg-green-50 border-green-200"
                                        : "bg-white border-gray-100"
                                }`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {tarea.completada
                                        ? <CheckCircle2 size={20} className="text-green-500" />
                                        : <Circle size={20} className="text-gray-300" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${tarea.completada ? "line-through text-gray-400" : "text-gray-800"}`}>
                                        {tarea.texto}
                                    </p>
                                    {tarea.completada && tarea.completadaPor && (
                                        <p className="text-xs text-green-600 mt-0.5">
                                            Completada por {tarea.completadaPor.nombre} {tarea.completadaPor.apellido}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => eliminar(tarea._id)}
                                    className="text-gray-300 hover:text-red-500 transition flex-shrink-0 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
