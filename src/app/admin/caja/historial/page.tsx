"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import {
    ChevronLeft, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, ArrowDownCircle, ArrowUpCircle, UtensilsCrossed,
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

// Groups of movements by pedidoId (or solo if no pedido)
type MovGroup = {
    key: string;
    pedido?: PedidoDetail;
    concepto: string;
    tipo: "ingreso" | "egreso";
    total: number;
    excedente: number;
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
                    pagos: [],
                    userId: m.userId,
                    createdAt: m.createdAt,
                };
                byPedido[pid] = g;
                groups.push(g);
            }
            byPedido[pid].total += m.monto;
            byPedido[pid].excedente += m.excedente || 0;
            byPedido[pid].pagos.push({ metodo: m.metodoPago, monto: m.monto });
        } else {
            groups.push({
                key: m._id,
                concepto: m.concepto,
                tipo: m.tipo,
                total: m.monto,
                excedente: m.excedente || 0,
                pagos: [{ metodo: m.metodoPago, monto: m.monto }],
                userId: m.userId,
                createdAt: m.createdAt,
            });
        }
    }

    return groups;
}

// ── Pedido detail card ─────────────────────────────────────────────────────────

function PedidoCard({ pedido }: { pedido: PedidoDetail }) {
    return (
        <div className="mt-2 ml-4 bg-white border border-gray-200 rounded-xl px-3 py-2.5 space-y-1.5">
            {pedido.items.map((it, i) => {
                const nombre = it.menuItemId?.nombre || "Ítem";
                const precio = it.menuItemId?.precio || 0;
                return (
                    <div key={i} className="flex items-start justify-between text-xs gap-2">
                        <div className="flex-1 min-w-0">
                            <span className="text-gray-800 font-medium">{nombre}</span>
                            {it.nota && <span className="ml-1 text-gray-400">({it.nota})</span>}
                            {it.menuItemId?.categoria && (
                                <span className="ml-1.5 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{it.menuItemId.categoria}</span>
                            )}
                        </div>
                        <span className="text-gray-500 shrink-0">×{it.cantidad}</span>
                        <span className="font-semibold text-gray-900 shrink-0 w-16 text-right">{fmt(precio * it.cantidad)}</span>
                    </div>
                );
            })}
            {pedido.total != null && (
                <div className="flex justify-between text-xs font-black pt-1.5 border-t border-gray-100">
                    <span className="text-gray-700">Total pedido</span>
                    <span className="text-gray-900">{fmt(pedido.total)}</span>
                </div>
            )}
        </div>
    );
}

// ── Movements section ──────────────────────────────────────────────────────────

function MovimientosSection({ movimientos }: { movimientos: Movement[] }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    function toggle(key: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    const groups = buildGroups(movimientos);

    return (
        <div className="space-y-1.5">
            {groups.map(g => {
                const isOpen = expanded.has(g.key);
                const canExpand = !!g.pedido?.items?.length;
                return (
                    <div key={g.key}>
                        <button
                            onClick={() => canExpand && toggle(g.key)}
                            className={`w-full flex items-start gap-2 text-xs text-left rounded-xl px-2 py-1.5 transition
                                ${canExpand ? "hover:bg-gray-100 active:bg-gray-200 cursor-pointer" : "cursor-default"}`}
                        >
                            {g.tipo === "ingreso"
                                ? <ArrowDownCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                : <ArrowUpCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                            }
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{g.concepto}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-gray-400">{formatHora(g.createdAt)}</span>
                                    {g.pagos.map((p, i) => (
                                        <MetodoBadge key={i} metodo={p.metodo} monto={g.pagos.length > 1 ? p.monto : undefined} />
                                    ))}
                                    {g.excedente > 0 && (
                                        <span className="text-amber-600 font-bold">+{fmt(g.excedente)} exc.</span>
                                    )}
                                    {canExpand && (
                                        <span className="text-gray-400 flex items-center gap-0.5">
                                            <UtensilsCrossed size={9} />
                                            {g.pedido!.items.reduce((s, i) => s + i.cantidad, 0)} ítems
                                            {isOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`font-black shrink-0 ${g.tipo === "ingreso" ? "text-emerald-600" : "text-red-500"}`}>
                                {g.tipo === "egreso" ? "-" : "+"}{fmt(g.total)}
                            </span>
                        </button>
                        {isOpen && g.pedido && <PedidoCard pedido={g.pedido} />}
                    </div>
                );
            })}
        </div>
    );
}

// ── Expanded session detail ────────────────────────────────────────────────────

function DetalleSesion({ s }: { s: Sesion }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Apertura / Cierre */}
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

            {/* Per-method breakdown */}
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

            {/* Excedente per-method detail */}
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

            {/* Products sold */}
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

            {/* Movements list (grouped by pedido) */}
            {s.movimientos.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Movimientos ({s.movimientos.length})</SectionTitle>
                    <MovimientosSection movimientos={s.movimientos} />
                </div>
            )}

            {/* Notes */}
            {s.notas && (
                <div className="px-4 py-3">
                    <SectionTitle>Notas de cierre</SectionTitle>
                    <p className="text-xs text-gray-600">{s.notas}</p>
                </div>
            )}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CajaHistorialPage() {
    const { data: sesiones, isLoading } = useSWR<Sesion[]>("/api/superadmin/caja/historial", fetcher);
    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

    function toggle(id: string) {
        setExpandidas(prev => {
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

            {isLoading && (
                <div className="flex justify-center py-20"><Loader size={40} /></div>
            )}

            {!isLoading && (!sesiones || sesiones.length === 0) && (
                <p className="text-center text-gray-400 py-20">Sin sesiones registradas</p>
            )}

            {sesiones && sesiones.length > 0 && (
                <div className="space-y-4">
                    {sesiones.map(s => {
                        const open = expandidas.has(s._id);
                        return (
                            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                {/* Header */}
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

                                {/* Compact totals */}
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

                                {/* Expanded detail */}
                                {open && <DetalleSesion s={s} />}

                                {/* Footer / expand toggle */}
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
        </div>
    );
}
