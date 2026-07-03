"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
    ChevronLeft, ChevronDown, ChevronUp, X,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, ArrowDownCircle, ArrowUpCircle, UtensilsCrossed,
    Star, AlertCircle, Clock, Receipt, Ticket,
} from "lucide-react";
import Loader from "@/components/Loader";

// ── Types ──────────────────────────────────────────────────────────────────────

type PedidoItem = {
    menuItemId?: { nombre: string; precio: number; categoria?: string };
    cantidad: number;
    nota?: string;
};

type PedidoDetail = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    fuente: string;
    items: PedidoItem[];
    total?: number;
    userId?:    { nombre?: string; apellido?: string } | null;
    clienteId?: { nombre?: string; apellido?: string; telefono?: string } | null;
};

type Movement = {
    _id: string;
    tipo: "ingreso" | "egreso";
    concepto: string;
    monto: number;
    excedente?: number;
    descuento?: number;
    metodoPago: string;
    pedidoId?: PedidoDetail | null;
    userId?: { nombre?: string; apellido?: string };
    createdAt: string;
    items?: { nombre: string; cantidad: number; precio: number; categoria?: string }[];
};

type Producto = {
    nombre: string;
    categoria: string;
    cantidad: number;
    total: number;
};

type Sesion = {
    _id: string;
    estado: "abierta" | "cerrada";
    montoInicial: number;
    montoCierre?: number;
    fechaApertura: string;
    fechaCierre?: string;
    abiertaPor: { nombre?: string; apellido?: string } | null;
    cerradaPor: { nombre?: string; apellido?: string } | null;
    notas?: string;
    totalIngreso: number;
    totalEgreso: number;
    neto: number;
    cantMovimientos: number;
    totales: Record<string, { ingreso: number; egreso: number; excedente: number }>;
    movimientos: Movement[];
    productos: Record<string, Producto>;
};

type EventoCerrado = {
    _id: string;
    nombre: string;
    estado: string;
    updatedAt: string;
    cierreData?: {
        fecha?: string;
        totalGeneral: number;
        entradasCantidad: number;
        entradasPrecio: number;
        entradasTotal: number;
        totalEfectivo: number;
        ventasEfectivo: number;
        comandasEfectivo: number;
        totalTransferencia: number;
        ventasTransferencia: number;
        comandasTransferencia: number;
        totalTarjeta: number;
        ventasTarjeta: number;
        comandasTarjeta: number;
        comandasSinCobrar: number;
    };
    ventas?: Array<{
        items?: Array<{ nombre: string; precio: number; cantidad: number; categoria?: string }>;
    }>;
};

type SubCobro = {
    concepto: string;
    metodo: string;
    monto: number;
    excedente: number;
    descuento: number;
    createdAt: string;
    isParcial: boolean;
    items: { nombre: string; cantidad: number; precio: number; categoria?: string }[];
};

type MovGroup = {
    key: string;
    pedido?: PedidoDetail;
    concepto: string;
    tipo: "ingreso" | "egreso";
    total: number;
    excedente: number;
    descuento: number;
    pagos: { metodo: string; monto: number }[];
    cobros: SubCobro[];
    userId?: { nombre?: string; apellido?: string };
    createdAt: string;
    items?: { nombre: string; cantidad: number; precio: number; categoria?: string }[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const METODO_LABEL: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
};

const METODO_ICON: Record<string, React.ElementType> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Send,
};

const METODO_COLOR: Record<string, string> = {
    efectivo:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    tarjeta:       "bg-blue-50 text-blue-700 border-blue-200",
    transferencia: "bg-violet-50 text-violet-700 border-violet-200",
};

