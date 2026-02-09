"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed, Settings, Gift, ChevronLeft, ChevronRight } from "lucide-react";
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

    // paginación puntos
    const [page, setPage] = useState(1);
    const pageSize = 8;

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/puntos", { cache: "no-store" });
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
                const res = await fetch("/api/canjes", { cache: "no-store" });
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

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    return (
        <div className="p-6 space-y-6 bg-white min-h-screen">
            <h1 className="text-4xl font-extrabold mb-10 text-center text-black">
                Historial
            </h1>

            {/* Tabs */}
            <div className="flex justify-center gap-4">
                {["puntos", "canjes"].map((t) => (
                    <button
                        key={t}
                        onClick={() => {
                            setTab(t as any);
                            setPage(1);
                        }}
                        className={`px-5 py-2 rounded-lg font-semibold border transition-all shadow-sm ${tab === t
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {t === "puntos" ? "Puntos" : "Canjes"}
                    </button>
                ))}
            </div>

            {/* CONTENIDO */}
            {tab === "puntos" ? (
                loadingPuntos ? (
                    <div className="py-20 flex justify-center">
                        <Loader size={40} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 border rounded-xl">
                        Sin movimientos aún.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {pagedItems.map((tx) => {
                                const Icon = tx.source === "consumo" ? UtensilsCrossed : Settings;

                                return (
                                    <div
                                        key={tx._id}
                                        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icon className="w-7 h-7 text-red-600" />
                                            <h2 className="text-lg font-bold text-black">
                                                {tx.source === "consumo" ? "Consumo" : "Ajuste"}
                                            </h2>
                                        </div>

                                        {tx.meta?.consumoARS !== undefined && (
                                            <p className="text-sm text-gray-700 mb-4">
                                                Consumo: ${tx.meta.consumoARS}
                                            </p>
                                        )}

                                        <div className="flex items-end justify-between">
                                            <p className="text-sm text-gray-500">
                                                {formatDate(tx.createdAt)}
                                            </p>
                                            <span className="text-xl font-extrabold text-red-600">
                                                {tx.amount >= 0 ? "+" : ""}
                                                {tx.amount}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="mt-10 flex justify-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="h-10 px-3 rounded-lg border bg-white disabled:opacity-50"
                                >
                                    <ChevronLeft />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`h-10 min-w-10 px-3 rounded-lg border font-semibold ${p === page
                                                ? "bg-red-600 text-white border-red-600"
                                                : "bg-white text-black border-gray-300 hover:bg-gray-100"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="h-10 px-3 rounded-lg border bg-white disabled:opacity-50"
                                >
                                    <ChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )
            ) : loadingCanjes ? (
                <div className="py-20 flex justify-center">
                    <Loader size={40} />
                </div>
            ) : canjes.length === 0 ? (
                <div className="p-6 text-center text-gray-500 border rounded-xl">
                    Aún no realizaste canjes.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {canjes.map((c) => (
                        <div
                            key={c._id}
                            className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Gift className="w-7 h-7 text-red-600" />
                                <h2 className="text-lg font-bold text-black">
                                    {c.rewardId?.titulo}
                                </h2>
                            </div>

                            {c.rewardId?.descripcion && (
                                <p className="text-sm text-gray-700 mb-4">
                                    {c.rewardId.descripcion}
                                </p>
                            )}

                            <div className="flex items-end justify-between">
                                <p className="text-sm text-gray-500">
                                    {formatDate(c.createdAt)}
                                </p>
                                <div className="text-right">
                                    <p className="text-xl font-extrabold text-red-600">
                                        -{c.puntosGastados} pts
                                    </p>
                                    <span
                                        className={`inline-block mt-1 text-xs px-3 py-1 rounded-full border font-semibold ${c.estado === "completado"
                                                ? "bg-green-50 text-green-600 border-green-300"
                                                : "bg-amber-50 text-amber-700 border-amber-300"
                                            }`}
                                    >
                                        {c.estado.toUpperCase()}
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