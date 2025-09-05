"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Reward = {
    _id: string;
    titulo: string;
    descripcion?: string;
    puntos: number;
    imagen?: string;
};

export default function AdminRewardsPage() {
    const { data: rewards, mutate } = useSWR<Reward[]>("/api/rewards", fetcher);
    const [nuevo, setNuevo] = useState<Partial<Reward>>({
        titulo: "",
        descripcion: "",
        puntos: 0,
        imagen: "",
    });

    async function agregar() {
        if (!nuevo.titulo || !nuevo.puntos) return;
        await fetch("/api/rewards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevo),
        });
        mutate();
        setNuevo({ titulo: "", descripcion: "", puntos: 0, imagen: "" });
    }

    async function eliminar(id: string) {
        if (!confirm("¿Seguro que deseas eliminar este canje?")) return;
        await fetch(`/api/rewards/${id}`, { method: "DELETE" });
        mutate();
    }

    if (!rewards) return <p className="p-6">Cargando...</p>;

    // Función para formatear número de puntos
    const formatNumber = (value: number | string) =>
        new Intl.NumberFormat("es-AR").format(Number(value));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Recompensas</h1>

            {/* Formulario para agregar */}
            <div className="mb-10 bg-white/5 rounded-lg p-4 shadow-md">
                <h2 className="text-lg font-bold mb-4 text-emerald-400">
                    ➕ Agregar Recompensa
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                        className="bg-slate-800 border border-slate-600 text-slate-100 
              placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 
              focus:ring-emerald-500"
                        placeholder="Título"
                        value={nuevo.titulo || ""}
                        onChange={(e) =>
                            setNuevo({ ...nuevo, titulo: e.target.value })
                        }
                    />
                    <input
                        className="bg-slate-800 border border-slate-600 text-slate-100 
              placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 
              focus:ring-emerald-500"
                        placeholder="Puntos"
                        type="text"
                        value={nuevo.puntos ? formatNumber(nuevo.puntos) : ""}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, "");
                            setNuevo({ ...nuevo, puntos: parseInt(raw) || 0 });
                        }}
                    />
                    <button
                        onClick={agregar}
                        className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500"
                    >
                        Agregar
                    </button>
                </div>
                <textarea
                    className="w-full bg-slate-800 border border-slate-600 text-slate-100 
            placeholder-slate-400 px-3 py-2 rounded min-h-[60px] focus:outline-none 
            focus:ring-2 focus:ring-emerald-500"
                    placeholder="Descripción (opcional)"
                    value={nuevo.descripcion || ""}
                    onChange={(e) =>
                        setNuevo({ ...nuevo, descripcion: e.target.value })
                    }
                />
            </div>

            {/* Listado */}
            <ul className="space-y-2">
                {rewards.map((r) => (
                    <li
                        key={r._id}
                        className="p-3 bg-white/5 rounded flex justify-between items-center"
                    >
                        <div>
                            <p className="font-bold">{r.titulo}</p>
                            {r.descripcion && (
                                <p className="text-sm opacity-70">{r.descripcion}</p>
                            )}
                            <p className="text-sm text-indigo-400">
                                {formatNumber(r.puntos)} pts
                            </p>
                        </div>
                        <button
                            onClick={() => eliminar(r._id)}
                            className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-500"
                        >
                            Eliminar
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
