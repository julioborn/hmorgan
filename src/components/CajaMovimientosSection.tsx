"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
    ChevronDown, ChevronUp, X,
    Banknote, CreditCard, Send,
    ArrowDownCircle, ArrowUpCircle, UtensilsCrossed,
    Star, Clock, Receipt, Pencil, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PedidoItem = {
    menuItemId?: { nombre: string; precio: number; categoria?: string };
    cantidad: number;
    nota?: string;
};

export type PedidoDetail = {
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

export type Movement = {
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

export type SubCobro = {
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

export type MovGroup = {
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

// ── Constants ──────────────────────────────────────────────────────────────────

export const METODO_LABEL: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
};

export const METODO_ICON: Record<string, React.ElementType> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Send,
};

export const METODO_COLOR: Record<string, string> = {
    efectivo:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    tarjeta:       "bg-blue-50 text-blue-700 border-blue-200",
    transferencia: "bg-violet-50 text-violet-700 border-violet-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

export function nombreU(u?: { nombre?: string; apellido?: string } | null) {
    if (!u) return null;
    return [u.nombre, u.apellido].filter(Boolean).join(" ") || null;
}

export function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function buildGroups(movimientos: Movement[]): MovGroup[] {
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

// ── Sub-items list ────────────────────────────────────────────────────────────

export function ItemsList({ items }: { items: { nombre: string; cantidad: number; precio: number; categoria?: string }[] }) {
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

export function PedidoModal({ group, onClose, onSave }: { group: MovGroup; onClose: () => void; onSave: () => void }) {
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

    const esCliente  = pedido.fuente === "cliente";
    const esMozo     = pedido.fuente === "empleado";
    // Para pedidos de app, userId ES el cliente (no un cajero)
    const clienteNombre = esCliente
        ? (nombreU(pedido.clienteId) || nombreU(pedido.userId))
        : nombreU(pedido.clienteId);
    const mozoNombre    = esMozo ? nombreU(pedido.userId) : null;
    const cajeroNombre  = !esCliente && !esMozo ? nombreU(pedido.userId) : null;
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
                                {esCliente ? "Pedido app" : evento ? "Comanda evento" : esMozo ? "Barra / mesa" : "Caja"} · {formatHora(group.createdAt)}
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

                {/* Cliente / mozo / cajero */}
                {(clienteNombre || mozoNombre || cajeroNombre) && (
                    <div className="border-b border-gray-100 px-4 py-2.5 flex gap-6 bg-gray-50 shrink-0">
                        {clienteNombre && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cliente</p>
                                <p className="text-sm font-black text-gray-800">{clienteNombre}</p>
                                {pedido.clienteId?.telefono && (
                                    <p className="text-[11px] text-gray-400">{pedido.clienteId.telefono}</p>
                                )}
                            </div>
                        )}
                        {mozoNombre && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mozo</p>
                                <p className="text-sm font-semibold text-gray-700">{mozoNombre}</p>
                            </div>
                        )}
                        {cajeroNombre && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cajero</p>
                                <p className="text-sm font-semibold text-gray-700">{cajeroNombre}</p>
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

export function MovCard({ g, onOpenGroup }: { g: MovGroup; onOpenGroup: (g: MovGroup) => void }) {
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
                        <p className="font-bold text-gray-800 text-sm leading-tight break-words">{g.concepto}</p>
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
                        <p className="text-[10px] text-amber-600 font-bold leading-tight mt-0.5 break-words">{g.eventoNombre}</p>
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

export function MovimientosSection({ movimientos, onRefresh }: { movimientos: Movement[]; onRefresh: () => void }) {
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
