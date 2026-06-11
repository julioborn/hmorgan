"use client";
import { useEffect, useState, useCallback } from "react";
import { swalBase } from "@/lib/swalConfig";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Wallet, X, Printer, CreditCard, Banknote, Send,
    Loader2, CheckCircle, AlertCircle, Clock, Flame,
    Package, Truck, UtensilsCrossed, CalendarDays,
    Phone, MessageCircle,
} from "lucide-react";
import ReservasManager from "@/components/ReservasManager";

type Pedido = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    comensales?: number;
    fuente: string;
    items: { _id?: string; menuItemId: { nombre: string; precio: number }; cantidad: number }[];
    total: number;
    costoEnvio?: number;
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
    { key: "pendiente",  label: "Pendiente",   icon: Clock,         color: "yellow"  },
    { key: "preparando", label: "Preparando",  icon: Flame,         color: "orange"  },
    { key: "listo",      label: "Listo",       icon: CheckCircle,   color: "blue"    },
    { key: "entregado",  label: "Finalizado",  icon: Truck,         color: "emerald" },
    { key: "cerrado",    label: "Cobrado",     icon: CheckCircle,   color: "emerald" },
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

type Vista = "pendientes" | "preparando" | "listos" | "finalizados";
const VISTA_MAP: Record<string, Vista> = {
    pendiente: "pendientes", preparando: "preparando", listo: "listos", entregado: "finalizados",
};

