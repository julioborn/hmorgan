"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import {
    ChevronLeft, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, Banknote, CreditCard, Send,
    Package, ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import Loader from "@/components/Loader";

type Movement = {
    _id: string;
    tipo: "ingreso" | "egreso";
    concepto: string;
    monto: number;
    excedente?: number;
    metodoPago: string;
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

function nombreU(u: { nombre?: string; apellido?: string } | null | undefined) {
    if (!u) return "—";
    return [u.nombre, u.apellido].filter(Boolean).join(" ") || "—";
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{children}</p>
    );
}

function MetodoBadge({ metodo }: { metodo: string }) {
    const Icon = METODO_ICON[metodo] || Banknote;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            <Icon size={9} />{METODO_LABEL[metodo] || metodo}
        </span>
    );
}

function DetalleSesion({ s }: { s: Sesion }) {
    const productos = Object.values(s.productos).sort((a, b) => b.total - a.total);
    const totalExcedente = Object.values(s.totales).reduce((sum, t) => sum + (t.excedente || 0), 0);

    return (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Financial summary */}
            <div className="px-4 py-4 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Monto apertura</p>
                    <p className="text-lg font-black text-gray-800">{fmt(s.montoInicial || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Monto cierre</p>
                    <p className="text-lg font-black text-gray-800">{s.montoCierre != null ? fmt(s.montoCierre) : "—"}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase">Total ingresos</p>
                    <p className="text-lg font-black text-emerald-700">{fmt(s.totalIngreso)}</p>
                </div>
                <div className="bg-red-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-red-500 uppercase">Total egresos</p>
                    <p className="text-lg font-black text-red-600">{fmt(s.totalEgreso)}</p>
                </div>
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

            {/* Movements list */}
            {s.movimientos.length > 0 && (
                <div className="px-4 py-4">
                    <SectionTitle>Movimientos ({s.movimientos.length})</SectionTitle>
                    <div className="space-y-1.5">
                        {s.movimientos.map(m => (
                            <div key={m._id} className="flex items-start gap-2 text-xs">
                                {m.tipo === "ingreso"
                                    ? <ArrowDownCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                    : <ArrowUpCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{m.concepto}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-gray-400">{formatHora(m.createdAt)}</span>
                                        <MetodoBadge metodo={m.metodoPago} />
                                        {m.userId && (
                                            <span className="text-gray-400">{nombreU(m.userId)}</span>
                                        )}
                                        {(m.excedente || 0) > 0 && (
                                            <span className="text-amber-600 font-bold">+{fmt(m.excedente!)} excedente</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`font-black shrink-0 ${m.tipo === "ingreso" ? "text-emerald-600" : "text-red-500"}`}>
                                    {m.tipo === "egreso" ? "-" : "+"}{fmt(m.monto)}
                                </span>
                            </div>
                        ))}
                    </div>
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
                <div className="flex justify-center py-20">
                    <Loader size={40} />
                </div>
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
                                            {" · "}Abrió: {nombreU(s.abiertaPor)}
                                            {s.cerradaPor && ` · Cerró: ${nombreU(s.cerradaPor)}`}
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
