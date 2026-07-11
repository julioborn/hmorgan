"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    TrendingUp, TrendingDown,
    CreditCard, Banknote, Send, Loader2, CheckCircle, History,
} from "lucide-react";

type CajaSession = {
    _id: string;
    estado: "abierta" | "cerrada";
    montoInicial: number;
    montoCierre?: number;
    abiertaPor: { nombre?: string; apellido?: string } | string;
    fechaApertura: string;
    notas?: string;
};

type CajaMovimiento = {
    _id: string;
    tipo: "ingreso" | "egreso";
    concepto: string;
    monto: number;
    metodoPago: "efectivo" | "tarjeta" | "transferencia";
    createdAt: string;
    userId?: { nombre?: string; apellido?: string };
    descuento?: number;
};

type PedidoActivo = {
    _id: string;
    mesa: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    createdAt: string;
    notaEmpleado?: string;
};

const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const metodoLabel: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
};

const metodoIcon: Record<string, React.ElementType> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Send,
};

export default function CajaPage() {
    const [sesion, setSesion] = useState<CajaSession | null | undefined>(undefined);
    const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [pedidosActivos, setPedidosActivos] = useState<PedidoActivo[]>([]);

    const loadCaja = useCallback(() => {
        fetch("/api/superadmin/caja", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                setSesion(data.sesion || null);
                setMovimientos(data.movimientos || []);
            })
            .catch(() => setSesion(null))
            .finally(() => setLoading(false));
    }, []);

    const loadPedidosActivos = useCallback(() => {
        fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setPedidosActivos(data.filter((p: PedidoActivo) => p.mesa)); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadCaja(); loadPedidosActivos(); }, [loadCaja, loadPedidosActivos]);

    function calcularTotales() {
        const totalIngreso = movimientos.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
        const totalEgreso = movimientos.filter(m => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
        const neto = (sesion?.montoInicial || 0) + totalIngreso - totalEgreso;
        return { totalIngreso, totalEgreso, neto };
    }

    const totales = calcularTotales();

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

    /* ── No session open ── */
    if (sesion === null) {
        return (
            <div className="min-h-screen">
                <div className="max-w-md mx-auto px-4">
                    <div className="flex items-center justify-between py-6">
                        <h1 className="text-3xl font-extrabold text-black">Caja</h1>
                        <Link href="/admin/caja/historial"
                            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
                            <History size={16} /> Historial
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <p className="text-sm text-gray-500 text-center">Sin sesión activa.</p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Session open ── */
    const horaApertura = sesion ? new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <div className="min-h-screen pb-24">
            <div className="px-4 max-w-2xl mx-auto">
                <div className="flex items-center justify-between py-6">
                    <h1 className="text-3xl font-extrabold text-black">Caja</h1>
                    <Link href="/admin/caja/historial"
                        className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl text-xs font-semibold transition text-gray-600">
                        <History size={13} /> Historial
                    </Link>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-800">Sesión abierta</p>
                        <p className="text-xs text-emerald-600">Desde las {horaApertura} · Inicial: {formatMoney(sesion?.montoInicial || 0)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Ingresos</p>
                            <p className="text-sm font-black text-emerald-600">{formatMoney(totales.totalIngreso)}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Egresos</p>
                            <p className="text-sm font-black text-red-600">{formatMoney(totales.totalEgreso)}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Neto total</p>
                            <p className={`text-sm font-black ${totales.neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(totales.neto)}</p>
                        </div>
                    </div>

                    {/* Movements list */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900 text-sm">Movimientos ({movimientos.length})</h2>
                        </div>
                        {movimientos.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Sin movimientos aún</p>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {movimientos.map(m => {
                                    const Icon = metodoIcon[m.metodoPago] || Banknote;
                                    return (
                                        <div key={m._id} className="flex items-start gap-3 px-4 py-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.tipo === "ingreso" ? "bg-emerald-100" : "bg-red-100"}`}>
                                                {m.tipo === "ingreso"
                                                    ? <TrendingUp size={14} className="text-emerald-600" />
                                                    : <TrendingDown size={14} className="text-red-600" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 leading-tight">{m.concepto}</p>
                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                                                    <Icon size={11} className="text-gray-400 shrink-0" />
                                                    <span className="text-xs text-gray-400">{metodoLabel[m.metodoPago]}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(m.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                    {m.userId?.nombre && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                {m.userId.nombre} {m.userId.apellido || ""}
                                                            </span>
                                                        </>
                                                    )}
                                                    {(m.descuento ?? 0) > 0 && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            <span className="text-xs text-amber-600 font-semibold">
                                                                Dto. {formatMoney(m.descuento!)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`text-sm font-black shrink-0 ${m.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"}`}>
                                                {m.tipo === "ingreso" ? "+" : "-"}{formatMoney(m.monto)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Mesas activas */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 text-sm">Mesas Activas</h2>
                            <button onClick={loadPedidosActivos} className="text-xs text-gray-400 hover:text-gray-600 transition">↻ actualizar</button>
                        </div>
                        {pedidosActivos.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Sin mesas con comanda abierta</p>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {pedidosActivos.map(p => (
                                    <div key={p._id} className="px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">Mesa {p.mesa}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    {" · "}{p.estado}
                                                </p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">{formatMoney(p.total)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {p.items.map((i, idx) => (
                                                <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    {i.cantidad}× {i.menuItemId?.nombre || "ítem"}
                                                </span>
                                            ))}
                                        </div>
                                        {p.notaEmpleado && <p className="text-xs text-amber-600 mt-1 italic">📝 {p.notaEmpleado}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
