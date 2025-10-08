"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";

export default function AdminPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let interval: any;
        const loadPedidos = async () => await fetchPedidos();

        // Carga inicial
        loadPedidos();

        // 🔄 Actualiza cada 4 segundos (en background)
        interval = setInterval(loadPedidos, 4000);

        return () => clearInterval(interval);
    }, []);

    async function fetchPedidos() {
        try {
            const res = await fetch("/api/admin/pedidos", {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
            });
            if (!res.ok) {
                console.error("Error HTTP:", res.status);
                setPedidos([]);
                return;
            }

            const data = await res.json();
            console.log("📦 Pedidos obtenidos:", data);
            setPedidos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("❌ Error cargando pedidos:", err);
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    }

    async function actualizarEstado(id: string, estado: string) {
        const res = await fetch("/api/admin/pedidos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, estado }),
        });

        if (res.ok) {
            Swal.fire({
                title: "Actualizado",
                icon: "success",
                timer: 1200,
                showConfirmButton: false,
            });
            fetchPedidos(); // ✅ Refrescar al instante
        } else {
            Swal.fire("❌", "Error al actualizar", "error");
        }
    }

    if (loading)
        return (
            <p className="p-6 text-center text-gray-300 animate-pulse">
                Cargando pedidos...
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

    return (
        <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
            <h1 className="text-3xl font-bold mb-6">Pedidos</h1>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {pedidos.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 mt-12">
                            No hay pedidos actualmente.
                        </p>
                    ) : (
                        pedidos.map((p) => {
                            const estadoIndex = getEstadoIndex(p.estado);

                            return (
                                <motion.div
                                    key={p._id}
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-md hover:shadow-xl transition-all"
                                >
                                    {/* Cabecera */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h2 className="text-lg font-semibold tracking-wide">
                                                {p.userId?.nombre} {p.userId?.apellido}
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
                                                <span>
                                                    {it.menuItemId?.nombre}{" "}
                                                    <span className="text-emerald-500 font-semibold">
                                                        ×{it.cantidad}
                                                    </span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Línea de tiempo */}
                                    <div className="relative w-full flex justify-between items-center mt-4">
                                        <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-700 rounded-full" />

                                        <motion.div
                                            className={`absolute top-[18px] left-0 h-[3px] bg-${estados[estadoIndex]?.color}-500 rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${(estadoIndex / (estados.length - 1)) * 100}%`,
                                            }}
                                            transition={{ duration: 0.4 }}
                                        />

                                        {estados.map((estado, index) => {
                                            const Icon = estado.icon;
                                            const isActive = index <= estadoIndex;
                                            return (
                                                <div
                                                    key={estado.key}
                                                    className="flex flex-col items-center text-xs w-full relative z-10"
                                                >
                                                    <motion.button
                                                        onClick={() =>
                                                            actualizarEstado(p._id, estado.key)
                                                        }
                                                        whileTap={{ scale: 0.9 }}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${isActive
                                                            ? `border-${estado.color}-400 bg-${estado.color}-500/20 text-${estado.color}-300`
                                                            : "border-gray-600 bg-gray-800 text-gray-500"
                                                            }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                    </motion.button>
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
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
