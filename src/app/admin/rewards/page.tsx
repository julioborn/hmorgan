"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Gift, QrCode, ChevronDown, ChevronUp } from "lucide-react";
import Loader from "@/components/Loader";

type Reward = {
    _id: string;
    titulo: string;
    puntos: number;
    descripcion?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminRewardsPage() {
    const { data: rewards, mutate } = useSWR<Reward[]>("/api/rewards", fetcher);

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

            if (!res.ok) throw new Error("Error creando canje");
            await mutate();

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

    if (!rewards) {
        return (
            <div className="p-12 flex justify-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
            {/* 🏷️ Título */}
            <h1 className="text-3xl font-extrabold mb-8 text-black text-center md:text-left flex justify-center items-center gap-2">
                Canjes (Administración)
            </h1>

            {/* ➕ Formulario toggleable */}
            <div className="mb-10 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full flex items-center justify-between text-lg font-bold text-red-600 hover:text-red-700 transition"
                >
                    <span>Generar Canje</span>
                    {showForm ? <ChevronUp /> : <ChevronDown />}
                </button>

                {showForm && (
                    <form onSubmit={handleCreate} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Título"
                                required
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <input
                                type="number"
                                value={puntos}
                                onChange={(e) => setPuntos(Number(e.target.value))}
                                placeholder="Puntos"
                                required
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción (opcional)"
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-500"
                        />

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition disabled:opacity-50"
                            >
                                {loading ? <Loader size={20} /> : "Crear"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* 📱 Botón global Escanear */}
            <div className="flex justify-center mb-10">
                <Link
                    href="/admin/rewards/scan"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 shadow-md hover:scale-105 transition"
                >
                    <QrCode size={18} /> Escanear
                </Link>
            </div>

            {/* 🎟️ Lista de canjes */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((r) => (
                    <div
                        key={r._id}
                        className="relative bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:bg-red-50/40 transition overflow-visible"
                    >
                        {/* Borde lateral tipo ticket */}
                        <div className="absolute inset-y-0 -left-3 flex items-center">
                            <span className="w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                        </div>
                        <div className="absolute inset-y-0 -right-3 flex items-center">
                            <span className="w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-black">{r.titulo}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {r.descripcion || "Sin descripción"}
                            </p>
                            <p className="text-sm font-semibold text-red-600 mt-2">
                                {r.puntos} puntos
                            </p>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <img
                                src="/icon-192x192.png"
                                alt="Logo"
                                className="h-7 w-7 object-contain opacity-80"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
