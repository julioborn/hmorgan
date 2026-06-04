"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { TrendingUp, Package, Users, Coins, Clock, ChevronLeft, ChevronRight } from "lucide-react";

type Stats = {
    totalIngresos: number;
    totalPedidos: number;
    conteos: { pendiente: number; preparando: number; listo: number; entregado: number; cancelado: number };
    itemsPopulares: { nombre: string; cantidad: number; categoria: string }[];
    pedidosPorDia: { fecha: string; cantidad: number }[];
    ingresosPorDia: { fecha: string; total: number }[];
    horaPico: number | null;
    horasPorHora: { hora: number; cantidad: number }[];
    totalUsuarios: number;
    totalPuntos: number;
    pedidosEmpleado: number;
    pedidosCliente: number;
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
    const offset = (firstDayRaw + 6) % 7; // Monday-first

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

    return (
        <div className="space-y-6">
            {/* 4 tarjetas originales */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<TrendingUp className="w-6 h-6 text-green-600" />} label="Ingresos totales" value={`$${stats.totalIngresos.toLocaleString("es-AR")}`} color="bg-green-50 border-green-200" />
                <StatCard icon={<Package className="w-6 h-6 text-red-600" />} label="Total pedidos" value={stats.totalPedidos} color="bg-red-50 border-red-200" />
                <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} label="Clientes registrados" value={stats.totalUsuarios} color="bg-blue-50 border-blue-200" />
                <StatCard icon={<Coins className="w-6 h-6 text-yellow-600" />} label="Puntos distribuidos" value={stats.totalPuntos.toLocaleString("es-AR")} color="bg-yellow-50 border-yellow-200" />
            </div>

            {/* Estado de pedidos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-lg text-gray-900 mb-4">Estado de pedidos</h2>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                        <p className="text-2xl font-extrabold text-yellow-700">{stats.conteos.pendiente}</p>
                        <p className="text-xs text-yellow-700 font-medium">Pendientes</p>
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
                <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                    <span>Clientes: <strong>{stats.pedidosCliente}</strong></span>
                    <span>Mozos: <strong>{stats.pedidosEmpleado}</strong></span>
                    <span>Cancelados: <strong>{stats.conteos.cancelado}</strong></span>
                </div>
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

                    {/* Barras */}
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

                    {/* Etiquetas de hora separadas */}
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

            {/* Valor máximo como referencia */}
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

                {/* Etiquetas de fecha */}
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
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className={`${color} rounded-2xl border p-4`}>
            <div className="mb-2">{icon}</div>
            <p className="text-xs text-gray-600 font-medium">{label}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{value}</p>
        </div>
    );
}
