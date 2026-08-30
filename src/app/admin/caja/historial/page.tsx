"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState, useCallback, useMemo } from "react";
import {
    ChevronLeft, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, AlertCircle, Receipt, Ticket, Pencil, Check, Star, Loader2, Truck, Trash2, Wallet, X,
} from "lucide-react";
import Loader from "@/components/Loader";
import { useAuth } from "@/context/auth-context";
import {
    Movement, MovimientosSection,
    METODO_LABEL, METODO_ICON, METODO_COLOR,
    nombreU, formatFecha, formatHora,
} from "@/components/CajaMovimientosSection";

// ── Types ─────────────────────────────────────────────────────────────────────

type Producto = {
    nombre: string;
    categoria: string;
    cantidad: number;
    total: number;
};

// Lightweight — returned by the historial list endpoint (no movement detail)
type SesionSummary = {
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
    cantDelivery: number;
    totales: Record<string, { ingreso: number; egreso: number; excedente: number }>;
};

// Full — returned by the sesion/[id] detail endpoint
type SesionDetail = SesionSummary & {
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
        entradasEfectivo?: number;
        entradasTransferencia?: number;
        entradasTarjeta?: number;
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
    entradasRegistradas?: number;
    precioTarjeta?: number;
    tarjetas?: Array<{ _id: string; cantidad: number; metodoPago: string; createdAt?: string }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    });

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

// ── Detalle Sesion ────────────────────────────────────────────────────────────

