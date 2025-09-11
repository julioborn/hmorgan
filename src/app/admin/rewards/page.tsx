"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Gift, QrCode, Plus } from "lucide-react";

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
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!rewards) return <p className="p-6">Cargando recompensas…</p>;

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="text-emerald-400" /> Canjes
            </h1>

            {/* Formulario de creación */}
            <form
                onSubmit={handleCreate}
                className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10"
            >
                <h2 className="font-semibold flex items-center gap-2">
                    <Plus className="text-emerald-400" /> Nueva recompensa
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Título"
                        required
                        className="rounded-lg px-3 py-2 bg-white/10 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                        type="number"
                        value={puntos}
                        onChange={(e) => setPuntos(Number(e.target.value))}
                        placeholder="Puntos"
                        required
                        className="rounded-lg px-3 py-2 bg-white/10 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full rounded-lg px-3 py-2 bg-white/10 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-500"
                />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                    {loading ? "Guardando..." : "Crear recompensa"}
                </button>
            </form>

            {/* Lista de recompensas */}
            <ul className="space-y-3">
                {rewards.map((r) => (
                    <li
                        key={r._id}
                        className="flex justify-between items-center bg-white/5 rounded p-4"
                    >
                        <div>
                            <p className="font-bold">{r.titulo}</p>
                            {r.descripcion && (
                                <p className="text-sm opacity-70">{r.descripcion}</p>
                            )}
                            <p className="text-sm opacity-70">{r.puntos} pts</p>
                        </div>
                        <Link
                            href={`/admin/rewards/scan?rewardId=${r._id}`}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded"
                        >
                            <QrCode size={18} /> Escanear
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
