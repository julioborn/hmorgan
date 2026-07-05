"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
    ChevronLeft, ChevronDown, ChevronUp, X,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, ArrowDownCircle, ArrowUpCircle, UtensilsCrossed,
    Star, AlertCircle, Clock, Receipt, Ticket, Pencil, Check,
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
    eventoId?:  { nombre?: string } | null;
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
    _id: string;
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
    isEvento?: boolean;
    eventoNombre?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    });

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
                const eventoNombre = (pedido!.eventoId as any)?.nombre as string | undefined;
                const baseLabel = pedido!.mesa
                    ? `Mesa ${pedido!.mesa}${pedido!.nombreComanda ? ` · ${pedido!.nombreComanda}` : ""}`
                    : pedido!.nombreComanda || m.concepto;
                const g: MovGroup = {
                    key: pid, pedido: pedido!, concepto: baseLabel,
                    tipo: m.tipo, total: 0, excedente: 0, descuento: 0,
                    pagos: [], cobros: [], userId: m.userId, createdAt: m.createdAt,
                    isEvento: !!eventoNombre, eventoNombre,
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
                _id: m._id,
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

function PedidoModal({ group, onClose, onSave }: { group: MovGroup; onClose: () => void; onSave: () => void }) {
    const [openCobro, setOpenCobro] = useState<number | null>(null);
    const [editState, setEditState] = useState<{ _id: string; metodo: string; monto: string; saving: boolean } | null>(null);
    const pedido = group.pedido!;

    async function saveEdit() {
        if (!editState) return;
        setEditState(s => s ? { ...s, saving: true } : null);
        const res = await fetch(`/api/superadmin/caja/movimiento/${editState._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ metodoPago: editState.metodo, monto: Number(editState.monto) }),
        });
        if (res.ok) { onClose(); onSave(); }
        else setEditState(s => s ? { ...s, saving: false } : null);
    }

    const editForm = editState && (
        <div className="mt-2 rounded-xl border-2 border-black bg-gray-50 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-600">Corregir cobro</p>
            <select
                value={editState.metodo}
                onChange={e => setEditState(s => s ? { ...s, metodo: e.target.value } : null)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white font-semibold"
            >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
            </select>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">
                <span className="text-gray-400 font-bold text-sm">$</span>
                <input
                    type="number" min="0"
                    value={editState.monto}
                    onChange={e => setEditState(s => s ? { ...s, monto: e.target.value } : null)}
                    className="flex-1 text-sm font-black focus:outline-none text-gray-900 bg-transparent text-right"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => setEditState(null)} className="flex-1 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:border-gray-500 transition">
                    Cancelar
                </button>
                <button onClick={saveEdit} disabled={editState.saving || !editState.monto}
                    className="flex-1 py-1.5 bg-black text-white rounded-xl text-xs font-black disabled:opacity-40 flex items-center justify-center gap-1 transition">
                    <Check size={12} /> {editState.saving ? "Guardando…" : "Guardar"}
                </button>
            </div>
        </div>
    );
    const titulo = pedido.mesa
        ? `Mesa ${pedido.mesa}${pedido.nombreComanda ? ` · ${pedido.nombreComanda}` : ""}`
        : pedido.nombreComanda || "Pedido";

    const esApp      = pedido.fuente === "app";
    const cliente    = nombreU(pedido.clienteId);
    const cajero     = nombreU(pedido.userId);
    const evento     = (pedido.eventoId as any)?.nombre as string | undefined;
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
                                {esApp ? "Pedido app" : evento ? `Comanda evento` : "Barra / mesa"} · {formatHora(group.createdAt)}
                                {multiCobro && ` · ${group.cobros.length} cobros`}
                            </p>
                            {evento && (
                                <p className="text-[10px] text-amber-400 font-bold mt-0.5">Evento: {evento}</p>
                            )}
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
                                {group.cobros.map((c, i) => {
                                    const Icon = METODO_ICON[c.metodo] || Banknote;
                                    const isEditing = editState?._id === c._id;
                                    return (
                                        <div key={i}>
                                            <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 border ${METODO_COLOR[c.metodo] || "bg-gray-100 border-gray-200 text-gray-600"}`}>
                                                <span className="flex items-center gap-1.5 text-xs font-bold"><Icon size={12} />{METODO_LABEL[c.metodo] || c.metodo}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-black">{fmt(c.monto)}</span>
                                                    <button
                                                        onClick={() => setEditState(isEditing ? null : { _id: c._id, metodo: c.metodo, monto: String(c.monto), saving: false })}
                                                        className="p-1 rounded hover:bg-black/10 transition opacity-60 hover:opacity-100"
                                                    >
                                                        <Pencil size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                            {isEditing && editForm}
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
                                    const isEditing = editState?._id === c._id;
                                    return (
                                        <div key={idx}>
                                            <div className="flex items-center gap-1 px-4 py-3 hover:bg-gray-50 transition">
                                                <div
                                                    className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
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
                                                </div>
                                                <button
                                                    onClick={() => setEditState(isEditing ? null : { _id: c._id, metodo: c.metodo, monto: String(c.monto), saving: false })}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition shrink-0"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                            {isEditing && (
                                                <div className="px-4 pb-3">
                                                    {editForm}
                                                </div>
                                            )}
                                            {isOpen && !isEditing && (
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
        <div className={`rounded-xl overflow-hidden border ${g.isEvento ? "border-amber-200 border-l-4 border-l-amber-400" : esIngreso ? "border-gray-200" : "border-red-100"}`}>
            {/* Fila principal */}
            <div
                className={`flex items-center gap-3 px-3 py-2.5 ${canExpand ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : ""} ${g.isEvento ? "bg-amber-50/40" : esIngreso ? "bg-white" : "bg-red-50"}`}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-gray-800 text-sm truncate leading-tight">{g.concepto}</p>
                        {g.isEvento && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0 flex items-center gap-0.5">
                                <Star size={7} />EVENTO
                            </span>
                        )}
                        {multiCobro && (
                            <span className="text-[9px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                                {g.cobros.length} COBROS
                            </span>
                        )}
                    </div>
                    {g.eventoNombre && (
                        <p className="text-[10px] text-amber-600 font-bold leading-tight mt-0.5 truncate">{g.eventoNombre}</p>
                    )}
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

function MovimientosSection({ movimientos, onRefresh }: { movimientos: Movement[]; onRefresh: () => void }) {
    const [modalGroup, setModalGroup] = useState<MovGroup | null>(null);
    const groups = buildGroups(movimientos);

    return (
        <>
            <div className="space-y-2">
                {groups.map(g => (
                    <MovCard key={g.key} g={g} onOpenGroup={setModalGroup} />
                ))}
            </div>
            {modalGroup && (
                <PedidoModal
                    group={modalGroup}
                    onClose={() => setModalGroup(null)}
                    onSave={() => { setModalGroup(null); onRefresh(); }}
                />
            )}
        </>
    );
}

// ── Detalle Sesion ────────────────────────────────────────────────────────────

function DetalleSesion({ s, onRefresh }: { s: Sesion; onRefresh: () => void }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    const efectivoSistema = (s.montoInicial || 0)
        + (s.totales["efectivo"]?.ingreso || 0)
        - (s.totales["efectivo"]?.egreso  || 0);

    // Secciones colapsables
    const [productosOpen,   setProductosOpen]   = useState(false);
    const [movimientosOpen, setMovimientosOpen] = useState(true);

    // Estado edición montoCierre
    const [editando,    setEditando]    = useState(false);
    const [editValor,   setEditValor]   = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const [saving,      setSaving]      = useState(false);

    function abrirEditor() {
        setEditValor(String(s.montoCierre ?? ""));
        setConfirmando(false);
        setEditando(true);
    }
    function cancelar() { setEditando(false); setConfirmando(false); }

    async function guardar() {
        setSaving(true);
        const res = await fetch(`/api/superadmin/caja/sesion/${s._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "editarCierre", montoCierre: Number(editValor) }),
        });
        setSaving(false);
        if (res.ok) { setEditando(false); setConfirmando(false); onRefresh(); }
    }

    const nuevoMonto     = Number(editValor) || 0;
    const nuevaDiferencia = nuevoMonto - efectivoSistema;

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Apertura / Cierre */}
            <div className="px-4 py-3 space-y-3">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Apertura</p>
                        <p className="font-black text-gray-900 text-sm sm:text-base">{fmt(s.montoInicial || 0)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sistema al cierre</p>
                        <p className="font-black text-gray-900 text-sm sm:text-base">{fmt(efectivoSistema)}</p>
                    </div>
                    {s.montoCierre != null && !editando && (
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Contado al cierre</p>
                            <div className="flex items-center gap-1.5">
                                <p className="font-black text-gray-900 text-sm sm:text-base">{fmt(s.montoCierre)}</p>
                                {s.estado === "cerrada" && (
                                    <button onClick={abrirEditor} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                                        <Pencil size={13} />
                                    </button>
                                )}
                            </div>
                            <p className={`text-xs font-bold mt-0.5 ${(s.montoCierre - efectivoSistema) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {(() => {
                                    const dif = s.montoCierre - efectivoSistema;
                                    if (dif === 0) return "Sin diferencia";
                                    return `Dif: ${dif > 0 ? "+" : ""}${fmt(dif)}`;
                                })()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Editor inline */}
                {editando && (
                    <div className="rounded-2xl border-2 border-black bg-gray-50 p-4 space-y-3">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Corregir contado al cierre</p>

                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                            <span className="text-gray-400 font-bold">$</span>
                            <input
                                type="number" min="0" autoFocus
                                value={editValor}
                                onChange={e => { setEditValor(e.target.value); setConfirmando(false); }}
                                className="flex-1 text-xl font-black focus:outline-none text-gray-900 bg-transparent text-right"
                                placeholder="0"
                            />
                        </div>

                        {/* Cálculo automático */}
                        {editValor !== "" && (
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-gray-500">
                                    <span>Sistema (efectivo)</span>
                                    <span className="font-bold">{fmt(efectivoSistema)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Contado nuevo</span>
                                    <span className="font-bold">{fmt(nuevoMonto)}</span>
                                </div>
                                <div className={`flex justify-between font-black border-t border-gray-200 pt-1 ${nuevaDiferencia === 0 ? "text-emerald-600" : nuevaDiferencia > 0 ? "text-blue-600" : "text-red-500"}`}>
                                    <span>Diferencia</span>
                                    <span>{nuevaDiferencia > 0 ? "+" : ""}{fmt(nuevaDiferencia)}</span>
                                </div>
                            </div>
                        )}

                        {/* Botones */}
                        {!confirmando ? (
                            <div className="flex gap-2">
                                <button onClick={cancelar} className="flex-1 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:border-gray-500 transition">
                                    Cancelar
                                </button>
                                <button onClick={() => setConfirmando(true)} disabled={!editValor || nuevoMonto === s.montoCierre}
                                    className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-bold disabled:opacity-40 transition">
                                    Guardar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-center font-bold text-gray-700">¿Confirmás el cambio?</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setConfirmando(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600">
                                        No, revisar
                                    </button>
                                    <button onClick={guardar} disabled={saving}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition disabled:opacity-50">
                                        <Check size={13} /> {saving ? "Guardando…" : "Sí, confirmar"}
                                    </button>
                                </div>
                            </div>
                        )}
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

            {/* Productos vendidos — colapsable */}
            {productos.length > 0 && (
                <div className="border-t border-gray-100">
                    <button
                        onClick={() => setProductosOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Package size={13} className="text-gray-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                                Productos vendidos
                            </span>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {productos.reduce((s, p) => s + p.cantidad, 0)} ítems
                            </span>
                        </span>
                        {productosOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                    {productosOpen && (
                        <div className="px-4 pb-4">
                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                {productos.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 bg-white">
                                        <Package size={12} className="text-gray-300 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                                            {p.categoria && <p className="text-[10px] text-gray-400">{p.categoria}</p>}
                                        </div>
                                        <span className="text-sm font-black text-gray-500 shrink-0">×{p.cantidad}</span>
                                        <span className="text-sm font-black text-gray-900 shrink-0 text-right">{fmt(p.total)}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-t border-gray-200">
                                    <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Total</span>
                                    <span className="font-black text-gray-900">{fmt(productos.reduce((s, p) => s + p.total, 0))}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Movimientos — colapsable */}
            {s.movimientos.length > 0 && (
                <div className="border-t border-gray-100">
                    <button
                        onClick={() => setMovimientosOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Receipt size={13} className="text-gray-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                                Movimientos
                            </span>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {s.movimientos.length}
                            </span>
                        </span>
                        {movimientosOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                    {movimientosOpen && (
                        <div className="px-4 pb-4">
                            <MovimientosSection movimientos={s.movimientos} onRefresh={onRefresh} />
                        </div>
                    )}
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
                                <span className="text-sm font-black text-gray-900 shrink-0 text-right">{fmt(p.total)}</span>
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
    const SWR_OPTS = { revalidateOnFocus: false, shouldRetryOnError: true, errorRetryCount: 4 };

    const { data: sesiones, isLoading: loadingSesiones, isValidating: valSesiones, error: errSesiones, mutate: reloadSesiones } =
        useSWR<Sesion[]>("/api/superadmin/caja/historial", fetcher, SWR_OPTS);
    const { data: eventosData, isLoading: loadingEventos, isValidating: valEventos, error: errEventos, mutate: reloadEventos } =
        useSWR<EventoCerrado[]>("/api/eventos?cerrado=true", fetcher, SWR_OPTS);

    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
    const [expandidosEv, setExpandidosEv] = useState<Set<string>>(new Set());

    const eventosCerrados = Array.isArray(eventosData) ? eventosData : [];
    const isRefreshing = (!loadingSesiones && valSesiones) || (!loadingEventos && valEventos);

    function toggle(id: string) {
        setExpandidas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleEv(id: string) {
        setExpandidosEv(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function recargar() { reloadSesiones(); reloadEventos(); }

    return (
        <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                <Link href="/admin/caja" className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0">
                    <ChevronLeft size={20} />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black flex-1">Historial de Caja</h1>
                <button
                    onClick={recargar}
                    disabled={isRefreshing || loadingSesiones || loadingEventos}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-40 transition px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-400"
                >
                    <svg className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing ? "Actualizando…" : "Actualizar"}
                </button>
            </div>

            {/* ── Sesiones ── */}
            {(loadingSesiones || errSesiones) && <div className="flex justify-center py-20"><Loader size={40} /></div>}
            {!loadingSesiones && !errSesiones && Array.isArray(sesiones) && sesiones.length === 0 && (
                <p className="text-center text-gray-400 py-10">Sin sesiones registradas</p>
            )}

            {sesiones && sesiones.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Receipt size={16} className="text-gray-500 shrink-0" />
                        <h2 className="text-lg font-extrabold text-black whitespace-nowrap">Sesiones de Caja</h2>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                <div className="space-y-4">
                    {sesiones.map(s => {
                        const open = expandidas.has(s._id);
                        return (
                            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                                {/* Header */}
                                <div className={`px-4 py-3 border-b ${s.estado === "abierta" ? "bg-emerald-50 border-emerald-100" : "bg-gray-900 border-gray-800"}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`font-black text-base leading-tight ${s.estado === "abierta" ? "text-emerald-800" : "text-white"}`}>
                                                {formatFecha(s.fechaApertura)}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${s.estado === "abierta" ? "text-emerald-600" : "text-white/50"}`}>
                                                {formatHora(s.fechaApertura)}
                                                {s.fechaCierre && ` → ${formatHora(s.fechaCierre)}`}
                                            </p>
                                            <p className={`text-[10px] mt-0.5 ${s.estado === "abierta" ? "text-emerald-500" : "text-white/40"}`}>
                                                Abrió: {nombreU(s.abiertaPor) ?? "—"}
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

                                {open && <DetalleSesion s={s} onRefresh={reloadSesiones} />}

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
                </div>
            )}

            {/* ── Eventos ── */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Star size={16} className="text-amber-500 shrink-0" />
                    <h2 className="text-lg font-extrabold text-black whitespace-nowrap">Historial de Eventos</h2>
                    <div className="flex-1 h-px bg-amber-200" />
                </div>

                {(loadingEventos || errEventos) && <div className="flex justify-center py-10"><Loader size={36} /></div>}
                {!loadingEventos && !errEventos && eventosCerrados.length === 0 && (
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
                                <div key={ev._id} className="bg-white border border-gray-200 border-t-2 border-t-amber-400 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="bg-black px-4 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide flex items-center gap-1">
                                                <Star size={8} className="text-amber-400 shrink-0" />
                                                Cerrado · {fechaCierre} {horaCierre}
                                            </p>
                                            <p className="font-black text-white text-base leading-tight truncate">{ev.nombre}</p>
                                        </div>
                                        {cd && <span className="font-black text-white text-lg shrink-0">{fmt(cd.totalGeneral)}</span>}
                                    </div>

                                    {cd && (
                                        <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-100">
                                            {cd.totalEfectivo > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Efectivo</p>
                                                    <p className="text-sm font-black text-emerald-700">{fmt(cd.totalEfectivo)}</p>
                                                </div>
                                            )}
                                            {cd.totalTransferencia > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Transf.</p>
                                                    <p className="text-sm font-black text-violet-700">{fmt(cd.totalTransferencia)}</p>
                                                </div>
                                            )}
                                            {cd.totalTarjeta > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Tarjeta</p>
                                                    <p className="text-sm font-black text-blue-700">{fmt(cd.totalTarjeta)}</p>
                                                </div>
                                            )}
                                            {cd.entradasCantidad > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Entradas</p>
                                                    <p className="text-sm font-black text-amber-700">{cd.entradasCantidad} × {fmt(cd.entradasPrecio)}</p>
                                                </div>
                                            )}
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
