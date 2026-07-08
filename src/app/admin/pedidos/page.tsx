"use client";
import { useEffect, useState } from "react";
import { Printer, CheckCircle, Truck, Clock, Banknote, CreditCard, ArrowLeftRight, X, Plus, Trash2, LockKeyhole, Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const fmt = (n: number) => "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));

type Item    = { _id: string; menuItemId?: { nombre: string; precio: number; categoria: string }; cantidad: number; nota?: string };
type Pedido  = { _id: string; mesa?: string; total: number; estado: string; fuente: string; tipoEntrega?: string; items: Item[]; userId?: { nombre: string; apellido: string; role: string; telefono?: string }; notaCliente?: string; notaEmpleado?: string; direccion?: string; costoEnvio?: number; createdAt: string; eventoId?: string; numeroDia?: number; horarioPreferido?: string; telefonoContacto?: string; nombreComanda?: string; deliveryNumero?: number };
type Pago    = { metodo: "efectivo" | "tarjeta" | "transferencia"; monto: string };
type Tab     = "pendiente" | "preparando" | "listo" | "entregado";
type Confirm = { id: string; accion: "aceptar" | "listo" | "entregado" | "cuenta" };

const TABS: { key: Tab; label: string }[] = [
    { key: "pendiente",  label: "Pendientes"  },
    { key: "preparando", label: "Preparando"  },
    { key: "listo",      label: "Listos"      },
    { key: "entregado",  label: "Entregados"  },
];

export default function AdminPedidosPage() {
    const [pedidos, setPedidos]         = useState<Pedido[]>([]);
    const [loading, setLoading]         = useState(true);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [tab, setTab]                 = useState<Tab>("pendiente");
    const [updatingId, setUpdatingId]   = useState<string | null>(null);
    const [imprimiendoId, setImprimiendoId] = useState<string | null>(null);
    const [confirm, setConfirm]         = useState<Confirm | null>(null);

    const [pedidosActivos, setPedidosActivos]   = useState<boolean | null>(null);
    const [togglingPedidos, setTogglingPedidos] = useState(false);

    // Modal cobrar
    const [cobrarPedido, setCobrarPedido] = useState<Pedido | null>(null);
    const [descuento, setDescuento]       = useState("");
    const [pagos, setPagos]               = useState<Pago[]>([{ metodo: "efectivo", monto: "" }]);
    const [guardando, setGuardando]       = useState(false);

    useEffect(() => {
        fetch("/api/caja/status", { credentials: "include" }).then(r => r.json()).then(d => setCajaAbierta(!!d.abierta)).catch(() => setCajaAbierta(false));
        fetch("/api/config/pedidos").then(r => r.json()).then(d => setPedidosActivos(!!d.activo)).catch(() => {});
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
        setConfirm(null);
        try {
            await fetch("/api/pedidos", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado }) });
            await cargar();
        } finally { setUpdatingId(null); }
    }

    async function aceptarYImprimir(p: Pedido) {
        setUpdatingId(p._id);
        setConfirm(null);
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
        setConfirm(null);
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
        setConfirm(null);
        setCobrarPedido(p);
        setDescuento("");
        setPagos([{ metodo: "efectivo", monto: String(p.total) }]);
    }
    function cerrarCobrar() { setCobrarPedido(null); setDescuento(""); setPagos([{ metodo: "efectivo", monto: "" }]); }

    const totalConDesc = (p: Pedido) => Math.max(0, p.total - (Number(descuento) || 0));
    const calcVuelto = () => {
        if (!cobrarPedido) return 0;
        const t = totalConDesc(cobrarPedido);
        const ef  = pagos.filter(p => p.metodo === "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        const noEf = pagos.filter(p => p.metodo !== "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
        return Math.max(0, ef - Math.max(0, t - noEf));
    };

    async function cobrar() {
        if (!cobrarPedido) return;
        const pagosArr   = pagos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) || 0 }));
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
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Header */}
            <div className="bg-black sticky top-0 z-20 px-4 pt-5 pb-0">
                <div className="max-w-2xl mx-auto flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-black text-white">Pedidos</h1>
                        <p className="text-xs text-gray-500">{pedidos.filter(p => ["pendiente","preparando","listo","entregado"].includes(p.estado)).length} activos</p>
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
                <div className="max-w-2xl mx-auto flex gap-0 overflow-x-auto">
                    {TABS.map(t => {
                        const count = byTab(t.key).length;
                        return (
                            <button key={t.key} onClick={() => { setTab(t.key); setConfirm(null); }}
                                className={`relative flex-1 min-w-[80px] py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap ${tab === t.key ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"}`}>
                                {t.label}
                                {count > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-red-500 text-white">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Caja cerrada */}
            {cajaAbierta === false && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center">
                        <LockKeyhole size={28} className="text-gray-400" />
                    </div>
                    <div>
                        <p className="font-black text-gray-900">Caja cerrada</p>
                        <p className="text-sm text-gray-500 mt-1">Abrí la caja para gestionar pedidos.</p>
                    </div>
                    <Link href="/admin/caja" className="bg-black text-white font-bold px-6 py-3 rounded-xl">Ir a Caja</Link>
                </div>
            )}

            {/* Lista */}
            {cajaAbierta && (
                <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
                    {loading && <div className="flex justify-center py-16"><Loader /></div>}
                    {!loading && lista.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <CheckCircle size={36} className="text-gray-300" />
                            <p className="font-bold text-gray-400">Sin pedidos {TABS.find(t => t.key === tab)?.label.toLowerCase()}</p>
                        </div>
                    )}

                    {!loading && lista.map(p => {
                        const esAutoservicio = p.fuente === "autoservicio";
                        const esApp = !esAutoservicio && p.fuente === "cliente";
                        const esMozo = p.fuente === "empleado";
                        const esEvento = !!p.eventoId;
                        const esCajaDelivery = !esApp && !esMozo && !esAutoservicio && p.tipoEntrega === "envio";

                        const titulo = esApp
                            ? (p.userId ? `${p.userId.nombre} ${p.userId.apellido || ""}`.trim() : "Cliente")
                            : p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || (esCajaDelivery ? "Delivery" : "Sin mesa");

                        const subtitulo = esApp
                            ? `${p.numeroDia ? `#${p.numeroDia} · ` : ""}${p.tipoEntrega === "envio" ? "Envío a domicilio" : "Retiro en local"}`
                            : esCajaDelivery
                                ? `Delivery${p.deliveryNumero ? ` #${p.deliveryNumero}` : ""}${p.direccion ? ` · ${p.direccion}` : ""}`
                                : esMozo
                                    ? `Mozo: ${[p.userId?.nombre, p.userId?.apellido].filter(Boolean).join(" ")}`
                                    : esAutoservicio ? "Autoservicio" : "Bar";

                        const tipoBadge = esEvento
                            ? { label: "Evento",       cls: "bg-amber-400 text-black"  }
                            : esAutoservicio
                                ? { label: "Autoservicio", cls: "bg-purple-600 text-white" }
                                : esCajaDelivery
                                    ? { label: "Delivery",     cls: "bg-blue-600 text-white"  }
                                    : esApp
                                        ? { label: "Pedido",       cls: "bg-red-500 text-white"   }
                                        : { label: "Bar",          cls: "bg-white text-black"     };

                        const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        const isBusy = updatingId === p._id || imprimiendoId === p._id;
                        const thisConfirm = confirm?.id === p._id ? confirm.accion : null;

                        return (
                            <div key={p._id} className="rounded-2xl border-2 border-black shadow-md overflow-hidden bg-white">
                                {/* Header negro */}
                                <div className="px-4 py-3 bg-black flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-lg leading-tight break-words">{titulo}</p>
                                        <p className="text-xs text-white/60 mt-0.5">{subtitulo}</p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${tipoBadge.cls}`}>
                                                {tipoBadge.label}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/40 flex items-center gap-1"><Clock size={10}/>{hora}</span>
                                    </div>
                                </div>

                                {/* Cuerpo */}
                                <div className="px-4 py-3 space-y-3">
                                    {/* Info extra delivery */}
                                    {(esCajaDelivery || (esApp && p.tipoEntrega === "envio")) && p.direccion && (
                                        <p className="text-xs text-gray-600 flex items-start gap-1">
                                            <span className="shrink-0">📍</span> {p.direccion}
                                        </p>
                                    )}
                                    {esApp && p.horarioPreferido && (
                                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1"><Clock size={11}/> {p.horarioPreferido}</p>
                                    )}
                                    {esApp && p.userId?.telefono && (
                                        <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                            📱 {p.userId.telefono}
                                        </a>
                                    )}

                                    {/* Items */}
                                    <div className="border border-black rounded-xl overflow-hidden">
                                        {p.items.map((it, idx) => (
                                            <div key={it._id || idx} className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
                                                <div className="min-w-0">
                                                    <span className="font-black text-sm text-gray-900">{it.cantidad}×</span>
                                                    <span className="text-sm text-gray-900 ml-1.5">{it.menuItemId?.nombre ?? "Ítem"}</span>
                                                    {it.nota && <p className="text-[11px] text-amber-700 italic mt-0.5">✏ {it.nota}</p>}
                                                </div>
                                                <span className="text-xs text-gray-400 shrink-0 ml-2">{fmt((it.menuItemId?.precio ?? 0) * it.cantidad)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Notas */}
                                    {(p.notaCliente || p.notaEmpleado) && (
                                        <p className="text-xs italic text-gray-600 bg-amber-50 border-l-2 border-amber-400 pl-3 py-1.5 rounded-r-lg">
                                            📝 {p.notaCliente || p.notaEmpleado}
                                        </p>
                                    )}

                                    {/* Total */}
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                                        {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 ? (
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>Subtotal</span><span>{fmt(p.total - (p.costoEnvio ?? 0))}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>Envío</span><span>{fmt(p.costoEnvio ?? 0)}</span>
                                                </div>
                                                <div className="flex justify-between font-black text-gray-900 text-base mt-0.5">
                                                    <span>Total</span><span>{fmt(p.total)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Total</span>
                                                <span className="font-black text-gray-900 text-xl">{fmt(p.total)}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* ── Acciones con doble confirmación ── */}

                                    {/* PENDIENTE → Aceptar e imprimir */}
                                    {tab === "pendiente" && (
                                        thisConfirm === "aceptar" ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => aceptarYImprimir(p)} disabled={isBusy}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white font-bold text-sm py-3 rounded-xl active:scale-[0.97] disabled:opacity-50">
                                                    <Printer size={14}/>{isBusy ? "Imprimiendo..." : "Sí, aceptar e imprimir"}
                                                </button>
                                                <button onClick={() => setConfirm(null)}
                                                    className="px-4 py-3 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">
                                                    <X size={16}/>
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirm({ id: p._id, accion: "aceptar" })} disabled={isBusy}
                                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <Printer size={15}/>Aceptar e imprimir
                                            </button>
                                        )
                                    )}

                                    {/* PREPARANDO → Marcar listo */}
                                    {tab === "preparando" && (
                                        thisConfirm === "listo" ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => cambiarEstado(p._id, "listo")} disabled={isBusy}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl active:scale-[0.97] disabled:opacity-50">
                                                    <CheckCircle size={14}/>{isBusy ? "..." : "Sí, marcar listo"}
                                                </button>
                                                <button onClick={() => setConfirm(null)} className="px-4 py-3 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirm({ id: p._id, accion: "listo" })} disabled={isBusy}
                                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <CheckCircle size={15}/>Marcar listo
                                            </button>
                                        )
                                    )}

                                    {/* LISTO → Imprimir cuenta + Cobrar */}
                                    {tab === "listo" && (
                                        <div className="space-y-2">
                                            {thisConfirm === "cuenta" ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => imprimirCuenta(p)} disabled={isBusy}
                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 text-white font-bold text-sm py-3 rounded-xl active:scale-[0.97] disabled:opacity-50">
                                                        <Printer size={14}/>{imprimiendoId === p._id ? "Imprimiendo..." : "Sí, imprimir cuenta"}
                                                    </button>
                                                    <button onClick={() => setConfirm(null)} className="px-4 py-3 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl"><X size={16}/></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirm({ id: p._id, accion: "cuenta" })} disabled={isBusy}
                                                    className="w-full flex items-center justify-center gap-1.5 border border-gray-300 bg-white text-gray-700 font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                    <Printer size={14}/>Imprimir cuenta
                                                </button>
                                            )}
                                            <button onClick={() => abrirCobrar(p)} disabled={isBusy}
                                                className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                                <Wallet size={15}/>Cobrar {fmt(p.total)}
                                            </button>
                                        </div>
                                    )}

                                    {/* ENTREGADO → Cobrar */}
                                    {tab === "entregado" && (
                                        <button onClick={() => abrirCobrar(p)} disabled={isBusy}
                                            className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl transition active:scale-[0.97] disabled:opacity-50">
                                            <Wallet size={15}/>Cobrar {fmt(p.total)}
                                        </button>
                                    )}
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

                            {/* Métodos de pago */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Pago</label>
                                <div className="space-y-2">
                                    {pagos.map((pago, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                                                {(["efectivo","tarjeta","transferencia"] as const).map(m => (
                                                    <button key={m} onClick={() => setPagos(prev => prev.map((p,j) => j===i ? {...p,metodo:m} : p))}
                                                        className={`p-1.5 rounded-lg transition ${pago.metodo===m ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
                                                        {m==="efectivo" ? <Banknote size={16}/> : m==="tarjeta" ? <CreditCard size={16}/> : <ArrowLeftRight size={16}/>}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" value={pago.monto} placeholder="Monto" style={{ fontSize:"16px" }}
                                                    onChange={e => setPagos(prev => prev.map((p,j) => j===i ? {...p,monto:e.target.value} : p))}
                                                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-bold"/>
                                            </div>
                                            {pagos.length > 1 && (
                                                <button onClick={() => setPagos(prev => prev.filter((_,j) => j!==i))} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {pagos.length < 3 && (
                                    <button onClick={() => setPagos(prev => [...prev, {metodo:"efectivo",monto:""}])}
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
