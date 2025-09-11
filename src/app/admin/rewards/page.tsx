"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Gift, QrCode, Plus } from "lucide-react";
import Loader from "@/components/Loader"; // 👈 importa tu loader

type Reward = {
    _id: string;
    titulo: string;
    puntos: number;
    descripcion?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminRewardsPage() {
    const { data: rewards, mutate } = useSWR<Reward[]>("/api/rewards", fetcher);

    // estado del form
    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [puntos, setPuntos] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ titulo, descripcion, puntos }),
            });

            if (!res.ok) throw new Error("Error creando recompensa");
            await mutate(); // refresca la lista
            setTitulo("");
            setDescripcion("");
            setPuntos(0);
            setShowForm(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // 👇 loader global en vez de texto
    if (!rewards) {
        return (
            <div className="flex justify-center items-center py-16">
                <Loader size={64} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="text-emerald-400" /> Canjes
            </h1>

            {/* Formulario toggleable */}
            <div className="bg-white/5 rounded-lg p-6 shadow-md">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full flex items-center justify-between text-md font-bold text-emerald-400 hover:text-emerald-300 transition"
                >
                    <span>Generar Canje</span>
                    {showForm ? "−" : "+"}
                </button>

                {showForm && (
                    <form onSubmit={handleCreate} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Título"
                                required
                                className="bg-slate-800 border border-slate-600 text-slate-100 
                           placeholder-slate-400 px-3 py-2 rounded 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <input
                                type="number"
                                value={puntos}
                                onChange={(e) => setPuntos(Number(e.target.value))}
                                placeholder="Puntos"
                                required
                                className="bg-slate-800 border border-slate-600 text-slate-100 
                           placeholder-slate-400 px-3 py-2 rounded 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Descripción (opcional)"
                                className="w-full bg-slate-800 border border-slate-600 text-slate-100 
                           placeholder-slate-400 px-3 py-2 rounded min-h-[80px] 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {error && <p className="text-sm text-rose-400">{error}</p>}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-500 disabled:opacity-50"
                            >
                                {loading ? <Loader size={20} /> : "Crear"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Botón global de escanear */}
            <div className="flex justify-center">
                <Link
                    href="/admin/rewards/scan"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shadow-lg hover:scale-105 transition"
                >
                    <QrCode size={18} /> Escanear
                </Link>
            </div>

            {/* Lista de recompensas estilo ticket */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((r) => (
                    <div
                        key={r._id}
                        className="relative bg-white text-black rounded-2xl shadow-xl p-5 h-48 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="flex-1 flex flex-col justify-between">
                            <h3 className="text-lg font-extrabold truncate">{r.titulo}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {r.descripcion || "Canje"}
                            </p>
                            <span className="text-sm font-semibold text-emerald-600">
                                {r.puntos} pts
                            </span>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <img
                                src="/icon-192x192.png"
                                alt="Logo"
                                className="h-7 w-7 object-contain opacity-80"
                            />
                        </div>

                        <span className="absolute -left-3 top-1/2 w-6 h-6 bg-slate-900 rounded-full" />
                        <span className="absolute -right-3 top-1/2 w-6 h-6 bg-slate-900 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
