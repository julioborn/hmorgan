"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, Printer, Banknote, CreditCard, ArrowLeftRight, X, Plus, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";

const PRINT_SERVER = process.env.NEXT_PUBLIC_PRINT_SERVER_URL ?? "http://localhost:3001";

type PedidoItem = {
    _id: string;
    menuItemId?: { nombre: string; precio: number };
    cantidad: number;
    nota?: string;
};
type Pedido = {
    _id: string;
    mesa?: string;
    total: number;
    estado: string;
    fuente: string;
    tipoEntrega?: string;
    items: PedidoItem[];
    userId?: { nombre?: string; apellido?: string };
    createdAt: string;
};
type Pago = { metodo: "efectivo" | "tarjeta" | "transferencia"; monto: string };

const ESTADOS_ACTIVOS = ["pendiente", "aceptado", "preparando", "listo"];
const METODO_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const fmt = (n: number) => "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));
const ESTADO_COLOR: Record<string, string> = {
    pendiente:  "bg-amber-100 text-amber-700",
    aceptado:   "bg-blue-100 text-blue-700",
    preparando: "bg-orange-100 text-orange-700",
    listo:      "bg-emerald-100 text-emerald-700",
};

export default function AdminCobrarPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [cobrarPedido, setCobrarPedido] = useState<Pedido | null>(null);
    const [descuento, setDescuento] = useState("");
    const [pagos, setPagos] = useState<Pago[]>([{ metodo: "efectivo", monto: "" }]);
    const [guardando, setGuardando] = useState(false);
    const [imprimiendo, setImprimiendo] = useState<string | null>(null);

    async function cargar() {
        try {
            const r = await fetch("/api/pedidos?activos=true", { credentials: "include" });
            const d = await r.json();
            setPedidos(Array.isArray(d) ? d.filter((p: Pedido) => ESTADOS_ACTIVOS.includes(p.estado)) : []);
        } finally { setLoading(false); }
    }

    useEffect(() => {
        cargar();
        const iv = setInterval(cargar, 8000);
        return () => clearInterval(iv);
    }, []);

    function abrirCobrar(p: Pedido) {
        setCobrarPedido(p);
        setDescuento("");
        setPagos([{ metodo: "efectivo", monto: String(p.total) }]);
    }
    function cerrarCobrar() { setCobrarPedido(null); setDescuento(""); setPagos([{ metodo: "efectivo", monto: "" }]); }

    function totalConDesc(p: Pedido) { return Math.max(0, p.total - (Number(descuento) || 0)); }

    function calcVuelto() {
        if (!cobrarPedido) return 0;
        const total = totalConDesc(cobrarPedido);
        const efectivo = pagos.filter(p => p.metodo === "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        const noEfectivo = pagos.filter(p => p.metodo !== "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        return Math.max(0, efectivo - Math.max(0, total - noEfectivo));
    }

    async function enviarTicketAlServidor(p: Pedido, pagosArr: { metodo: string; monto: number }[], desc: number, totalFinal: number, vuelto: number, sinPago = false) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");
        const items = p.items.map(i => ({ cantidad: i.cantidad, nombre: i.menuItemId?.nombre || "Ítem", precio: i.menuItemId?.precio || 0 }));
        try {
            await fetch(`${PRINT_SERVER}/imprimir/ticket`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mesa: p.mesa || "—", fecha, hora, items, total: sinPago ? p.total : totalFinal, descuento: desc, pagos: sinPago ? [] : pagosArr, vuelto, sinPago }),
            });
        } catch { /* print server no disponible */ }
    }

    async function imprimirCuenta(p: Pedido) {
        setImprimiendo(p._id);
        await enviarTicketAlServidor(p, [], 0, p.total, 0, true);
        setImprimiendo(null);
    }

    async function cobrar() {
        if (!cobrarPedido) return;
        const pagosArr = pagos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) || 0 }));
        const totalFinal = totalConDesc(cobrarPedido);
        const metodoPago = pagosArr.length === 1 ? pagosArr[0].metodo : "mixto";
        const vuelto = calcVuelto();
        setGuardando(true);
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pedidoId: cobrarPedido._id,
                    metodoPago,
                    montoPagado: totalFinal,
                    descuento: Number(descuento) || 0,
                    pagos: pagosArr,
                }),
            });
            if (res.ok) {
                await enviarTicketAlServidor(cobrarPedido, pagosArr, Number(descuento) || 0, totalFinal, vuelto);
                setPedidos(prev => prev.filter(p => p._id !== cobrarPedido._id));
                cerrarCobrar();
            }
        } finally { setGuardando(false); }
    }

    const comandas = pedidos.filter(p => p.tipoEntrega !== "envio" || p.fuente === "autoservicio");
    const delivery = pedidos.filter(p => p.tipoEntrega === "envio" && p.fuente !== "autoservicio");

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-black sticky top-0 z-20 px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <Link href="/admin" className="p-2 text-white/60 hover:text-white"><ChevronLeft size={22} /></Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-white">Cobrar</h1>
                        <p className="text-xs text-gray-500">{comandas.length + delivery.length} comanda{comandas.length + delivery.length !== 1 ? "s" : ""} activa{comandas.length + delivery.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4 space-y-6">
                {pedidos.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <CheckCircle size={40} className="text-emerald-400" />
                        <p className="font-bold text-gray-500">Sin comandas activas</p>
                    </div>
                )}

                {/* Salón / Autoservicio */}
                {comandas.length > 0 && (
                    <section>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Salón</p>
                        <div className="space-y-3">
                            {comandas.map(p => (
                                <PedidoCard key={p._id} pedido={p} onCobrar={() => abrirCobrar(p)}
                                    onImprimirCuenta={() => imprimirCuenta(p)} imprimiendo={imprimiendo === p._id} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Delivery */}
                {delivery.length > 0 && (
                    <section>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery</p>
                        <div className="space-y-3">
                            {delivery.map(p => (
                                <PedidoCard key={p._id} pedido={p} onCobrar={() => abrirCobrar(p)}
                                    onImprimirCuenta={() => imprimirCuenta(p)} imprimiendo={imprimiendo === p._id} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Bottom sheet cobrar */}
            {cobrarPedido && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={cerrarCobrar}>
                    <div className="bg-white rounded-t-3xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold">Cobrar comanda</p>
                                <h2 className="text-xl font-black text-gray-900">
                                    {cobrarPedido.mesa ? `Mesa ${cobrarPedido.mesa}` : "Sin mesa"}
                                </h2>
                            </div>
                            <button onClick={cerrarCobrar} className="p-2 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>

                        {/* Resumen ítems */}
                        <div className="px-5 pt-3 pb-2">
                            <div className="bg-gray-50 rounded-2xl p-3 space-y-1 mb-4">
                                {cobrarPedido.items.map(it => (
                                    <div key={it._id} className="flex justify-between text-sm text-gray-700">
                                        <span>{it.cantidad}× {it.menuItemId?.nombre ?? "Ítem"}</span>
                                        <span className="text-gray-500">{fmt((it.menuItemId?.precio ?? 0) * it.cantidad)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-black text-gray-900">
                                    <span>Total</span><span>{fmt(cobrarPedido.total)}</span>
                                </div>
                            </div>

                            {/* Descuento */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Descuento</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input type="number" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0"
                                        style={{ fontSize: "16px" }}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-bold" />
                                </div>
                                {Number(descuento) > 0 && (
                                    <p className="text-sm font-black text-emerald-600 mt-1.5">
                                        A cobrar: {fmt(totalConDesc(cobrarPedido))}
                                    </p>
                                )}
                            </div>

                            {/* Métodos de pago */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Pago</label>
                                <div className="space-y-2">
                                    {pagos.map((pago, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                                                {(["efectivo", "tarjeta", "transferencia"] as const).map(m => (
                                                    <button key={m} onClick={() => setPagos(prev => prev.map((p, j) => j === i ? { ...p, metodo: m } : p))}
                                                        className={`p-1.5 rounded-lg transition ${pago.metodo === m ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
                                                        {m === "efectivo" ? <Banknote size={16} /> : m === "tarjeta" ? <CreditCard size={16} /> : <ArrowLeftRight size={16} />}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" value={pago.monto} placeholder="Monto"
                                                    style={{ fontSize: "16px" }}
                                                    onChange={e => setPagos(prev => prev.map((p, j) => j === i ? { ...p, monto: e.target.value } : p))}
                                                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-bold" />
                                            </div>
                                            {pagos.length > 1 && (
                                                <button onClick={() => setPagos(prev => prev.filter((_, j) => j !== i))}
                                                    className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {pagos.length < 3 && (
                                    <button onClick={() => setPagos(prev => [...prev, { metodo: "efectivo", monto: "" }])}
                                        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700">
                                        <Plus size={14} /> Agregar otro medio
                                    </button>
                                )}
                                {calcVuelto() > 0 && (
                                    <p className="text-sm font-black text-amber-600 mt-2">Vuelto: {fmt(calcVuelto())}</p>
                                )}
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="px-5 pb-8 pt-2 space-y-2 border-t border-gray-100">
                            <button onClick={cobrar} disabled={guardando}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-4 rounded-2xl text-base active:scale-[0.98] transition disabled:opacity-50">
                                <Printer size={18} />{guardando ? "Procesando..." : `Cobrar e imprimir · ${fmt(totalConDesc(cobrarPedido))}`}
                            </button>
                            <button onClick={cerrarCobrar}
                                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PedidoCard({ pedido, onCobrar, onImprimirCuenta, imprimiendo }: {
    pedido: Pedido;
    onCobrar: () => void;
    onImprimirCuenta: () => void;
    imprimiendo: boolean;
}) {
    const fmt = (n: number) => "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));
    const hora = new Date(pedido.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                    <p className="font-black text-gray-900">
                        {pedido.mesa ? `Mesa ${pedido.mesa}` : pedido.tipoEntrega === "envio" ? "Delivery" : "Sin mesa"}
                    </p>
                    {pedido.userId && (
                        <p className="text-xs text-gray-400">{pedido.userId.nombre} {pedido.userId.apellido}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{hora}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_COLOR[pedido.estado] ?? "bg-gray-100 text-gray-600"}`}>
                        {pedido.estado}
                    </span>
                </div>
            </div>

            <div className="px-4 py-3">
                <ul className="space-y-0.5 mb-3">
                    {pedido.items.map(it => (
                        <li key={it._id} className="flex justify-between text-sm text-gray-700">
                            <span>{it.cantidad}× {it.menuItemId?.nombre ?? "Ítem"}</span>
                            <span className="text-gray-400">{fmt((it.menuItemId?.precio ?? 0) * it.cantidad)}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex items-center justify-between">
                    <p className="font-black text-gray-900 text-base">{fmt(pedido.total)}</p>
                    <div className="flex gap-2">
                        <button onClick={onImprimirCuenta} disabled={imprimiendo}
                            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                            <Printer size={13} />{imprimiendo ? "..." : "Cuenta"}
                        </button>
                        <button onClick={onCobrar}
                            className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition active:scale-[0.97]">
                            Cobrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
