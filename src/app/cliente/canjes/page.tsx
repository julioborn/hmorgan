"use client";
import useSWR from "swr";
import { History } from "lucide-react";

type Redemption = {
    _id: string;
    rewardId: string;
    titulo: string;
    puntosGastados: number;
    estado: string; // pendiente, aprobado, entregado
    fecha: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CanjesPage() {
    const { data: canjes } = useSWR<Redemption[]>("/api/redemptions", fetcher);

    if (!canjes) return <p className="p-6 text-center">Cargando canjes...</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <History size={24} className="text-indigo-400" /> Mis Canjes
            </h1>

            {canjes.length === 0 ? (
                <p className="text-center opacity-70">Todavía no realizaste canjes.</p>
            ) : (
                <div className="space-y-3">
                    {canjes.map((c) => (
                        <div
                            key={c._id}
                            className="bg-white/5 p-4 rounded-lg shadow flex justify-between items-center"
                        >
                            <div>
                                <p className="font-bold">{c.titulo}</p>
                                <p className="text-sm opacity-70">
                                    {new Date(c.fecha).toLocaleDateString("es-AR")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-emerald-400">
                                    -{c.puntosGastados} pts
                                </p>
                                <p className="text-xs opacity-70">{c.estado}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
