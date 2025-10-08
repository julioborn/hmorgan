"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MisPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"activos" | "completados">("activos");

    useEffect(() => {
        fetchPedidosCliente();
    }, []);

    async function fetchPedidosCliente() {
        try {
            const res = await fetch("/api/pedidos");
            const data = await res.json();
            setPedidos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading)
        return (
            <p className="p-6 text-center text-gray-400 animate-pulse">
                Cargando tus pedidos...
            </p>
        );

    const estados = [
        { key: "pendiente", label: "Pendiente", icon: Clock, color: "yellow" },
        { key: "preparando", label: "Preparando", icon: Flame, color: "orange" },
        { key: "listo", label: "Listo", icon: CheckCircle, color: "blue" },
        { key: "entregado", label: "Entregado", icon: Truck, color: "emerald" },
    ];

    const getEstadoIndex = (estado: string) =>
        estados.findIndex((e) => e.key === estado);

    const activos = pedidos.filter(
        (p) => p.estado === "pendiente" || p.estado === "preparando" || p.estado === "listo"
    );
    const completados = pedidos.filter((p) => p.estado === "entregado");

    return (
        <div className="p-6 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">Mis Pedidos</h1>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center gap-4 mb-8">
                {(() => {
                    const pendientes = pedidos.filter((p) => p.estado === "pendiente");

                    return (
                        <>
                            <button
                                onClick={() => setVista("activos")}
                                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${vista === "activos"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                                    }`}
                            >
                                Pendientes
                                {pendientes.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {pendientes.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setVista("completados")}
                                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${vista === "completados"
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                                    }`}
                            >
                                Entregados
                            </button>
                        </>
                    );
                })()}
            </div>

            {pedidos.length === 0 ? (
                <p className="text-gray-400 text-center mt-12">
                    Aún no realizaste ningún pedido.
                </p>
            ) : vista === "activos" ? (
                <PedidosLista pedidos={activos} estados={estados} />
            ) : (
                <PedidosLista pedidos={completados} estados={estados} />
            )}
        </div>
    );
}

/* ------------------------------
 * 🧩 Lista de pedidos reutilizable
 * ------------------------------ */
function PedidosLista({ pedidos, estados }: { pedidos: any[]; estados: any[] }) {
    const getEstadoIndex = (estado: string) =>
        estados.findIndex((e) => e.key === estado);

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {pedidos.map((p) => {
                    const estadoIndex = getEstadoIndex(p.estado);
                    const fechaHora = p.createdAt
                        ? format(new Date(p.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
                        : "";

                    return (
                        <motion.div
                            key={p._id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-md hover:shadow-lg transition-all"
                        >
                            {/* Cabecera */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="text-base font-semibold tracking-wide">
                                        Pedido #{p._id.slice(-5).toUpperCase()}
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Entrega: {p.tipoEntrega}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {fechaHora && `${fechaHora}`}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize border border-${estados[estadoIndex]?.color}-500/40 text-${estados[estadoIndex]?.color}-400 bg-${estados[estadoIndex]?.color}-500/10`}
                                >
                                    {p.estado}
                                </span>
                            </div>

                            {/* Items */}
                            <ul className="space-y-1 text-sm text-gray-200 mb-4">
                                {p.items.map((it: any) => (
                                    <li
                                        key={it._id}
                                        className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg"
                                    >
                                        <span>🍽️</span>
                                        <span>
                                            {it.menuItemId?.nombre} × {it.cantidad}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Timeline */}
                            <div className="relative w-full flex justify-between items-center mt-4">
                                <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-700 rounded-full" />

                                <motion.div
                                    className={`absolute top-[18px] left-0 h-[3px] bg-${estados[estadoIndex]?.color}-500 rounded-full`}
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${(estadoIndex / (estados.length - 1)) * 100}%`,
                                    }}
                                    transition={{ duration: 0.6 }}
                                />

                                {estados.map((estado, index) => {
                                    const Icon = estado.icon;
                                    const isActive = index <= estadoIndex;

                                    return (
                                        <div
                                            key={estado.key}
                                            className="flex flex-col items-center text-xs w-full relative z-10"
                                        >
                                            <div
                                                className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${isActive
                                                    ? `border-${estado.color}-400 bg-${estado.color}-500/20 text-${estado.color}-300`
                                                    : "border-gray-600 bg-gray-800 text-gray-500"
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span
                                                className={`mt-2 ${isActive
                                                    ? `text-${estado.color}-300`
                                                    : "text-gray-500"
                                                    }`}
                                            >
                                                {estado.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
