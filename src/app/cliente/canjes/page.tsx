"use client";
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import Loader from "@/components/Loader";

export const dynamic = "force-dynamic"; // 👈 siempre datos frescos

type Reward = { titulo: string; puntos: number };
type Canje = {
    _id: string;
    rewardId: Reward;
    puntosGastados: number;
    estado: string;
    createdAt: string;
};

export default function CanjesClientePage() {
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/canjes");
                if (!res.ok) throw new Error("No autorizado");
                const data = await res.json();
                setCanjes(data || []);
            } catch (e) {
                console.error(e);
                setCanjes([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="py-20 flex justify-center items-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-white">
                Mis Canjes
            </h1>

            {canjes.length === 0 ? (
                <p className="opacity-70 text-center">Aún no realizaste canjes.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {canjes.map((c) => (
                        <div
                            key={c._id}
                            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br 
               from-emerald-600/20 via-slate-800/40 to-slate-900/60
               p-5 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg 
               hover:shadow-emerald-500/20 transition-all duration-300"
                        >
                            {/* Ícono decorativo */}
                            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl" />

                            {/* Título */}
                            <div className="flex items-center gap-3 mb-2">
                                <Gift className="w-8 h-8 text-emerald-400 shrink-0" />
                                <h2 className="text-lg sm:text-xl font-bold">{c.rewardId?.titulo}</h2>
                            </div>

                            {/* Descripción del canje (si la hay) */}
                            {c.rewardId && (c.rewardId as any).descripcion && (
                                <p className="text-sm opacity-80 mb-3">
                                    {(c.rewardId as any).descripcion}
                                </p>
                            )}

                            {/* Puntos + fecha + estado en la misma fila */}
                            <div className="mb-2 flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-extrabold text-emerald-400">
                                        {c.puntosGastados} pts
                                    </p>
                                    <p className="text-sm opacity-70">
                                        {new Date(c.createdAt).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>

                                <span
                                    className={`inline-block text-xs sm:text-sm px-3 py-1 rounded-full font-semibold tracking-wide
      ${c.estado === "completado"
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                            : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                        }`}
                                >
                                    {c.estado === "completado" ? "CANJEADO" : c.estado.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
