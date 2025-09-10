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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rewards.map((r) => (
                    <div
                        key={r._id}
                        className="relative bg-white text-black rounded-2xl shadow-xl p-5 h-44 flex flex-col justify-between overflow-hidden"
                    >
                        {/* Contenido principal */}
                        <div className="flex-1 flex flex-col justify-between">
                            <h2 className="text-lg font-extrabold truncate">{r.titulo}</h2>

                            {r.descripcion ? (
                                <p className="text-sm text-gray-600 line-clamp-2">{r.descripcion}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Canje</p>
                            )}

                            <span className="text-sm font-semibold text-emerald-600">
                                {r.puntos} pts
                            </span>
                        </div>

                        {/* Logo en esquina inferior derecha */}
                        <div className="absolute bottom-3 right-3">
                            <img
                                src="/icon-192x192.png"
                                alt="Logo"
                                className="h-8 w-8 object-contain opacity-80"
                            />
                        </div>

                        {/* Estilo ticket: muescas */}
                        <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-900 rounded-full" />
                        <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-900 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
