"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Clock, CheckCircle, Loader2, User } from "lucide-react";
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

export default function ChatsList({ remitente }: { remitente: "admin" | "cliente" }) {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPedidos = async () => {
            try {
                const res = await fetch("/api/pedidos", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();

                // Filtrar pedidos activos
                const activos = data.filter(
                    (p: Pedido) => p.estado !== "entregado" && p.estado !== "cancelado"
                );

                setPedidos(activos);
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

    if (pedidos.length === 0)
        return (
            <div className="flex flex-col justify-center items-center h-[80vh] text-gray-500">
                <MessageSquare className="w-10 h-10 mb-2 text-gray-400" />
                <p className="text-sm text-center">No hay chats activos por el momento.</p>
            </div>
        );

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto py-4">
            <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">Chats Activos</h1>

            <div className="divide-y divide-gray-200 rounded-2xl bg-white shadow-md overflow-hidden">
                {pedidos.map((p) => (
                    <Link
                        key={p._id}
                        href={
                            remitente === "admin"
                                ? `/admin/pedidos/${p._id}/chat`
                                : `/cliente/mis-pedidos/${p._id}/chat`
                        }
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition"
                    >
                        {/* 📦 Información del pedido */}
                        <div className="flex flex-col">
                            {/* Nombre del cliente */}
                            {p.userId?.nombre && (
                                <div className="flex items-center gap-1 text-sm text-gray-700 font-semibold">
                                    <User className="w-4 h-4 text-gray-500" />
                                    {p.userId.nombre} {p.userId.apellido}
                                </div>
                            )}

                            {/* ID + Estado */}
                            <span className="text-sm text-gray-600">
                                Pedido <span className="font-medium">#{p._id.slice(-6)}</span> •{" "}
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

                            {/* Fecha */}
                            <span className="text-xs text-gray-400 mt-1">
                                {format(new Date(p.updatedAt), "dd/MM HH:mm", { locale: es })}
                            </span>
                        </div>

                        {/* Ícono según estado */}
                        {p.estado === "pendiente" && <Clock className="w-5 h-5 text-yellow-500" />}
                        {p.estado === "preparando" && (
                            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                        )}
                        {p.estado === "listo" && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </Link>
                ))}
            </div>
        </div>
    );
}
