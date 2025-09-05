"use client";
import useSWR from "swr";
import { Gift } from "lucide-react";

type Reward = {
    _id: string;
    titulo: string;
    descripcion?: string;
    puntos: number;
    activo?: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatNumber = (value: number | string) =>
    new Intl.NumberFormat("es-AR").format(Number(value));

export default function RewardsPage() {
    const { data: rewards, mutate } = useSWR<Reward[]>("/api/rewards", fetcher);

    async function canjearReward(reward: Reward) {
        try {
            const res = await fetch("/api/canjes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rewardId: reward._id,
                    titulo: reward.titulo,
                    puntosGastados: reward.puntos,
                    // suponiendo que el backend puede leer el userId desde el JWT/cookie
                    // si no, también deberías enviarlo acá
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`❌ Error: ${err.message || "No se pudo canjear"}`);
                return;
            }

            alert("✅ Canje realizado con éxito");
            mutate();
        } catch (error) {
            console.error(error);
            alert("❌ Error inesperado en el canje");
        }
    }

    if (!rewards) return <p className="p-6 text-center">Cargando recompensas...</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Gift size={24} className="text-emerald-400" /> Recompensas Disponibles
            </h1>

            {rewards.length === 0 ? (
                <p className="text-center opacity-70">No hay recompensas disponibles.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {rewards.map((r) => (
                        <div
                            key={r._id}
                            className="bg-white/5 p-4 rounded-lg shadow flex flex-col justify-between"
                        >
                            <div>
                                <h2 className="text-lg font-bold">{r.titulo}</h2>
                                {r.descripcion && (
                                    <p className="text-sm opacity-70 mb-2">{r.descripcion}</p>
                                )}
                            </div>
                            <p className="mt-2 font-semibold text-indigo-400">
                                {formatNumber(r.puntos)} pts
                            </p>
                            <button
                                onClick={() => canjearReward(r)}
                                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded px-3 py-1"
                            >
                                Canjear
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
