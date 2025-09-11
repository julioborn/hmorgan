"use client";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Settings, Gift } from "lucide-react";
import Loader from "@/components/Loader";

type Tx = {
    _id: string;
    source: "consumo" | "ajuste";
    amount: number;
    meta?: { consumoARS?: number };
    createdAt: string;
};

type Reward = { titulo: string; descripcion?: string; puntos: number };
type Canje = {
    _id: string;
    rewardId: Reward;
    puntosGastados: number;
    estado: string;
    createdAt: string;
};

export default function HistorialPage() {
    const [tab, setTab] = useState<"puntos" | "canjes">("puntos");
    const [items, setItems] = useState<Tx[]>([]);
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loadingPuntos, setLoadingPuntos] = useState(true);
    const [loadingCanjes, setLoadingCanjes] = useState(true);

    // fetch puntos
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/puntos");
                const data = await res.json();
                setItems(data.items || []);
            } catch {
                setItems([]);
            } finally {
                setLoadingPuntos(false);
            }
        })();
    }, []);

    // fetch canjes
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/canjes");
                if (!res.ok) throw new Error("No autorizado");
                const data = await res.json();
                setCanjes(data || []);
            } catch {
                setCanjes([]);
            } finally {
                setLoadingCanjes(false);
            }
        })();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-extrabold text-center text-white">
                Historial
            </h1>

            {/* Tabs */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => setTab("puntos")}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${tab === "puntos"
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                >
                    Puntos
                </button>
                <button
                    onClick={() => setTab("canjes")}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${tab === "canjes"
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                >
                    Canjes
                </button>
            </div>

            {/* Contenido según tab */}
            {tab === "puntos" ? (
                loadingPuntos ? (
                    <div className="py-20 flex justify-center items-center">
                        <Loader size={40} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-center opacity-70 bg-white/5 rounded-xl border border-white/10">
                        Sin movimientos aún.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {items.map((tx) => {
                            const Icon = tx.source === "consumo" ? UtensilsCrossed : Settings;
                            return (
                                <div
                                    key={tx._id}
                                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br 
                  from-emerald-600/20 via-slate-800/40 to-slate-900/60
                  p-5 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg 
                  hover:shadow-emerald-500/20 transition-all duration-300"
                                >
                                    {/* Icono decorativo */}
                                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl" />

                                    {/* Cabecera */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className="w-8 h-8 text-emerald-400 shrink-0" />
                                        <h2 className="text-lg sm:text-xl font-bold">
                                            {tx.source === "consumo" ? "Consumo" : "Ajuste"}
                                        </h2>
                                    </div>

                                    {/* Fecha + monto */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm opacity-70">
                                            {new Date(tx.createdAt).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <span
                                            className={`text-xl font-extrabold ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                                                }`}
                                        >
                                            {tx.amount >= 0 ? "+" : ""}
                                            {tx.amount}
                                        </span>
                                    </div>

                                    {/* Consumo en ARS opcional */}
                                    {tx.meta?.consumoARS !== undefined && (
                                        <div className="mt-2 text-sm opacity-80">
                                            Consumo: ${tx.meta.consumoARS}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : loadingCanjes ? (
                <div className="py-20 flex justify-center items-center">
                    <Loader size={40} />
                </div>
            ) : canjes.length === 0 ? (
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
                            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl" />
                            <div className="flex items-center gap-3 mb-2">
                                <Gift className="w-8 h-8 text-emerald-400 shrink-0" />
                                <h2 className="text-lg sm:text-xl font-bold">
                                    {c.rewardId?.titulo}
                                </h2>
                            </div>
                            {c.rewardId?.descripcion && (
                                <p className="text-sm opacity-80 mb-3">
                                    {c.rewardId.descripcion}
                                </p>
                            )}
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
                                    {c.estado === "completado"
                                        ? "CANJEADO"
                                        : c.estado.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
