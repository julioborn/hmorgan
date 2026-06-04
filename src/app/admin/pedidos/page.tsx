"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

export default function AdminPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"pendientes" | "preparando" | "listos" | "entregados">("pendientes");
    const ITEMS_POR_PAGINA = 6;
    const [pagina, setPagina] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [pedidosActivos, setPedidosActivos] = useState(true);
    const [mensajeWA, setMensajeWA] = useState("");

    useEffect(() => {
        const loadPedidos = async () => await fetchPedidos();
        loadPedidos();
        const interval = setInterval(loadPedidos, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setPagina(1);
        setBusqueda("");
    }, [vista]);

    useEffect(() => {
        fetch("/api/config/pedidos")
            .then(res => res.json())
            .then(data => setPedidosActivos(data.activo));
        fetch("/api/configuracion/whatsapp")
            .then(res => res.json())
            .then(data => setMensajeWA(data.mensaje));
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
                swalBase.fire("❌", err.message || "Error al actualizar", "error");
                return;
            }

            // swalBase.fire({
            //     title: "Estado actualizado",
            //     icon: "success",
            //     timer: 900,
            //     showConfirmButton: false,
            // });

            // 🔥 CAMBIO DE BURBUJA AUTOMÁTICO
            setVista(estadoAVista[estado]);

            fetchPedidos();
        } catch {
            swalBase.fire("❌", "Error de conexión", "error");
        }
    }

    async function eliminarPedido(id: string) {
        try {
            const confirm = await swalBase.fire({
                title: "¿Rechazar pedido?",
                text: "Esta acción eliminará el pedido.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            });

            if (!confirm.isConfirmed) return;

            const res = await fetch(`/api/pedidos?id=${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                swalBase.fire("❌", "Error al eliminar el pedido", "error");
                return;
            }

            swalBase.fire("Eliminado", "El pedido fue rechazado.", "success");
            fetchPedidos();
        } catch {
            swalBase.fire("❌", "Error de conexión", "error");
        }
    }

    async function eliminarPedidoDobleConfirmacion(id: string) {
        const primerConfirm = await swalBase.fire({
            title: "⚠️ Eliminar pedido",
            text: "Esta acción eliminará el pedido definitivamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Continuar",
            cancelButtonText: "Cancelar",
        });

        if (!primerConfirm.isConfirmed) return;

        const segundoConfirm = await swalBase.fire({
            title: "❗ Confirmación final",
            text: "¿Estás SEGURO? Esta acción NO se puede deshacer.",
            icon: "error",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar definitivamente",
            cancelButtonText: "Cancelar",
        });

        if (!segundoConfirm.isConfirmed) return;

        try {
            const res = await fetch(`/api/pedidos?id=${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                swalBase.fire("❌", "Error al eliminar el pedido", "error");
                return;
            }

            swalBase.fire({
                title: "Pedido eliminado",
                icon: "success",
                timer: 1200,
                showConfirmButton: false,
            });

            fetchPedidos();
        } catch {
            swalBase.fire("❌", "Error de conexión", "error");
        }
    }

    if (loading) return <Loader />;

    function abrirWhatsApp(p: any) {
        const nombre = p.userId?.nombre ?? "";
        const lineasItems = (p.items as any[])
            .map((it) => `- ${it.menuItemId?.nombre ?? "Producto"} x${it.cantidad}`)
            .join("\n");
        const total = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(p.total ?? 0);
        const entrega = p.tipoEntrega === "envio" ? "Envio a domicilio" : "Retira en el bar";

        const partes: string[] = [
            mensajeWA.replace("{nombre}", nombre),
            "",
            "Detalle del pedido:",
            lineasItems,
            "",
            `Total: $${total}`,
            `Entrega: ${entrega}`,
        ];
        if (p.tipoEntrega === "envio" && p.direccion) {
            partes.push(`Direccion: ${p.direccion}`);
        }

        const msg = partes.join("\n");
        const phone = `549${p.userId.telefono.replace(/\D/g, "").replace(/^0/, "")}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    const estados = [
        { key: "pendiente", label: "Pendiente", icon: Clock, color: "yellow" },
        { key: "preparando", label: "Preparando", icon: Flame, color: "orange" },
        { key: "listo", label: "Listo", icon: CheckCircle, color: "blue" },
        { key: "entregado", label: "Entregado", icon: Truck, color: "emerald" },
    ];

    const estadoAVista: Record<string, typeof vista> = {
        pendiente: "pendientes",
        preparando: "preparando",
        listo: "listos",
        entregado: "entregados",
    };

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


    let lista = vista === "pendientes"
        ? pendientes
        : vista === "preparando"
            ? preparando
            : vista === "listos"
                ? listos
                : entregados;

    // Pedidos de mozos siempre primero
    lista = [...lista].sort((a, b) => {
        if (a.userId?.role === "empleado" && b.userId?.role !== "empleado") return -1;
        if (a.userId?.role !== "empleado" && b.userId?.role === "empleado") return 1;
        return 0;
    });

    // 🔍 BÚSQUEDA SOLO EN ENTREGADOS
    if (vista === "entregados" && busqueda.trim()) {
        const q = busqueda.toLowerCase();

        lista = lista.filter((p) =>
            `${p.userId?.nombre} ${p.userId?.apellido}`
                .toLowerCase()
                .includes(q) ||
            p.items.some((i: any) =>
                i.menuItemId?.nombre?.toLowerCase().includes(q)
            ) ||
            p.direccion?.toLowerCase().includes(q)
        );
    }

    const totalPaginas =
        vista === "entregados"
            ? Math.ceil(lista.length / ITEMS_POR_PAGINA)
            : 1;

    const listaPaginada =
        vista === "entregados"
            ? lista.slice(
                (pagina - 1) * ITEMS_POR_PAGINA,
                pagina * ITEMS_POR_PAGINA
            )
            : lista;

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

    const puedeCambiarEstado = (estadoActual: string, estadoDestino: string) => {
        const actual = getEstadoIndex(estadoActual);
        const destino = getEstadoIndex(estadoDestino);

        return destino > actual;
    };

    return (
        <div className="p-6 min-h-screen text-white">
            <h1 className="text-4xl font-extrabold mb-3 text-center text-black">Pedidos</h1>

            <div className="flex justify-center mb-6">
                <button
                    onClick={async () => {
                        const nuevoEstado = !pedidosActivos;

                        await fetch("/api/config/pedidos", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ activos: nuevoEstado }),
                        });

                        setPedidosActivos(nuevoEstado);

                        swalBase.fire({
                            icon: "success",
                            title: nuevoEstado ? "Pedidos ACTIVADOS" : "Pedidos DESACTIVADOS",
                            timer: 1200,
                            showConfirmButton: false,
                        });
                    }}
                    className={`px-2 py-1 rounded-xl font-semibold text-white transition
      ${pedidosActivos
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-black hover:bg-gray-900"
                        }`}
                >
                    {pedidosActivos ? "Desactivar pedidos" : "Activar pedidos"}
                </button>
            </div>

            {/* 🔘 Selector de vista */}
            <div className="flex justify-center flex-wrap gap-1 mb-8">
                {renderBoton("pendientes", "Pendientes", notificacionPendientes)}
                {renderBoton("preparando", "Preparando", notificacionPreparando)}
                {renderBoton("listos", "Listos", notificacionListos)}
                {renderBoton("entregados", "Entregados", notificacionEntregados)}
            </div>

            {vista === "entregados" && (
                <div className="max-w-2xl mx-auto mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por cliente, producto o dirección..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-red-600
                       bg-black text-white placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                </div>
            )}

            {/* 📋 Listado */}
            <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                <AnimatePresence>
                    {lista.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 mt-12">
                            No hay pedidos.
                        </p>
                    ) : (
                        listaPaginada.map((p) => {
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
                                    className={`rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden ${
                                        p.userId?.role === "empleado"
                                            ? "border-blue-400"
                                            : "border-gray-200"
                                    }`}
                                >
                                    {/* Banner mozo */}
                                    {p.userId?.role === "empleado" && (
                                        <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2">
                                            <span className="text-base">🍽️</span>
                                            <span className="font-bold text-sm">
                                                Pedido de Mozo{p.mesa ? ` — Mesa ${p.mesa}` : ""}
                                            </span>
                                            {p.notaEmpleado && (
                                                <span className="ml-auto text-xs opacity-80 italic truncate max-w-[140px]">
                                                    {p.notaEmpleado}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Contenido */}
                                    <div className={`p-5 flex flex-col flex-1 ${p.userId?.role === "empleado" ? "bg-blue-50" : "bg-white"}`}>

                                    {/* 🔹 Encabezado */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                {p.userId?.nombre} {p.userId?.apellido}
                                            </h2>
                                            {p.userId?.role !== "empleado" && (
                                                <>
                                                    <p className="text-sm text-gray-600 capitalize">
                                                        Entrega: {p.tipoEntrega}
                                                    </p>
                                                    {p.userId?.telefono && (
                                                        <p className="text-sm text-gray-500">
                                                            📱 {p.userId.telefono}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            {p.tipoEntrega === "envio" && p.direccion && (
                                                <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                                                    📍 <span className="font-medium">{p.direccion}</span>
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">{fechaHora}</p>
                                        </div>

                                        {/* Estado */}
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${colorClasses[color] ||
                                                "border-gray-400 bg-gray-100 text-gray-600"}`}
                                        >
                                            {p.estado}
                                        </span>
                                    </div>

                                    {/* 🧾 Items */}
                                    <ul className="mt-3 mb-4 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                        {p.items.map((it: any) => (
                                            <li
                                                key={it._id}
                                                className="flex justify-between items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                                            >
                                                <span className="text-sm text-gray-800">
                                                    {it.menuItemId?.nombre}
                                                </span>
                                                <span className="text-red-600 font-semibold text-sm">
                                                    ×{it.cantidad}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* 🔘 Acciones o progreso */}
                                    {p.estado === "pendiente" ? (
                                        <div className="flex gap-3 mt-2">
                                            <button
                                                onClick={() => actualizarEstado(p._id, "preparando")}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-all shadow-sm hover:shadow-red-400/40"
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => eliminarPedido(p._id)}
                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg transition-all"
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
                                                className={`absolute top-[18px] left-0 h-[3px] ${barColors[color] || "bg-gray-400"} rounded-full`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(estadoIndex / (estados.length - 1)) * 100}%` }}
                                                transition={{ duration: 0.4 }}
                                            />

                                            {estados.map((estado, index) => {
                                                const Icon = estado.icon;
                                                const isActive = index <= estadoIndex;
                                                const activeColor = colorClasses[estado.color] || "";

                                                const habilitado = puedeCambiarEstado(p.estado, estado.key);

                                                return (
                                                    <div
                                                        key={estado.key}
                                                        className="flex flex-col items-center text-xs w-full relative z-10"
                                                    >

                                                        <motion.button
                                                            disabled={!habilitado}
                                                            onClick={() => habilitado && actualizarEstado(p._id, estado.key)}
                                                            whileTap={habilitado ? { scale: 0.9 } : undefined}
                                                            className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all
        ${isActive ? activeColor : "border-gray-300 bg-white text-gray-400"}
        ${!habilitado ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
    `}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </motion.button>
                                                        <span
                                                            className={`mt-2 font-medium ${isActive ? "text-gray-700" : "text-gray-400"
                                                                }`}
                                                        >
                                                            {estado.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {p.userId?.role !== "empleado" && p.userId?.telefono && (
                                        <button
                                            onClick={() => abrirWhatsApp(p)}
                                            className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                                        >
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.557 4.133 1.531 5.867L0 24l6.266-1.504A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.824.917.962-3.716-.241-.38A9.962 9.962 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                            Confirmar por WhatsApp
                                        </button>
                                    )}

                                    <button
                                        onClick={() => eliminarPedidoDobleConfirmacion(p._id)}
                                        className="mt-2 w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg transition font-semibold"
                                    >
                                        Eliminar pedido
                                    </button>

                                    </div>{/* fin contenido */}
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {vista === "entregados" && totalPaginas > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                        disabled={pagina === 1}
                        onClick={() => setPagina((p) => p - 1)}
                        className="px-4 py-2 rounded-lg bg-black text-white
                       disabled:opacity-40"
                    >
                        ←
                    </button>

                    {Array.from({ length: totalPaginas }).map((_, i) => {
                        const num = i + 1;
                        return (
                            <button
                                key={num}
                                onClick={() => setPagina(num)}
                                className={`px-4 py-2 rounded-lg font-semibold
                        ${pagina === num
                                        ? "bg-red-600 text-white"
                                        : "bg-black text-gray-300 hover:bg-red-700"}
                    `}
                            >
                                {num}
                            </button>
                        );
                    })}

                    <button
                        disabled={pagina === totalPaginas}
                        onClick={() => setPagina((p) => p + 1)}
                        className="px-4 py-2 rounded-lg bg-black text-white
                       disabled:opacity-40"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
}
