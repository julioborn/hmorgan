"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Loader from "@/components/Loader";

export default function AdminPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"pendientes" | "enProceso" | "finalizados">("pendientes");

    useEffect(() => {
        const loadPedidos = async () => await fetchPedidos();
        loadPedidos();
        const interval = setInterval(loadPedidos, 4000);
        return () => clearInterval(interval);
    }, []);

    async function fetchPedidos() {
        try {
            const res = await fetch("/api/pedidos", { cache: "no-store" });
            if (!res.ok) {
                console.error("Error HTTP:", res.status);
                setPedidos([]);
                return;
            }
            const data = await res.json();
            setPedidos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("❌ Error cargando pedidos:", err);
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    }

    async function actualizarEstado(id: string, estado: string) {
        try {
            const res = await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, estado }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire("❌", err.message || "Error al actualizar", "error");
                return;
            }

            Swal.fire({
                title: "Actualizado",
                icon: "success",
                timer: 1000,
                showConfirmButton: false,
            });

            fetchPedidos();
        } catch (error) {
            Swal.fire("❌", "Error de conexión", "error");
        }
    }

    async function eliminarPedido(id: string) {
        try {
            const confirm = await Swal.fire({
                title: "¿Rechazar pedido?",
                text: "Esta acción eliminará el pedido.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#ef4444",
            });

            if (!confirm.isConfirmed) return;

            const res = await fetch(`/api/pedidos?id=${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                Swal.fire("❌", "Error al eliminar el pedido", "error");
                return;
            }

            Swal.fire("Eliminado", "El pedido fue rechazado.", "success");
            fetchPedidos();
        } catch (error) {
            Swal.fire("❌", "Error de conexión", "error");
        }
    }

    if (loading) return <Loader />;

    const estados = [
        { key: "pendiente", label: "Pendiente", icon: Clock, color: "yellow" },
        { key: "preparando", label: "Preparando", icon: Flame, color: "orange" },
        { key: "listo", label: "Listo", icon: CheckCircle, color: "blue" },
        { key: "entregado", label: "Entregado", icon: Truck, color: "emerald" },
    ];

    const colorClasses: Record<string, string> = {
        yellow: "border-yellow-400 bg-yellow-500/20 text-yellow-300",
        orange: "border-orange-400 bg-orange-500/20 text-orange-300",
        blue: "border-blue-400 bg-blue-500/20 text-blue-300",
        emerald: "border-emerald-400 bg-emerald-500/20 text-emerald-300",
    };

    const barColors: Record<string, string> = {
        yellow: "bg-yellow-500",
        orange: "bg-orange-500",
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
    };

    const textColors: Record<string, string> = {
        yellow: "text-yellow-300",
        orange: "text-orange-300",
        blue: "text-blue-300",
        emerald: "text-emerald-300",
    };

    const getEstadoIndex = (estado: string) =>
        estados.findIndex((e) => e.key === estado);

    const pendientes = pedidos.filter((p) => p.estado === "pendiente");
    const enProceso = pedidos.filter(
        (p) => p.estado === "preparando" || p.estado === "listo"
    );
    const finalizados = pedidos.filter((p) => p.estado === "entregado");

    const notificacionPendientes = pendientes.length;
    const notificacionFinalizados = pedidos.filter((p) => p.estado === "listo").length;

    const lista =
        vista === "pendientes"
            ? pendientes
            : vista === "enProceso"
                ? enProceso
                : finalizados;

    return (
        <div className="p-6 min-h-screen text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Pedidos</h1>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center gap-4 mb-8">
                <button
                    onClick={() => setVista("pendientes")}
                    className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${vista === "pendientes"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                        }`}
                >
                    Pendientes
                    {notificacionPendientes > 0 && (
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {notificacionPendientes}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setVista("enProceso")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${vista === "enProceso"
                        ? "bg-orange-500/20 text-orange-300 border border-orange-400/50"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                        }`}
                >
                    En proceso
                </button>

                <button
                    onClick={() => setVista("finalizados")}
                    className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${vista === "finalizados"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                        }`}
                >
                    Finalizados
                    {notificacionFinalizados > 0 && (
                        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {notificacionFinalizados}
                        </span>
                    )}
                </button>
            </div>

            {/* 📋 Listado */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {lista.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 mt-12">
                            No hay pedidos en esta vista.
                        </p>
                    ) : (
                        lista.map((p) => {
                            const estadoIndex = getEstadoIndex(p.estado);
                            const color = estados[estadoIndex]?.color || "gray";
                            const fechaHora = p.createdAt
                                ? format(new Date(p.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
                                : "";

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
                                            <p className="text-xs text-gray-500">{fechaHora}</p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${colorClasses[color] ||
                                                "border-gray-500 text-gray-400 bg-gray-800/40"
                                                }`}
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

                                    {p.estado === "pendiente" ? (
                                        // ✅ Botones aceptar/rechazar
                                        <div className="flex justify-between mt-4">
                                            <button
                                                onClick={() =>
                                                    actualizarEstado(p._id, "preparando")
                                                }
                                                className="flex-1 mr-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition"
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => eliminarPedido(p._id)}
                                                className="flex-1 ml-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition"
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    ) : (
                                        // 🔄 Línea de tiempo
                                        <div className="relative w-full flex justify-between items-center mt-4">
                                            <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-700 rounded-full" />
                                            <motion.div
                                                className={`absolute top-[18px] left-0 h-[3px] ${barColors[color] || "bg-gray-500"
                                                    } rounded-full`}
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${(estadoIndex /
                                                        (estados.length - 1)) *
                                                        100
                                                        }%`,
                                                }}
                                                transition={{ duration: 0.4 }}
                                            />
                                            {estados.map((estado, index) => {
                                                const Icon = estado.icon;
                                                const isActive = index <= estadoIndex;
                                                const activeColor =
                                                    colorClasses[estado.color];

                                                return (
                                                    <div
                                                        key={estado.key}
                                                        className="flex flex-col items-center text-xs w-full relative z-10"
                                                    >
                                                        <motion.button
                                                            onClick={() =>
                                                                actualizarEstado(
                                                                    p._id,
                                                                    estado.key
                                                                )
                                                            }
                                                            whileTap={{ scale: 0.9 }}
                                                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${isActive
                                                                ? activeColor
                                                                : "border-gray-600 bg-gray-800 text-gray-500"
                                                                }`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </motion.button>
                                                        <span
                                                            className={`mt-2 ${isActive
                                                                ? textColors[
                                                                estado.color
                                                                ]
                                                                : "text-gray-500"
                                                                }`}
                                                        >
                                                            {estado.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