export default function CajaPage() {
    const [tab, setTab]                   = useState<"pedidos" | "caja" | "reservas">("pedidos");
    const [sesion, setSesion]             = useState<CajaSession | null | undefined>(undefined);
    const [pedidosActivos, setPedidosActivos]   = useState(true);
    const [reservasActivas, setReservasActivas] = useState(true);
    const [reservasPendientes, setReservasPendientes] = useState(0);
    const [pedidos, setPedidos]           = useState<Pedido[]>([]);
    const [loading, setLoading]           = useState(true);
    const [vista, setVista]               = useState<Vista>("pendientes");
    const hoyStr = new Date().toISOString().slice(0, 10);
    const [updatingId, setUpdatingId]     = useState<string | null>(null);
    const [openForm, setOpenForm]         = useState({ montoInicial: "", notas: "" });
    const [openSaving, setOpenSaving]     = useState(false);
    const [cobrarModal, setCobrarModal]   = useState<{ open: boolean; pedido: Pedido | null }>({ open: false, pedido: null });
    const [cobrarForm, setCobrarForm]     = useState({ metodoPago: "efectivo" as typeof METODOS[number], montoPagado: "" });
    const [cobrarSaving, setCobrarSaving] = useState(false);
    const [closeModal, setCloseModal]     = useState(false);
    const [closeForm, setCloseForm]       = useState({ montoCierre: "", notas: "" });
    const [closeSaving, setCloseSaving]   = useState(false);
    const [closeError, setCloseError]     = useState("");

    const loadData = useCallback(async () => {
        try {
            const [cajaRes, pedRes] = await Promise.all([
                fetch("/api/superadmin/caja", { credentials: "include" }),
                fetch("/api/pedidos", { credentials: "include" }),
            ]);
            const [cajaData, pedData] = await Promise.all([cajaRes.json(), pedRes.json()]);
            setSesion(cajaData.sesion || null);
            if (Array.isArray(pedData)) {
                // Incluir "cerrado" (cobrado por caja) solo del día de hoy para Finalizados
                setPedidos(pedData.filter((p: Pedido) =>
                    p.estado !== "cancelado" &&
                    (p.estado !== "cerrado" || (p as any).createdAt?.slice(0, 10) === hoyStr)
                ));
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadData();
        const iv = setInterval(loadData, 5000);
        return () => clearInterval(iv);
    }, [loadData]);

    useEffect(() => {
        fetch("/api/config/pedidos").then(r => r.json()).then(d => setPedidosActivos(d.activo ?? true));
        fetch("/api/config/reservas").then(r => r.json()).then(d => setReservasActivas(d.activo ?? true));
    }, []);

    async function togglePedidosActivos() {
        const next = !pedidosActivos;
        setPedidosActivos(next);
        await fetch("/api/config/pedidos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activos: next }) });
    }

    async function toggleReservasActivas() {
        const next = !reservasActivas;
        setReservasActivas(next);
        await fetch("/api/config/reservas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: next }) });
    }

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

    async function rechazarPedido(id: string) {
        const r = await swalBase.fire({ title: "¿Rechazar pedido?", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, rechazar", cancelButtonText: "Cancelar" });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos?id=${id}`, { method: "DELETE", credentials: "include" });
        loadData();
    }

    async function cerrarCaja() {
        setCloseSaving(true);
        setCloseError("");
        try {
            const res = await fetch("/api/superadmin/caja/cerrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoCierre: Number(closeForm.montoCierre) || 0, notas: closeForm.notas || undefined }),
            });
            if (res.ok) {
                setCloseModal(false);
                setCloseForm({ montoCierre: "", notas: "" });
                await loadData();
            } else {
                const err = await res.json().catch(() => ({}));
                setCloseError(err.error || `Error ${res.status}`);
            }
        } catch {
            setCloseError("Error de conexión");
        } finally { setCloseSaving(false); }
    }

    async function avanzarEstado(p: Pedido, estado: string) {
        setUpdatingId(p._id);
        try {
            const res = await fetch("/api/pedidos", {
                method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ id: p._id, estado }),
            });
            if (res.ok) {
                if (estado === "entregado") {
                    // Al finalizar, ir directo a Cobrar
                    setTab("caja");
                } else {
                    setVista(VISTA_MAP[estado] || "pendientes");
                }
                await loadData();
            }
        } finally { setUpdatingId(null); }
    }

    async function cobrar() {
        if (!cobrarModal.pedido) return;
        setCobrarSaving(true);
        const pedidoCobrado = cobrarModal.pedido;
        const metodoPago    = cobrarForm.metodoPago;
        const montoPagado   = Number(cobrarForm.montoPagado) || pedidoCobrado.total;
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ pedidoId: pedidoCobrado._id, metodoPago, montoPagado }),
            });
            if (res.ok) {
                // Cerrar modal inmediatamente
                setCobrarModal({ open: false, pedido: null });
                setCobrarForm({ metodoPago: "efectivo", montoPagado: "" });
                // Quitar el pedido de la lista local de forma optimista (no esperar al poll)
                setPedidos(prev => prev.map(p =>
                    p._id === pedidoCobrado._id ? { ...p, estado: "cerrado" } : p
                ));
                // Imprimir ticket
                printTicket(pedidoCobrado, metodoPago, montoPagado);
                // Confirmar con datos frescos del servidor
                await loadData();
            }
        } finally { setCobrarSaving(false); }
    }

    function printTicket(pedido: Pedido, metodo: string, montoPagado: number) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");
        const vuelto = metodo === "efectivo" && montoPagado > pedido.total ? montoPagado - pedido.total : 0;
        const rows = pedido.items.map(i => `<tr><td>${i.cantidad}x ${i.menuItemId?.nombre || "ítem"}</td><td style="text-align:right">${formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</td></tr>`).join("")
            + (pedido.tipoEntrega === "envio" && (pedido.costoEnvio ?? 0) > 0 ? `<tr><td>Envío a domicilio</td><td style="text-align:right">${formatMoney(pedido.costoEnvio ?? 0)}</td></tr>` : "");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:15px;letter-spacing:2px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            hr{border:none;border-top:1px dashed #000;margin:5px 0}
            table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:12px}
            .total{font-size:14px;font-weight:bold}.vuelto{font-weight:bold;color:#16a34a}
            .legal{text-align:center;font-size:9px;color:#aaa;margin-top:10px}
        </style></head><body>
        <h2>TICKET</h2>
        <div class="sub">${fecha} ${hora}</div>
        <hr/><table>${rows}</table><hr/>
        <table>
            <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(pedido.total)}</td></tr>
            <tr><td>${METODO_LABEL[metodo]}</td><td style="text-align:right">${formatMoney(montoPagado)}</td></tr>
            ${vuelto > 0 ? `<tr><td class="vuelto">Vuelto</td><td class="vuelto" style="text-align:right">${formatMoney(vuelto)}</td></tr>` : ""}
        </table>
        <div class="legal">Comprobante no válido como factura</div>
        </body></html>`;
        const w = window.open("", "_blank", "width=320,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    function printComanda(p: Pedido) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const mesa = p.mesa ? `Mesa ${p.mesa}` : p.tipoEntrega === "envio" ? "Envío a domicilio" : "Retira en barra";
        const cliente = p.userId?.role === "empleado"
            ? (p.nombreComanda || p.userId?.nombre || "Mozo")
            : (p.userId?.nombre || "Cliente");
        const filas = p.items.map(it =>
            `<tr>
                <td style="font-size:22px;font-weight:900;padding:4px 10px 4px 0;white-space:nowrap">${it.cantidad}x</td>
                <td style="font-size:20px;font-weight:700;padding:4px 0">${it.menuItemId?.nombre ?? "Ítem"}</td>
            </tr>`
        ).join("");
        const nota = p.notaEmpleado || p.notaCliente;

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 8px; }
            .centro { text-align:center; }
            .sep { border-top: 2px dashed #000; margin: 8px 0; }
            .badge { font-size:28px; font-weight:900; text-transform:uppercase; }
            .meta { font-size:14px; margin:4px 0; }
            table { width:100%; border-collapse:collapse; }
            .nota { font-size:14px; margin-top:6px; padding:6px; border:2px solid #000; border-radius:4px; }
        </style></head><body>
        <div class="centro"><div class="badge">⬛ COMANDA ⬛</div></div>
        <div class="sep"></div>
        <div class="meta"><b>${mesa}</b></div>
        <div class="meta">Cliente: ${cliente}</div>
        <div class="meta">Hora: ${hora}</div>
        <div class="sep"></div>
        <table>${filas}</table>
        <div class="sep"></div>
        ${nota ? `<div class="nota">📝 ${nota}</div>` : ""}
        </body></html>`;

        const w = window.open("", "_blank", "width=340,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={36} /></div>;

    // Pedidos listos para cobrar: estado listo O entregado (ambos estados válidos)
    const paraCobrar = pedidos.filter(p => p.estado === "listo" || p.estado === "entregado");

    // Listas por estado
    const pendientes   = pedidos.filter(p => p.estado === "pendiente");
    const preparando   = pedidos.filter(p => p.estado === "preparando");
    const listos       = pedidos.filter(p => p.estado === "listo");
    const finalizados  = pedidos.filter(p => p.estado === "entregado" || p.estado === "cerrado");

    let lista = vista === "pendientes" ? pendientes : vista === "preparando" ? preparando : vista === "listos" ? listos : finalizados;
    // Mozo primero
    lista = [...lista].sort((a, b) => {
        const aEmp = a.fuente === "empleado" || a.userId?.role === "empleado";
        const bEmp = b.fuente === "empleado" || b.userId?.role === "empleado";
        return aEmp && !bEmp ? -1 : !aEmp && bEmp ? 1 : 0;
    });

    const getEstadoIdx = (e: string) => ESTADOS.findIndex(x => x.key === e);

    const renderTabBtn = (key: Vista, label: string, count: number) => (
        <button onClick={() => setVista(key)}
            className={`relative flex-1 py-2.5 text-xs font-black transition rounded-xl ${
                vista === key
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            {label}
            {count > 0 && key !== "finalizados" && vista !== key && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.3rem] px-1 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black text-center leading-tight">
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="text-white px-5 py-5" style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #1c1c1c 100%)" }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className={`rounded-2xl p-2.5 ${sesion ? "bg-emerald-500/20" : "bg-red-500/15"}`}>
                        <Wallet size={20} className={sesion ? "text-emerald-400" : "text-red-400"} />
                    </div>
                    <div>
                        <h1 className="font-black text-xl leading-tight tracking-tight">Caja</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {sesion ? (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    <span className="text-xs text-emerald-400 font-semibold">
                                        Abierta · desde {new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                                    <span className="text-xs text-red-400 font-semibold">Sin sesión activa</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!sesion && (
                        <span className="text-xs text-gray-500">{new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                    )}
                    {sesion && (
                        <button onClick={() => { setCloseModal(true); setCloseForm({ montoCierre: "", notas: "" }); }}
                            className="text-xs font-black bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-red-600/30">
                            Cerrar caja
                        </button>
                    )}
                </div>
            </div>

            {/* Switches pedidos / reservas */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Pedidos</span>
                    <button onClick={togglePedidosActivos}
                        className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${pedidosActivos ? "bg-red-500" : "bg-gray-600"}`}>
                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${pedidosActivos ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Reservas</span>
                    <button onClick={toggleReservasActivas}
                        className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${reservasActivas ? "bg-red-500" : "bg-gray-600"}`}>
                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${reservasActivas ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>
            </div>
            </div>

            {/* Abrir caja */}
            {!sesion && (
                <div className="max-w-sm mx-auto px-4 mt-10">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 pt-8 pb-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Wallet size={28} className="text-emerald-600" />
                            </div>
                            <h2 className="font-black text-gray-900 text-xl tracking-tight">Abrir caja</h2>
                            <p className="text-sm text-gray-400 mt-1">Ingresá el monto inicial para comenzar</p>
                        </div>
                        <div className="px-6 pb-8 space-y-3">
                            <input type="number" min="0" value={openForm.montoInicial}
                                onChange={e => setOpenForm(p => ({ ...p, montoInicial: e.target.value }))}
                                placeholder="$0" style={{ fontSize: "16px" }}
                                className="w-full px-4 py-4 border-2 border-gray-100 focus:border-emerald-400 rounded-2xl text-3xl font-black text-center focus:outline-none transition-colors" />
                            <input value={openForm.notas} onChange={e => setOpenForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Notas (opcional)" style={{ fontSize: "16px" }}
                                className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-colors" />
                            <button onClick={abrirCaja} disabled={openSaving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/30 text-base">
                                <Wallet size={19} />{openSaving ? "Abriendo..." : "Abrir caja"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sesion && (
                <>
                    {/* Tabs principales */}
                    <div className="flex bg-white sticky top-0 z-10 border-b border-gray-100">
                        <button onClick={() => setTab("pedidos")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "pedidos" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Package size={15} /> Pedidos
                            {(pendientes.length + preparando.length + listos.length) > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "pedidos" ? "bg-gray-900 text-white" : "bg-red-100 text-red-600"}`}>
                                    {pendientes.length + preparando.length + listos.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("caja")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "caja" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Wallet size={15} /> Cobrar
                            {paraCobrar.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "caja" ? "bg-gray-900 text-white" : "bg-amber-100 text-amber-700"}`}>
                                    {paraCobrar.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("reservas")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "reservas" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <CalendarDays size={15} /> Reservas
                            {reservasPendientes > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "reservas" ? "bg-gray-900 text-white" : "bg-red-100 text-red-600"}`}>
                                    {reservasPendientes}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── TAB PEDIDOS ── */}
                    {tab === "pedidos" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            {/* Sub-tabs estado */}
                            <div className="flex gap-2 mb-5">
                                {renderTabBtn("pendientes",  "Pendientes",  pendientes.length)}
                                {renderTabBtn("preparando", "Preparando",  preparando.length)}
                                {renderTabBtn("listos",     "Listos",      listos.length)}
                                {renderTabBtn("finalizados","Finalizados", finalizados.length)}
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

                                        // "cerrado" nunca es clickeable en el progress bar (solo via Cobrar)
                                        // Mozo: pendiente→preparando→listo (cobrar = pestaña Cobrar)
                                        // Cliente: pendiente→preparando→listo→entregado (finalizado)
                                        const estadosMozo   = ESTADOS.filter(e => e.key !== "entregado" && e.key !== "cerrado");
                                        const estadosCliente = ESTADOS.filter(e => e.key !== "cerrado");
                                        const estadosList = esMozo ? estadosMozo : estadosCliente;

                                        return (
                                            <motion.div key={p._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className={`rounded-2xl border shadow-sm overflow-hidden ${esMozo ? "border-gray-800" : "border-gray-200"}`}>

                                                {/* Banner mozo */}
                                                {esMozo && (
                                                    <div className="text-white px-4 py-2.5 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #1c1c1c 0%, #2a2a2a 100%)" }}>
                                                        <UtensilsCrossed size={14} className="text-gray-400" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-black text-sm tracking-tight">
                                                                Barra — Mozo{p.mesa ? ` · Mesa ${p.mesa}` : ""}
                                                            </span>
                                                            {(p as any).nombreComanda && (
                                                                <p className="text-xs text-gray-400 font-semibold truncate mt-0.5">{(p as any).nombreComanda}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Banner app */}
                                                {!esMozo && (
                                                    <div className="bg-gray-100 text-gray-600 px-4 py-2 flex items-center gap-2">
                                                        <Package size={12} />
                                                        <span className="text-xs font-bold">Pedido App</span>
                                                        {p.tipoEntrega && <span className="text-xs text-gray-400 ml-1 capitalize">· {p.tipoEntrega}</span>}
                                                    </div>
                                                )}

                                                <div className={`p-4 ${esMozo ? "bg-gray-50" : "bg-white"}`}>
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide inline-block mb-1.5 ${COLOR_CLASSES[color] || "border-gray-200 bg-gray-100 text-gray-600"}`}>
                                                                {p.estado}
                                                            </span>
                                                            <h2 className="text-lg font-black text-gray-900 leading-tight">
                                                                {p.userId?.nombre} {p.userId?.apellido}
                                                            </h2>
                                                            {!esMozo && p.userId?.telefono && (
                                                                <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                                    className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 w-fit hover:text-emerald-600 transition">
                                                                    <Phone size={10} />{p.userId.telefono}
                                                                </a>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-0.5">{fechaHora}</p>
                                                        </div>
                                                        {!esMozo && p.userId?.telefono && (
                                                            <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0">
                                                                <MessageCircle size={13} /> WhatsApp
                                                            </a>
                                                        )}
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

                                                    {(p.notaEmpleado || p.notaCliente) && (
                                                        <div className="border-l-2 border-amber-400 pl-3 py-1 mb-3">
                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Nota</p>
                                                            <p className="text-xs text-gray-600 italic">{p.notaEmpleado || p.notaCliente}</p>
                                                        </div>
                                                    )}

                                                    {/* Total */}
                                                    {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 ? (
                                                        <div className="text-sm text-gray-700 mb-3 space-y-0.5">
                                                            <div className="flex justify-between">
                                                                <span>Subtotal</span>
                                                                <span>{formatMoney(p.total - (p.costoEnvio ?? 0))}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Envío</span>
                                                                <span>{formatMoney(p.costoEnvio ?? 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-bold text-gray-900">
                                                                <span>Total</span>
                                                                <span>{formatMoney(p.total)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-bold text-gray-900 mb-3">Total: {formatMoney(p.total)}</p>
                                                    )}

                                                    {/* Botones estado pendiente */}
                                                    {p.estado === "pendiente" ? (
                                                        <div className="flex gap-2">
                                                            <button disabled={isUpdating}
                                                                onClick={async () => {
                                                                    await avanzarEstado(p, "preparando");
                                                                    printComanda(p);
                                                                }}
                                                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1">
                                                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                                                Aceptar
                                                            </button>
                                                            <button onClick={() => rechazarPedido(p._id)}
                                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition">
                                                                Rechazar
                                                            </button>
                                                        </div>
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

                                                    {/* Reimprimir comanda (pedido ya aceptado) */}
                                                    {p.estado !== "pendiente" && (
                                                        <button onClick={() => printComanda(p)}
                                                            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                            <Printer size={12} /> Reimprimir comanda
                                                        </button>
                                                    )}

                                                    {/* Finalizado → botón para ir a cobrar */}
                                                    {p.estado === "entregado" && (
                                                        <button onClick={() => setTab("caja")}
                                                            className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                                                            <Wallet size={14} /> Cobrar en caja →
                                                        </button>
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
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-black text-gray-900 text-lg tracking-tight">Para cobrar</h2>
                                {paraCobrar.length > 0 && (
                                    <span className="text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{paraCobrar.length}</span>
                                )}
                            </div>
                            {paraCobrar.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Wallet size={28} className="text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-400">Sin pedidos para cobrar</p>
                                    <p className="text-sm mt-1 text-gray-300">Aparecen acá cuando el pedido está Listo o Finalizado</p>
                                </div>
                            ) : paraCobrar.map(p => {
                                const esMozo = p.fuente === "empleado" || p.userId?.role === "empleado";
                                const label = esMozo
                                    ? (p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || "Sin mesa")
                                    : (p.userId ? `${p.userId.nombre} ${p.userId.apellido || ""}`.trim() : "Cliente app");
                                return (
                                    <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-3">
                                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gray-50">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <UtensilsCrossed size={14} className="text-gray-400" />
                                                    <p className="font-black text-gray-900">{label}</p>
                                                    {!esMozo && <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">App</span>}
                                                    {p.comensales ? <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">{p.comensales}p</span> : null}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.estado === "entregado" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {p.estado === "entregado" ? "Finalizado" : "Listo"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{format(new Date(p.createdAt), "HH:mm", { locale: es })}{p.tipoEntrega === "envio" ? " · Envío" : ""}</p>
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
                                            {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-700">Envío a domicilio</span>
                                                    <span className="text-gray-400">{formatMoney(p.costoEnvio ?? 0)}</span>
                                                </div>
                                            )}
                                            {p.notaEmpleado && <p className="text-xs text-amber-600 italic pt-1">📝 {p.notaEmpleado}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── TAB RESERVAS ── */}
                    {tab === "reservas" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            <ReservasManager onPendingCountChange={setReservasPendientes} />
                        </div>
                    )}
                </>
            )}

            {/* Modal cerrar caja */}
            {closeModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Cerrar caja</h2>
                            <button onClick={() => setCloseModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Abierta desde las <strong>{sesion ? new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                                {sesion && ` · Inicial: ${formatMoney(sesion.montoInicial)}`}
                            </p>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Monto en caja al cierre</label>
                                <input type="number" min="0" value={closeForm.montoCierre}
                                    onChange={e => setCloseForm(p => ({ ...p, montoCierre: e.target.value }))}
                                    placeholder="$0" style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            <input value={closeForm.notas} onChange={e => setCloseForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Notas del cierre (opcional)"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                            {closeError && <p className="text-red-600 text-xs font-semibold">{closeError}</p>}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => { setCloseModal(false); setCloseError(""); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={cerrarCaja} disabled={closeSaving}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {closeSaving ? "Cerrando..." : "Confirmar cierre"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal cobrar */}
            {cobrarModal.open && cobrarModal.pedido && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
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
                                {cobrarModal.pedido.tipoEntrega === "envio" && (cobrarModal.pedido.costoEnvio ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-700">Envío a domicilio</span>
                                        <span className="font-semibold text-gray-900">{formatMoney(cobrarModal.pedido.costoEnvio ?? 0)}</span>
                                    </div>
                                )}
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
