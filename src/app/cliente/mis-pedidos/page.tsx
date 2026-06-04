"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type EstadoColor = "yellow" | "orange" | "blue" | "emerald";

export default function MisPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"activos" | "completados">("activos");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

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
    const totalPages = Math.max(1, Math.ceil(pedidosActuales.length / PAGE_SIZE));
    const pagedPedidos = pedidosActuales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="p-6 min-h-screen bg-white">
            <h1 className="text-4xl font-extrabold mb-10 text-center text-black">Mis Pedidos</h1>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center gap-4 mb-8">
                <button
                    onClick={() => { setVista("activos"); setPage(1); }}
                    className={`px-6 py-2 rounded-full text-sm font-medium border transition-all ${vista === "activos"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700"
                        }`}
                >
                    Pendientes
                </button>
                <button
                    onClick={() => { setVista("completados"); setPage(1); }}
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
                <>
                    <PedidosLista pedidos={pagedPedidos} estados={estados} colorClasses={colorClasses} />

                    {totalPages > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
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
            )}
        </div>
    );
}

function CancelButton({ pedidoId, cancelableUntil }: { pedidoId: string; cancelableUntil: string }) {
    const [timeLeft, setTimeLeft] = useState<number>(
        new Date(cancelableUntil).getTime() - Date.now()
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(new Date(cancelableUntil).getTime() - Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, [cancelableUntil]);

    if (timeLeft <= 0) return null;

    const minutos = Math.floor(timeLeft / 60000);
    const segundos = Math.floor((timeLeft % 60000) / 1000);

    const handleCancel = async () => {
        const confirm = await swalBase.fire({
            title: "¿Cancelar pedido?",
            text: "Tenés unos minutos para arrepentirte, pero si confirmás se cancelará definitivamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, cancelar",
            cancelButtonText: "No, volver",
        });

        if (!confirm.isConfirmed) return;

        // 🌀 Mostrar loader mientras se procesa la cancelación
        swalBase.fire({
            title: "Cancelando pedido...",
            html: '<div class="flex justify-center mt-3"><div class="loader"></div></div>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                swalBase.showLoading();
            },
        });

        try {
            const res = await fetch(`/api/pedidos/${pedidoId}/cancelar`, { method: "PUT" });
            const data = await res.json();

            if (res.ok) {
                await swalBase.fire({
                    icon: "success",
                    title: "Pedido cancelado",
                    text: "Tu pedido fue cancelado correctamente.",
                    timer: 2000,
                    showConfirmButton: false,
                });
                window.location.reload();
            } else {
                await swalBase.fire({
                    icon: "error",
                    title: "Error",
                    text: data.message || "No se pudo cancelar el pedido.",
                });
            }
        } catch (error) {
            await swalBase.fire({
                icon: "error",
                title: "Error de conexión",
                text: "No se pudo contactar con el servidor.",
            });
        }
    };

    return (
        <div className="flex justify-between items-center mb-3">
            <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-500 transition"
            >
                Cancelar pedido
            </button>
            <span className="text-gray-600 text-sm font-medium">
                ⏳ {minutos}:{segundos.toString().padStart(2, "0")}
            </span>
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
        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
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
                                        Pedido
                                    </h2>
                                    {p.tipoEntrega === "envio" && p.direccion && (
                                        <p className="text-sm text-gray-700 mt-1">
                                            📍 <span className="font-medium">{p.direccion}</span>
                                        </p>
                                    )}
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

                            {/* Cancelación (solo si es pendiente y dentro del tiempo límite) */}
                            {p.estado === "pendiente" && p.cancelableUntil && (
                                <CancelButton pedidoId={p._id} cancelableUntil={p.cancelableUntil} />
                            )}

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
