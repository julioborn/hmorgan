"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RotateCcw, CheckCircle2, Circle, Sunrise, Moon } from "lucide-react";
import Loader from "@/components/Loader";

type Tarea = {
    _id: string;
    texto: string;
    tipo: "apertura" | "cierre";
    completada: boolean;
    completadaPor?: { nombre: string; apellido: string } | null;
};

type Tipo = "apertura" | "cierre";

const SECCIONES: { tipo: Tipo; label: string; color: string; inputColor: string; btnColor: string }[] = [
    {
        tipo: "apertura",
        label: "Tareas apertura",
        color: "text-amber-600",
        inputColor: "focus:border-amber-400",
        btnColor: "bg-amber-500 hover:bg-amber-600",
    },
    {
        tipo: "cierre",
        label: "Tareas cierre",
        color: "text-indigo-600",
        inputColor: "focus:border-indigo-400",
        btnColor: "bg-indigo-500 hover:bg-indigo-600",
    },
];

function TareaInput({ tipo, color, inputColor, btnColor, onAgregada }: {
    tipo: Tipo; color: string; inputColor: string; btnColor: string; onAgregada: () => void;
}) {
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
                className={`flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none ${inputColor} bg-gray-50`}
            />
            <button
                onClick={agregar}
                disabled={agregando || !texto.trim()}
                className={`${btnColor} text-white px-4 py-2 rounded-xl font-bold text-sm transition disabled:opacity-40 flex items-center gap-1`}
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
                        <RotateCcw size={15} />Reiniciar
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-5 space-y-8">
                {SECCIONES.map(({ tipo, label, color, inputColor, btnColor }) => {
                    const lista = tareas.filter(t => (t.tipo ?? "apertura") === tipo);
                    const comp = lista.filter(t => t.completada).length;
                    return (
                        <div key={tipo}>
                            <div className="flex items-center gap-2 mb-3">
                                {tipo === "apertura"
                                    ? <Sunrise size={18} className={color} />
                                    : <Moon size={18} className={color} />
                                }
                                <h2 className={`font-black text-base ${color}`}>{label}</h2>
                                <span className="text-xs text-gray-400 ml-auto">{comp}/{lista.length}</span>
                            </div>

                            <TareaInput
                                tipo={tipo}
                                color={color}
                                inputColor={inputColor}
                                btnColor={btnColor}
                                onAgregada={cargar}
                            />

                            <div className="mt-3 space-y-2">
                                {lista.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-6">
                                        No hay tareas. Agregá la primera.
                                    </p>
                                ) : lista.map(tarea => (
                                    <div
                                        key={tarea._id}
                                        className={`flex items-start gap-3 p-4 rounded-2xl border transition ${
                                            tarea.completada ? "bg-green-50 border-green-200" : "bg-white border-gray-100"
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