function nombreU(u?: { nombre?: string; apellido?: string } | null) {
    if (!u) return null;
    return [u.nombre, u.apellido].filter(Boolean).join(" ") || null;
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function buildGroups(movimientos: Movement[]): MovGroup[] {
    const groups: MovGroup[] = [];
    const byPedido: Record<string, MovGroup> = {};

    for (const m of movimientos) {
        const pedido = m.pedidoId && typeof m.pedidoId === "object" ? m.pedidoId : null;
        const pid = pedido?._id ? String(pedido._id) : null;

        if (pid) {
            if (!byPedido[pid]) {
                const label = pedido!.mesa
                    ? `Mesa ${pedido!.mesa}${pedido!.nombreComanda ? ` · ${pedido!.nombreComanda}` : ""}`
                    : pedido!.nombreComanda || m.concepto;
                const g: MovGroup = {
                    key: pid, pedido: pedido!, concepto: label,
                    tipo: m.tipo, total: 0, excedente: 0, descuento: 0,
                    pagos: [], cobros: [], userId: m.userId, createdAt: m.createdAt,
                };
                byPedido[pid] = g;
                groups.push(g);
            }
            const g = byPedido[pid];
            const isParcial = m.concepto.toLowerCase().includes("parcial");
            // Items de cobro parcial vienen en m.items; cobro final usa items del pedido
            const subItems = isParcial
                ? (m.items ?? [])
                : (pedido!.items ?? []).map(it => ({
                    nombre: (it.menuItemId as any)?.nombre ?? "Ítem",
                    cantidad: it.cantidad,
                    precio: (it.menuItemId as any)?.precio ?? 0,
                    categoria: (it.menuItemId as any)?.categoria ?? "",
                }));
            g.cobros.push({
                concepto: m.concepto,
                metodo: m.metodoPago,
                monto: m.monto,
                excedente: m.excedente || 0,
                descuento: m.descuento || 0,
                createdAt: m.createdAt,
                isParcial,
                items: subItems,
            });
            g.total     += m.monto;
            g.excedente += m.excedente || 0;
            g.descuento += m.descuento || 0;
            g.pagos.push({ metodo: m.metodoPago, monto: m.monto });
        } else {
            groups.push({
                key: m._id, concepto: m.concepto,
                tipo: m.tipo, total: m.monto,
                excedente: m.excedente || 0, descuento: m.descuento || 0,
                pagos: [{ metodo: m.metodoPago, monto: m.monto }],
                cobros: [], userId: m.userId, createdAt: m.createdAt,
                items: m.items,
            });
        }
    }

    return groups;
}

// ── Sub-items list (reusable) ─────────────────────────────────────────────────

function ItemsList({ items }: { items: { nombre: string; cantidad: number; precio: number; categoria?: string }[] }) {
    if (!items.length) return <p className="px-4 py-3 text-xs text-gray-400 italic">Sin detalle de ítems registrado</p>;
    return (
        <div className="divide-y divide-gray-50">
            {items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 bg-gray-50">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-black flex items-center justify-center shrink-0">
                        {it.cantidad}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{it.nombre}</p>
                        {it.categoria && <p className="text-[10px] text-gray-400">{it.categoria}</p>}
                    </div>
                    <span className="text-xs font-black text-gray-700 shrink-0">{fmt(it.precio * it.cantidad)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Pedido Modal ──────────────────────────────────────────────────────────────

function PedidoModal({ group, onClose }: { group: MovGroup; onClose: () => void }) {
    const [openCobro, setOpenCobro] = useState<number | null>(null);
    const pedido = group.pedido!;
    const titulo = pedido.mesa
        ? `Mesa ${pedido.mesa}${pedido.nombreComanda ? ` · ${pedido.nombreComanda}` : ""}`
        : pedido.nombreComanda || "Pedido";

    const esApp   = pedido.fuente === "app";
    const cliente = nombreU(pedido.clienteId);
    const cajero  = nombreU(pedido.userId);
    const multiCobro = group.cobros.length > 1;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-black px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed size={15} className="text-white/60" />
                        <div>
                            <p className="font-black text-white text-sm leading-tight">{titulo}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                                {esApp ? "Pedido app" : "Barra / mesa"} · {formatHora(group.createdAt)}
                                {multiCobro && ` · ${group.cobros.length} cobros`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Cliente / cajero */}
                {(cliente || cajero) && (
                    <div className="border-b border-gray-100 px-4 py-2.5 flex gap-6 bg-gray-50 shrink-0">
                        {cliente && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cliente</p>
                                <p className="text-sm font-black text-gray-800">{cliente}</p>
                                {pedido.clienteId?.telefono && (
                                    <p className="text-[11px] text-gray-400">{pedido.clienteId.telefono}</p>
                                )}
                            </div>
                        )}
                        {cajero && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cajero</p>
                                <p className="text-sm font-semibold text-gray-700">{cajero}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Cuerpo scrollable */}
                <div className="overflow-y-auto flex-1">

                    {/* CASO: un solo cobro → mostrar ítems directamente */}
                    {!multiCobro && (
                        <>
                            <ItemsList items={group.cobros[0]?.items ?? []} />
                            <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 bg-gray-50">
                                {group.cobros[0]?.descuento > 0 && (
                                    <div className="flex justify-between text-xs text-orange-500 font-bold">
                                        <span>Descuento</span><span>-{fmt(group.cobros[0].descuento)}</span>
                                    </div>
                                )}
                                {group.pagos.map((p, i) => {
                                    const Icon = METODO_ICON[p.metodo] || Banknote;
                                    return (
                                        <div key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 border ${METODO_COLOR[p.metodo] || "bg-gray-100 border-gray-200 text-gray-600"}`}>
                                            <span className="flex items-center gap-1.5 text-xs font-bold"><Icon size={12} />{METODO_LABEL[p.metodo] || p.metodo}</span>
                                            <span className="text-sm font-black">{fmt(p.monto)}</span>
                                        </div>
                                    );
                                })}
                                {group.excedente > 0 && (
                                    <div className="flex justify-between text-xs text-amber-600 font-bold">
                                        <span>Propina / excedente</span><span>+{fmt(group.excedente)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Total cobrado</span>
                                    <span className="text-base font-black text-gray-900">{fmt(group.total)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* CASO: múltiples cobros (parcial + final) → acordeón */}
                    {multiCobro && (
                        <>
                            <div className="divide-y divide-gray-100">
                                {group.cobros.map((c, idx) => {
                                    const Icon = METODO_ICON[c.metodo] || Banknote;
                                    const isOpen = openCobro === idx;
                                    return (
                                        <div key={idx}>
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                                                onClick={() => setOpenCobro(isOpen ? null : idx)}
                                            >
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${c.isParcial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                    {c.isParcial ? "PARCIAL" : "FINAL"}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Icon size={11} className="shrink-0 text-gray-500" />
                                                        <span className="text-xs font-bold text-gray-700">{METODO_LABEL[c.metodo] || c.metodo}</span>
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={9} />{formatHora(c.createdAt)}</span>
                                                    </div>
                                                    {c.excedente > 0 && (
                                                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">+{fmt(c.excedente)} propina</p>
                                                    )}
                                                </div>
                                                <span className="font-black text-gray-900 text-sm shrink-0">{fmt(c.monto)}</span>
                                                {isOpen ? <ChevronUp size={13} className="text-gray-400 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                                            </button>
                                            {isOpen && (
                                                <div className="border-t border-gray-100">
                                                    <ItemsList items={c.items} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
                                <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Total cobrado</span>
                                <span className="text-base font-black text-gray-900">{fmt(group.total)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Movimiento Card ───────────────────────────────────────────────────────────

function MovCard({ g, onOpenGroup }: { g: MovGroup; onOpenGroup: (g: MovGroup) => void }) {
    const [expanded, setExpanded] = useState(false);
    const esIngreso  = g.tipo === "ingreso";
    const hasPedido  = !!g.pedido;
    const hasItems   = !!g.items?.length;
    const multiCobro = g.cobros.length > 1;
    const canExpand  = hasPedido || hasItems;

    return (
        <div className={`rounded-xl border overflow-hidden ${esIngreso ? "border-gray-200" : "border-red-100"}`}>
            {/* Fila principal */}
            <div
                className={`flex items-center gap-3 px-3 py-2.5 ${canExpand ? "cursor-pointer hover:bg-gray-50" : ""} ${esIngreso ? "bg-white" : "bg-red-50"}`}
                onClick={() => {
                    if (hasPedido) onOpenGroup(g);
                    else if (hasItems) setExpanded(v => !v);
                }}
            >
                {esIngreso
                    ? <ArrowDownCircle size={16} className="text-emerald-500 shrink-0" />
                    : <ArrowUpCircle  size={16} className="text-red-400 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-800 text-sm truncate leading-tight">{g.concepto}</p>
                        {multiCobro && (
                            <span className="text-[9px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                                {g.cobros.length} COBROS
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={9} />{formatHora(g.createdAt)}
                        </span>
                        {g.pagos.map((p, i) => {
                            const Icon = METODO_ICON[p.metodo] || Banknote;
                            return (
                                <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${METODO_COLOR[p.metodo] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    <Icon size={9} />{METODO_LABEL[p.metodo] || p.metodo} {fmt(p.monto)}
                                </span>
                            );
                        })}
                        {g.excedente > 0 && (
                            <span className="text-[10px] font-bold text-amber-600">+{fmt(g.excedente)} propina</span>
                        )}
                        {g.descuento > 0 && (
                            <span className="text-[10px] font-bold text-orange-500">-{fmt(g.descuento)} desc.</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-black text-sm ${esIngreso ? "text-gray-900" : "text-red-600"}`}>
                        {esIngreso ? "+" : "-"}{fmt(g.total)}
                    </span>
                    {canExpand && (
                        hasPedido
                            ? <Receipt size={12} className="text-gray-400" />
                            : expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />
                    )}
                </div>
            </div>

            {/* Items expandidos (movimientos sin pedido: gastos, entradas, etc.) */}
            {hasItems && expanded && (
                <div className="border-t border-gray-100">
                    <ItemsList items={g.items!} />
                </div>
            )}
        </div>
    );
}

// ── Movimientos Section ───────────────────────────────────────────────────────

function MovimientosSection({ movimientos }: { movimientos: Movement[] }) {
    const [modalGroup, setModalGroup] = useState<MovGroup | null>(null);
    const groups = buildGroups(movimientos);

    return (
        <>
            <div className="space-y-2">
                {groups.map(g => (
                    <MovCard key={g.key} g={g} onOpenGroup={setModalGroup} />
                ))}
            </div>
            {modalGroup && <PedidoModal group={modalGroup} onClose={() => setModalGroup(null)} />}
        </>
    );
}

// ── Detalle Sesion ────────────────────────────────────────────────────────────

function DetalleSesion({ s }: { s: Sesion }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Apertura / Cierre */}
            <div className="px-4 py-3 flex gap-6">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Apertura</p>
                    <p className="font-black text-gray-900 text-base">{fmt(s.montoInicial || 0)}</p>
                </div>
                {s.montoCierre != null && (
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Contado al cierre</p>
                        <p className="font-black text-gray-900 text-base">{fmt(s.montoCierre)}</p>
                    </div>
                )}
                {s.montoCierre != null && (
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sistema al cierre</p>
                        <p className={`font-black text-base ${(s.montoInicial + s.totalIngreso - s.totalEgreso) >= 0 ? "text-gray-900" : "text-red-600"}`}>
                            {fmt(s.montoInicial + s.totalIngreso - s.totalEgreso)}
                        </p>
                    </div>
                )}
            </div>

            {/* Recaudación por método */}
            {Object.keys(s.totales).length > 0 && (
                <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Recaudación por método</p>
                    <div className="space-y-2">
                        {Object.entries(s.totales).map(([metodo, vals]) => {
                            const Icon = METODO_ICON[metodo] || Banknote;
                            const neto = (vals.ingreso || 0) - (vals.egreso || 0);
                            return (
                                <div key={metodo} className={`rounded-xl border px-3 py-2.5 ${METODO_COLOR[metodo] || "bg-gray-50 border-gray-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon size={15} />
                                            <span className="font-bold text-sm">{METODO_LABEL[metodo] || metodo}</span>
                                        </div>
                                        <span className="font-black text-base">{fmt(neto)}</span>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs opacity-70">
                                        {vals.ingreso > 0 && (
                                            <span className="flex items-center gap-0.5 font-semibold">
                                                <TrendingUp size={10} /> {fmt(vals.ingreso)}
                                            </span>
                                        )}
                                        {vals.egreso > 0 && (
                                            <span className="flex items-center gap-0.5 font-semibold">
                                                <TrendingDown size={10} /> -{fmt(vals.egreso)}
                                            </span>
                                        )}
                                        {vals.excedente > 0 && (
                                            <span className="font-semibold">propina {fmt(vals.excedente)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalExcedente > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700">Total propinas / excedentes</span>
                            <span className="text-sm font-black text-amber-700">{fmt(totalExcedente)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Productos vendidos */}
            {productos.length > 0 && (
                <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        Productos vendidos · {productos.reduce((s, p) => s + p.cantidad, 0)} ítems
                    </p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        {productos.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 bg-white">
                                <Package size={12} className="text-gray-300 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                                    {p.categoria && <p className="text-[10px] text-gray-400">{p.categoria}</p>}
                                </div>
                                <span className="text-sm font-black text-gray-500 shrink-0">×{p.cantidad}</span>
                                <span className="text-sm font-black text-gray-900 w-20 text-right shrink-0">{fmt(p.total)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-t border-gray-200">
                            <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Total</span>
                            <span className="font-black text-gray-900">{fmt(productos.reduce((s, p) => s + p.total, 0))}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Movimientos */}
            {s.movimientos.length > 0 && (
                <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        Movimientos · {s.movimientos.length}
                    </p>
                    <MovimientosSection movimientos={s.movimientos} />
                </div>
            )}

            {/* Notas */}
            {s.notas && (
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Notas de cierre</p>
                    <p className="text-xs text-amber-800 font-medium">{s.notas}</p>
                </div>
            )}
        </div>
    );
}

// ── Detalle Evento ────────────────────────────────────────────────────────────

function DetalleEvento({ ev }: { ev: EventoCerrado }) {
    const cd = ev.cierreData;
    if (!cd) return <p className="px-4 py-3 text-xs text-gray-500">Sin resumen de cierre registrado</p>;

    const grouped: Record<string, { cantidad: number; total: number; categoria: string }> = {};
    (ev.ventas ?? []).forEach(v => {
        (v.items ?? []).forEach(it => {
            if (!grouped[it.nombre]) grouped[it.nombre] = { cantidad: 0, total: 0, categoria: it.categoria ?? "" };
            grouped[it.nombre].cantidad += it.cantidad;
            grouped[it.nombre].total += it.precio * it.cantidad;
        });
    });
    const productList = Object.entries(grouped)
        .map(([nombre, d]) => ({ nombre, ...d }))
        .sort((a, b) => b.total - a.total);

    const metodos = [
        { label: "Efectivo",      icon: Banknote,    key: "efectivo",      total: cd.totalEfectivo,      ventas: cd.ventasEfectivo,      comandas: cd.comandasEfectivo },
        { label: "Transferencia", icon: Send,         key: "transferencia", total: cd.totalTransferencia, ventas: cd.ventasTransferencia, comandas: cd.comandasTransferencia },
        { label: "Tarjeta",       icon: CreditCard,   key: "tarjeta",       total: cd.totalTarjeta,       ventas: cd.ventasTarjeta,       comandas: cd.comandasTarjeta },
    ].filter(m => m.total > 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {cd.entradasCantidad > 0 && (
                <div className="px-4 py-3 flex items-center gap-3">
                    <Ticket size={14} className="text-gray-400 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">
                            {cd.entradasCantidad} entradas · {fmt(cd.entradasPrecio)} c/u
                        </p>
                    </div>
                    <span className="font-black text-gray-900">{fmt(cd.entradasTotal)}</span>
                </div>
            )}

            {metodos.length > 0 && (
                <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Recaudación por método</p>
                    <div className="space-y-2">
                        {metodos.map(m => (
                            <div key={m.key} className={`rounded-xl border px-3 py-2.5 ${METODO_COLOR[m.key] || "bg-gray-50 border-gray-200"}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <m.icon size={15} />
                                        <span className="font-bold text-sm">{m.label}</span>
                                    </div>
                                    <span className="font-black text-base">{fmt(m.total)}</span>
                                </div>
                                {(m.ventas > 0 || m.comandas > 0) && (
                                    <div className="flex gap-4 mt-1 text-xs opacity-70">
                                        {m.ventas > 0 && <span className="font-semibold">ventas {fmt(m.ventas)}</span>}
                                        {m.comandas > 0 && <span className="font-semibold">comandas {fmt(m.comandas)}</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {cd.comandasSinCobrar > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                                <AlertCircle size={12} /> Sin cobrar al cierre
                            </span>
                            <span className="text-sm font-black text-amber-700">{fmt(cd.comandasSinCobrar)}</span>
                        </div>
                    )}
                </div>
            )}

            {productList.length > 0 && (
                <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        Productos consumidos · {productList.reduce((s, p) => s + p.cantidad, 0)} ítems
                    </p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        {productList.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 bg-white">
                                <Package size={12} className="text-gray-300 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                                    {p.categoria && <p className="text-[10px] text-gray-400">{p.categoria}</p>}
                                </div>
                                <span className="text-sm font-black text-gray-500 shrink-0">×{p.cantidad}</span>
                                <span className="text-sm font-black text-gray-900 w-20 text-right shrink-0">{fmt(p.total)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-t border-gray-200">
                            <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Total</span>
                            <span className="font-black text-gray-900">{fmt(productList.reduce((s, p) => s + p.total, 0))}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CajaHistorialPage() {
    const { data: sesiones, isLoading: loadingSesiones } = useSWR<Sesion[]>("/api/superadmin/caja/historial", fetcher);
    const { data: eventosData, isLoading: loadingEventos } = useSWR<EventoCerrado[]>("/api/eventos?cerrado=true", fetcher);

    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
    const [expandidosEv, setExpandidosEv] = useState<Set<string>>(new Set());

    const eventosCerrados = Array.isArray(eventosData) ? eventosData : [];

    function toggle(id: string) {
        setExpandidas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleEv(id: string) {
        setExpandidosEv(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/admin/caja" className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronLeft size={20} />
                </Link>
                <h1 className="text-3xl font-extrabold text-black">Historial de Caja</h1>
            </div>

            {/* ── Sesiones ── */}
            {loadingSesiones && <div className="flex justify-center py-20"><Loader size={40} /></div>}
            {!loadingSesiones && (!sesiones || sesiones.length === 0) && (
                <p className="text-center text-gray-400 py-10">Sin sesiones registradas</p>
            )}

            {sesiones && sesiones.length > 0 && (
                <div className="space-y-4 mb-10">
                    {sesiones.map(s => {
                        const open = expandidas.has(s._id);
                        return (
                            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                                {/* Header */}
                                <div className={`px-4 py-3 border-b ${s.estado === "abierta" ? "bg-emerald-50 border-emerald-100" : "bg-gray-900 border-gray-800"}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`font-black text-base ${s.estado === "abierta" ? "text-emerald-800" : "text-white"}`}>
                                                {formatFecha(s.fechaApertura)}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${s.estado === "abierta" ? "text-emerald-600" : "text-white/50"}`}>
                                                {formatHora(s.fechaApertura)}
                                                {s.fechaCierre && ` → ${formatHora(s.fechaCierre)}`}
                                                {" · "}Abrió: {nombreU(s.abiertaPor) ?? "—"}
                                                {s.cerradaPor && ` · Cerró: ${nombreU(s.cerradaPor) ?? "—"}`}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.estado === "abierta" ? "bg-emerald-200 text-emerald-800" : "bg-white/10 text-white/70"}`}>
                                            {s.estado === "abierta" ? "Abierta" : "Cerrada"}
                                        </span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Ingresos</p>
                                        <p className="text-base font-black text-emerald-600">{fmt(s.totalIngreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Egresos</p>
                                        <p className="text-base font-black text-red-500">{fmt(s.totalEgreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Neto</p>
                                        <p className={`text-base font-black ${s.neto >= 0 ? "text-gray-900" : "text-red-600"}`}>{fmt(s.neto)}</p>
                                    </div>
                                </div>

                                {open && <DetalleSesion s={s} />}

                                <button
                                    onClick={() => toggle(s._id)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
                                >
                                    <p className="text-[11px] text-gray-400">
                                        {s.cantMovimientos} movimiento{s.cantMovimientos !== 1 ? "s" : ""}
                                        {s.montoInicial > 0 && ` · Apertura: ${fmt(s.montoInicial)}`}
                                        {Object.keys(s.productos).length > 0 && ` · ${Object.keys(s.productos).length} productos`}
                                    </p>
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                        {open ? <><ChevronUp size={13} />Ocultar</> : <><ChevronDown size={13} />Ver detalle</>}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Eventos ── */}
            <div className="mb-6">
                <h2 className="text-xl font-extrabold text-black mb-4">Historial de Eventos</h2>

                {loadingEventos && <div className="flex justify-center py-10"><Loader size={36} /></div>}
                {!loadingEventos && eventosCerrados.length === 0 && (
                    <p className="text-center text-gray-400 py-10">Sin eventos cerrados</p>
                )}

                {eventosCerrados.length > 0 && (
                    <div className="space-y-4">
                        {eventosCerrados.map(ev => {
                            const cd = ev.cierreData;
                            const open = expandidosEv.has(ev._id);
                            const fechaCierre = cd?.fecha ? formatFecha(cd.fecha) : formatFecha(ev.updatedAt);
                            const horaCierre  = cd?.fecha ? formatHora(cd.fecha)  : formatHora(ev.updatedAt);

                            return (
                                <div key={ev._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="bg-black px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide">
                                                Cerrado · {fechaCierre} {horaCierre}
                                            </p>
                                            <p className="font-black text-white text-base leading-tight">{ev.nombre}</p>
                                        </div>
                                        {cd && <span className="font-black text-white text-xl">{fmt(cd.totalGeneral)}</span>}
                                    </div>

                                    {cd && (
                                        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Efectivo</p>
                                                <p className="text-base font-black text-gray-800">{fmt(cd.totalEfectivo)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Transf.</p>
                                                <p className="text-base font-black text-gray-800">{fmt(cd.totalTransferencia)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
                                                <p className="text-base font-black text-gray-900">{fmt(cd.totalGeneral)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {open && <DetalleEvento ev={ev} />}

                                    <button
                                        onClick={() => toggleEv(ev._id)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
                                    >
                                        <p className="text-[11px] text-gray-400">
                                            {cd?.entradasCantidad ? `${cd.entradasCantidad} entradas` : "Sin entradas"}
                                            {(ev.ventas?.length ?? 0) > 0 && ` · ${ev.ventas!.length} venta${ev.ventas!.length !== 1 ? "s" : ""}`}
                                        </p>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                            {open ? <><ChevronUp size={13} />Ocultar</> : <><ChevronDown size={13} />Ver detalle</>}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
