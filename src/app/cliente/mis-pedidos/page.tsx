"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck, ChevronLeft, ChevronRight, PackagePlus, MapPin, X, ArrowLeftRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type EstadoColor = "yellow" | "orange" | "blue" | "emerald";

const formatPrice = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

export default function MisPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"activos" | "completados">("activos");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

    // Estado para cambio de tipo de entrega
    const [cambioModal, setCambioModal] = useState<{ pedidoId: string; costoEnvio: number } | null>(null);
    const [nuevaDireccion, setNuevaDireccion] = useState("");
    const [cambiandoId, setCambiandoId] = useState<string | null>(null);

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

    async function ejecutarCambio(pedidoId: string, nuevaTipo: string, direccion?: string) {
        setCambiandoId(pedidoId);
        try {
            const res = await fetch(`/api/pedidos/${pedidoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accion: "cambiarTipoEntrega", nuevaTipo, direccion }),
            });
            if (res.ok) {
                const data = await res.json();
                setPedidos(prev => prev.map(p => p._id === pedidoId ? { ...p, ...data.pedido } : p));
                setCambioModal(null);
            } else {
                const err = await res.json().catch(() => ({}));
                await swalBase.fire({ icon: "error", title: "Error", text: err.error || "No se pudo cambiar el tipo de entrega." });
            }
        } finally { setCambiandoId(null); }
    }

    function pedirCambio(p: any) {
        if (!["pendiente", "preparando"].includes(p.estado)) return;
        if (p.tipoEntrega === "envio") {
            swalBase.fire({
                title: "¿Cambiar a retiro?",
                html: `Tu pedido pasará a <b>retiro en el local</b>${p.costoEnvio > 0 ? ` y se descontarán <b>$${formatPrice(p.costoEnvio)}</b> del total` : ""}.`,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sí, retirar en local",
                cancelButtonText: "Cancelar",
            }).then(r => { if (r.isConfirmed) ejecutarCambio(p._id, "retira"); });
        } else {
            setNuevaDireccion("");
            setCambioModal({ pedidoId: p._id, costoEnvio: 0 });
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

    const ESTADOS_FINALES = ["entregado", "cerrado", "cobrado"];
    const pedidosApp = pedidos.filter((p) => p.fuente !== "autoservicio");
    const activos = pedidosApp.filter(
        (p) => p.estado === "pendiente" || p.estado === "preparando" || p.estado === "listo"
    );
    const completados = pedidosApp.filter((p) => ESTADOS_FINALES.includes(p.estado));
    const pedidosActuales = vista === "activos" ? activos : completados;
    const totalPages = Math.max(1, Math.ceil(pedidosActuales.length / PAGE_SIZE));
    const pagedPedidos = pedidosActuales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const getEstadoIndex = (estado: string) => {
        if (ESTADOS_FINALES.includes(estado)) return estados.length - 1;
        return estados.findIndex((e) => e.key === estado);
    };

    const barColors: Record<EstadoColor, string> = {
        yellow: "bg-yellow-500",
        orange: "bg-orange-500",
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
    };

    return (
        <div className="p-6 min-h-screen bg-white">
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-4xl font-extrabold text-black">Mis Pedidos</h1>
                <Link
                    href="/cliente/pedidos"
                    className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition active:scale-[0.97]"
                >
                    <PackagePlus size={16} />
                    Nuevo pedido
                </Link>
            </div>

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

            {pedidosActuales.length === 0 ? (
                <p className="text-gray-500 text-center mt-12">
                    {vista === "activos"
                        ? "No tenés pedidos activos en este momento."
                        : "No tenés pedidos finalizados todavía."}
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
                        <AnimatePresence>
                            {pagedPedidos.map((p) => {
                                const estadoIndex = getEstadoIndex(p.estado);
                                const color = (estados[estadoIndex]?.color || "yellow") as EstadoColor;
                                const fechaHora = p.createdAt
                                    ? format(new Date(p.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
                                    : "";
                                const puedecambiar = ["pendiente", "preparando"].includes(p.estado) && p.fuente === "cliente";

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
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <h2 className="text-lg font-bold text-gray-900">Pedido</h2>
                                                    {p.fuente === "autoservicio" && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Autoservicio</span>
                                                    )}
                                                    {p.fuente === "cliente" && p.tipoEntrega === "envio" && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                                                            <Truck size={10} /> Envío
                                                        </span>
                                                    )}
                                                    {p.fuente === "cliente" && p.tipoEntrega !== "envio" && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Retiro</span>
                                                    )}
                                                    {puedecambiar && (
                                                        <button
                                                            onClick={() => pedirCambio(p)}
                                                            disabled={cambiandoId === p._id}
                                                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition disabled:opacity-50"
                                                        >
                                                            {cambiandoId === p._id
                                                                ? <Loader2 size={9} className="animate-spin" />
                                                                : <ArrowLeftRight size={9} />
                                                            }
                                                            {p.tipoEntrega === "envio" ? "Retirar en local" : "Pedir a domicilio"}
                                                        </button>
                                                    )}
                                                </div>
                                                {p.fuente === "autoservicio" && p.mesa && (
                                                    <p className="text-xs text-purple-600 font-medium">Mesa {p.mesa}</p>
                                                )}
                                                {p.tipoEntrega === "envio" && p.direccion && (
                                                    <p className="text-sm text-gray-700 mt-1 flex items-start gap-1">
                                                        <MapPin size={13} className="shrink-0 mt-0.5 text-gray-400" />
                                                        <span className="font-medium">{p.direccion}</span>
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500">{fechaHora}</p>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border shrink-0 ml-2 ${colorClasses[color]}`}
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

                                        {/* Total / costo de envío */}
                                        {p.tipoEntrega === "envio" && p.costoEnvio > 0 ? (
                                            <div className="text-sm text-gray-700 mb-3 space-y-0.5">
                                                <div className="flex justify-between">
                                                    <span>Subtotal</span>
                                                    <span>${formatPrice(p.total - p.costoEnvio)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Envío a domicilio</span>
                                                    <span>${formatPrice(p.costoEnvio)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-gray-900">
                                                    <span>Total</span>
                                                    <span>${formatPrice(p.total)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between text-sm font-bold text-gray-900 mb-3">
                                                <span>Total</span>
                                                <span>${formatPrice(p.total)}</span>
                                            </div>
                                        )}

                                        {/* Cancelación */}
                                        {p.estado === "pendiente" && p.cancelableUntil && (
                                            <CancelButton pedidoId={p._id} cancelableUntil={p.cancelableUntil} />
                                        )}

                                        {/* Timeline */}
                                        <div className="relative w-full flex justify-between items-center mt-5">
                                            <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />
                                            <motion.div
                                                className={`absolute top-[18px] left-0 h-[3px] ${barColors[color]} rounded-full`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(estadoIndex / (estados.length - 1)) * 100}%` }}
                                                transition={{ duration: 0.4 }}
                                            />
                                            {estados.map((estado, index) => {
                                                const Icon = estado.icon;
                                                const isActive = index <= estadoIndex;
                                                const estadoColor = estado.color;
                                                return (
                                                    <div key={estado.key} className="flex flex-col items-center text-xs w-full relative z-10">
                                                        <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${isActive
                                                            ? `border-${estadoColor}-500 bg-${estadoColor}-100 text-${estadoColor}-700`
                                                            : "border-gray-300 bg-white text-gray-400"
                                                            }`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <span className={`mt-2 font-medium ${isActive ? "text-gray-800" : "text-gray-400"}`}>
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

                    {totalPages > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="h-10 px-3 rounded-lg border bg-white disabled:opacity-50">
                                <ChevronLeft />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`h-10 min-w-10 px-3 rounded-lg border font-semibold ${p === page
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-white text-black border-gray-300 hover:bg-gray-100"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="h-10 px-3 rounded-lg border bg-white disabled:opacity-50">
                                <ChevronRight />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modal: cambiar retira → envio */}
            {cambioModal && (
                <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center p-4"
                    onClick={() => !cambiandoId && setCambioModal(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-600 px-5 pt-5 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck size={18} className="text-white" />
                                <div>
                                    <h3 className="font-black text-white text-base leading-tight">Cambiar a domicilio</h3>
                                    <p className="text-blue-200 text-xs mt-0.5">Ingresá la dirección de entrega</p>
                                </div>
                            </div>
                            <button onClick={() => setCambioModal(null)} className="p-1 text-white/60 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 py-4">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Dirección *</label>
                            <input
                                autoFocus
                                value={nuevaDireccion}
                                onChange={e => setNuevaDireccion(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && nuevaDireccion.trim() && ejecutarCambio(cambioModal.pedidoId, "envio", nuevaDireccion)}
                                placeholder="Ej: San Martín 456"
                                style={{ fontSize: "16px" }}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 transition"
                            />
                            <p className="text-xs text-gray-400 mt-2">Se sumará el costo de envío al total si corresponde.</p>
                        </div>
                        <div className="px-5 pb-5 flex gap-2">
                            <button onClick={() => setCambioModal(null)} disabled={!!cambiandoId}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition">
                                Cancelar
                            </button>
                            <button
                                onClick={() => ejecutarCambio(cambioModal.pedidoId, "envio", nuevaDireccion)}
                                disabled={!!cambiandoId || !nuevaDireccion.trim()}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                {cambiandoId ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
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

        swalBase.fire({
            title: "Cancelando pedido...",
            html: '<div class="flex justify-center mt-3"><div class="loader"></div></div>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { swalBase.showLoading(); },
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
                await swalBase.fire({ icon: "error", title: "Error", text: data.message || "No se pudo cancelar el pedido." });
            }
        } catch {
            await swalBase.fire({ icon: "error", title: "Error de conexión", text: "No se pudo contactar con el servidor." });
        }
    };

    return (
        <div className="flex justify-between items-center mb-3">
            <button onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-500 transition">
                Cancelar pedido
            </button>
            <span className="text-gray-600 text-sm font-medium">
                ⏳ {minutos}:{segundos.toString().padStart(2, "0")}
            </span>
        </div>
    );
}
