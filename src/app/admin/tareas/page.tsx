"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RotateCcw, CheckCircle2, Circle, Sunrise, Moon, ChevronLeft } from "lucide-react";
import Loader from "@/components/Loader";

type Tarea = {
    _id: string;
    texto: string;
    tipo: "apertura" | "cierre";
    completada: boolean;
    completadaPor?: { nombre: string; apellido: string } | null;
};

type Tipo = "apertura" | "cierre";

const CONFIG: Record<Tipo, { label: string; color: string; inputColor: string; btnColor: string; barColor: string; bg: string; border: string }> = {
    apertura: {
        label: "Tareas apertura",
        color: "text-amber-600",
        inputColor: "focus:border-amber-400",
        btnColor: "bg-amber-500 hover:bg-amber-600",
        barColor: "bg-amber-400",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
    cierre: {
        label: "Tareas cierre",
        color: "text-indigo-600",
        inputColor: "focus:border-indigo-400",
        btnColor: "bg-indigo-500 hover:bg-indigo-600",
        barColor: "bg-indigo-400",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
    },
};

function TareaInput({ tipo, onAgregada }: { tipo: Tipo; onAgregada: () => void }) {
    const cfg = CONFIG[tipo];
    const [texto, setTexto] = useState("");
    const [agregando, setAgregando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    async function agregar() {
        if (!texto.trim()) return;
        setAgregando(true);
        await fetch("/api/tareas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto: texto.trim(), tipo }),
        });
        setTexto("");
        onAgregada();
        inputRef.current?.focus();
        setAgregando(false);
    }

    return (
        <div className="flex gap-2">
            <input
                ref={inputRef}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                placeholder="Nueva tarea..."
                className={`flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none ${cfg.inputColor} bg-gray-50`}
            />
            <button
                onClick={agregar}
                disabled={agregando || !texto.trim()}
                className={`${cfg.btnColor} text-white px-4 py-2 rounded-xl font-bold text-sm transition disabled:opacity-40 flex items-center gap-1`}
            >
                <Plus size={16} />Agregar
            </button>
        </div>
    );
}

export default function AdminTareasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [reseteando, setReseteando] = useState(false);
    const [vistaActiva, setVistaActiva] = useState<Tipo | null>(null);

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

    // ── Vista de detalle (una sección) ────────────────────────────────────────
    if (vistaActiva) {
        const cfg = CONFIG[vistaActiva];
        const lista = tareas.filter(t => (t.tipo ?? "apertura") === vistaActiva);
        const comp = lista.filter(t => t.completada).length;
        const pct = lista.length > 0 ? Math.round((comp / lista.length) * 100) : 0;

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
                                    <h1 className={`text-xl font-black ${cfg.color}`}>{cfg.label}</h1>
                                    <p className="text-xs text-gray-400 mt-0.5">{comp} de {lista.length} completadas</p>
                                </div>
                            </div>
                            <button onClick={resetear} disabled={reseteando}
                                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50">
                                <RotateCcw size={14} />Reiniciar
                            </button>
                        </div>
                        {lista.length > 0 && (
                            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${cfg.barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                    <TareaInput tipo={vistaActiva} onAgregada={cargar} />

                    <div className="space-y-2 mt-2">
                        {lista.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-10">No hay tareas. Agregá la primera.</p>
                        ) : lista.map(tarea => (
                            <div key={tarea._id}
                                className={`flex items-start gap-3 p-4 rounded-2xl border transition ${
                                    tarea.completada ? "bg-green-50 border-green-200" : "bg-white border-gray-100"
                                }`}>
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
                                <button onClick={() => eliminar(tarea._id)}
                                    className="text-gray-300 hover:text-red-500 transition flex-shrink-0 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Vista principal: dos botones ──────────────────────────────────────────
    const totalCompletadas = tareas.filter(t => t.completada).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Tareas del turno</h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {totalCompletadas} de {tareas.length} completadas
                        </p>
                    </div>
                    <button onClick={resetear} disabled={reseteando}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50">
                        <RotateCcw size={15} />Reiniciar
                    </button>
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
                                <p className={`font-black text-base ${cfg.color}`}>
                                    {tipo === "apertura" ? "Apertura" : "Cierre"}
                                </p>
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
        </div>
    );
}
