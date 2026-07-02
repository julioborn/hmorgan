"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import {
    ChevronLeft, ChevronDown, ChevronUp, X,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, ArrowDownCircle, ArrowUpCircle, UtensilsCrossed,
    Star, AlertCircle,
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

// Groups of movements by pedidoId (or solo if no pedido)
type MovGroup = {
    key: string;
    pedido?: PedidoDetail;
    concepto: string;
    tipo: "ingreso" | "egreso";
    total: number;
    excedente: number;
    descuento: number;
    pagos: { metodo: string; monto: number }[];
    userId?: { nombre?: string; apellido?: string };
    createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const METODO_LABEL: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transf.",
};

const METODO_ICON: Record<string, React.ElementType> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Send,
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

function MetodoBadge({ metodo, monto }: { metodo: string; monto?: number }) {
    const Icon = METODO_ICON[metodo] || Banknote;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            <Icon size={9} />{METODO_LABEL[metodo] || metodo}
            {monto != null && <span className="text-gray-500">{fmt(monto)}</span>}
        </span>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{children}</p>;
}

function buildGroups(movimientos: Movement[]): MovGroup[] {
    const groups: MovGroup[] = [];
    const byPedido: Record<string, MovGroup> = {};

    for (const m of movimientos) {
        const pedido = m.pedidoId && typeof m.pedidoId === "object" ? m.pedidoId : null;
        const pid = pedido?._id;

        if (pid) {
            if (!byPedido[pid]) {
                const label = pedido.mesa
                    ? `Mesa ${pedido.mesa}${pedido.nombreComanda ? ` · ${pedido.nombreComanda}` : ""}`
                    : pedido.nombreComanda || m.concepto;
                const g: MovGroup = {
                    key: pid,
                    pedido,
                    concepto: label,
                    tipo: m.tipo,
                    total: 0,
                    excedente: 0,
                    descuento: 0,
                    pagos: [],
                    userId: m.userId,
                    createdAt: m.createdAt,
                };
                byPedido[pid] = g;
                groups.push(g);
            }
            byPedido[pid].total += m.monto;
            byPedido[pid].excedente += m.excedente || 0;
            byPedido[pid].descuento += m.descuento || 0;
            byPedido[pid].pagos.push({ metodo: m.metodoPago, monto: m.monto });
        } else {
            groups.push({
                key: m._id,
                concepto: m.concepto,
                tipo: m.tipo,
                total: m.monto,
                excedente: m.excedente || 0,
                descuento: m.descuento || 0,
                pagos: [{ metodo: m.metodoPago, monto: m.monto }],
                userId: m.userId,
                createdAt: m.createdAt,
            });
        }
    }

    return groups;
}

// ── Pedido modal ───────────────────────────────────────────────────────────────

