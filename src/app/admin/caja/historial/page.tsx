"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState, useCallback } from "react";
import {
    ChevronLeft, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, AlertCircle, Receipt, Ticket, Pencil, Check, Star, Loader2,
} from "lucide-react";
import Loader from "@/components/Loader";
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
        { label: "Efectivo",      icon: Banknote,   key: "efectivo",      total: cd.totalEfectivo,      ventas: cd.ventasEfectivo,      comandas: cd.comandasEfectivo },
        { label: "Transferencia", icon: Send,        key: "transferencia", total: cd.totalTransferencia, ventas: cd.ventasTransferencia, comandas: cd.comandasTransferencia },
        { label: "Tarjeta",       icon: CreditCard,  key: "tarjeta",       total: cd.totalTarjeta,       ventas: cd.ventasTarjeta,       comandas: cd.comandasTarjeta },
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
    const SWR_OPTS = { revalidateOnFocus: false, revalidateOnMount: true, shouldRetryOnError: true, errorRetryCount: 3 };

    const { data: sesiones, isLoading: loadingSesiones, error: errSesiones, mutate: reloadSesiones } =
        useSWR<SesionSummary[]>("/api/superadmin/caja/historial", fetcher, SWR_OPTS);
    const { data: eventosData, isLoading: loadingEventos, error: errEventos } =
        useSWR<EventoCerrado[]>("/api/eventos?cerrado=true", fetcher, SWR_OPTS);

    const [expandidas,     setExpandidas]     = useState<Set<string>>(new Set());
    const [expandidosEv,   setExpandidosEv]   = useState<Set<string>>(new Set());
    const [detalles,       setDetalles]       = useState<Record<string, SesionDetail>>({});
    const [loadingDetalle, setLoadingDetalle] = useState<Set<string>>(new Set());

    const eventosCerrados = Array.isArray(eventosData) ? eventosData : [];

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
        if (!wasOpen && !detalles[id] && !loadingDetalle.has(id)) {
            fetchDetalle(id);
        }
    }

    function toggleEv(id: string) {
        setExpandidosEv(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    function handleRefreshSesion(id: string) {
        reloadSesiones();
        fetchDetalle(id);
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
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Receipt size={16} className="text-gray-500 shrink-0" />
                        <h2 className="text-lg font-extrabold text-black whitespace-nowrap">Sesiones de Caja</h2>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-4">
                        {sesiones.map(s => {
                            const open   = expandidas.has(s._id);
                            const detail = detalles[s._id];
                            const loading = loadingDetalle.has(s._id);

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
                                            <button
                                                onClick={() => fetchDetalle(s._id)}
                                                className="text-xs font-bold text-blue-600 underline"
                                            >
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
                            const cd   = ev.cierreData;
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