function DetalleSesion({ s, onRefresh }: { s: SesionDetail; onRefresh: () => void }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    const efectivoSistema = (s.montoInicial || 0)
        + (s.totales["efectivo"]?.ingreso || 0)
        - (s.totales["efectivo"]?.egreso  || 0);

    const [productosOpen,   setProductosOpen]   = useState(false);
    const [movimientosOpen, setMovimientosOpen] = useState(true);

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

    const nuevoMonto      = Number(editValor) || 0;
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

            {/* Productos vendidos */}
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
                                {productos.reduce((sum, p) => sum + p.cantidad, 0)} ítems
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

            {/* Movimientos */}
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

const METODO_ICON_LOCAL: Record<string, React.ElementType> = { efectivo: Banknote, transferencia: Send, tarjeta: CreditCard };

function DetalleEvento({ ev, onRefreshed }: { ev: EventoCerrado; onRefreshed?: () => void }) {
    const cd = ev.cierreData;
    if (!cd) return <p className="px-4 py-3 text-xs text-gray-500">Sin resumen de cierre registrado</p>;

    const [editingTarjeta, setEditingTarjeta] = useState<string | null>(null);
    const [editMetodo, setEditMetodo] = useState("efectivo");
    const [savingTarjeta, setSavingTarjeta] = useState(false);

    const [cobrarModal, setCobrarModal] = useState(false);
    const [cobrarCantidad, setCobrarCantidad] = useState("");
    const [cobrarMetodo, setCobrarMetodo] = useState<"efectivo" | "transferencia" | "tarjeta">("efectivo");
    const [cobrarSaving, setCobrarSaving] = useState(false);

    const [agregarModal, setAgregarModal] = useState(false);
    const [agregarCantidad, setAgregarCantidad] = useState("");
    const [agregarPrecio, setAgregarPrecio] = useState("");
    const [agregarMetodo, setAgregarMetodo] = useState<"efectivo" | "transferencia" | "tarjeta">("efectivo");
    const [agregarSaving, setAgregarSaving] = useState(false);

    const [editModal, setEditModal] = useState<{ _id: string; cantidad: number; metodoPago: string } | null>(null);
    const [editCantidad, setEditCantidad] = useState("");
    const [editPrecio, setEditPrecio] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const registradas = Math.max(ev.entradasRegistradas ?? 0, cd?.entradasCantidad ?? 0);
    const cobradas = (ev.tarjetas ?? []).reduce((s, t) => s + t.cantidad, 0);
    const pendientes = Math.max(0, registradas - cobradas);
    const precioTarjeta = ev.precioTarjeta ?? cd?.entradasPrecio ?? 0;

    async function guardarMetodoTarjeta(tarjetaId: string) {
        setSavingTarjeta(true);
        const res = await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "editarMetodoTarjeta", tarjetaId, metodoPago: editMetodo }),
        });
        setSavingTarjeta(false);
        if (res.ok) { setEditingTarjeta(null); onRefreshed?.(); }
    }

    async function confirmarAgregar() {
        const cant = Number(agregarCantidad);
        if (!cant || cant < 1) return;
        setAgregarSaving(true);
        // 1. Actualizar precio si cambió
        const nuevoPrecio = Number(agregarPrecio);
        if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0 && nuevoPrecio !== precioTarjeta) {
            await fetch(`/api/eventos/${ev._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "editarPrecioTarjeta", precio: nuevoPrecio }),
            });
        }
        // 2. Agregar al contador
        await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "agregarTarjetas", cantidad: cant }),
        });
        // 3. Cobrar inmediatamente con el método elegido
        const res = await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "cobrarEntradas", cantidad: cant, metodoPago: agregarMetodo }),
        });
        setAgregarSaving(false);
        if (res.ok) { setAgregarModal(false); setAgregarCantidad(""); setAgregarPrecio(""); onRefreshed?.(); }
    }

    async function guardarEditTarjeta() {
        if (!editModal) return;
        const cant = Number(editCantidad);
        if (!cant || cant < 1) return;
        setEditSaving(true);
        const nuevoPrecio = Number(editPrecio);
        if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0 && nuevoPrecio !== precioTarjeta) {
            await fetch(`/api/eventos/${ev._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "editarPrecioTarjeta", precio: nuevoPrecio }),
            });
        }
        await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "editarMetodoTarjeta", tarjetaId: editModal._id, metodoPago: editMetodo }),
        });
        if (cant !== editModal.cantidad) {
            await fetch(`/api/eventos/${ev._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "editarCantidadTarjeta", tarjetaId: editModal._id, cantidad: cant }),
            });
        }
        setEditSaving(false);
        setEditModal(null);
        onRefreshed?.();
    }

    async function handleEliminarTarjeta(tarjetaId: string) {
        setDeletingId(tarjetaId);
        await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "eliminarTarjeta", tarjetaId }),
        });
        setDeletingId(null);
        onRefreshed?.();
    }

    async function confirmarCobro() {
        const cant = Number(cobrarCantidad);
        if (!cant || cant < 1 || cant > pendientes) return;
        setCobrarSaving(true);
        const res = await fetch(`/api/eventos/${ev._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "cobrarEntradas", cantidad: cant, metodoPago: cobrarMetodo }),
        });
        setCobrarSaving(false);
        if (res.ok) { setCobrarModal(false); setCobrarCantidad(""); onRefreshed?.(); }
    }

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
        { label: "Efectivo",      icon: Banknote,   key: "efectivo",      total: cd.totalEfectivo,      ventas: cd.ventasEfectivo,      comandas: cd.comandasEfectivo,      entradas: cd.entradasEfectivo ?? 0 },
        { label: "Transferencia", icon: Send,        key: "transferencia", total: cd.totalTransferencia, ventas: cd.ventasTransferencia, comandas: cd.comandasTransferencia, entradas: cd.entradasTransferencia ?? 0 },
        { label: "Tarjeta",       icon: CreditCard,  key: "tarjeta",       total: cd.totalTarjeta,       ventas: cd.ventasTarjeta,       comandas: cd.comandasTarjeta,       entradas: cd.entradasTarjeta ?? 0 },
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

            {true && (
                <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cobros de entradas</p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => { setAgregarCantidad(""); setAgregarPrecio(String(precioTarjeta || "")); setAgregarModal(true); }}
                                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-black px-2.5 py-1.5 rounded-lg transition active:scale-95">
                                <Ticket size={11} /> + Agregar
                            </button>
                            {pendientes > 0 && (
                                <button onClick={() => { setCobrarCantidad(String(pendientes)); setCobrarMetodo("efectivo"); setCobrarModal(true); }}
                                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg transition active:scale-95">
                                    <Wallet size={11} /> Cobrar {pendientes}
                                </button>
                            )}
                        </div>
                    </div>
                    {(ev.tarjetas ?? []).map(t => {
                        const Icon = METODO_ICON_LOCAL[t.metodoPago] ?? Banknote;
                        const isDeleting = deletingId === t._id;
                        return (
                            <div key={t._id} className="flex items-center gap-2 rounded-xl border border-green-100 px-3 py-2 bg-green-50">
                                <Icon size={12} className="text-green-500 shrink-0" />
                                <span className="text-xs font-semibold text-gray-700 flex-1">×{t.cantidad} entradas</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-400">
                                        {precioTarjeta > 0 ? fmt(t.cantidad * precioTarjeta) : <span className="text-orange-400 font-semibold">Sin precio</span>}
                                    </span>
                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{METODO_LABEL[t.metodoPago] || t.metodoPago}</span>
                                    <button onClick={() => { setEditModal(t); setEditCantidad(String(t.cantidad)); setEditMetodo(t.metodoPago); setEditPrecio(String(precioTarjeta || "")); }}
                                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition">
                                        <Pencil size={11} />
                                    </button>
                                    <button onClick={() => handleEliminarTarjeta(t._id)} disabled={isDeleting}
                                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition disabled:opacity-40">
                                        {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {pendientes > 0 && (
                        <div className="flex items-center gap-2 rounded-xl border border-orange-100 px-3 py-2 bg-orange-50">
                            <Ticket size={12} className="text-orange-400 shrink-0" />
                            <span className="text-xs font-semibold text-orange-700 flex-1">{pendientes} entrada{pendientes !== 1 ? "s" : ""} sin cobrar</span>
                            {precioTarjeta > 0 && <span className="text-xs font-bold text-orange-600">{fmt(pendientes * precioTarjeta)}</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Modal agregar entradas desde historial */}
            {agregarModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <Ticket size={18} className="text-gray-600 shrink-0" />
                            <div className="flex-1">
                                <h2 className="font-black text-gray-900">Registrar cobro de entradas</h2>
                                <p className="text-xs text-gray-500">{ev.nombre} · {registradas} registradas hasta ahora</p>
                            </div>
                            <button onClick={() => setAgregarModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-5 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Cantidad a agregar</p>
                                <input autoFocus type="number" inputMode="numeric" min="1"
                                    value={agregarCantidad} onChange={e => setAgregarCantidad(e.target.value)}
                                    style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border-2 border-black rounded-xl text-2xl font-black focus:outline-none text-center"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Precio por entrada</p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                                    <input type="number" inputMode="decimal" min="0"
                                        value={agregarPrecio} onChange={e => setAgregarPrecio(e.target.value)}
                                        style={{ fontSize: "16px" }}
                                        className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl text-xl font-black focus:outline-none text-center transition ${!agregarPrecio || Number(agregarPrecio) <= 0 ? "border-red-400 bg-red-50" : "border-gray-300 focus:border-black"}`}
                                        placeholder="0"
                                    />
                                </div>
                                {(!agregarPrecio || Number(agregarPrecio) <= 0) && (
                                    <p className="text-xs text-red-500 font-semibold mt-1">El precio es obligatorio</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Método de pago</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["efectivo", "transferencia", "tarjeta"] as const).map(m => {
                                        const Icon = METODO_ICON_LOCAL[m];
                                        return (
                                            <button key={m} onClick={() => setAgregarMetodo(m)}
                                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-black border-2 transition active:scale-95 ${agregarMetodo === m ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>
                                                <Icon size={18} />
                                                {m === "efectivo" ? "Efectivo" : m === "tarjeta" ? "Tarjeta" : "Transf."}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {Number(agregarCantidad) >= 1 && Number(agregarPrecio) > 0 && (
                                <div className="bg-amber-50 rounded-2xl px-4 py-3 text-center border border-amber-200">
                                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-0.5">Total</p>
                                    <p className="text-2xl font-black text-amber-800">{fmt(Number(agregarCantidad) * Number(agregarPrecio))}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-5 pb-5 flex gap-2">
                            <button onClick={() => setAgregarModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={confirmarAgregar} disabled={agregarSaving || Number(agregarCantidad) < 1 || !agregarPrecio || Number(agregarPrecio) <= 0}
                                className="flex-1 py-3 bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2">
                                {agregarSaving ? <Loader2 size={16} className="animate-spin" /> : <><Wallet size={15} /> Cobrar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal editar cobro */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <Pencil size={18} className="text-gray-600 shrink-0" />
                            <div className="flex-1">
                                <h2 className="font-black text-gray-900">Editar cobro</h2>
                                <p className="text-xs text-gray-500">{ev.nombre}</p>
                            </div>
                            <button onClick={() => setEditModal(null)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-5 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Cantidad</p>
                                <input autoFocus type="number" inputMode="numeric" min="1"
                                    value={editCantidad} onChange={e => setEditCantidad(e.target.value)}
                                    style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border-2 border-black rounded-xl text-2xl font-black focus:outline-none text-center"
                                />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Precio por entrada</p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                                    <input type="number" inputMode="decimal" min="0"
                                        value={editPrecio} onChange={e => setEditPrecio(e.target.value)}
                                        style={{ fontSize: "16px" }}
                                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl text-xl font-black focus:outline-none focus:border-black text-center"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Método de pago</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["efectivo", "transferencia", "tarjeta"] as const).map(m => {
                                        const Icon = METODO_ICON_LOCAL[m];
                                        return (
                                            <button key={m} onClick={() => setEditMetodo(m)}
                                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-black border-2 transition active:scale-95 ${editMetodo === m ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>
                                                <Icon size={18} />
                                                {m === "efectivo" ? "Efectivo" : m === "tarjeta" ? "Tarjeta" : "Transf."}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {Number(editCantidad) >= 1 && Number(editPrecio) > 0 && (
                                <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                                    <p className="text-2xl font-black text-gray-800">{fmt(Number(editCantidad) * Number(editPrecio))}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-5 pb-5 flex gap-2">
                            <button onClick={() => setEditModal(null)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={guardarEditTarjeta} disabled={editSaving || Number(editCantidad) < 1}
                                className="flex-1 py-3 bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2">
                                {editSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={15} /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal cobrar entradas desde historial */}
            {cobrarModal && (() => {
                const cant = Number(cobrarCantidad) || 0;
                const total = cant * precioTarjeta;
                const invalid = cant < 1 || cant > pendientes;
                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                <Ticket size={18} className="text-amber-600 shrink-0" />
                                <div className="flex-1">
                                    <h2 className="font-black text-gray-900">Cobrar entradas</h2>
                                    <p className="text-xs text-gray-500">{ev.nombre} · {pendientes} pendiente{pendientes !== 1 ? "s" : ""}</p>
                                </div>
                                <button onClick={() => setCobrarModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                            </div>
                            <div className="px-5 py-5 space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Cantidad</p>
                                    <input autoFocus type="number" inputMode="numeric" min="1" max={pendientes}
                                        value={cobrarCantidad} onChange={e => setCobrarCantidad(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !invalid) confirmarCobro(); }}
                                        style={{ fontSize: "16px" }}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-2xl font-black focus:outline-none text-center transition ${invalid && cobrarCantidad ? "border-red-400" : "border-black"}`}
                                        placeholder={String(pendientes)}
                                    />
                                    {cant > pendientes && <p className="text-xs text-red-500 mt-1 font-semibold">Máximo: {pendientes}</p>}
                                </div>
                                {precioTarjeta > 0 && cant > 0 && !invalid && (
                                    <div className="bg-amber-50 rounded-2xl px-4 py-3 text-center border border-amber-200">
                                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-0.5">Total</p>
                                        <p className="text-3xl font-black text-amber-800">{fmt(total)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Método de pago</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["efectivo", "transferencia", "tarjeta"] as const).map(m => {
                                            const Icon = METODO_ICON_LOCAL[m];
                                            return (
                                                <button key={m} onClick={() => setCobrarMetodo(m)}
                                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-black border-2 transition active:scale-95 ${cobrarMetodo === m ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>
                                                    <Icon size={18} />
                                                    {m === "efectivo" ? "Efectivo" : m === "tarjeta" ? "Tarjeta" : "Transf."}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 pb-5 flex gap-2">
                                <button onClick={() => setCobrarModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                                <button onClick={confirmarCobro} disabled={cobrarSaving || invalid}
                                    className="flex-1 py-3 bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2">
                                    {cobrarSaving ? <Loader2 size={16} className="animate-spin" /> : <><Wallet size={15} /> Cobrar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                                {(m.ventas > 0 || m.comandas > 0 || m.entradas > 0) && (
                                    <div className="flex gap-4 mt-1 text-xs opacity-70">
                                        {m.entradas > 0 && <span className="font-semibold">entradas {fmt(m.entradas)}</span>}
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

// ── Evento dentro de sesión ────────────────────────────────────────────────────

function EventoEnSesion({ ev, puedeEliminar, onDeleted, onRefreshed }: { ev: EventoCerrado; puedeEliminar?: boolean; onDeleted?: (id: string) => void; onRefreshed?: () => void }) {
    const [open, setOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const cd = ev.cierreData;
    const horaCierre = cd?.fecha ? formatHora(cd.fecha) : formatHora(ev.updatedAt);

    async function eliminarEvento() {
        setDeleting(true);
        const res = await fetch(`/api/eventos/${ev._id}`, { method: "DELETE", credentials: "include" });
        setDeleting(false);
        if (res.ok) onDeleted?.(ev._id);
        else setConfirmDelete(false);
    }

    return (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
            {/* Header del evento */}
            <div className="bg-black px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                    <Star size={11} className="text-amber-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-black text-white text-sm leading-tight break-words">{ev.nombre}</p>
                        <p className="text-[10px] text-amber-400/70 mt-0.5">Cerrado · {horaCierre}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {cd && <span className="font-black text-white text-base">{fmt(cd.totalGeneral)}</span>}
                    {puedeEliminar && !confirmDelete && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition">
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Doble confirmación para eliminar evento */}
            {confirmDelete && (
                <div className="bg-red-50 border-b border-red-100 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-black text-red-700">¿Eliminar este evento y todos sus datos?</p>
                    <p className="text-[10px] text-red-500">Se borran pedidos, movimientos de caja y entradas asociadas.</p>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-600">
                            Cancelar
                        </button>
                        <button onClick={eliminarEvento} disabled={deleting}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 transition disabled:opacity-50">
                            <Trash2 size={11} /> {deleting ? "Eliminando…" : "Sí, eliminar"}
                        </button>
                    </div>
                </div>
            )}

            {/* Resumen métodos */}
            {cd && (
                <div className="px-3 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5 bg-amber-50 border-b border-amber-100">
                    {cd.totalEfectivo > 0 && (
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Efectivo</p>
                            <p className="text-xs font-black text-emerald-700">{fmt(cd.totalEfectivo)}</p>
                        </div>
                    )}
                    {cd.totalTransferencia > 0 && (
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Transf.</p>
                            <p className="text-xs font-black text-violet-700">{fmt(cd.totalTransferencia)}</p>
                        </div>
                    )}
                    {cd.totalTarjeta > 0 && (
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Tarjeta</p>
                            <p className="text-xs font-black text-blue-700">{fmt(cd.totalTarjeta)}</p>
                        </div>
                    )}
                    {cd.entradasCantidad > 0 && (
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Entradas</p>
                            <p className="text-xs font-black text-amber-700">{cd.entradasCantidad} × {fmt(cd.entradasPrecio)}</p>
                        </div>
                    )}
                </div>
            )}

            {open && <DetalleEvento ev={ev} onRefreshed={onRefreshed} />}

            <button
                onClick={() => setOpen(v => !v)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition bg-white"
            >
                <p className="text-[10px] text-gray-400">
                    {cd?.entradasCantidad ? `${cd.entradasCantidad} entradas` : "Sin entradas"}
                    {(ev.ventas?.length ?? 0) > 0 && ` · ${ev.ventas!.length} venta${ev.ventas!.length !== 1 ? "s" : ""}`}
                </p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                    {open ? <><ChevronUp size={11} />Ocultar</> : <><ChevronDown size={11} />Ver detalle</>}
                </span>
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CajaHistorialPage() {
    const SWR_OPTS = { revalidateOnFocus: false, revalidateOnMount: true, shouldRetryOnError: true, errorRetryCount: 3 };

    const { user } = useAuth();
    const puedeEliminar = user?.role === "admin" || user?.role === "superadmin";

    const { data: sesiones, isLoading: loadingSesiones, error: errSesiones, mutate: reloadSesiones } =
        useSWR<SesionSummary[]>("/api/superadmin/caja/historial", fetcher, SWR_OPTS);
    const { data: eventosData, mutate: reloadEventos } =
        useSWR<EventoCerrado[]>("/api/eventos?cerrado=true", fetcher, SWR_OPTS);

    const [expandidas,     setExpandidas]     = useState<Set<string>>(new Set());
    const [detalles,       setDetalles]       = useState<Record<string, SesionDetail>>({});
    const [loadingDetalle, setLoadingDetalle] = useState<Set<string>>(new Set());

    // Eliminación de sesiones
    const [confirmCaja,   setConfirmCaja]   = useState<string | null>(null);
    const [deletingCaja,  setDeletingCaja]  = useState(false);

    const eventosCerrados = Array.isArray(eventosData) ? eventosData : [];

    // Match each event to the session whose open/close range contains the event's close date
    const { eventosBySesion, eventosHuerfanos } = useMemo(() => {
        const map: Record<string, EventoCerrado[]> = {};
        const huerfanos: EventoCerrado[] = [];
        for (const ev of eventosCerrados) {
            const evDate = new Date(ev.cierreData?.fecha ?? ev.updatedAt);
            let matched = false;
            for (const s of (sesiones ?? [])) {
                const apertura = new Date(s.fechaApertura);
                // +30s de margen para eventos cerrados justo después de fechaCierre
                const cierre   = s.fechaCierre ? new Date(new Date(s.fechaCierre).getTime() + 30000) : new Date();
                if (evDate >= apertura && evDate <= cierre) {
                    if (!map[s._id]) map[s._id] = [];
                    map[s._id].push(ev);
                    matched = true;
                    break;
                }
            }
            if (!matched) huerfanos.push(ev);
        }
        return { eventosBySesion: map, eventosHuerfanos: huerfanos };
    }, [eventosCerrados, sesiones]);

    const fetchDetalle = useCallback(async (id: string) => {
        setLoadingDetalle(prev => { const n = new Set(prev); n.add(id); return n; });
        try {
            const res = await fetch(`/api/superadmin/caja/sesion/${id}`, { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setDetalles(prev => ({
                ...prev,
                [id]: {
                    ...data.sesion,
                    movimientos: data.movimientos,
                    productos: data.productos,
                    totales: data.totales,
                    totalIngreso: data.totalIngreso,
                    totalEgreso: data.totalEgreso,
                    neto: data.neto,
                    cantMovimientos: data.cantMovimientos,
                },
            }));
        } catch {
            // silently fail — user can retry by collapsing and re-expanding
        } finally {
            setLoadingDetalle(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
    }, []);

    function toggle(id: string) {
        const wasOpen = expandidas.has(id);
        setExpandidas(prev => { const n = new Set(prev); wasOpen ? n.delete(id) : n.add(id); return n; });
        if (!wasOpen && !detalles[id] && !loadingDetalle.has(id)) fetchDetalle(id);
    }

    function handleRefreshSesion(id: string) {
        reloadSesiones();
        fetchDetalle(id);
    }

    async function eliminarSesion(id: string) {
        setDeletingCaja(true);
        const res = await fetch(`/api/superadmin/caja/sesion/${id}`, { method: "DELETE", credentials: "include" });
        setDeletingCaja(false);
        if (res.ok) { setConfirmCaja(null); reloadSesiones(); }
    }

    function handleEventoDeleted(id: string) {
        reloadEventos();
    }

    return (
        <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                <Link href="/admin/caja" className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0">
                    <ChevronLeft size={20} />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black flex-1">Historial de Caja</h1>
            </div>

            {/* ── Sesiones ── */}
            {(loadingSesiones || errSesiones) && <div className="flex justify-center py-20"><Loader size={40} /></div>}
            {!loadingSesiones && !errSesiones && Array.isArray(sesiones) && sesiones.length === 0 && (
                <p className="text-center text-gray-400 py-10">Sin sesiones registradas</p>
            )}

            {sesiones && sesiones.length > 0 && (
                <div className="space-y-4 mb-10">
                    {sesiones.map(s => {
                        const open    = expandidas.has(s._id);
                        const detail  = detalles[s._id];
                        const loading = loadingDetalle.has(s._id);
                        const eventos = eventosBySesion[s._id] ?? [];

                        const totalEventos = eventos.reduce((sum, ev) => sum + (ev.cierreData?.totalGeneral ?? 0), 0);

                        return (
                            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                                {/* Header — clickeable para abrir/cerrar */}
                                <button onClick={() => toggle(s._id)} className={`w-full text-left px-4 py-3 border-b ${s.estado === "abierta" ? "bg-emerald-50 border-emerald-100" : "bg-gray-900 border-gray-800"}`}>
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
                                        <div className="flex items-center gap-2 shrink-0">
                                            {open && (
                                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-white/50">
                                                    <ChevronUp size={12} />Ocultar
                                                </span>
                                            )}
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.estado === "abierta" ? "bg-emerald-200 text-emerald-800" : "bg-white/10 text-white/70"}`}>
                                                {s.estado === "abierta" ? "Abierta" : "Cerrada"}
                                            </span>
                                            {puedeEliminar && s.estado === "cerrada" && confirmCaja !== s._id && (
                                                <button onClick={e => { e.stopPropagation(); setConfirmCaja(s._id); }}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Doble confirmación para eliminar sesión */}
                                {confirmCaja === s._id && (
                                    <div className="bg-red-50 border-b border-red-100 px-4 py-3 space-y-2">
                                        <p className="text-xs font-black text-red-700">¿Eliminar esta sesión de caja y todos sus movimientos?</p>
                                        <p className="text-[10px] text-red-500">Esta acción no se puede deshacer.</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setConfirmCaja(null)} className="flex-1 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600">
                                                Cancelar
                                            </button>
                                            <button onClick={() => eliminarSesion(s._id)} disabled={deletingCaja}
                                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition disabled:opacity-50">
                                                <Trash2 size={12} /> {deletingCaja ? "Eliminando…" : "Sí, eliminar"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Ingresos caja</p>
                                        <p className="text-base font-black text-emerald-600">{fmt(s.totalIngreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Egresos</p>
                                        <p className="text-base font-black text-red-500">{fmt(s.totalEgreso)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Neto</p>
                                        <p className={`text-base font-black ${s.neto >= 0 ? "text-gray-900" : "text-red-600"}`}>
                                            {fmt(s.neto)}
                                        </p>
                                    </div>
                                </div>

                                {/* Eventos del día — siempre visibles en el resumen */}
                                {eventos.length > 0 && (
                                    <div className="px-4 py-3 space-y-2 border-b border-gray-100 bg-amber-50/40">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                                            <Star size={10} className="text-amber-500" />
                                            {eventos.length === 1 ? "Evento de esta sesión" : `${eventos.length} eventos de esta sesión`}
                                            <span className="ml-auto font-black text-amber-700 text-xs">{fmt(totalEventos)}</span>
                                        </p>
                                        <p className="text-[10px] text-amber-500">⚠️ Ya incluido en "Ingresos caja" — no sumar por separado.</p>
                                        {eventos.map(ev => <EventoEnSesion key={ev._id} ev={ev} puedeEliminar={puedeEliminar} onDeleted={handleEventoDeleted} onRefreshed={reloadEventos} />)}
                                    </div>
                                )}

                                {s.cantDelivery > 0 && (
                                    <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 bg-blue-50">
                                        <Truck size={13} className="text-blue-500 shrink-0" />
                                        <span className="text-xs font-bold text-blue-700">
                                            {s.cantDelivery} envío{s.cantDelivery !== 1 ? "s" : ""} entregado{s.cantDelivery !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                )}

                                {/* Expanded detail */}
                                {open && detail && (
                                    <DetalleSesion s={detail} onRefresh={() => handleRefreshSesion(s._id)} />
                                )}
                                {open && loading && (
                                    <div className="flex justify-center py-8">
                                        <Loader2 size={24} className="animate-spin text-gray-400" />
                                    </div>
                                )}
                                {open && !detail && !loading && (
                                    <div className="py-6 text-center">
                                        <p className="text-xs text-gray-400 mb-2">No se pudo cargar el detalle</p>
                                        <button onClick={() => fetchDetalle(s._id)} className="text-xs font-bold text-blue-600 underline">
                                            Reintentar
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => toggle(s._id)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
                                >
                                    <p className="text-[11px] text-gray-400">
                                        {s.cantMovimientos} movimiento{s.cantMovimientos !== 1 ? "s" : ""}
                                        {s.montoInicial > 0 && ` · Apertura: ${fmt(s.montoInicial)}`}
                                        {detail && Object.keys(detail.productos).length > 0 && ` · ${Object.keys(detail.productos).length} productos`}
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

            {/* ── Eventos sin sesión asociada (edge case) ── */}
            {eventosHuerfanos.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Star size={16} className="text-amber-500 shrink-0" />
                        <h2 className="text-lg font-extrabold text-black whitespace-nowrap">Eventos sin sesión</h2>
                        <div className="flex-1 h-px bg-amber-200" />
                    </div>
                    <div className="space-y-4">
                        {eventosHuerfanos.map(ev => (
                            <div key={ev._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <EventoEnSesion ev={ev} puedeEliminar={puedeEliminar} onDeleted={handleEventoDeleted} onRefreshed={reloadEventos} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
