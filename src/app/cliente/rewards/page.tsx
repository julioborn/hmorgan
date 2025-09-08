"use client";
import useSWR from "swr";
import { Gift } from "lucide-react";

type Reward = {
    _id: string;
    titulo: string;
    descripcion?: string;
    puntos: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RewardsClientePage() {
    const { data: rewards } = useSWR<Reward[]>("/api/rewards", fetcher);

    if (!rewards) return <p className="p-6">Cargando recompensas...</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Gift className="text-emerald-400" /> Canjes disponibles
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rewards.map((r) => (
                    <div key={r._id} className="p-4 bg-white/5 rounded shadow">
                        <h2 className="font-bold">{r.titulo}</h2>
                        <p className="text-sm opacity-70">{r.descripcion}</p>
                        <p className="mt-2 font-semibold text-emerald-400">{r.puntos} pts</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