function PedidoModal({ pedido, onClose }: { pedido: PedidoDetail; onClose: () => void }) {
    const titulo = pedido.mesa
        ? `Mesa ${pedido.mesa}${pedido.nombreComanda ? ` · ${pedido.nombreComanda}` : ""}`
        : pedido.nombreComanda || "Pedido";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-black px-4 py-3 flex items-center justify-between">
                    <p className="font-black text-white text-sm">{titulo}</p>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
                    {pedido.items.map((it, i) => {
                        const nombre = it.menuItemId?.nombre || "Ítem";
                        const precio = it.menuItemId?.precio || 0;
                        return (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-gray-800">{nombre}</span>
                                    {it.nota && <span className="ml-1 text-xs text-gray-400">({it.nota})</span>}
                                    {it.menuItemId?.categoria && (
                                        <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{it.menuItemId.categoria}</span>
                                    )}
                                </div>
                                <span className="text-gray-400 shrink-0">×{it.cantidad}</span>
                                <span className="font-semibold text-gray-900 shrink-0 w-16 text-right">{fmt(precio * it.cantidad)}</span>
                            </div>
                        );
                    })}
                </div>

                {pedido.total != null && (
                    <div className="border-t border-gray-200 px-4 py-3 flex justify-between items-center">
                        <span className="font-black text-gray-700 text-sm">Total</span>
                        <span className="font-black text-gray-900 text-sm">{fmt(pedido.total)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Movements section ──────────────────────────────────────────────────────────

function MovimientosSection({ movimientos }: { movimientos: Movement[] }) {
    const [modalPedido, setModalPedido] = useState<PedidoDetail | null>(null);
    const groups = buildGroups(movimientos);

    return (
        <>
            <div className="space-y-2">
                {groups.map(g => {
                    const canOpen = !!g.pedido?.items?.length;

                    if (!g.pedido) {
                        return (
                            <div key={g.key} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-xl">
                                {g.tipo === "ingreso"
                                    ? <ArrowDownCircle size={14} className="text-emerald-500 shrink-0" />
                                    : <ArrowUpCircle size={14} className="text-red-400 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-gray-800">{g.concepto}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-gray-400">{formatHora(g.createdAt)}</span>
                                        <MetodoBadge metodo={g.pagos[0].metodo} />
                                        {g.excedente > 0 && (
                                            <span className="text-amber-600 font-bold">+{fmt(g.excedente)} exc.</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`font-black shrink-0 ${g.tipo === "ingreso" ? "text-emerald-600" : "text-red-500"}`}>
                                    {g.tipo === "egreso" ? "-" : "+"}{fmt(g.total)}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={g.key} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => canOpen && setModalPedido(g.pedido!)}
                                className={`w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs gap-2
                                    ${canOpen ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <ArrowDownCircle size={13} className="text-emerald-500 shrink-0" />
                                    <span className="font-bold text-gray-800">{g.concepto}</span>
                                    <span className="text-gray-400">{formatHora(g.createdAt)}</span>
                                </div>
                                {canOpen && (
                                    <span className="flex items-center gap-0.5 text-gray-400">
                                        <UtensilsCrossed size={9} />
                                        {g.pedido.items.reduce((s, i) => s + i.cantidad, 0)} ítems
                                        <ChevronDown size={9} />
                                    </span>
                                )}
                            </button>

                            {g.pagos.map((p, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs">
                                    <MetodoBadge metodo={p.metodo} />
                                    <span className="font-bold text-emerald-600">+{fmt(p.monto)}</span>
                                </div>
                            ))}

                            {g.descuento > 0 && (
                                <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 text-xs">
                                    <span className="text-orange-600 font-semibold">Descuento</span>
                                    <span className="font-bold text-orange-600">-{fmt(g.descuento)}</span>
                                </div>
                            )}

                            {g.excedente > 0 && (
                                <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 text-xs">
                                    <span className="text-amber-600 font-semibold">Excedente</span>
                                    <span className="font-bold text-amber-600">+{fmt(g.excedente)}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs">
                                <span className="font-black text-gray-600">Total cobrado</span>
                                <span className="font-black text-gray-900">{fmt(g.total)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {modalPedido && (
                <PedidoModal pedido={modalPedido} onClose={() => setModalPedido(null)} />
            )}
        </>
    );
}

// ── Expanded session detail ────────────────────────────────────────────────────

function DetalleSesion({ s }: { s: Sesion }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            <div className="px-4 py-3 flex gap-4">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Monto apertura</p>
                    <p className="font-black text-gray-800">{fmt(s.montoInicial || 0)}</p>
                </div>
                {s.montoCierre != null && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Monto cierre</p>
                        <p className="font-black text-gray-800">{fmt(s.montoCierre)}</p>
                    </div>
                )}
            </div>

            {Object.keys(s.totales).length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Recaudación por método</SectionTitle>
                    <div className="space-y-2">
                        {Object.entries(s.totales).map(([metodo, vals]) => {
                            const Icon = METODO_ICON[metodo] || Banknote;
                            const neto = (vals.ingreso || 0) - (vals.egreso || 0);
                            return (
                                <div key={metodo} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                    <Icon size={16} className="text-gray-500 shrink-0" />
                                    <span className="font-bold text-sm text-gray-700 w-28">{METODO_LABEL[metodo] || metodo}</span>
                                    <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                                        {vals.ingreso > 0 && (
                                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                                <TrendingUp size={11} />{fmt(vals.ingreso)}
                                            </span>
                                        )}
                                        {vals.egreso > 0 && (
                                            <span className="text-red-500 font-bold flex items-center gap-0.5">
                                                <TrendingDown size={11} />{fmt(vals.egreso)}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-sm font-black ${neto >= 0 ? "text-gray-900" : "text-red-600"}`}>{fmt(neto)}</span>
                                </div>
                            );
                        })}
                    </div>
                    {totalExcedente > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700">Excedentes / propinas totales</span>
                            <span className="text-sm font-black text-amber-700">{fmt(totalExcedente)}</span>
                        </div>
                    )}
                </div>
            )}

            {Object.entries(s.totales).some(([, v]) => (v.excedente || 0) > 0) && (
                <div className="px-4 py-4">
                    <SectionTitle>Detalle de excedentes</SectionTitle>
                    <div className="space-y-1">
                        {Object.entries(s.totales)
                            .filter(([, v]) => (v.excedente || 0) > 0)
                            .map(([metodo, vals]) => (
                                <div key={metodo} className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                                    <MetodoBadge metodo={metodo} />
                                    <span className="font-black">{fmt(vals.excedente || 0)}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {productos.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Productos vendidos ({productos.reduce((s, p) => s + p.cantidad, 0)} ítems)</SectionTitle>
                    <div className="space-y-1">
                        {productos.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
                                <Package size={11} className="text-gray-400 shrink-0" />
                                <span className="flex-1 font-medium text-gray-800">{p.nombre}</span>
                                {p.categoria && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.categoria}</span>
                                )}
                                <span className="text-gray-500 font-semibold">×{p.cantidad}</span>
                                <span className="font-black text-gray-900 w-20 text-right">{fmt(p.total)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-1.5 text-xs font-black text-gray-900">
                            <span>Total productos</span>
                            <span>{fmt(productos.reduce((sum, p) => sum + p.total, 0))}</span>
                        </div>
                    </div>
                </div>
            )}

            {s.movimientos.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Movimientos ({s.movimientos.length})</SectionTitle>
                    <MovimientosSection movimientos={s.movimientos} />
                </div>
            )}

            {s.notas && (
                <div className="px-4 py-3">
                    <SectionTitle>Notas de cierre</SectionTitle>
                    <p className="text-xs text-gray-600">{s.notas}</p>
                </div>
            )}
        </div>
    );
}

// ── Evento detail ──────────────────────────────────────────────────────────────

function DetalleEvento({ ev }: { ev: EventoCerrado }) {
    const cd = ev.cierreData;
    if (!cd) return <p className="px-4 py-3 text-xs text-gray-500">Sin resumen de cierre registrado</p>;

    // Aggregate products from all ventas
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
        { label: "Efectivo", icon: Banknote, key: "efectivo", total: cd.totalEfectivo, ventas: cd.ventasEfectivo, comandas: cd.comandasEfectivo },
        { label: "Transferencia", icon: Send, key: "transferencia", total: cd.totalTransferencia, ventas: cd.ventasTransferencia, comandas: cd.comandasTransferencia },
        { label: "Tarjeta", icon: CreditCard, key: "tarjeta", total: cd.totalTarjeta, ventas: cd.ventasTarjeta, comandas: cd.comandasTarjeta },
    ].filter(m => m.total > 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Tarjetas entrada */}
            {cd.entradasCantidad > 0 && (
                <div className="px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1.5">
                        <Star size={13} className="text-gray-400" />
                        Tarjetas entrada ({cd.entradasCantidad}× {fmt(cd.entradasPrecio)})
                    </span>
                    <span className="font-black text-gray-900">{fmt(cd.entradasTotal)}</span>
                </div>
            )}

            {/* Desglose por método */}
            {metodos.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Recaudación por método</SectionTitle>
                    <div className="space-y-2">
                        {metodos.map(m => (
                            <div key={m.key} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                <m.icon size={16} className="text-gray-500 shrink-0" />
                                <span className="font-bold text-sm text-gray-700 w-28">{m.label}</span>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                                    {m.ventas > 0 && (
                                        <span className="text-gray-500">ventas {fmt(m.ventas)}</span>
                                    )}
                                    {m.comandas > 0 && (
                                        <span className="text-gray-500">comandas {fmt(m.comandas)}</span>
                                    )}
                                </div>
                                <span className="text-sm font-black text-gray-900">{fmt(m.total)}</span>
                            </div>
                        ))}
                    </div>

                    {cd.comandasSinCobrar > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                                <AlertCircle size={12} />Sin cobrar al cierre
                            </span>
                            <span className="text-sm font-black text-amber-700">{fmt(cd.comandasSinCobrar)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Products consumed */}
            {productList.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Productos consumidos ({productList.reduce((s, p) => s + p.cantidad, 0)} ítems)</SectionTitle>
                    <div className="space-y-1">
                        {productList.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
                                <Package size={11} className="text-gray-400 shrink-0" />
                                <span className="flex-1 font-medium text-gray-800">{p.nombre}</span>
                                {p.categoria && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.categoria}</span>
                                )}
                                <span className="text-gray-500 font-semibold">×{p.cantidad}</span>
                                <span className="font-black text-gray-900 w-20 text-right">{fmt(p.total)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-1.5 text-xs font-black text-gray-900">
                            <span>Total productos</span>
                            <span>{fmt(productList.reduce((sum, p) => sum + p.total, 0))}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CajaHistorialPage() {
    const { data: sesiones, isLoading: loadingSesiones } = useSWR<Sesion[]>("/api/superadmin/caja/historial", fetcher);
    const { data: eventosData, isLoading: loadingEventos } = useSWR<EventoCerrado[]>("/api/eventos?cerrado=true", fetcher);

    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
    const [expandidosEv, setExpandidosEv] = useState<Set<string>>(new Set());

    const eventosCerrados = Array.isArray(eventosData) ? eventosData : [];

    function toggle(id: string) {
        setExpandidas(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleEv(id: string) {
        setExpandidosEv(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/admin/caja" className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronLeft size={20} />
                </Link>
                <h1 className="text-3xl font-extrabold text-black">Historial de Caja</h1>
            </div>

            {/* ── Sesiones de caja ── */}
            {loadingSesiones && (
                <div className="flex justify-center py-20"><Loader size={40} /></div>
            )}

            {!loadingSesiones && (!sesiones || sesiones.length === 0) && (
                <p className="text-center text-gray-400 py-10">Sin sesiones registradas</p>
            )}

            {sesiones && sesiones.length > 0 && (
                <div className="space-y-4 mb-10">
                    {sesiones.map(s => {
                        const open = expandidas.has(s._id);
                        return (
                            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className={`px-4 py-3 flex items-center justify-between ${s.estado === "abierta" ? "bg-emerald-50 border-b border-emerald-100" : "bg-gray-50 border-b border-gray-100"}`}>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm">{formatFecha(s.fechaApertura)}</p>
                                        <p className="text-xs text-gray-400">
                                            {formatHora(s.fechaApertura)}
                                            {s.fechaCierre && ` → ${formatHora(s.fechaCierre)}`}
                                            {" · "}Abrió: {nombreU(s.abiertaPor) ?? "—"}
                                            {s.cerradaPor && ` · Cerró: ${nombreU(s.cerradaPor) ?? "—"}`}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.estado === "abierta" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                        {s.estado === "abierta" ? "Abierta" : "Cerrada"}
                                    </span>
                                </div>

                                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <p className="text-[11px] text-gray-400 uppercase font-semibold">Ingresos</p>
                                        <p className="text-sm font-black text-emerald-600">{fmt(s.totalIngreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] text-gray-400 uppercase font-semibold">Egresos</p>
                                        <p className="text-sm font-black text-red-500">{fmt(s.totalEgreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] text-gray-400 uppercase font-semibold">Neto</p>
                                        <p className={`text-sm font-black ${s.neto >= 0 ? "text-gray-900" : "text-red-600"}`}>{fmt(s.neto)}</p>
                                    </div>
                                </div>

                                {open && <DetalleSesion s={s} />}

                                <button
                                    onClick={() => toggle(s._id)}
                                    className="w-full border-t border-gray-100 px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
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

            {/* ── Historial de eventos ── */}
            <div className="mb-6">
                <h2 className="text-xl font-extrabold text-black mb-4">Historial de Eventos</h2>

                {loadingEventos && (
                    <div className="flex justify-center py-10"><Loader size={36} /></div>
                )}

                {!loadingEventos && eventosCerrados.length === 0 && (
                    <p className="text-center text-gray-400 py-10">Sin eventos cerrados</p>
                )}

                {eventosCerrados.length > 0 && (
                    <div className="space-y-4">
                        {eventosCerrados.map(ev => {
                            const cd = ev.cierreData;
                            const open = expandidosEv.has(ev._id);
                            const fechaCierre = cd?.fecha
                                ? new Date(cd.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
                                : new Date(ev.updatedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
                            const horaCierre = cd?.fecha
                                ? formatHora(cd.fecha)
                                : formatHora(ev.updatedAt);

                            return (
                                <div key={ev._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    {/* Black header */}
                                    <div className="bg-black px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">
                                                Cerrado · {fechaCierre} {horaCierre}
                                            </p>
                                            <p className="font-black text-white text-sm leading-tight">{ev.nombre}</p>
                                        </div>
                                        {cd && (
                                            <span className="font-black text-white text-base">{fmt(cd.totalGeneral)}</span>
                                        )}
                                    </div>

                                    {/* Compact stats */}
                                    {cd && (
                                        <div className="px-4 py-3 grid grid-cols-3 gap-3">
                                            <div className="text-center">
                                                <p className="text-[11px] text-gray-400 uppercase font-semibold">Efectivo</p>
                                                <p className="text-sm font-black text-gray-800">{fmt(cd.totalEfectivo)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] text-gray-400 uppercase font-semibold">Transf.</p>
                                                <p className="text-sm font-black text-gray-800">{fmt(cd.totalTransferencia)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total</p>
                                                <p className="text-sm font-black text-gray-900">{fmt(cd.totalGeneral)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {open && <DetalleEvento ev={ev} />}

                                    <button
                                        onClick={() => toggleEv(ev._id)}
                                        className="w-full border-t border-gray-100 px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
                                    >
                                        <p className="text-[11px] text-gray-400">
                                            {cd?.entradasCantidad
                                                ? `${cd.entradasCantidad} tarjeta${cd.entradasCantidad !== 1 ? "s" : ""} entrada`
                                                : "Sin tarjetas"}
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
