"use client";
import { useEffect, useState, useCallback } from "react";
import {
    Wallet, X, Printer, CreditCard, Banknote, Send,
    Loader2, CheckCircle, AlertCircle, Clock, Flame,
    Package, ChevronRight,
} from "lucide-react";

type PedidoActivo = {
    _id: string;
    mesa?: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    fuente: string;
    createdAt: string;
    notaEmpleado?: string;
    notaCliente?: string;
    userId?: { nombre: string; apellido: string };
};
type CajaSession = { _id: string; estado: "abierta" | "cerrada"; montoInicial: number; fechaApertura: string };

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;
const METODO_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const METODO_ICON: Record<string, React.ElementType> = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Send };

const ESTADO_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
    pendiente:  { label: "Pendiente",  color: "bg-amber-100 text-amber-700",   next: "preparando", nextLabel: "Preparar" },
    preparando: { label: "Preparando", color: "bg-blue-100 text-blue-700",     next: "listo",      nextLabel: "Listo" },
    listo:      { label: "Listo",      color: "bg-emerald-100 text-emerald-700", next: "entregado",  nextLabel: "Entregar" },
    entregado:  { label: "Entregado",  color: "bg-gray-100 text-gray-600" },
    cerrado:    { label: "Cobrado",    color: "bg-gray-100 text-gray-400" },
};

const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

