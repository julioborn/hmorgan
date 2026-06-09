"use client";
import useSWR from "swr";
import Link from "next/link";
import { ChevronLeft, TrendingUp, TrendingDown, Banknote, CreditCard, Send } from "lucide-react";
import Loader from "@/components/Loader";

type Sesion = {
    _id: string;
    estado: "abierta" | "cerrada";
    montoInicial: number;
    montoCierre?: number;
    fechaApertura: string;
    fechaCierre?: string;
    abiertaPor: { nombre?: string; apellido?: string } | null;
    cerradaPor: { nombre?: string; apellido?: string } | null;
    totalIngreso: number;
    totalEgreso: number;
    neto: number;
    cantMovimientos: number;
    totales: Record<string, { ingreso: number; egreso: number }>;
};

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

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

function nombreUsuario(u: { nombre?: string; apellido?: string } | null) {
    if (!u) return "—";
    return [u.nombre, u.apellido].filter(Boolean).join(" ") || "—";
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function CajaHistorialPage() {
    const { data: sesiones, isLoading } = useSWR<Sesion[]>("/api/admin/caja/historial", fetcher);

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
                    {sesiones.map(s => (
                        <div key={s._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className={`px-4 py-3 flex items-center justify-between ${s.estado === "abierta" ? "bg-emerald-50 border-b border-emerald-100" : "bg-gray-50 border-b border-gray-100"}`}>
                                <div>
                                    <p className="font-black text-gray-900 text-sm">{formatFecha(s.fechaApertura)}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatHora(s.fechaApertura)}
                                        {s.fechaCierre && ` → ${formatHora(s.fechaCierre)}`}
                                        {" · "}Abrió: {nombreUsuario(s.abiertaPor)}
                                    </p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.estado === "abierta" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                    {s.estado === "abierta" ? "Abierta" : "Cerrada"}
                                </span>
                            </div>

                            {/* Totals grid */}
                            <div className="px-4 py-3 grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Ingresos</p>
                                    <p className="text-sm font-black text-emerald-600">{formatMoney(s.totalIngreso)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Egresos</p>
                                    <p className="text-sm font-black text-red-500">{formatMoney(s.totalEgreso)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Neto</p>
                                    <p className={`text-sm font-black ${s.neto >= 0 ? "text-gray-900" : "text-red-600"}`}>{formatMoney(s.neto)}</p>
                                </div>
                            </div>

                            {/* Per-method breakdown */}
                            {Object.keys(s.totales).length > 0 && (
                                <div className="border-t border-gray-100 px-4 py-3 flex flex-wrap gap-3">
                                    {Object.entries(s.totales).map(([metodo, vals]) => {
                                        const Icon = metodoIcon[metodo] || Banknote;
                                        return (
                                            <div key={metodo} className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Icon size={12} className="shrink-0" />
                                                <span className="font-semibold">{metodoLabel[metodo] || metodo}:</span>
                                                {vals.ingreso > 0 && (
                                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                                        <TrendingUp size={11} />{formatMoney(vals.ingreso)}
                                                    </span>
                                                )}
                                                {vals.egreso > 0 && (
                                                    <span className="text-red-500 font-bold flex items-center gap-0.5">
                                                        <TrendingDown size={11} />{formatMoney(vals.egreso)}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                                <p className="text-[11px] text-gray-400">{s.cantMovimientos} movimiento{s.cantMovimientos !== 1 ? "s" : ""}</p>
                                {s.montoInicial > 0 && (
                                    <p className="text-[11px] text-gray-400">Apertura: {formatMoney(s.montoInicial)}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
