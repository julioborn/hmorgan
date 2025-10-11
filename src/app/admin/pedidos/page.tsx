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
    const [vista, setVista] = useState<"pendientes" | "preparando" | "listos" | "entregados">("pendientes");
    const [direccionPrincipal, setDireccionPrincipal] = useState<string>("");
    const [direccionEnvio, setDireccionEnvio] = useState<string>("");
    const [usarOtraDireccion, setUsarOtraDireccion] = useState(false);

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
                return setPedidos([]);
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
        } catch {
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
        } catch {
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
        yellow: "border-yellow-500 bg-yellow-400/30 text-yellow-900 font-semibold",
        orange: "border-orange-500 bg-orange-100 text-orange-700 font-semibold",
        blue: "border-blue-500 bg-blue-100 text-blue-700 font-semibold",
        emerald: "border-emerald-500 bg-emerald-100 text-emerald-700 font-semibold",
    };

    const barColors: Record<string, string> = {
        yellow: "bg-yellow-500",
        orange: "bg-orange-500",
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
    };

    const getEstadoIndex = (estado: string) => estados.findIndex((e) => e.key === estado);

    // 🧭 Filtros sin solapamiento
    const pendientes = pedidos.filter((p) => p.estado === "pendiente");
    const preparando = pedidos.filter((p) => p.estado === "preparando");
    const listos = pedidos.filter((p) => p.estado === "listo");
    const entregados = pedidos.filter((p) => p.estado === "entregado");

    // 🔢 Contadores
    const notificacionPendientes = pendientes.length;
    const notificacionPreparando = preparando.length;
    const notificacionListos = listos.length;
    const notificacionEntregados = entregados.length;

    const lista = vista === "pendientes" ? pendientes : vista === "preparando" ? preparando : vista === "listos" ? listos : entregados;

    const renderBoton = (key: string, label: string, count: number) => (
        <button
            type="button"
            onClick={() => setVista(key as any)}
            aria-pressed={vista === key}
            className={`relative min-w-[130px] text-center px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${vista === key
                ? "bg-red-600 text-white border-red-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                }`}
        >
            {label}
            {/* ❌ no mostrar burbuja en Entregados */}
            {key !== "entregados" && count > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.5rem] px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold text-center">
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="p-6 min-h-screen text-white">
            <h1 className="text-3xl text-black font-bold text-center mb-6">Pedidos</h1>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center flex-wrap gap-1 mb-8">
                {renderBoton("pendientes", "Pendientes", notificacionPendientes)}
                {renderBoton("preparando", "Preparando", notificacionPreparando)}
                {renderBoton("listos", "Listos", notificacionListos)}
                {renderBoton("entregados", "Entregados", notificacionEntregados)}
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
                                    className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
                                >
                                    {/* Cabecera */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                {p.userId?.nombre} {p.userId?.apellido}
                                            </h2>
                                            <p className="text-sm text-gray-600">Entrega: {p.tipoEntrega}</p>
                                            {p.tipoEntrega === "envio" && p.direccion && (
                                                <p className="text-sm text-gray-700 mt-1">
                                                    📍 <span className="font-medium">{p.direccion}</span>
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500">{fechaHora}</p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${colorClasses[color] ||
                                                "border-gray-400 bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {p.estado}
                                        </span>
                                        {p.tipoEntrega === "envio" && p.direccion && (
                                            <p className="text-sm text-gray-700 mt-1">
                                                📍 <span className="font-medium">{p.direccion}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Items */}
                                    <ul className="space-y-1 text-sm text-gray-700 mb-4">
                                        {p.items.map((it: any) => (
                                            <li
                                                key={it._id}
                                                className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                                            >
                                                <span>{it.menuItemId?.nombre}</span>
                                                <span className="text-red-600 font-semibold">×{it.cantidad}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* ✅ Botones o Línea de tiempo */}
                                    {p.estado === "pendiente" ? (
                                        <div className="flex justify-between mt-4">
                                            <button
                                                onClick={() => actualizarEstado(p._id, "preparando")}
                                                className="flex-1 mr-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-all shadow-sm hover:shadow-red-400/40"
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => eliminarPedido(p._id)}
                                                className="flex-1 ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition-all"
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative w-full flex justify-between items-center mt-5">
                                            {/* Línea base */}
                                            <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />

                                            {/* Progreso dinámico */}
                                            <motion.div
                                                className={`absolute top-[18px] left-0 h-[3px] ${barColors[color] || "bg-gray-400"
                                                    } rounded-full`}
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${(estadoIndex / (estados.length - 1)) * 100}%`,
                                                }}
                                                transition={{ duration: 0.4 }}
                                            />

                                            {estados.map((estado, index) => {
                                                const Icon = estado.icon;
                                                const isActive = index <= estadoIndex;
                                                const activeColor = colorClasses[estado.color] || "";

                                                return (
                                                    <div
                                                        key={estado.key}
                                                        className="flex flex-col items-center text-xs w-full relative z-10"
                                                    >
                                                        <motion.button
                                                            onClick={() => actualizarEstado(p._id, estado.key)}
                                                            whileTap={{ scale: 0.9 }}
                                                            className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${isActive
                                                                ? activeColor
                                                                : "border-gray-300 bg-white text-gray-400"
                                                                }`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </motion.button>
                                                        <span
                                                            className={`mt-2 font-medium ${isActive
                                                                ? "text-gray-700"
                                                                : "text-gray-400"
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
