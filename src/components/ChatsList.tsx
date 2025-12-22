"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    MessageSquare,
    Clock,
    CheckCircle,
    Loader2,
    User,
    PackageX,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Pedido = {
    _id: string;
    estado: string;
    tipoEntrega: string;
    updatedAt: string;
    createdAt: string;
    userId?: {
        nombre?: string;
        apellido?: string;
    };
};

export default function ChatsList({
    remitente,
}: {
    remitente: "admin" | "cliente";
}) {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"activos" | "finalizados">("activos");

    useEffect(() => {
        const fetchPedidos = async () => {
            try {
                const res = await fetch("/api/pedidos", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                setPedidos(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPedidos();
        const interval = setInterval(fetchPedidos, 5000);
        return () => clearInterval(interval);
    }, [remitente]);

    if (loading)
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        );

    const activos = pedidos.filter(
        (p) => !["entregado", "cancelado"].includes(p.estado)
    );

    const finalizados = pedidos.filter((p) =>
        ["entregado", "cancelado"].includes(p.estado)
    );

    const lista = tab === "activos" ? activos : finalizados;

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto py-4">
            <h1 className="text-4xl font-extrabold mb-6 text-center text-black">
                Chats
            </h1>

            {/* TABS */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setTab("activos")}
                    className={`flex-1 py-2 rounded-xl font-semibold transition ${tab === "activos"
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                >
                    Activos ({activos.length})
                </button>

                <button
                    onClick={() => setTab("finalizados")}
                    className={`flex-1 py-2 rounded-xl font-semibold transition ${tab === "finalizados"
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                >
                    Finalizados ({finalizados.length})
                </button>
            </div>

            {/* LISTA */}
            {lista.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-[50vh] text-gray-500">
                    <PackageX className="w-10 h-10 mb-2 text-gray-400" />
                    <p className="text-sm text-center">
                        No hay chats {tab === "activos" ? "activos" : "finalizados"}.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-gray-200 rounded-2xl bg-white shadow-md overflow-hidden">
                    {lista.map((p) => (
                        <Link
                            key={p._id}
                            href={
                                remitente === "admin"
                                    ? `/admin/pedidos/${p._id}/chat`
                                    : `/cliente/mis-pedidos/${p._id}/chat`
                            }
                            className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition"
                        >
                            {/* INFO */}
                            <div className="flex flex-col gap-1">
                                {p.userId?.nombre && (
                                    <div className="flex items-center gap-1 text-sm text-gray-700 font-semibold">
                                        <User className="w-4 h-4 text-gray-500" />
                                        {p.userId.nombre} {p.userId.apellido}
                                    </div>
                                )}

                                <span className="text-sm text-gray-600">
                                    Pedido{" "}
                                    <span className="font-medium">#{p._id.slice(-6)}</span> •{" "}
                                    <span
                                        className={`capitalize font-semibold ${p.estado === "pendiente"
                                                ? "text-yellow-600"
                                                : p.estado === "preparando"
                                                    ? "text-red-600"
                                                    : p.estado === "listo"
                                                        ? "text-green-600"
                                                        : "text-gray-500"
                                            }`}
                                    >
                                        {p.estado}
                                    </span>{" "}
                                    ({p.tipoEntrega})
                                </span>

                                <span className="text-xs text-gray-400">
                                    {format(new Date(p.updatedAt), "dd/MM HH:mm", {
                                        locale: es,
                                    })}
                                </span>
                            </div>

                            {/* ICONO */}
                            {p.estado === "pendiente" && (
                                <Clock className="w-5 h-5 text-yellow-500" />
                            )}
                            {p.estado === "preparando" && (
                                <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                            )}
                            {p.estado === "listo" && (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
