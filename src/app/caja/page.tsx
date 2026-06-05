"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Wallet, X, Printer, CreditCard, Banknote, Send,
    Loader2, CheckCircle, AlertCircle, Clock, Flame,
    Package, Truck, UtensilsCrossed,
} from "lucide-react";

type Pedido = {
    _id: string;
    mesa?: string;
    fuente: string;
    items: { _id?: string; menuItemId: { nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    tipoEntrega?: string;
    direccion?: string;
    createdAt: string;
    notaEmpleado?: string;
    notaCliente?: string;
    userId?: { _id: string; nombre: string; apellido: string; telefono?: string; role?: string };
};
type CajaSession = { _id: string; estado: "abierta" | "cerrada"; montoInicial: number; fechaApertura: string };

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;
const METODO_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const METODO_ICON: Record<string, React.ElementType> = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Send };
const formatMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const ESTADOS = [
    { key: "pendiente",  label: "Pendiente",  icon: Clock,         color: "yellow" },
    { key: "preparando", label: "Preparando", icon: Flame,         color: "orange" },
    { key: "listo",      label: "Listo",      icon: CheckCircle,   color: "blue"   },
    { key: "entregado",  label: "Entregado",  icon: Truck,         color: "emerald"},
];
const COLOR_CLASSES: Record<string, string> = {
    yellow:  "border-yellow-500 bg-yellow-400/30 text-yellow-900 font-semibold",
    orange:  "border-orange-500 bg-orange-100 text-orange-700 font-semibold",
    blue:    "border-blue-500 bg-blue-100 text-blue-700 font-semibold",
    emerald: "border-emerald-500 bg-emerald-100 text-emerald-700 font-semibold",
};
const BAR_COLORS: Record<string, string> = {
    yellow: "bg-yellow-500", orange: "bg-orange-500", blue: "bg-blue-500", emerald: "bg-emerald-500",
};

type Vista = "pendientes" | "preparando" | "listos" | "entregados";
const VISTA_MAP: Record<string, Vista> = {
    pendiente: "pendientes", preparando: "preparando", listo: "listos", entregado: "entregados",
};

export default function CajaPage() {
    const [tab, setTab]                   = useState<"pedidos" | "caja">("pedidos");
    const [sesion, setSesion]             = useState<CajaSession | null | undefined>(undefined);
    const [pedidos, setPedidos]           = useState<Pedido[]>([]);
    const [loading, setLoading]           = useState(true);
    const [vista, setVista]               = useState<Vista>("pendientes");
    const [updatingId, setUpdatingId]     = useState<string | null>(null);
    const [openForm, setOpenForm]         = useState({ montoInicial: "", notas: "" });
    const [openSaving, setOpenSaving]     = useState(false);
    const [cobrarModal, setCobrarModal]   = useState<{ open: boolean; pedido: Pedido | null }>({ open: false, pedido: null });
    const [cobrarForm, setCobrarForm]     = useState({ metodoPago: "efectivo" as typeof METODOS[number], montoPagado: "" });
    const [cobrarSaving, setCobrarSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [cajaRes, pedRes] = await Promise.all([
                fetch("/api/superadmin/caja", { credentials: "include" }),
                fetch("/api/pedidos", { credentials: "include" }),
            ]);
            const [cajaData, pedData] = await Promise.all([cajaRes.json(), pedRes.json()]);
            setSesion(cajaData.sesion || null);
            if (Array.isArray(pedData)) {
                setPedidos(pedData.filter((p: Pedido) => !["cerrado", "cancelado"].includes(p.estado)));
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadData();
        const iv = setInterval(loadData, 5000);
        return () => clearInterval(iv);
    }, [loadData]);

    async function abrirCaja() {
        setOpenSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoInicial: Number(openForm.montoInicial) || 0, notas: openForm.notas || undefined }),
            });
            if (res.ok) { setOpenForm({ montoInicial: "", notas: "" }); loadData(); }
        } finally { setOpenSaving(false); }
    }

    async function avanzarEstado(p: Pedido, estado: string) {
        setUpdatingId(p._id);
        try {
            const res = await fetch("/api/pedidos", {
                method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ id: p._id, estado }),
            });
            if (res.ok) { setVista(VISTA_MAP[estado]); loadData(); }
        } finally { setUpdatingId(null); }
    }

    async function cobrar() {
        if (!cobrarModal.pedido) return;
        setCobrarSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    pedidoId: cobrarModal.pedido._id,
                    metodoPago: cobrarForm.metodoPago,
                    montoPagado: Number(cobrarForm.montoPagado) || cobrarModal.pedido.total,
                }),
            });
            if (res.ok) {
                printTicket(cobrarModal.pedido, cobrarForm.metodoPago, Number(cobrarForm.montoPagado) || cobrarModal.pedido.total);
                setCobrarModal({ open: false, pedido: null });
                setCobrarForm({ metodoPago: "efectivo", montoPagado: "" });
                loadData();
            }
        } finally { setCobrarSaving(false); }
    }

    function printTicket(pedido: Pedido, metodo: string, montoPagado: number) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");
        const vuelto = metodo === "efectivo" && montoPagado > pedido.total ? montoPagado - pedido.total : 0;
        const rows = pedido.items.map(i => `<tr><td>${i.cantidad}x ${i.menuItemId?.nombre || "ítem"}</td><td style="text-align:right">${formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</td></tr>`).join("");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:15px;letter-spacing:2px;margin-bottom:2px}.sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            .mesa{text-align:center;font-size:14px;font-weight:bold;padding:3px 0}hr{border:none;border-top:1px dashed #000;margin:5px 0}
            table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:12px}.total{font-size:14px;font-weight:bold}.vuelto{font-weight:bold;color:#16a34a}
        </style></head><body>
        <h2>TICKET</h2><div class="sub">H. Morgan Bar</div>
        <div class="mesa">${pedido.mesa ? `MESA ${pedido.mesa}` : pedido.userId ? `${pedido.userId.nombre}` : "MOSTRADOR"}</div>
        <div class="sub">${fecha} ${hora}</div><hr/><table>${rows}</table><hr/>
        <table>
            <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(pedido.total)}</td></tr>
            <tr><td>${METODO_LABEL[metodo]}</td><td style="text-align:right">${formatMoney(montoPagado)}</td></tr>
            ${vuelto > 0 ? `<tr><td class="vuelto">Vuelto</td><td class="vuelto" style="text-align:right">${formatMoney(vuelto)}</td></tr>` : ""}
        </table><hr/><div class="sub" style="margin-top:6px">Gracias por su visita!</div></body></html>`;
        const w = window.open("", "_blank", "width=320,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={36} /></div>;

    // Pedidos para el tab Cobrar (mozo con mesa, no cerrados)
    const mesasCobrar = pedidos.filter(p => p.mesa && p.fuente === "empleado");

    // Listas por estado
    const pendientes = pedidos.filter(p => p.estado === "pendiente");
    const preparando = pedidos.filter(p => p.estado === "preparando");
    const listos     = pedidos.filter(p => p.estado === "listo");
    const entregados = pedidos.filter(p => p.estado === "entregado");

    let lista = vista === "pendientes" ? pendientes : vista === "preparando" ? preparando : vista === "listos" ? listos : entregados;
    // Mozo primero
    lista = [...lista].sort((a, b) => {
        const aEmp = a.fuente === "empleado" || a.userId?.role === "empleado";
        const bEmp = b.fuente === "empleado" || b.userId?.role === "empleado";
        return aEmp && !bEmp ? -1 : !aEmp && bEmp ? 1 : 0;
    });

    const getEstadoIdx = (e: string) => ESTADOS.findIndex(x => x.key === e);

    const renderTabBtn = (key: Vista, label: string, count: number) => (
        <button onClick={() => setVista(key)}
            className={`relative flex-1 py-2.5 text-xs font-bold transition rounded-xl ${vista === key ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {label}
            {count > 0 && key !== "entregados" && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.2rem] px-1 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold text-center leading-tight"
                    style={{ display: vista === key ? "none" : "block" }}>{count}</span>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="bg-black text-white px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Wallet size={20} className="text-amber-400" />
                    <div>
                        <h1 className="font-black text-lg leading-tight">Caja</h1>
                        <p className="text-xs">
                            {sesion
                                ? <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle size={10} /> Sesión abierta · desde {new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                                : <span className="text-red-400 font-semibold flex items-center gap-1"><AlertCircle size={10} /> Sin sesión activa</span>
                            }
                        </p>
                    </div>
                </div>
                <span className="text-xs text-gray-400">{new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
            </div>

            {/* Abrir caja */}
            {!sesion && (
                <div className="max-w-2xl mx-auto px-4 mt-4">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900">Abrir caja</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Ingresá el monto inicial antes de empezar</p>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <input type="number" min="0" value={openForm.montoInicial}
                                onChange={e => setOpenForm(p => ({ ...p, montoInicial: e.target.value }))}
                                placeholder="Monto inicial $0" style={{ fontSize: "16px" }}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            <input value={openForm.notas} onChange={e => setOpenForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Notas (opcional)" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                            <button onClick={abrirCaja} disabled={openSaving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                                <Wallet size={18} />{openSaving ? "Abriendo..." : "Abrir caja"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sesion && (
                <>
                    {/* Tabs principales */}
                    <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
                        <button onClick={() => setTab("pedidos")}
                            className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${tab === "pedidos" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
                            <Package size={15} /> Pedidos
                            {pedidos.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">{pedidos.length}</span>}
                        </button>
                        <button onClick={() => setTab("caja")}
                            className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${tab === "caja" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
                            <Wallet size={15} /> Cobrar
                            {mesasCobrar.length > 0 && <span className="bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded-full">{mesasCobrar.length}</span>}
                        </button>
                    </div>

                    {/* ── TAB PEDIDOS ── */}
                    {tab === "pedidos" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            {/* Sub-tabs estado */}
                            <div className="flex gap-2 mb-5">
                                {renderTabBtn("pendientes", "Pendientes", pendientes.length)}
                                {renderTabBtn("preparando", "Preparando", preparando.length)}
                                {renderTabBtn("listos",     "Listos",     listos.length)}
                                {renderTabBtn("entregados", "Entregados", entregados.length)}
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence>
                                    {lista.length === 0 ? (
                                        <p className="text-center text-gray-400 py-12">Sin pedidos en este estado.</p>
                                    ) : lista.map(p => {
                                        const esMozo   = p.fuente === "empleado" || p.userId?.role === "empleado";
                                        const estadoIdx = getEstadoIdx(p.estado);
                                        const color     = ESTADOS[estadoIdx]?.color || "gray";
                                        const fechaHora = p.createdAt ? format(new Date(p.createdAt), "dd/MM HH:mm", { locale: es }) : "";
                                        const isUpdating = updatingId === p._id;

                                        // Para mozo: solo hasta "listo" en este tab (se cobra en Cobrar)
                                        const estadosMozo = ESTADOS.filter(e => e.key !== "entregado");
                                        const estadosList = esMozo ? estadosMozo : ESTADOS;

                                        return (
                                            <motion.div key={p._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className={`rounded-2xl border shadow-sm overflow-hidden ${esMozo ? "border-blue-300" : "border-gray-200"}`}>

                                                {/* Banner mozo */}
                                                {esMozo && (
                                                    <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2">
                                                        <UtensilsCrossed size={14} />
                                                        <span className="font-bold text-sm">
                                                            Barra — Mozo{p.mesa ? ` · Mesa ${p.mesa}` : ""}
                                                        </span>
                                                        {p.notaEmpleado && <span className="ml-auto text-xs opacity-80 italic truncate max-w-[120px]">{p.notaEmpleado}</span>}
                                                    </div>
                                                )}

                                                {/* Banner app */}
                                                {!esMozo && (
                                                    <div className="bg-gray-100 text-gray-600 px-4 py-1.5 flex items-center gap-2">
                                                        <Package size={12} />
                                                        <span className="text-xs font-semibold">Pedido App</span>
                                                        {p.tipoEntrega && <span className="text-xs text-gray-400 ml-1 capitalize">· {p.tipoEntrega}</span>}
                                                    </div>
                                                )}

                                                <div className={`p-4 ${esMozo ? "bg-blue-50" : "bg-white"}`}>
                                                    {/* Header */}
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h2 className="font-bold text-gray-900">
                                                                {p.userId?.nombre} {p.userId?.apellido}
                                                            </h2>
                                                            {!esMozo && p.userId?.telefono && (
                                                                <p className="text-xs text-gray-500 mt-0.5">📱 {p.userId.telefono}</p>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-0.5">{fechaHora}</p>
                                                        </div>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs border ${COLOR_CLASSES[color] || "border-gray-200 bg-gray-100 text-gray-600"}`}>
                                                            {p.estado}
                                                        </span>
                                                    </div>

                                                    {/* Items */}
                                                    <ul className="mb-3 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                                        {p.items.map((it, idx) => (
                                                            <li key={idx} className="flex justify-between items-center px-3 py-2 bg-gray-50">
                                                                <span className="text-sm text-gray-800">{it.menuItemId?.nombre}</span>
                                                                <span className="text-red-600 font-semibold text-sm">×{it.cantidad}</span>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    {(p.notaCliente) && (
                                                        <p className="text-xs text-gray-600 italic bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                                                            📝 {p.notaCliente}
                                                        </p>
                                                    )}

                                                    {/* Total */}
                                                    <p className="text-sm font-bold text-gray-900 mb-3">Total: {formatMoney(p.total)}</p>

                                                    {/* Botones estado pendiente */}
                                                    {p.estado === "pendiente" ? (
                                                        <button disabled={isUpdating}
                                                            onClick={() => avanzarEstado(p, "preparando")}
                                                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition flex items-center justify-center gap-2">
                                                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                                            Aceptar pedido
                                                        </button>
                                                    ) : (
                                                        /* Barra de progreso con estados */
                                                        <div className="relative w-full flex justify-between items-center mt-4">
                                                            <div className="absolute top-[18px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />
                                                            <motion.div
                                                                className={`absolute top-[18px] left-0 h-[3px] ${BAR_COLORS[color] || "bg-gray-400"} rounded-full`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(estadoIdx / (estadosList.length - 1)) * 100}%` }}
                                                                transition={{ duration: 0.4 }}
                                                            />
                                                            {estadosList.map((est, idx) => {
                                                                const Icon = est.icon;
                                                                const isActive = estadoIdx >= getEstadoIdx(est.key);
                                                                const canClick = getEstadoIdx(est.key) > estadoIdx;
                                                                return (
                                                                    <div key={est.key} className="flex flex-col items-center text-xs w-full relative z-10">
                                                                        <motion.button
                                                                            disabled={!canClick || isUpdating}
                                                                            onClick={() => canClick && avanzarEstado(p, est.key)}
                                                                            whileTap={canClick ? { scale: 0.9 } : undefined}
                                                                            className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all
                                                                                ${isActive ? COLOR_CLASSES[est.color] : "border-gray-300 bg-white text-gray-400"}
                                                                                ${!canClick ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}>
                                                                            <Icon className="w-4 h-4" />
                                                                        </motion.button>
                                                                        <span className={`mt-2 font-medium ${isActive ? "text-gray-700" : "text-gray-400"}`}>
                                                                            {est.label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Nota mozo sobre cobro */}
                                                    {esMozo && (
                                                        <p className="text-xs text-blue-500 text-center mt-4">
                                                            Se cobra en la pestaña Cobrar
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* ── TAB COBRAR ── */}
                    {tab === "caja" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-black text-gray-900">Mesas para cobrar</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{mesasCobrar.length}</span>
                            </div>
                            {mesasCobrar.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Wallet size={40} className="mx-auto mb-3 text-gray-200" />
                                    <p className="font-semibold">Sin mesas activas</p>
                                    <p className="text-sm mt-1">Los pedidos del mozo aparecen acá cuando estén listos</p>
                                </div>
                            ) : mesasCobrar.map(p => {
                                const estadoIdx = getEstadoIdx(p.estado);
                                const color = ESTADOS[estadoIdx]?.color || "gray";
                                return (
                                    <div key={p._id} className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden mb-3">
                                        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <UtensilsCrossed size={14} className="text-blue-600" />
                                                    <p className="font-black text-gray-900">Mesa {p.mesa}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_CLASSES[color]}`}>
                                                        {p.estado}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{format(new Date(p.createdAt), "HH:mm", { locale: es })}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-xl font-black text-gray-900">{formatMoney(p.total)}</p>
                                                <button
                                                    onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ metodoPago: "efectivo", montoPagado: String(p.total) }); }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
                                                    Cobrar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3 space-y-1">
                                            {p.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">{item.cantidad}× {item.menuItemId?.nombre}</span>
                                                    <span className="text-gray-400">{formatMoney((item.menuItemId?.precio || 0) * item.cantidad)}</span>
                                                </div>
                                            ))}
                                            {p.notaEmpleado && <p className="text-xs text-amber-600 italic pt-1">📝 {p.notaEmpleado}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modal cobrar */}
            {cobrarModal.open && cobrarModal.pedido && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Cobrar Mesa {cobrarModal.pedido.mesa}</h2>
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                {cobrarModal.pedido.items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-700">{i.cantidad}× {i.menuItemId?.nombre}</span>
                                        <span className="font-semibold text-gray-900">{formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 mt-1">
                                    <span>TOTAL</span><span>{formatMoney(cobrarModal.pedido.total)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {METODOS.map(met => {
                                    const Icon = METODO_ICON[met];
                                    return (
                                        <button key={met} onClick={() => setCobrarForm(p => ({ ...p, metodoPago: met }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${cobrarForm.metodoPago === met ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>
                                            <Icon size={12} />{METODO_LABEL[met]}
                                        </button>
                                    );
                                })}
                            </div>
                            <input type="number" min="0" value={cobrarForm.montoPagado}
                                onChange={e => setCobrarForm(p => ({ ...p, montoPagado: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            {cobrarForm.metodoPago === "efectivo" && Number(cobrarForm.montoPagado) > cobrarModal.pedido.total && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex justify-between">
                                    <span className="text-sm font-semibold text-emerald-700">Vuelto</span>
                                    <span className="text-sm font-black text-emerald-700">{formatMoney(Number(cobrarForm.montoPagado) - cobrarModal.pedido.total)}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={cobrar} disabled={cobrarSaving}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                                <Printer size={15} />{cobrarSaving ? "..." : "Cobrar e imprimir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
