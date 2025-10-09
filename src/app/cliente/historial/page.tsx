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

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    return (
        <div className="p-6 space-y-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-center text-black">Historial</h1>

            {/* Tabs */}
            <div className="flex justify-center gap-4">
                {["puntos", "canjes"].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t as "puntos" | "canjes")}
                        className={`px-5 py-2 rounded-lg font-semibold border transition-all duration-200 shadow-sm ${tab === t
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {t === "puntos" ? "Puntos" : "Canjes"}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            {tab === "puntos" ? (
                loadingPuntos ? (
                    <div className="py-20 flex justify-center items-center">
                        <Loader size={40} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
                        Sin movimientos aún.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {items.map((tx) => {
                            const Icon = tx.source === "consumo" ? UtensilsCrossed : Settings;
                            return (
                                <div
                                    key={tx._id}
                                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all"
                                >
                                    {/* Cabecera */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className="w-7 h-7 text-red-600" />
                                        <h2 className="text-lg font-bold text-black">
                                            {tx.source === "consumo" ? "Consumo" : "Ajuste"}
                                        </h2>
                                    </div>

                                    {/* Descripción */}
                                    {tx.meta?.consumoARS !== undefined && (
                                        <p className="text-sm text-gray-700 mb-4">
                                            Consumo: ${tx.meta.consumoARS}
                                        </p>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-end justify-between">
                                        <p className="text-sm text-gray-500">{formatDate(tx.createdAt)}</p>
                                        <span
                                            className={`text-xl font-extrabold ${tx.amount >= 0 ? "text-red-600" : "text-red-600"
                                                }`}
                                        >
                                            {tx.amount >= 0 ? "+" : ""}
                                            {tx.amount}
                                        </span>
                                    </div>
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
                <p className="text-gray-500 text-center bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                    Aún no realizaste canjes.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {canjes.map((c) => (
                        <div
                            key={c._id}
                            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all"
                        >
                            {/* Cabecera */}
                            <div className="flex items-center gap-3 mb-2">
                                <Gift className="w-7 h-7 text-red-600" />
                                <h2 className="text-lg font-bold text-black">{c.rewardId?.titulo}</h2>
                            </div>

                            {/* Descripción */}
                            {c.rewardId?.descripcion && (
                                <p className="text-sm text-gray-700 mb-4">{c.rewardId.descripcion}</p>
                            )}

                            {/* Footer */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{formatDate(c.createdAt)}</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-xl font-extrabold text-red-600">
                                        -{c.puntosGastados} pts
                                    </p>
                                    <span
                                        className={`inline-block text-xs px-3 py-1 rounded-full font-semibold tracking-wide border mt-1
                      ${c.estado === "completado"
                                                ? "bg-green-50 text-green-600 border-green-300"
                                                : "bg-amber-50 text-amber-700 border-amber-300"
                                            }`}
                                    >
                                        {c.estado === "completado"
                                            ? "CANJEADO"
                                            : c.estado.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
