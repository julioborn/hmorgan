"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import Loader from "@/components/Loader";

type Tarea = {
    _id: string;
    texto: string;
    completada: boolean;
    completadaPor?: { nombre: string; apellido: string } | null;
    completadaAt?: string | null;
};

const POLL_INTERVAL = 8000;

export default function EmpleadoTareasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user && !["empleado", "admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    const cargar = useCallback(async () => {
        const res = await fetch("/api/tareas");
        if (res.ok) setTareas(await res.json());
        setLoadingData(false);
    }, []);

    useEffect(() => {
        cargar();
        const interval = setInterval(cargar, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [cargar]);

    async function toggleTarea(id: string) {
        if (toggling) return;
        setToggling(id);

        // Optimistic update
        setTareas(prev => prev.map(t =>
            t._id === id
                ? { ...t, completada: !t.completada, completadaPor: null }
                : t
        ));

        const res = await fetch(`/api/tareas/${id}`, { method: "PATCH" });
        if (res.ok) {
            const updated: Tarea = await res.json();
            setTareas(prev => prev.map(t => t._id === id ? updated : t));
        } else {
            // Revert on error
            await cargar();
        }
        setToggling(null);
    }

    if (loading || loadingData) return <Loader />;
    if (!user) return null;

    const completadas = tareas.filter(t => t.completada).length;
    const total = tareas.length;
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Tareas del turno</h1>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {completadas} de {total} completadas
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ListChecks size={20} className="text-red-500" />
                            <span className="text-lg font-black text-gray-900">{progreso}%</span>
                        </div>
                    </div>

                    {total > 0 && (
                        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${progreso}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-5">
                {tareas.length === 0 ? (
                    <div className="text-center py-16">
                        <ListChecks size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No hay tareas para este turno</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tareas.map(tarea => (
                            <button
                                key={tarea._id}
                                onClick={() => toggleTarea(tarea._id)}
                                disabled={toggling === tarea._id}
                                className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition active:scale-[0.98] ${
                                    tarea.completada
                                        ? "bg-green-50 border-green-200"
                                        : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                } ${toggling === tarea._id ? "opacity-60" : ""}`}
                            >
                                <div className="mt-0.5 flex-shrink-0 transition-transform">
                                    {tarea.completada
                                        ? <CheckCircle2 size={22} className="text-green-500" />
                                        : <Circle size={22} className="text-gray-300" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold leading-snug ${
                                        tarea.completada ? "line-through text-gray-400" : "text-gray-800"
                                    }`}>
                                        {tarea.texto}
                                    </p>
                                    {tarea.completada && tarea.completadaPor && (
                                        <p className="text-xs text-green-600 mt-1">
                                            {tarea.completadaPor.nombre} {tarea.completadaPor.apellido}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {total > 0 && completadas === total && (
                    <div className="mt-8 text-center">
                        <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                        <p className="text-green-700 font-black text-lg">¡Todo listo!</p>
                        <p className="text-green-600 text-sm">Completaron todas las tareas del turno.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
