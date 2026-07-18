"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import {
    TrendingUp, Package, Users, Coins, Clock,
    ChevronLeft, ChevronRight, Percent, UserPlus,
    Gift, Truck, UtensilsCrossed, Wallet,
} from "lucide-react";

type Stats = {
    totalIngresos: number;
    totalPedidos: number;
    ticketPromedio: number;
    tasaCancelacion: number;
    conteos: { pendiente: number; preparando: number; listo: number; entregado: number; cancelado: number };
    itemsPopulares: { nombre: string; cantidad: number; categoria: string }[];
    pedidosPorDia: { fecha: string; cantidad: number }[];
    ingresosPorDia: { fecha: string; total: number }[];
    horaPico: number | null;
    horasPorHora: { hora: number; cantidad: number }[];
    totalUsuarios: number;
    nuevosUsuarios: number;
    totalPuntos: number;
    canjesCount: number;
    puntosCanjeados: number;
    pedidosEmpleado: number;
    pedidosCliente: number;
    pedidosAutoservicio: number;
    tipoEntregaSplit: Record<string, number>;
    metodoPagoSplit: Record<string, number>;
    ingresosPorCategoria: { categoria: string; total: number; cantidad: number }[];
};

function toInputDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

const PRESETS = [
    { label: "Hoy", dias: 0 },
    { label: "7 días", dias: 6 },
    { label: "30 días", dias: 29 },
    { label: "Este mes", dias: -1 },
    { label: "Todo", dias: -2 },
];

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function EstadisticasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const todayStr = toInputDate(new Date());
    const defaultDesde = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return toInputDate(d);
    })();

    const [desde, setDesde] = useState(defaultDesde);
    const [hasta, setHasta] = useState(todayStr);
    const [presetActivo, setPresetActivo] = useState("7 días");
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!loading && user?.role !== "admin") router.replace("/");
    }, [user, loading, router]);

    const fetchStats = useCallback(async (d: string, h: string) => {
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/admin/estadisticas?desde=${d}&hasta=${h}`, { cache: "no-store" });
            setStats(await res.json());
        } catch {
            setStats(null);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => { fetchStats(desde, hasta); }, []);

    function applyRange(d: string, h: string) {
        setDesde(d);
        setHasta(h);
        fetchStats(d, h);
    }

    function aplicarPreset(label: string, dias: number) {
        setPresetActivo(label);
        const h = new Date();
        let d = new Date();
        if (dias === 0) { /* hoy */ }
        else if (dias === -1) { d = new Date(h.getFullYear(), h.getMonth(), 1); }
        else if (dias === -2) { d = new Date(h.getFullYear() - 5, 0, 1); }
        else { d.setDate(d.getDate() - dias); }
        applyRange(toInputDate(d), toInputDate(h));
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={64} /></div>;

    return (
        <div
            className="min-h-screen bg-gray-50 pb-10 px-4 max-w-3xl mx-auto"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
        >
            <h1 className="text-3xl font-extrabold text-center py-8 text-black">Estadísticas</h1>

            {/* Filtro de fechas */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => aplicarPreset(p.label, p.dias)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                                presetActivo === p.label
                                    ? "bg-red-600 text-white border-red-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <DateRangePicker
                    desde={desde}
                    hasta={hasta}
                    today={todayStr}
                    onApply={(d, h) => { setPresetActivo(""); applyRange(d, h); }}
                />
            </div>

            {loadingStats ? (
                <div className="flex justify-center py-20"><Loader size={48} /></div>
            ) : !stats ? (
                <p className="text-center py-20 text-gray-500">Error cargando estadísticas</p>
            ) : (
                <StatsContent stats={stats} />
            )}
        </div>
    );
}

/* ─── Date Range Picker ─────────────────────────────────────────── */
function DateRangePicker({
    desde, hasta, today, onApply,
}: {
    desde: string;
    hasta: string;
    today: string;
    onApply: (desde: string, hasta: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [pickStart, setPickStart] = useState("");
    const [pickEnd, setPickEnd] = useState("");
    const [step, setStep] = useState<"start" | "end">("start");

    const initDate = new Date((desde || today) + "T12:00:00");
    const [viewYear, setViewYear] = useState(initDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initDate.getMonth());

    function openCalendar() {
        setPickStart(desde);
        setPickEnd(hasta);
        setStep("start");
        const d = new Date((desde || today) + "T12:00:00");
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setOpen(true);
    }

    function handleDayClick(dateStr: string) {
        if (step === "start") {
            setPickStart(dateStr);
            setPickEnd("");
            setStep("end");
        } else {
            const finalStart = dateStr < pickStart ? dateStr : pickStart;
            const finalEnd = dateStr < pickStart ? pickStart : dateStr;
            onApply(finalStart, finalEnd);
            setOpen(false);
        }
    }

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        const now = new Date();
        if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
    const offset = (firstDayRaw + 6) % 7;

    const cells: (string | null)[] = [
        ...Array(offset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => {
            const d = String(i + 1).padStart(2, "0");
            const m = String(viewMonth + 1).padStart(2, "0");
            return `${viewYear}-${m}-${d}`;
        }),
    ];

    function formatDisplay(d: string) {
        if (!d) return "—";
        const dt = new Date(d + "T12:00:00");
        return dt.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    }

    const now = new Date();
    const isAtMaxMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    const activeStart = step === "end" ? pickStart : desde;
    const activeEnd = step === "end" ? pickEnd : hasta;

    return (
        <div className="relative">
            <button
                onClick={openCalendar}
                className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-white hover:border-red-400 transition text-left"
            >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">
                    {formatDisplay(desde)} → {formatDisplay(hasta)}
                </span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
                        <p className="text-xs text-center font-medium text-red-600 mb-3">
                            {step === "start" ? "Tocá la fecha de inicio" : "Tocá la fecha de fin"}
                        </p>

                        <div className="flex items-center justify-between mb-3">
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-sm text-gray-900">{MONTHS[viewMonth]} {viewYear}</span>
                            <button onClick={nextMonth} disabled={isAtMaxMonth} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                            {["L","M","X","J","V","S","D"].map(d => (
                                <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                            {cells.map((dateStr, i) => {
                                if (!dateStr) return <div key={i} />;
                                const isStart = dateStr === activeStart;
                                const isEnd = dateStr === activeEnd;
                                const inRange = activeStart && activeEnd && dateStr > activeStart && dateStr < activeEnd;
                                const isFuture = dateStr > today;
                                const isToday = dateStr === today;

                                return (
                                    <button
                                        key={dateStr}
                                        onClick={() => !isFuture && handleDayClick(dateStr)}
                                        disabled={isFuture}
                                        className={[
                                            "h-9 w-full flex items-center justify-center text-sm font-medium transition-all relative",
                                            isFuture ? "opacity-25 cursor-not-allowed" : "cursor-pointer",
                                            isStart || isEnd ? "bg-red-600 text-white rounded-lg z-10" : "",
                                            inRange ? "bg-red-100 text-red-700" : "",
                                            !isStart && !isEnd && !inRange ? "hover:bg-gray-100 text-gray-800 rounded-lg" : "",
                                        ].join(" ")}
                                    >
                                        {isToday && !isStart && !isEnd && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-400 rounded-full" />
                                        )}
                                        {new Date(dateStr + "T12:00:00").getDate()}
                                    </button>
                                );
                            })}
                        </div>

                        <button onClick={() => setOpen(false)} className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition">
                            Cancelar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Stats Content ─────────────────────────────────────────────── */
function StatsContent({ stats }: { stats: Stats }) {
    const maxPedidosDia = Math.max(...stats.pedidosPorDia.map(d => d.cantidad), 1);
    const maxIngresosDia = Math.max(...stats.ingresosPorDia.map(d => d.total), 1);
    const maxItems = Math.max(...stats.itemsPopulares.map(i => i.cantidad), 1);
    const maxHora = Math.max(...stats.horasPorHora.map(h => h.cantidad), 1);
    const horasActivas = stats.horasPorHora.some(h => h.cantidad > 0);
    const maxCategoria = Math.max(...stats.ingresosPorCategoria.map(c => c.total), 1);

    const hayMetodoPago = Object.values(stats.metodoPagoSplit).some(v => v > 0);
    const hayEntrega = Object.values(stats.tipoEntregaSplit).some(v => v > 0);
    const hayCategorias = stats.ingresosPorCategoria.length > 0;

    return (
        <div className="space-y-6">

            {/* KPIs principales — 2 columnas */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                    label="Ingresos totales"
                    value={`$${stats.totalIngresos.toLocaleString("es-AR")}`}
                    color="bg-green-50 border-green-200"
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    label="Ticket promedio"
                    value={stats.ticketPromedio > 0 ? `$${stats.ticketPromedio.toLocaleString("es-AR")}` : "—"}
                    color="bg-emerald-50 border-emerald-200"
                />
                <StatCard
                    icon={<Package className="w-5 h-5 text-red-600" />}
                    label="Pedidos totales"
                    value={stats.totalPedidos}
                    color="bg-red-50 border-red-200"
                />
                <StatCard
                    icon={<Percent className="w-5 h-5 text-orange-600" />}
                    label="Cancelaciones"
                    value={`${stats.tasaCancelacion}%`}
                    sub={`${stats.conteos.cancelado} pedido${stats.conteos.cancelado !== 1 ? "s" : ""}`}
                    color="bg-orange-50 border-orange-200"
                />
                <StatCard
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    label="Clientes totales"
                    value={stats.totalUsuarios}
                    color="bg-blue-50 border-blue-200"
                />
                <StatCard
                    icon={<UserPlus className="w-5 h-5 text-indigo-600" />}
                    label="Nuevos en período"
                    value={stats.nuevosUsuarios}
                    color="bg-indigo-50 border-indigo-200"
                />
                <StatCard
                    icon={<Coins className="w-5 h-5 text-yellow-600" />}
                    label="Puntos emitidos"
                    value={stats.totalPuntos.toLocaleString("es-AR")}
                    color="bg-yellow-50 border-yellow-200"
                />
                <StatCard
                    icon={<Gift className="w-5 h-5 text-purple-600" />}
                    label="Canjes"
                    value={stats.canjesCount}
                    sub={stats.puntosCanjeados > 0 ? `${stats.puntosCanjeados.toLocaleString("es-AR")} pts` : undefined}
                    color="bg-purple-50 border-purple-200"
                />
            </div>

            {/* Pedidos por período */}
            <BarChart
                title="Pedidos por período"
                data={stats.pedidosPorDia}
                valueKey="cantidad"
                maxVal={maxPedidosDia}
                color="bg-red-500"
                formatValue={(v) => String(v)}
            />

            {/* Ingresos por período */}
            <BarChart
                title="Ingresos por período"
                data={stats.ingresosPorDia}
                valueKey="total"
                maxVal={maxIngresosDia}
                color="bg-green-500"
                formatValue={(v) => v > 0 ? `$${v.toLocaleString("es-AR")}` : ""}
            />

            {/* Tipo de entrega */}
            {hayEntrega && (
                <SplitCard
                    title="Tipo de entrega"
                    icon={<Truck className="w-5 h-5 text-blue-600" />}
                    segments={[
                        { label: "Local / retira", value: stats.tipoEntregaSplit.retira || 0, color: "#3b82f6", emoji: "🏠" },
                        { label: "Delivery", value: stats.tipoEntregaSplit.envio || 0, color: "#f59e0b", emoji: "🛵" },
                    ]}
                />
            )}

            {/* Origen de pedidos */}
            {stats.totalPedidos > 0 && (
                <SplitCard
                    title="Origen de pedidos"
                    icon={<UtensilsCrossed className="w-5 h-5 text-red-600" />}
                    segments={[
                        { label: "App clientes", value: stats.pedidosCliente, color: "#ef4444", emoji: "📱" },
                        { label: "Mozos", value: stats.pedidosEmpleado, color: "#8b5cf6", emoji: "🧑‍🍳" },
                        { label: "Autoservicio", value: stats.pedidosAutoservicio, color: "#06b6d4", emoji: "📟" },
                    ].filter(s => s.value > 0)}
                />
            )}

            {/* Método de pago */}
            {hayMetodoPago && (
                <SplitCard
                    title="Método de pago"
                    icon={<Wallet className="w-5 h-5 text-emerald-600" />}
                    segments={[
                        { label: "Efectivo", value: stats.metodoPagoSplit.efectivo || 0, color: "#10b981", emoji: "💵" },
                        { label: "Transferencia", value: stats.metodoPagoSplit.transferencia || 0, color: "#8b5cf6", emoji: "📲" },
                        { label: "Mercado Pago", value: stats.metodoPagoSplit.mercadopago || 0, color: "#3b82f6", emoji: "💳" },
                    ].filter(s => s.value > 0)}
                />
            )}

            {/* Estado de pedidos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-lg text-gray-900 mb-4">Estado de pedidos</h2>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                        <p className="text-2xl font-extrabold text-amber-700">{stats.conteos.pendiente}</p>
                        <p className="text-xs text-amber-700 font-medium">Pendientes</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                        <p className="text-2xl font-extrabold text-orange-700">{stats.conteos.preparando}</p>
                        <p className="text-xs text-orange-700 font-medium">Preparando</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                        <p className="text-2xl font-extrabold text-emerald-700">{stats.conteos.entregado}</p>
                        <p className="text-xs text-emerald-700 font-medium">Entregados</p>
                    </div>
                </div>
            </div>

            {/* Ingresos por categoría */}
            {hayCategorias && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-lg text-gray-900 mb-4">Ingresos por categoría</h2>
                    <div className="space-y-3">
                        {stats.ingresosPorCategoria.map((cat, i) => {
                            const pct = Math.round((cat.total / maxCategoria) * 100);
                            const COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#06b6d4","#f43f5e","#84cc16"];
                            const color = COLORS[i % COLORS.length];
                            return (
                                <div key={cat.categoria}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-semibold text-gray-800 capitalize">{cat.categoria}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900">${cat.total.toLocaleString("es-AR")}</span>
                                            <span className="text-xs text-gray-400 ml-1.5">×{cat.cantidad}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Distribución por hora */}
            {horasActivas && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-lg text-gray-900 mb-1">Distribución por hora</h2>
                    {stats.horaPico !== null && (
                        <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-red-500" />
                            Hora pico: <strong className="text-black ml-1">{stats.horaPico}:00 – {stats.horaPico + 1}:00</strong>
                        </p>
                    )}
                    <div className="flex items-end gap-[3px]" style={{ height: "72px" }}>
                        {stats.horasPorHora.map((h) => (
                            <div
                                key={h.hora}
                                className="flex-1"
                                style={{
                                    height: h.cantidad > 0
                                        ? `${Math.max(4, Math.round((h.cantidad / maxHora) * 68))}px`
                                        : "2px",
                                    borderRadius: "3px 3px 0 0",
                                    backgroundColor: h.hora === stats.horaPico ? "#ef4444" : h.cantidad > 0 ? "#d1d5db" : "#f3f4f6",
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex gap-[3px] mt-1">
                        {stats.horasPorHora.map((h) => (
                            <div key={h.hora} className="flex-1 text-center">
                                {h.hora % 6 === 0 && (
                                    <span className="text-[9px] text-gray-400">{h.hora}h</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Productos más pedidos */}
            {stats.itemsPopulares.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-lg text-gray-900 mb-4">Productos más pedidos</h2>
                    <div className="space-y-3">
                        {stats.itemsPopulares.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-800">{item.nombre}</span>
                                        <span className="font-bold text-red-600">×{item.cantidad}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(item.cantidad / maxItems) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Split Card ─────────────────────────────────────────────────── */
function SplitCard({
    title, icon, segments,
}: {
    title: string;
    icon: React.ReactNode;
    segments: { label: string; value: number; color: string; emoji?: string }[];
}) {
    const total = segments.reduce((acc, s) => acc + s.value, 0);
    if (total === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h2 className="font-bold text-lg text-gray-900">{title}</h2>
            </div>

            {/* Barra segmentada */}
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
                        className="rounded-full"
                    />
                ))}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-sm text-gray-600 font-medium">
                            {seg.emoji} {seg.label}
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">{seg.value}</span>
                        <span className="text-xs text-gray-400">({Math.round((seg.value / total) * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Bar Chart ─────────────────────────────────────────────────── */
function BarChart({ title, data, valueKey, maxVal, color, formatValue }: {
    title: string;
    data: Record<string, any>[];
    valueKey: string;
    maxVal: number;
    color: string;
    formatValue: (v: number) => string;
}) {
    if (!data.length) return null;

    const step = Math.ceil(data.length / 6);
    const barMin = 14;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-lg text-gray-900 mb-1">{title}</h2>
            <p className="text-xs text-gray-400 mb-3">
                Máx: <span className="font-semibold text-gray-600">{formatValue(maxVal)}</span>
            </p>

            <div className="overflow-x-auto -mx-1 px-1">
                <div
                    className="flex items-end gap-[3px]"
                    style={{ minWidth: `${data.length * (barMin + 3)}px`, height: "96px" }}
                >
                    {data.map((d, i) => {
                        const val = d[valueKey] as number;
                        const barH = val > 0 ? Math.max(4, Math.round((val / maxVal) * 80)) : 0;
                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-end h-full"
                                style={{ flex: "1 1 0", minWidth: `${barMin}px` }}
                            >
                                <div
                                    className={`w-full ${color} rounded-t`}
                                    style={{ height: `${barH}px` }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div
                    className="flex gap-[3px] mt-1"
                    style={{ minWidth: `${data.length * (barMin + 3)}px` }}
                >
                    {data.map((d, i) => {
                        const show = i === 0 || i === data.length - 1 || i % step === 0;
                        return (
                            <div
                                key={i}
                                className="text-center overflow-hidden"
                                style={{ flex: "1 1 0", minWidth: `${barMin}px` }}
                            >
                                {show && (
                                    <span className="text-[9px] text-gray-400 leading-none">{d.fecha}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className={`${color} rounded-2xl border p-4`}>
            <div className="mb-2">{icon}</div>
            <p className="text-xs text-gray-600 font-medium leading-tight">{label}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1 leading-tight">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}
