"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, CheckCircle, Truck, LockKeyhole, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];

const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

export default function AdminPedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [vista, setVista] = useState<"pendientes" | "preparando" | "listos" | "entregados">("pendientes");
    const ITEMS_POR_PAGINA = 6;
    const [pagina, setPagina] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [pedidosActivos, setPedidosActivos] = useState<boolean | null>(null);
    const [togglingPedidos, setTogglingPedidos] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/caja/status", { credentials: "include" })
            .then(r => r.json())
            .then(d => setCajaAbierta(!!d.abierta))
            .catch(() => setCajaAbierta(false));
        fetch("/api/config/pedidos")
            .then(r => r.json())
            .then(d => setPedidosActivos(!!d.activo))
            .catch(() => setPedidosActivos(false));
    }, []);

    async function togglePedidos() {
        if (togglingPedidos || pedidosActivos === null) return;
        const nuevoEstado = !pedidosActivos;
        setTogglingPedidos(true);
        const res = await fetch("/api/config/pedidos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activos: nuevoEstado }),
        });
        setTogglingPedidos(false);
        if (res.ok) {
            setPedidosActivos(nuevoEstado);
        } else {
            swalBase.fire({ icon: "error", title: "Error", text: "No se pudo cambiar el estado.", timer: 2000, showConfirmButton: false });
        }
    }

    useEffect(() => {
        if (cajaAbierta === false) return;
        const loadPedidos = async () => await fetchPedidos();
        loadPedidos();
        const interval = setInterval(loadPedidos, 4000);
        return () => clearInterval(interval);
    }, [cajaAbierta]);

    useEffect(() => {
        setPagina(1);
        setBusqueda("");
    }, [vista]);

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

    async function cambiarEstado(p: any, estado: string) {
        setUpdatingId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: p._id, estado }),
            });
            await fetchPedidos();
        } finally { setUpdatingId(null); }
    }

    async function aceptarYImprimir(p: any) {
        setUpdatingId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: p._id, estado: "preparando" }),
            });
            const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
            const cliente = p.userId ? `${p.userId.nombre} ${p.userId.apellido}`.trim() : "-";
            const bebidas = p.items.filter((it: any) => BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
            const comida  = p.items.filter((it: any) => !BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
            const toItems = (arr: any[]) => arr.map((it: any) => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota }));

            if (comida.length > 0) {
                await fetch("/api/print-jobs", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo: "comanda", impresora: "Cocina", payload: { titulo: "COCINA", mesa: p.mesa || "-", cliente, mozo: p.userId?.nombre || "-", hora, items: toItems(comida), nota: p.notaCliente || p.notaEmpleado || "" } }),
                });
            }
            if (bebidas.length > 0) {
                await fetch("/api/print-jobs", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo: "comanda", impresora: "Barra", payload: { titulo: "BARRA", mesa: p.mesa || "-", cliente, mozo: p.userId?.nombre || "-", hora, items: toItems(bebidas), nota: "" } }),
                });
            }
            await fetchPedidos();
        } finally { setUpdatingId(null); }
    }

    if (cajaAbierta === null && pedidosActivos === null) return <div className="flex justify-center py-20"><Loader /></div>;

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

    return (
        <div className="p-6 min-h-screen text-white">
            {/* Header siempre visible */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-4xl font-extrabold text-black">Pedidos</h1>
                {pedidosActivos !== null && (
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${pedidosActivos ? "text-gray-900" : "text-gray-400"}`}>
                            Delivery {pedidosActivos ? "activo" : "inactivo"}
                        </span>
                        <button
                            onClick={togglePedidos}
                            disabled={togglingPedidos}
                            className={`relative flex h-6 w-10 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 disabled:opacity-50 ${pedidosActivos ? "bg-red-500" : "bg-gray-300"}`}
                        >
                            <span className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${pedidosActivos ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                        </button>
                    </div>
                )}
            </div>

            {/* Caja cerrada */}
            {cajaAbierta === false && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <LockKeyhole size={32} className="text-gray-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900 mb-1">Caja cerrada</h2>
                        <p className="text-sm text-gray-500">Para gestionar pedidos, primero abrí la caja del día.</p>
                    </div>
                    <Link href="/admin/caja" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition">
                        Ir a Caja
                    </Link>
                </div>
            )}

            {/* Cargando pedidos */}
            {cajaAbierta === true && loading && <div className="flex justify-center py-20"><Loader /></div>}

            {/* Contenido pedidos */}
            {cajaAbierta === true && !loading && <>

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
                                            {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    🛵 Envío: ${formatMoney(p.costoEnvio)}
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

                                    {/* 📝 Nota del cliente */}
                                    {p.notaCliente && (
                                        <p className="text-sm text-gray-600 italic bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                                            📝 {p.notaCliente}
                                        </p>
                                    )}

                                    {/* Botones de acción */}
                                    <div className="flex gap-2 mt-4">
                                        {p.estado === "pendiente" && (
                                            <button
                                                onClick={() => aceptarYImprimir(p)}
                                                disabled={updatingId === p._id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.97] disabled:opacity-50"
                                            >
                                                <Printer size={15} />
                                                {updatingId === p._id ? "..." : "Aceptar e imprimir"}
                                            </button>
                                        )}
                                        {p.estado === "preparando" && (
                                            <button
                                                onClick={() => cambiarEstado(p, "listo")}
                                                disabled={updatingId === p._id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.97] disabled:opacity-50"
                                            >
                                                <CheckCircle size={15} />
                                                {updatingId === p._id ? "..." : "Marcar listo"}
                                            </button>
                                        )}
                                        {p.estado === "listo" && (
                                            <button
                                                onClick={() => cambiarEstado(p, "entregado")}
                                                disabled={updatingId === p._id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.97] disabled:opacity-50"
                                            >
                                                <Truck size={15} />
                                                {updatingId === p._id ? "..." : "Marcar entregado"}
                                            </button>
                                        )}
                                    </div>

                                    {/* 🔘 Progreso (solo lectura) */}
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

                                            return (
                                                <div
                                                    key={estado.key}
                                                    className="flex flex-col items-center text-xs w-full relative z-10"
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${isActive ? activeColor : "border-gray-300 bg-white text-gray-400"}`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                    </div>
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
            </>}
        </div>
    );
}
