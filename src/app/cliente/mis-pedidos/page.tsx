"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Loader from "@/components/Loader";

type EstadoColor = "yellow" | "orange" | "blue" | "emerald";

export default function MisPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"activos" | "completados">("activos");

    useEffect(() => {
        let interval: any;
        const loadPedidos = async () => await fetchPedidosCliente();
        loadPedidos();
        interval = setInterval(loadPedidos, 4000);
        return () => clearInterval(interval);
    }, []);

    async function fetchPedidosCliente() {
        try {
            const res = await fetch("/api/pedidos", { cache: "no-store" });
            if (!res.ok) throw new Error("Error al cargar pedidos");
            const data = await res.json();
            if (JSON.stringify(data) !== JSON.stringify(pedidos)) {
                setPedidos(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("❌ Error cargando pedidos:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Loader />;

    const estados = [
        { key: "pendiente", label: "Pendiente", icon: Clock, color: "yellow" as EstadoColor },
        { key: "preparando", label: "Preparando", icon: Flame, color: "orange" as EstadoColor },
        { key: "listo", label: "Listo", icon: CheckCircle, color: "blue" as EstadoColor },
        { key: "entregado", label: "Entregado", icon: Truck, color: "emerald" as EstadoColor },
    ];

    const colorClasses: Record<EstadoColor, string> = {
        yellow: "border-yellow-500 bg-yellow-100 text-yellow-700",
        orange: "border-orange-500 bg-orange-100 text-orange-700",
        blue: "border-blue-500 bg-blue-100 text-blue-700",
        emerald: "border-emerald-500 bg-emerald-100 text-emerald-700",
    };

    const activos = pedidos.filter(
        (p) => p.estado === "pendiente" || p.estado === "preparando" || p.estado === "listo"
    );
    const completados = pedidos.filter((p) => p.estado === "entregado");
    const pedidosActuales = vista === "activos" ? activos : completados;

    return (
        <div className="p-6 min-h-screen bg-white">
            <h1 className="text-3xl font-bold mb-6 text-center text-black">Mis Pedidos</h1>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center gap-4 mb-8">
                <button
                    onClick={() => setVista("activos")}
                    className={`px-6 py-2 rounded-full text-sm font-medium border transition-all ${vista === "activos"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700"
                        }`}
                >
                    Pendientes
                </button>
                <button
                    onClick={() => setVista("completados")}
                    className={`px-6 py-2 rounded-full text-sm font-medium border transition-all ${vista === "completados"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700"
                        }`}
                >
                    Finalizados
                </button>
            </div>

            {/* 🧩 Lista de pedidos */}
            {pedidosActuales.length === 0 ? (
                <p className="text-gray-500 text-center mt-12">
                    {vista === "activos"
                        ? "No tenés pedidos activos en este momento."
                        : "No tenés pedidos finalizados todavía."}
                </p>
            ) : (
                <PedidosLista pedidos={pedidosActuales} estados={estados} colorClasses={colorClasses} />
            )}
        </div>
    );
}

function PedidosLista({
    pedidos,
    estados,
    colorClasses,
}: {
    pedidos: any[];
    estados: { key: string; label: string; icon: any; color: EstadoColor }[];
    colorClasses: Record<EstadoColor, string>;
}) {
    const getEstadoIndex = (estado: string) =>
        estados.findIndex((e) => e.key === estado);

    const barColors: Record<EstadoColor, string> = {
        yellow: "bg-yellow-500",
        orange: "bg-orange-500",
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
    };

    return (
        <div className="grid sm:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <AnimatePresence>
                {pedidos.map((p) => {
                    const estadoIndex = getEstadoIndex(p.estado);
                    const color = (estados[estadoIndex]?.color || "yellow") as EstadoColor;
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
                            className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
                        >
                            {/* Cabecera */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {p.nombre || "Cliente"}
                                    </h2>
                                    <p className="text-sm text-gray-600">Entrega: {p.tipoEntrega}</p>
                                    <p className="text-xs text-gray-500">{fechaHora}</p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${colorClasses[color]}`}
                                >
                                    {p.estado}
                                </span>
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

                            {/* Timeline */}
                            <div className="relative w-full flex justify-between items-center mt-5">
                                {/* Línea base */}
                                <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />

                                {/* Progreso dinámico */}
                                <motion.div
                                    className={`absolute top-[18px] left-0 h-[3px] ${barColors[color]} rounded-full`}
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${(estadoIndex / (estados.length - 1)) * 100}%`,
                                    }}
                                    transition={{ duration: 0.4 }}
                                />

                                {/* Estados */}
                                {estados.map((estado, index) => {
                                    const Icon = estado.icon;
                                    const isActive = index <= estadoIndex;
                                    const estadoColor = estado.color;

                                    return (
                                        <div
                                            key={estado.key}
                                            className="flex flex-col items-center text-xs w-full relative z-10"
                                        >
                                            <div
                                                className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${isActive
                                                        ? `border-${estadoColor}-500 bg-${estadoColor}-100 text-${estadoColor}-700`
                                                        : "border-gray-300 bg-white text-gray-400"
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span
                                                className={`mt-2 font-medium ${isActive ? "text-gray-800" : "text-gray-400"
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