export default function CajaPage() {
    const [tab, setTab]                   = useState<"pedidos" | "caja">("pedidos");
    const [sesion, setSesion]             = useState<CajaSession | null | undefined>(undefined);
    const [pedidos, setPedidos]           = useState<PedidoActivo[]>([]);
    const [loading, setLoading]           = useState(true);
    const [openForm, setOpenForm]         = useState({ montoInicial: "", notas: "" });
    const [openSaving, setOpenSaving]     = useState(false);
    const [cobrarModal, setCobrarModal]   = useState<{ open: boolean; pedido: PedidoActivo | null }>({ open: false, pedido: null });
    const [cobrarForm, setCobrarForm]     = useState({ metodoPago: "efectivo" as typeof METODOS[number], montoPagado: "" });
    const [cobrarSaving, setCobrarSaving] = useState(false);
    const [updatingId, setUpdatingId]     = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [cajaRes, pedRes] = await Promise.all([
                fetch("/api/superadmin/caja", { credentials: "include" }),
                fetch("/api/pedidos", { credentials: "include" }),
            ]);
            const [cajaData, pedData] = await Promise.all([cajaRes.json(), pedRes.json()]);
            setSesion(cajaData.sesion || null);
            if (Array.isArray(pedData)) {
                setPedidos(pedData.filter((p: PedidoActivo) => !["cerrado", "cancelado"].includes(p.estado)));
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadData();
        const iv = setInterval(loadData, 6000);
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

    async function avanzarEstado(pedido: PedidoActivo) {
        const cfg = ESTADO_CONFIG[pedido.estado];
        if (!cfg?.next) return;
        setUpdatingId(pedido._id);
        try {
            const res = await fetch("/api/pedidos", {
                method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ id: pedido._id, estado: cfg.next }),
            });
            if (res.ok) loadData();
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

    function printTicket(pedido: PedidoActivo, metodo: string, montoPagado: number) {
        const hora   = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha  = new Date().toLocaleDateString("es-AR");
        const vuelto = metodo === "efectivo" && montoPagado > pedido.total ? montoPagado - pedido.total : 0;
        const rows   = pedido.items.map(i => {
            const p = i.menuItemId?.precio || 0;
            return `<tr><td>${i.cantidad}x ${i.menuItemId?.nombre || "ítem"}</td><td style="text-align:right">${formatMoney(p * i.cantidad)}</td></tr>`;
        }).join("");
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

    // Mesas listas para cobrar (listo o entregado, con mesa asignada)
    const mesasCobrar = pedidos.filter(p => p.mesa && ["listo", "entregado", "preparando", "pendiente"].includes(p.estado));

    const activosPorEstado = (estado: string) => pedidos.filter(p => p.estado === estado);
    const totalPedidos = pedidos.length;

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="bg-black text-white px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Wallet size={20} className="text-amber-400" />
                    <div>
                        <h1 className="font-black text-lg leading-tight">Caja</h1>
                        <p className="text-xs flex items-center gap-1">
                            {sesion
                                ? <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle size={10} /> Sesión abierta · desde {new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                                : <span className="text-red-400 font-semibold flex items-center gap-1"><AlertCircle size={10} /> Sin sesión activa</span>
                            }
                        </p>
                    </div>
                </div>
                <span className="text-xs text-gray-400">{new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
            </div>

            {/* Abrir caja si no hay sesión */}
            {!sesion && (
                <div className="max-w-2xl mx-auto px-4 mt-4">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900">Abrir caja</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Ingresá el monto inicial antes de empezar</p>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Monto inicial</label>
                                <input type="number" min="0" value={openForm.montoInicial}
                                    onChange={e => setOpenForm(p => ({ ...p, montoInicial: e.target.value }))}
                                    placeholder="$0" style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            </div>
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

            {/* Tabs (solo cuando hay sesión) */}
            {sesion && (
                <>
                    <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
                        <button onClick={() => setTab("pedidos")}
                            className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${tab === "pedidos" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
                            <Package size={15} /> Pedidos
                            {totalPedidos > 0 && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">{totalPedidos}</span>}
                        </button>
                        <button onClick={() => setTab("caja")}
                            className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${tab === "caja" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
                            <Wallet size={15} /> Cobrar
                            {mesasCobrar.length > 0 && <span className="bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded-full font-bold">{mesasCobrar.length}</span>}
                        </button>
                    </div>

                    {/* TAB PEDIDOS */}
                    {tab === "pedidos" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                            {pedidos.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Package size={40} className="mx-auto mb-3 text-gray-200" />
                                    <p className="font-semibold">Sin pedidos activos</p>
                                </div>
                            ) : (
                                pedidos.map(p => {
                                    const cfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.pendiente;
                                    const isUpdating = updatingId === p._id;
                                    return (
                                        <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-900">
                                                            {p.mesa ? `Mesa ${p.mesa}` : p.userId ? `${p.userId.nombre}` : "Mostrador"}
                                                        </p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                        {p.fuente === "empleado" ? " · Mozo" : " · Cliente"}
                                                    </p>
                                                </div>
                                                <p className="font-black text-gray-900 shrink-0">{formatMoney(p.total)}</p>
                                            </div>
                                            <div className="px-4 py-2.5 space-y-0.5">
                                                {p.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-gray-700">{item.cantidad}× {item.menuItemId?.nombre}</span>
                                                        <span className="text-gray-400">{formatMoney((item.menuItemId?.precio || 0) * item.cantidad)}</span>
                                                    </div>
                                                ))}
                                                {(p.notaEmpleado || p.notaCliente) && (
                                                    <p className="text-xs text-amber-600 italic pt-1">📝 {p.notaEmpleado || p.notaCliente}</p>
                                                )}
                                            </div>
                                            {cfg.next && (
                                                <div className="px-4 pb-3 flex justify-end">
                                                    <button onClick={() => avanzarEstado(p)} disabled={isUpdating}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition">
                                                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                                                        {cfg.nextLabel}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB COBRAR */}
                    {tab === "caja" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-black text-gray-900">Mesas activas</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{mesasCobrar.length}</span>
                            </div>
                            {mesasCobrar.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Wallet size={40} className="mx-auto mb-3 text-gray-200" />
                                    <p className="font-semibold">Sin mesas activas</p>
                                    <p className="text-sm mt-1">Los pedidos del mozo aparecen acá</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {mesasCobrar.map(p => {
                                        const cfg = ESTADO_CONFIG[p.estado];
                                        return (
                                            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-gray-900">Mesa {p.mesa}</p>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg?.color}`}>{cfg?.label}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
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
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                                <Printer size={15} />{cobrarSaving ? "..." : "Cobrar e imprimir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
