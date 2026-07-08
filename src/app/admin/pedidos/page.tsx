"use client";
import { useEffect, useRef, useState } from "react";
import { Printer, CheckCircle, ChefHat, Clock, Banknote, CreditCard, ArrowLeftRight, X, Plus, Trash2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const fmt = (n: number) => "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));

type Item = { _id: string; menuItemId?: { nombre: string; precio: number; categoria: string }; cantidad: number; nota?: string };
type Pedido = { _id: string; mesa?: string; total: number; estado: string; fuente: string; tipoEntrega?: string; items: Item[]; userId?: { nombre: string; apellido: string; role: string; telefono?: string }; notaCliente?: string; notaEmpleado?: string; direccion?: string; costoEnvio?: number; createdAt: string };
type Pago = { metodo: "efectivo" | "tarjeta" | "transferencia"; monto: string };

type Tab = "pendiente" | "preparando" | "listo";

const TAB_CONFIG: { key: Tab; label: string }[] = [
    { key: "pendiente",  label: "Pendientes" },
    { key: "preparando", label: "Preparando" },
    { key: "listo",      label: "Listos" },
];

const ESTADO_COLOR: Record<string, string> = {
    pendiente:  "bg-amber-100 text-amber-700",
    preparando: "bg-orange-100 text-orange-700",
    listo:      "bg-emerald-100 text-emerald-700",
};

export default function AdminPedidosPage() {
    const [pedidos, setPedidos]         = useState<Pedido[]>([]);
    const [loading, setLoading]         = useState(true);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [tab, setTab]                 = useState<Tab>("pendiente");
    const [updatingId, setUpdatingId]   = useState<string | null>(null);
    const [imprimiendoId, setImprimiendoId] = useState<string | null>(null);

    // Modal cobrar
    const [cobrarPedido, setCobrarPedido] = useState<Pedido | null>(null);
    const [descuento, setDescuento]       = useState("");
    const [pagos, setPagos]               = useState<Pago[]>([{ metodo: "efectivo", monto: "" }]);
    const [guardando, setGuardando]       = useState(false);

    // Toggle pedidos activos
    const [pedidosActivos, setPedidosActivos]   = useState<boolean | null>(null);
    const [togglingPedidos, setTogglingPedidos] = useState(false);

    useEffect(() => {
        fetch("/api/caja/status", { credentials: "include" }).then(r => r.json()).then(d => setCajaAbierta(!!d.abierta)).catch(() => setCajaAbierta(false));
        fetch("/api/config/pedidos").then(r => r.json()).then(d => setPedidosActivos(!!d.activo)).catch(() => setPedidosActivos(false));
    }, []);

    useEffect(() => {
        if (cajaAbierta === false) return;
        cargar();
        const iv = setInterval(cargar, 5000);
        return () => clearInterval(iv);
    }, [cajaAbierta]);

    async function cargar() {
        try {
            const r = await fetch("/api/pedidos", { cache: "no-store", credentials: "include" });
            const d = await r.json();
            setPedidos(Array.isArray(d) ? d : []);
        } finally { setLoading(false); }
    }

    async function togglePedidos() {
        if (togglingPedidos || pedidosActivos === null) return;
        setTogglingPedidos(true);
        const res = await fetch("/api/config/pedidos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activos: !pedidosActivos }) });
        if (res.ok) setPedidosActivos(p => !p);
        setTogglingPedidos(false);
    }

    async function cambiarEstado(id: string, estado: string) {
        setUpdatingId(id);
        try {
            await fetch("/api/pedidos", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado }) });
            await cargar();
        } finally { setUpdatingId(null); }
    }

    async function aceptarYImprimir(p: Pedido) {
        setUpdatingId(p._id);
        try {
            await fetch("/api/pedidos", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p._id, estado: "preparando" }) });
            const hora    = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
            const cliente = p.userId ? `${p.userId.nombre} ${p.userId.apellido}`.trim() : "-";
            const bebidas = p.items.filter(it => BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
            const comida  = p.items.filter(it => !BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
            const toItems = (arr: Item[]) => arr.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota }));
            if (comida.length > 0)  await encolarComanda("Cocina", "COCINA", p, cliente, hora, toItems(comida));
            if (bebidas.length > 0) await encolarComanda("Barra",  "BARRA",  p, cliente, hora, toItems(bebidas));
            await cargar();
        } finally { setUpdatingId(null); }
    }

    async function encolarComanda(impresora: string, titulo: string, p: Pedido, cliente: string, hora: string, items: object[]) {
        await fetch("/api/print-jobs", {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: "comanda", impresora, payload: { titulo, mesa: p.mesa || "-", cliente, mozo: p.userId?.nombre || "-", hora, items, nota: p.notaCliente || p.notaEmpleado || "" } }),
        });
    }

    async function imprimirCuenta(p: Pedido) {
        setImprimiendoId(p._id);
        const hora  = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");
        const items = p.items.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", precio: it.menuItemId?.precio || 0 }));
        await fetch("/api/print-jobs", {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: "ticket", impresora: "Barra", payload: { mesa: p.mesa || "—", fecha, hora, items, total: p.total, descuento: 0, pagos: [], vuelto: 0, sinPago: true } }),
        });
        setImprimiendoId(null);
    }

    function abrirCobrar(p: Pedido) {
        setCobrarPedido(p);
        setDescuento("");
        setPagos([{ metodo: "efectivo", monto: String(p.total) }]);
    }
    function cerrarCobrar() { setCobrarPedido(null); setDescuento(""); setPagos([{ metodo: "efectivo", monto: "" }]); }

    const totalConDesc = (p: Pedido) => Math.max(0, p.total - (Number(descuento) || 0));
    const calcVuelto = () => {
        if (!cobrarPedido) return 0;
        const total = totalConDesc(cobrarPedido);
        const ef  = pagos.filter(p => p.metodo === "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        const noEf = pagos.filter(p => p.metodo !== "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        return Math.max(0, ef - Math.max(0, total - noEf));
    };

    async function cobrar() {
        if (!cobrarPedido) return;
        const pagosArr  = pagos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) || 0 }));
        const totalFinal = totalConDesc(cobrarPedido);
        const metodoPago = pagosArr.length === 1 ? pagosArr[0].metodo : "mixto";
        const vuelto     = calcVuelto();
        setGuardando(true);
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pedidoId: cobrarPedido._id, metodoPago, montoPagado: totalFinal, descuento: Number(descuento) || 0, pagos: pagosArr }),
            });
            if (res.ok) {
                const hora  = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                const fecha = new Date().toLocaleDateString("es-AR");
                const items = cobrarPedido.items.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", precio: it.menuItemId?.precio || 0 }));
                await fetch("/api/print-jobs", {
                    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo: "ticket", impresora: "Barra", payload: { mesa: cobrarPedido.mesa || "—", fecha, hora, items, total: totalFinal, descuento: Number(descuento) || 0, pagos: pagosArr, vuelto, sinPago: false } }),
                });
                cerrarCobrar();
                await cargar();
            }
        } finally { setGuardando(false); }
    }

    if (cajaAbierta === null) return <div className="flex justify-center py-20"><Loader /></div>;

    const byTab = (t: Tab) => pedidos.filter(p => p.estado === t);
    const lista = byTab(tab);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-black sticky top-0 z-20 px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-white">Pedidos</h1>
                        <p className="text-xs text-gray-500">{pedidos.filter(p => ["pendiente","preparando","listo"].includes(p.estado)).length} activos</p>
                    </div>
                    {pedidosActivos !== null && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">Delivery</span>
                            <button onClick={togglePedidos} disabled={togglingPedidos}
                                className={`relative flex h-6 w-11 rounded-full items-center transition-colors duration-200 disabled:opacity-50 ${pedidosActivos ? "bg-emerald-500" : "bg-gray-600"}`}>
                                <span className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${pedidosActivos ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="max-w-xl mx-auto flex gap-1 mt-3 bg-white/10 rounded-xl p-1">
                    {TAB_CONFIG.map(t => {
                        const count = byTab(t.key).length;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex-1 relative py-2 rounded-lg text-xs font-bold transition ${tab === t.key ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
                                {t.label}
                                {count > 0 && (
                                    <span className={`absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center ${tab === t.key ? "bg-black text-white" : "bg-red-500 text-white"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Caja cerrada */}
            {cajaAbierta === false && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <LockKeyhole size={28} className="text-gray-400" />
                    </div>
                    <div>
                        <p className="font-black text-gray-900">Caja cerrada</p>
                        <p className="text-sm text-gray-500 mt-1">Abrí la caja para gestionar pedidos.</p>
                    </div>
                    <Link href="/admin/caja" className="bg-black text-white font-bold px-6 py-3 rounded-xl">Ir a Caja</Link>
                </div>
            )}

            {/* Contenido */}
            {cajaAbierta && (
                <div className="max-w-xl mx-auto px-4 pt-4 space-y-3">
                    {loading && <div className="flex justify-center py-16"><Loader /></div>}

                    {!loading && lista.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <CheckCircle size={36} className="text-gray-300" />
                            <p className="font-bold text-gray-400">Sin pedidos {TAB_CONFIG.find(t => t.key === tab)?.label.toLowerCase()}</p>
                        </div>
                    )}

                    {!loading && lista.map(p => {
                        const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        const isBusy = updatingId === p._id || imprimiendoId === p._id;
                        return (
                            <div key={p._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${p.userId?.role === "empleado" ? "border-blue-200" : "border-gray-200"}`}>
                                {/* Banner mozo */}
                                {p.userId?.role === "empleado" && (
                                    <div className="bg-blue-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
                                        <ChefHat size={14} /> Comanda mozo{p.mesa ? ` — Mesa ${p.mesa}` : ""}
                                        {p.notaEmpleado && <span className="ml-auto opacity-80 italic truncate max-w-[140px]">{p.notaEmpleado}</span>}
                                    </div>
                                )}

                                <div className="px-4 py-3">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-black text-gray-900">
                                                {p.mesa ? `Mesa ${p.mesa}` : p.tipoEntrega === "envio" ? "Delivery" : "Sin mesa"}
                                            </p>
                                            {p.userId && p.userId.role !== "empleado" && (
                                                <p className="text-xs text-gray-500">{p.userId.nombre} {p.userId.apellido}</p>
                                            )}
                                            {p.tipoEntrega === "envio" && p.direccion && (
                                                <p className="text-xs text-gray-500 mt-0.5">📍 {p.direccion}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11}/>{hora}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado] ?? "bg-gray-100 text-gray-600"}`}>{p.estado}</span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 space-y-1">
                                        {p.items.map(it => (
                                            <div key={it._id} className="flex justify-between text-sm text-gray-700">
                                                <span>{it.cantidad}× {it.menuItemId?.nombre ?? "Ítem"}{it.nota ? <span className="text-gray-400 text-xs"> · {it.nota}</span> : null}</span>
                                                <span className="text-gray-400 text-xs">{fmt((it.menuItemId?.precio ?? 0) * it.cantidad)}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-gray-200 pt-1 flex justify-between font-black text-gray-900 text-sm">
                                            <span>Total</span><span>{fmt(p.total)}</span>
                                        </div>
                                    </div>

                                    {/* Nota */}
                                    {p.notaCliente && (
                                        <p className="text-xs italic text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">📝 {p.notaCliente}</p>
                                    )}

                                    {/* Acciones */}
                                    <div className="flex gap-2">
                                        {tab === "pendiente" && (
                                            <button onClick={() => aceptarYImprimir(p)} disabled={isBusy}
                                                className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <Printer size={15}/>{isBusy ? "..." : "Aceptar e imprimir"}
                                            </button>
                                        )}
                                        {tab === "preparando" && (
                                            <button onClick={() => cambiarEstado(p._id, "listo")} disabled={isBusy}
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <CheckCircle size={15}/>{isBusy ? "..." : "Marcar listo"}
                                            </button>
                                        )}
                                        {tab === "listo" && (<>
                                            <button onClick={() => imprimirCuenta(p)} disabled={isBusy}
                                                className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 font-bold text-sm px-4 py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <Printer size={14}/>{imprimiendoId === p._id ? "..." : "Cuenta"}
                                            </button>
                                            <button onClick={() => abrirCobrar(p)} disabled={isBusy}
                                                className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                Cobrar {fmt(p.total)}
                                            </button>
                                        </>)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal cobrar */}
            {cobrarPedido && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={cerrarCobrar}>
                    <div className="bg-white rounded-t-3xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold">Cobrar</p>
                                <h2 className="text-xl font-black text-gray-900">{cobrarPedido.mesa ? `Mesa ${cobrarPedido.mesa}` : "Sin mesa"}</h2>
                            </div>
                            <button onClick={cerrarCobrar} className="p-2 text-gray-400 hover:text-gray-700"><X size={18}/></button>
                        </div>

                        <div className="px-5 pt-4 pb-2 space-y-4">
                            {/* Resumen */}
                            <div className="bg-gray-50 rounded-2xl p-3 space-y-1">
                                {cobrarPedido.items.map(it => (
                                    <div key={it._id} className="flex justify-between text-sm text-gray-700">
                                        <span>{it.cantidad}× {it.menuItemId?.nombre ?? "Ítem"}</span>
                                        <span className="text-gray-400">{fmt((it.menuItemId?.precio ?? 0) * it.cantidad)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 pt-1 flex justify-between font-black text-gray-900">
                                    <span>Total</span><span>{fmt(cobrarPedido.total)}</span>
                                </div>
                            </div>

                            {/* Descuento */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Descuento</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input type="number" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0"
                                        style={{ fontSize: "16px" }}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-bold"/>
                                </div>
                                {Number(descuento) > 0 && <p className="text-sm font-black text-emerald-600 mt-1.5">A cobrar: {fmt(totalConDesc(cobrarPedido))}</p>}
                            </div>

                            {/* Pagos */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Pago</label>
                                <div className="space-y-2">
                                    {pagos.map((pago, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                                                {(["efectivo", "tarjeta", "transferencia"] as const).map(m => (
                                                    <button key={m} onClick={() => setPagos(prev => prev.map((p, j) => j === i ? { ...p, metodo: m } : p))}
                                                        className={`p-1.5 rounded-lg transition ${pago.metodo === m ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
                                                        {m === "efectivo" ? <Banknote size={16}/> : m === "tarjeta" ? <CreditCard size={16}/> : <ArrowLeftRight size={16}/>}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" value={pago.monto} placeholder="Monto" style={{ fontSize: "16px" }}
                                                    onChange={e => setPagos(prev => prev.map((p, j) => j === i ? { ...p, monto: e.target.value } : p))}
                                                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-bold"/>
                                            </div>
                                            {pagos.length > 1 && (
                                                <button onClick={() => setPagos(prev => prev.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {pagos.length < 3 && (
                                    <button onClick={() => setPagos(prev => [...prev, { metodo: "efectivo", monto: "" }])}
                                        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700">
                                        <Plus size={14}/> Agregar otro medio
                                    </button>
                                )}
                                {calcVuelto() > 0 && <p className="text-sm font-black text-amber-600 mt-2">Vuelto: {fmt(calcVuelto())}</p>}
                            </div>
                        </div>

                        <div className="px-5 pb-8 pt-3 space-y-2 border-t border-gray-100">
                            <button onClick={cobrar} disabled={guardando}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-4 rounded-2xl text-base active:scale-[0.98] transition disabled:opacity-50">
                                <Printer size={18}/>{guardando ? "Procesando..." : `Cobrar e imprimir · ${fmt(totalConDesc(cobrarPedido))}`}
                            </button>
                            <button onClick={cerrarCobrar} className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
