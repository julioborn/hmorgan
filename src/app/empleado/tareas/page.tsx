"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, Sunrise, Moon, ChevronLeft } from "lucide-react";
import Loader from "@/components/Loader";

type Tarea = {
    _id: string;
    texto: string;
    tipo: "apertura" | "cierre";
    completada: boolean;
    completadaPor?: { nombre: string; apellido: string } | null;
};

type Tipo = "apertura" | "cierre";

const POLL_INTERVAL = 8000;

const CONFIG: Record<Tipo, { label: string; color: string; barColor: string; bg: string; border: string }> = {
    apertura: {
        label: "Apertura",
        color: "text-amber-600",
        barColor: "bg-amber-400",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
    cierre: {
        label: "Cierre",
        color: "text-indigo-600",
        barColor: "bg-indigo-400",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
    },
};

export default function EmpleadoTareasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);
    const [vistaActiva, setVistaActiva] = useState<Tipo | null>(null);

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
        setTareas(prev => prev.map(t =>
            t._id === id ? { ...t, completada: !t.completada, completadaPor: null } : t
        ));
        const res = await fetch(`/api/tareas/${id}`, { method: "PATCH" });
        if (res.ok) {
            const updated: Tarea = await res.json();
            setTareas(prev => prev.map(t => t._id === id ? updated : t));
        } else {
            await cargar();
        }
        setToggling(null);
    }

    if (loading || loadingData) return <Loader />;
    if (!user) return null;

    // ── Vista de detalle ──────────────────────────────────────────────────────
    if (vistaActiva) {
        const cfg = CONFIG[vistaActiva];
        const lista = tareas.filter(t => (t.tipo ?? "apertura") === vistaActiva);
        const comp = lista.filter(t => t.completada).length;
        const pct = lista.length > 0 ? Math.round((comp / lista.length) * 100) : 0;
        const todoListo = lista.length > 0 && comp === lista.length;

        return (
            <div className="min-h-screen bg-white pb-20">
                <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                    <div className="max-w-xl mx-auto">
                        <button onClick={() => setVistaActiva(null)}
                            className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-black mb-3 transition">
                            <ChevronLeft size={16} /> Volver
                        </button>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {vistaActiva === "apertura"
                                    ? <Sunrise size={20} className={cfg.color} />
                                    : <Moon size={20} className={cfg.color} />
                                }
                                <div>
                                    <h1 className={`text-xl font-black ${cfg.color}`}>Tareas {cfg.label}</h1>
                                    <p className="text-xs text-gray-400 mt-0.5">{comp} de {lista.length} completadas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ListChecks size={18} className="text-gray-400" />
                                <span className="text-base font-black text-gray-800">{pct}%</span>
                            </div>
                        </div>
                        {lista.length > 0 && (
                            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${cfg.barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-xl mx-auto px-4 pt-4 space-y-2">
                    {lista.length === 0 ? (
                        <div className="text-center py-16">
                            <ListChecks size={40} className="text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No hay tareas en esta sección</p>
                        </div>
                    ) : lista.map(tarea => (
                        <button key={tarea._id} onClick={() => toggleTarea(tarea._id)}
                            disabled={toggling === tarea._id}
                            className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition active:scale-[0.98] ${
                                tarea.completada
                                    ? "bg-green-50 border-green-200"
                                    : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            } ${toggling === tarea._id ? "opacity-60" : ""}`}>
                            <div className="mt-0.5 flex-shrink-0">
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

                    {todoListo && (
                        <div className="mt-6 text-center">
                            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                            <p className="text-green-700 font-black text-lg">¡Todo listo!</p>
                            <p className="text-green-600 text-sm">Completaron todas las tareas.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Vista principal: dos botones ──────────────────────────────────────────
    const totalCompletadas = tareas.filter(t => t.completada).length;
    const totalTareas = tareas.length;
    const progresoTotal = totalTareas > 0 ? Math.round((totalCompletadas / totalTareas) * 100) : 0;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Tareas del turno</h1>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {totalCompletadas} de {totalTareas} completadas
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ListChecks size={20} className="text-red-500" />
                            <span className="text-lg font-black text-gray-900">{progresoTotal}%</span>
                        </div>
                    </div>
                    {totalTareas > 0 && (
                        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progresoTotal}%` }} />
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-6 grid grid-cols-2 gap-4">
                {(["apertura", "cierre"] as Tipo[]).map(tipo => {
                    const cfg = CONFIG[tipo];
                    const lista = tareas.filter(t => (t.tipo ?? "apertura") === tipo);
                    const comp = lista.filter(t => t.completada).length;
                    const pct = lista.length > 0 ? Math.round((comp / lista.length) * 100) : 0;
                    const todoListo = lista.length > 0 && comp === lista.length;

                    return (
                        <button key={tipo} onClick={() => setVistaActiva(tipo)}
                            className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 ${cfg.border} ${cfg.bg} px-4 py-8 active:scale-[0.97] transition-transform shadow-sm`}>
                            {todoListo && (
                                <span className="absolute top-3 right-3">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                </span>
                            )}
                            {tipo === "apertura"
                                ? <Sunrise size={36} className={cfg.color} />
                                : <Moon size={36} className={cfg.color} />
                            }
                            <div className="text-center">
                                <p className={`font-black text-base ${cfg.color}`}>{cfg.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{comp}/{lista.length} completadas</p>
                            </div>
                            {lista.length > 0 && (
                                <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                                    <div className={`h-full ${cfg.barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {totalTareas === 0 && (
                <div className="text-center py-20">
                    <ListChecks size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No hay tareas para este turno</p>
                </div>
            )}
        </div>
    );
}
