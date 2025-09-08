// src/app/cliente/canjes/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

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

    if (loading) return <p className="p-6">Cargando canjes...</p>;

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="text-emerald-400" /> Mis Canjes
            </h1>

            {canjes.length === 0 ? (
                <p className="opacity-70">Aún no realizaste canjes.</p>
            ) : (
                <ul className="space-y-3">
                    {canjes.map((c) => (
                        <li
                            key={c._id}
                            className="rounded-xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between"
                        >
                            <div>
                                <div className="font-semibold">{c.rewardId?.titulo}</div>
                                <div className="text-sm opacity-70">
                                    {c.puntosGastados} pts —{" "}
                                    {new Date(c.createdAt).toLocaleDateString("es-AR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                    })}
                                </div>
                            </div>
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${c.estado === "completado"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                            >
                                {c.estado}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
