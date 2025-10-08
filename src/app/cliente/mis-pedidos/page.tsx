"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";

export default function MisPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPedidosCliente();
    }, []);

    async function fetchPedidosCliente() {
        try {
            const res = await fetch("/api/pedidos"); // endpoint cliente
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

    const activos = pedidos.filter((p) => p.estado !== "entregado");
    const completados = pedidos.filter((p) => p.estado === "entregado");

    return (
        <div className="p-6 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8 flex justify-center items-center gap-2">
                Mis Pedidos
            </h1>

            {pedidos.length === 0 ? (
                <p className="text-gray-400 text-center mt-12">
                    Aún no realizaste ningún pedido.
                </p>
            ) : (
                <div className="space-y-10">
                    {/* 🔹 Pedidos activos */}
                    {activos.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-amber-400">
                                🕓 En curso
                            </h2>
                            <PedidosLista pedidos={activos} estados={estados} />
                        </section>
                    )}

                    {/* ✅ Pedidos completados */}
                    {completados.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                                ✅ Entregados
                            </h2>
                            <PedidosLista pedidos={completados} estados={estados} />
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------
 * 🧩 Componente reutilizable de lista de pedidos
 * ------------------------------ */
function PedidosLista({
    pedidos,
    estados,
}: {
    pedidos: any[];
    estados: any[];
}) {
    const getEstadoIndex = (estado: string) =>
        estados.findIndex((e) => e.key === estado);

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {pedidos.map((p) => {
                    const estadoIndex = getEstadoIndex(p.estado);

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
                                {/* Línea base */}
                                <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-700 rounded-full" />

                                {/* Línea progreso */}
                                <motion.div
                                    className={`absolute top-[18px] left-0 h-[3px] bg-${estados[estadoIndex]?.color}-500 rounded-full`}
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${(estadoIndex / (estados.length - 1)) * 100}%`,
                                    }}
                                    transition={{ duration: 0.6 }}
                                />

                                {/* Puntos */}
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
