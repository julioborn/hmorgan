"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Wallet, TrendingUp, TrendingDown, Plus, X, Printer,
    Clock, CreditCard, Banknote, Send, Loader2, CheckCircle,
} from "lucide-react";

type CajaSession = {
    _id: string;
    estado: "abierta" | "cerrada";
    montoInicial: number;
    montoCierre?: number;
    abiertaPor: { nombre?: string; apellido?: string } | string;
    fechaApertura: string;
    notas?: string;
};

type CajaMovimiento = {
    _id: string;
    tipo: "ingreso" | "egreso";
    concepto: string;
    monto: number;
    metodoPago: "efectivo" | "tarjeta" | "transferencia";
    createdAt: string;
};

type Resumen = Record<string, { ingreso: number; egreso: number }>;

type PedidoActivo = {
    _id: string;
    mesa: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    createdAt: string;
    notaEmpleado?: string;
};

const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;

const metodoLabel: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
};

const metodoIcon: Record<string, React.ElementType> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Send,
};

export default function CajaPage() {
    const [sesion, setSesion] = useState<CajaSession | null | undefined>(undefined);
    const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [pedidosActivos, setPedidosActivos] = useState<PedidoActivo[]>([]);
    const [cobrarModal, setCobrarModal] = useState<{ open: boolean; pedido: PedidoActivo | null }>({ open: false, pedido: null });
    const [cobrarForm, setCobrarForm] = useState({ metodoPago: "efectivo" as "efectivo" | "tarjeta" | "transferencia", montoPagado: "" });
    const [cobrarSaving, setCobrarSaving] = useState(false);

    // open session form
    const [openForm, setOpenForm] = useState({ montoInicial: "", notas: "" });
    const [openSaving, setOpenSaving] = useState(false);

    // movement form
    const [movForm, setMovForm] = useState({
        tipo: "ingreso" as "ingreso" | "egreso",
        concepto: "",
        monto: "",
        metodoPago: "efectivo" as "efectivo" | "tarjeta" | "transferencia",
    });
    const [movSaving, setMovSaving] = useState(false);

    // close session modal
    const [closeModal, setCloseModal] = useState(false);
    const [closeForm, setCloseForm] = useState({ montoCierre: "", notas: "" });
    const [closeSaving, setCloseSaving] = useState(false);
    const [closeResumen, setCloseResumen] = useState<Resumen | null>(null);

    const loadCaja = useCallback(() => {
        fetch("/api/superadmin/caja", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                setSesion(data.sesion || null);
                setMovimientos(data.movimientos || []);
            })
            .catch(() => setSesion(null))
            .finally(() => setLoading(false));
    }, []);

    const loadPedidosActivos = useCallback(() => {
        fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setPedidosActivos(data.filter((p: PedidoActivo) => p.mesa)); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadCaja(); loadPedidosActivos(); }, [loadCaja, loadPedidosActivos]);

    async function abrirCaja() {
        setOpenSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoInicial: Number(openForm.montoInicial) || 0, notas: openForm.notas || undefined }),
            });
            if (res.ok) { setOpenForm({ montoInicial: "", notas: "" }); loadCaja(); }
        } finally { setOpenSaving(false); }
    }

    async function agregarMovimiento() {
        if (!movForm.concepto || !movForm.monto) return;
        setMovSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja/movimiento", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ tipo: movForm.tipo, concepto: movForm.concepto, monto: Number(movForm.monto), metodoPago: movForm.metodoPago }),
            });
            if (res.ok) {
                setMovForm(p => ({ ...p, concepto: "", monto: "" }));
                loadCaja();
            }
        } finally { setMovSaving(false); }
    }

    async function cobrarPedido() {
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
                const pedido = cobrarModal.pedido;
                const monto = Number(cobrarForm.montoPagado) || pedido.total;
                printTicket(pedido, cobrarForm.metodoPago, monto);
                setCobrarModal({ open: false, pedido: null });
                setCobrarForm({ metodoPago: "efectivo", montoPagado: "" });
                loadCaja();
                loadPedidosActivos();
            }
        } finally { setCobrarSaving(false); }
    }

    function printTicket(pedido: PedidoActivo, metodoPago: string, montoPagado: number) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");
        const vuelto = metodoPago === "efectivo" && montoPagado > pedido.total ? montoPagado - pedido.total : 0;
        const rows = pedido.items.map(i => {
            const nombre = i.menuItemId?.nombre || "Ítem";
            const precio = i.menuItemId?.precio || 0;
            return `<tr><td>${i.cantidad}x ${nombre}</td><td style="text-align:right">${formatMoney(precio * i.cantidad)}</td></tr>`;
        }).join("");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Courier New',monospace;font-size:12px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:15px;letter-spacing:2px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            .mesa{text-align:center;font-size:14px;font-weight:bold;padding:3px 0}
            hr{border:none;border-top:1px dashed #000;margin:5px 0}
            table{width:100%;border-collapse:collapse}
            td{padding:2px 0;font-size:12px}
            .total{font-size:14px;font-weight:bold}
            .vuelto{font-weight:bold;color:#16a34a}
        </style></head><body>
        <h2>★ TICKET ★</h2>
        <div class="sub">H. Morgan Bar</div>
        <div class="mesa">MESA ${pedido.mesa}</div>
        <div class="sub">${fecha} ${hora}</div>
        <hr/>
        <table>${rows}</table>
        <hr/>
        <table>
            <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(pedido.total)}</td></tr>
            <tr><td>${metodoLabel[metodoPago] || metodoPago}</td><td style="text-align:right">${formatMoney(montoPagado)}</td></tr>
            ${vuelto > 0 ? `<tr><td class="vuelto">Vuelto</td><td class="vuelto" style="text-align:right">${formatMoney(vuelto)}</td></tr>` : ""}
        </table>
        <hr/>
        <div class="sub" style="margin-top:6px">¡Gracias por su visita!</div>
        </body></html>`;
        const w = window.open("", "_blank", "width=320,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    async function cerrarCaja() {
        setCloseSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja/cerrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoCierre: Number(closeForm.montoCierre) || 0, notas: closeForm.notas || undefined }),
            });
            if (res.ok) {
                const data = await res.json();
                setCloseResumen(data.resumen);
                loadCaja();
            }
        } finally { setCloseSaving(false); }
    }

    function printResumen() {
        const totales = calcularTotales();
        const movRows = movimientos.map(m =>
            `<tr style="border-bottom:1px solid #eee">
                <td style="padding:4px 6px;font-size:12px">${new Date(m.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td style="padding:4px 6px;font-size:12px">${m.concepto}</td>
                <td style="padding:4px 6px;font-size:12px">${metodoLabel[m.metodoPago]}</td>
                <td style="padding:4px 6px;font-size:12px;text-align:right;color:${m.tipo === "ingreso" ? "#16a34a" : "#dc2626"};font-weight:bold">
                    ${m.tipo === "ingreso" ? "+" : "-"}${formatMoney(m.monto)}
                </td>
            </tr>`
        ).join("");

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen de Caja</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size:13px; padding:20px; max-width:600px; }
            h1 { font-size:18px; text-align:center; margin-bottom:4px; }
            .sub { text-align:center; color:#666; font-size:11px; margin-bottom:12px; }
            table { width:100%; border-collapse:collapse; }
            th { text-align:left; padding:6px; background:#f5f5f5; font-size:11px; text-transform:uppercase; }
            .total-row td { font-weight:bold; padding:8px 6px; border-top:2px solid #000; }
        </style>
        </head><body>
        <h1>Resumen de Caja</h1>
        <div class="sub">H. Morgan Bar · ${sesion ? new Date(sesion.fechaApertura).toLocaleDateString("es-AR") : ""}</div>
        <table>
            <tr><th>Hora</th><th>Concepto</th><th>Método</th><th style="text-align:right">Monto</th></tr>
            ${movRows}
            <tr class="total-row">
                <td colspan="3">Total neto</td>
                <td style="text-align:right;color:${totales.neto >= 0 ? "#16a34a" : "#dc2626"}">${formatMoney(totales.neto)}</td>
            </tr>
        </table>
        <div style="margin-top:16px;font-size:12px;color:#555">
            <p>Ingresos: ${formatMoney(totales.totalIngreso)} · Egresos: ${formatMoney(totales.totalEgreso)}</p>
            <p>Monto inicial: ${formatMoney(sesion?.montoInicial || 0)}</p>
        </div>
        </body></html>`;

        const w = window.open("", "_blank", "width=650,height=700,toolbar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    function calcularTotales() {
        const totalIngreso = movimientos.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
        const totalEgreso = movimientos.filter(m => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
        const neto = (sesion?.montoInicial || 0) + totalIngreso - totalEgreso;
        return { totalIngreso, totalEgreso, neto };
    }

    const totales = calcularTotales();

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

    /* ── No session open ── */
    if (sesion === null) {
        return (
            <div className="min-h-screen p-4">
                <div className="max-w-md mx-auto pt-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Wallet size={28} className="text-gray-400" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900">Caja cerrada</h1>
                        <p className="text-sm text-gray-500 mt-1">No hay sesión activa. Abrí la caja para empezar.</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Monto inicial (en caja)</label>
                            <input type="number" min="0" value={openForm.montoInicial}
                                onChange={e => setOpenForm(p => ({ ...p, montoInicial: e.target.value }))}
                                placeholder="0"
                                className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Notas</label>
                            <input value={openForm.notas} onChange={e => setOpenForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Opcional"
                                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <button onClick={abrirCaja} disabled={openSaving}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition mt-2">
                            <Wallet size={18} />
                            {openSaving ? "Abriendo..." : "Abrir Caja"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Session open ── */
    const operadorNombre = typeof sesion?.abiertaPor === "object" && sesion.abiertaPor
        ? `${(sesion.abiertaPor as any).nombre || ""} ${(sesion.abiertaPor as any).apellido || ""}`.trim()
        : "—";

    const horaApertura = sesion ? new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <div className="min-h-screen pb-24">
            {/* Session header */}
            <div className="bg-emerald-600 text-white px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <CheckCircle size={18} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">Sesión abierta</p>
                        <p className="text-xs text-emerald-100">Desde las {horaApertura} · Inicial: {formatMoney(sesion?.montoInicial || 0)}</p>
                    </div>
                    <button onClick={printResumen} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                        <Printer size={13} /> Imprimir
                    </button>
                    <button onClick={() => { setCloseModal(true); setCloseForm({ montoCierre: "", notas: "" }); }}
                        className="flex items-center gap-1.5 bg-white text-red-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                        Cerrar caja
                    </button>
                </div>
            </div>

            <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Ingresos</p>
                        <p className="text-sm font-black text-emerald-600">{formatMoney(totales.totalIngreso)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Egresos</p>
                        <p className="text-sm font-black text-red-600">{formatMoney(totales.totalEgreso)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Neto total</p>
                        <p className={`text-sm font-black ${totales.neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(totales.neto)}</p>
                    </div>
                </div>

                {/* Add movement form */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                    <h2 className="font-bold text-gray-900 text-sm">Registrar movimiento</h2>

                    <div className="flex gap-2">
                        <button onClick={() => setMovForm(p => ({ ...p, tipo: "ingreso" }))}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition ${movForm.tipo === "ingreso" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                            <TrendingUp size={14} /> Ingreso
                        </button>
                        <button onClick={() => setMovForm(p => ({ ...p, tipo: "egreso" }))}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition ${movForm.tipo === "egreso" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                            <TrendingDown size={14} /> Egreso
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {METODOS.map(met => {
                            const Icon = metodoIcon[met];
                            return (
                                <button key={met} onClick={() => setMovForm(p => ({ ...p, metodoPago: met }))}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition ${movForm.metodoPago === met ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                                    <Icon size={12} /> {metodoLabel[met]}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <input value={movForm.concepto} onChange={e => setMovForm(p => ({ ...p, concepto: e.target.value }))}
                            placeholder="Concepto..."
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <input type="number" min="0" value={movForm.monto} onChange={e => setMovForm(p => ({ ...p, monto: e.target.value }))}
                            placeholder="$"
                            className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-bold" />
                    </div>

                    <button onClick={agregarMovimiento} disabled={movSaving || !movForm.concepto || !movForm.monto}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition">
                        <Plus size={16} />
                        {movSaving ? "Registrando..." : "Registrar"}
                    </button>
                </div>

                {/* Movements list */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 text-sm">Movimientos ({movimientos.length})</h2>
                    </div>
                    {movimientos.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin movimientos aún</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {movimientos.map(m => {
                                const Icon = metodoIcon[m.metodoPago] || Banknote;
                                return (
                                    <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.tipo === "ingreso" ? "bg-emerald-100" : "bg-red-100"}`}>
                                            {m.tipo === "ingreso"
                                                ? <TrendingUp size={14} className="text-emerald-600" />
                                                : <TrendingDown size={14} className="text-red-600" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{m.concepto}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Icon size={11} className="text-gray-400 shrink-0" />
                                                <p className="text-xs text-gray-400">{metodoLabel[m.metodoPago]}</p>
                                                <span className="text-gray-300">·</span>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(m.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`text-sm font-black shrink-0 ${m.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"}`}>
                                            {m.tipo === "ingreso" ? "+" : "-"}{formatMoney(m.monto)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Mesas activas */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 text-sm">Mesas Activas</h2>
                        <button onClick={loadPedidosActivos} className="text-xs text-gray-400 hover:text-gray-600 transition">↻ actualizar</button>
                    </div>
                    {pedidosActivos.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin mesas con comanda abierta</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {pedidosActivos.map(p => (
                                <div key={p._id} className="px-4 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Mesa {p.mesa}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                {" · "}{p.estado}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-gray-900">{formatMoney(p.total)}</p>
                                            <button
                                                onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ metodoPago: "efectivo", montoPagado: String(p.total) }); }}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                                                Cobrar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {p.items.map((i, idx) => (
                                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {i.cantidad}× {i.menuItemId?.nombre || "ítem"}
                                            </span>
                                        ))}
                                    </div>
                                    {p.notaEmpleado && <p className="text-xs text-amber-600 mt-1 italic">📝 {p.notaEmpleado}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal cobrar */}
            {cobrarModal.open && cobrarModal.pedido && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Cobrar Mesa {cobrarModal.pedido.mesa}</h2>
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {/* Detalle de ítems */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                {cobrarModal.pedido.items.map((i, idx) => {
                                    const precio = i.menuItemId?.precio || 0;
                                    return (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{i.cantidad}× {i.menuItemId?.nombre || "ítem"}</span>
                                            <span className="font-semibold text-gray-900">{formatMoney(precio * i.cantidad)}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 mt-2">
                                    <span>TOTAL</span>
                                    <span>{formatMoney(cobrarModal.pedido.total)}</span>
                                </div>
                            </div>
                            {/* Método de pago */}
                            <div className="flex gap-2">
                                {METODOS.map(met => {
                                    const Icon = metodoIcon[met];
                                    return (
                                        <button key={met} onClick={() => setCobrarForm(p => ({ ...p, metodoPago: met }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${cobrarForm.metodoPago === met ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                                            <Icon size={13} /> {metodoLabel[met]}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Monto recibido */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Monto recibido</label>
                                <input type="number" min="0" value={cobrarForm.montoPagado}
                                    onChange={e => setCobrarForm(p => ({ ...p, montoPagado: e.target.value }))}
                                    className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            </div>
                            {/* Vuelto */}
                            {cobrarForm.metodoPago === "efectivo" && Number(cobrarForm.montoPagado) > cobrarModal.pedido.total && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex justify-between">
                                    <span className="text-sm font-semibold text-emerald-700">Vuelto</span>
                                    <span className="text-sm font-black text-emerald-700">{formatMoney(Number(cobrarForm.montoPagado) - cobrarModal.pedido.total)}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={cobrarPedido} disabled={cobrarSaving}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                                <Printer size={15} />
                                {cobrarSaving ? "Procesando..." : "Cobrar e imprimir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close session modal */}
            {closeModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        {closeResumen ? (
                            <>
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                                    <h2 className="font-black text-gray-900 flex-1">Caja cerrada</h2>
                                    <button onClick={() => { setCloseModal(false); setCloseResumen(null); }} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                                </div>
                                <div className="px-5 py-4 space-y-2">
                                    {Object.entries(closeResumen).map(([metodo, v]) => (
                                        <div key={metodo} className="flex justify-between items-center py-2 border-b border-gray-50">
                                            <p className="text-sm font-semibold capitalize text-gray-700">{metodoLabel[metodo] || metodo}</p>
                                            <div className="text-right text-xs">
                                                <p className="text-emerald-600 font-semibold">{formatMoney(v.ingreso)}</p>
                                                {v.egreso > 0 && <p className="text-red-600">-{formatMoney(v.egreso)}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-5 pb-5">
                                    <button onClick={() => { setCloseModal(false); setCloseResumen(null); }}
                                        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold">
                                        Cerrar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                    <h2 className="font-black text-gray-900 flex-1">Cerrar caja</h2>
                                    <button onClick={() => setCloseModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                                </div>
                                <div className="px-5 py-4 space-y-3">
                                    <p className="text-sm text-gray-600">
                                        Total en caja estimado: <strong className="text-gray-900">{formatMoney(totales.neto)}</strong>
                                    </p>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Monto al cerrar (conteo real)</label>
                                        <input type="number" min="0" value={closeForm.montoCierre}
                                            onChange={e => setCloseForm(p => ({ ...p, montoCierre: e.target.value }))}
                                            placeholder={String(totales.neto)}
                                            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Notas del cierre</label>
                                        <input value={closeForm.notas} onChange={e => setCloseForm(p => ({ ...p, notas: e.target.value }))}
                                            placeholder="Opcional"
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    </div>
                                </div>
                                <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                                    <button onClick={() => setCloseModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                                    <button onClick={cerrarCaja} disabled={closeSaving}
                                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                        {closeSaving ? "Cerrando..." : "Confirmar cierre"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
