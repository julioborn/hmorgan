"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Package, Wallet, AlertTriangle, CheckCircle, MapPin, CalendarDays,
    ClipboardList, Users, Utensils, BarChart2, Settings, LayoutGrid, UserCog,
} from "lucide-react";

const container = "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

export default function SuperAdminHome() {
    const [pedidosActivos, setPedidosActivos] = useState<any[]>([]);
    const [reservasPendientes, setReservasPendientes] = useState(0);
    const [clientes, setClientes] = useState<number | null>(null);
    const [statsHoy, setStatsHoy] = useState<{ ingresos: number } | null>(null);
    const [stockAlertas, setStockAlertas] = useState(0);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [hora, setHora] = useState(() => new Date().getHours());

    useEffect(() => {
        const tick = setInterval(() => setHora(new Date().getHours()), 60000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/pedidos", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                setPedidosActivos(data?.filter((p: any) => ["pendiente", "preparando", "listo"].includes(p.estado)) ?? []);
            } catch {}
        };
        fetch_();
        const iv = setInterval(fetch_, 5000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/reservas", { credentials: "include" });
                if (!res.ok) return;
                const data = await res.json();
                const hoy = new Date().toISOString().slice(0, 10);
                setReservasPendientes(data.filter((r: any) => r.estado === "pendiente" && r.fecha?.slice(0, 10) === hoy).length);
            } catch {}
        };
        fetch_();
        const iv = setInterval(fetch_, 10000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
        fetch(`/api/admin/estadisticas?desde=${hoyStr}&hasta=${hoyStr}`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                setStatsHoy({ ingresos: d.totalIngresos ?? 0 });
                setClientes(d.totalUsuarios ?? null);
            }).catch(() => {});
    }, []);

    useEffect(() => {
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then((items: any[]) => {
                if (!Array.isArray(items)) return;
                setStockAlertas(items.filter(i => i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo).length);
            }).catch(() => {});

        fetch("/api/superadmin/caja", { credentials: "include" })
            .then(r => r.json())
            .then(data => setCajaAbierta(!!data.sesion))
            .catch(() => {});
    }, []);

    const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
    const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    const pedidosActivosCount = pedidosActivos.length;
    const pendientes = pedidosActivos.filter(p => p.estado === "pendiente").length;

    return (
        <div className={`${container} pb-10 space-y-5`} style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

            {/* Welcome */}
            <div className="rounded-2xl bg-black text-white px-5 py-5 flex items-center justify-between shadow-lg">
                <div>
                    <p className="text-sm text-gray-400 capitalize">{fechaHoy}</p>
                    <h1 className="text-xl font-extrabold mt-0.5">{saludo}</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Panel de Administración</p>
                </div>
                <img src="/morganwhite.png" alt="Logo" className="h-12 w-12 object-contain opacity-90" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                    { label: "Pedidos activos", value: pedidosActivosCount, color: pedidosActivosCount > 0 ? "text-red-600" : "text-gray-800" },
                    { label: "Reservas hoy",    value: reservasPendientes,  color: reservasPendientes > 0 ? "text-amber-600" : "text-gray-800" },
                    { label: "Clientes",        value: clientes ?? "—",     color: "text-gray-800" },
                    { label: "Ingresos hoy",    value: statsHoy ? `$${statsHoy.ingresos.toLocaleString("es-AR")}` : "—", color: "text-gray-800", small: true },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                        <p className={`font-extrabold leading-tight ${s.small ? "text-lg" : "text-2xl"} ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Live: Pedidos */}
            <Link href="/admin/pedidos"
                className="block rounded-2xl bg-red-600 text-white px-5 py-4 shadow-lg hover:bg-red-700 transition-all active:scale-[0.98]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-xl p-2.5"><Package className="h-5 w-5" /></div>
                        <div>
                            <p className="font-extrabold leading-tight">Pedidos</p>
                            <p className="text-red-100 text-sm">
                                {pedidosActivosCount === 0 ? "Sin pedidos activos"
                                    : `${pedidosActivosCount} activo${pedidosActivosCount > 1 ? "s" : ""}${pendientes > 0 ? ` · ${pendientes} pendiente${pendientes > 1 ? "s" : ""}` : ""}`}
                            </p>
                        </div>
                    </div>
                    {pedidosActivosCount > 0 && (
                        <span className="bg-white text-red-600 font-extrabold text-lg rounded-full h-9 w-9 flex items-center justify-center shadow animate-pulse">
                            {pedidosActivosCount}
                        </span>
                    )}
                </div>
            </Link>

            {/* Live: Reservas */}
            <Link href="/superadmin/reservas"
                className={`block rounded-2xl px-5 py-4 shadow-sm border transition-all active:scale-[0.98] ${
                    reservasPendientes > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2.5 ${reservasPendientes > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                            <CalendarDays className={`h-5 w-5 ${reservasPendientes > 0 ? "text-amber-600" : "text-gray-500"}`} />
                        </div>
                        <div>
                            <p className="font-extrabold text-gray-900 leading-tight">Reservas</p>
                            <p className={`text-sm ${reservasPendientes > 0 ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                                {reservasPendientes > 0
                                    ? `${reservasPendientes} pendiente${reservasPendientes > 1 ? "s" : ""} hoy`
                                    : "Sin reservas pendientes hoy"}
                            </p>
                        </div>
                    </div>
                    {reservasPendientes > 0 && (
                        <span className="bg-amber-500 text-white font-extrabold text-base rounded-full h-9 w-9 flex items-center justify-center shadow">
                            {reservasPendientes}
                        </span>
                    )}
                </div>
            </Link>

            {/* Salón */}
            <section className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Salón</p>
                <div className="grid grid-cols-2 gap-2.5">
                    <SuperCard href="/superadmin/mesas" title="Mesas" Icon={LayoutGrid} />
                    <SuperCard href="/superadmin/caja"  title="Caja"  Icon={Wallet}
                        badge={cajaAbierta === true ? "Abierta" : cajaAbierta === false ? "Cerrada" : undefined}
                        badgeColor={cajaAbierta ? "emerald" : "gray"} />
                </div>
            </section>

            {/* Stock */}
            <section className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Inventario</p>
                <SuperCard href="/superadmin/stock" title="Stock" Icon={Package}
                    badge={stockAlertas > 0 ? `${stockAlertas} bajo mínimo` : undefined}
                    badgeColor="yellow" full />
            </section>

            {/* Clientes y contenido */}
            <section className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Clientes</p>
                <div className="grid grid-cols-2 gap-2.5">
                    <SuperCard href="/admin/clientes"        title="Clientes"  Icon={Users} />
                    <SuperCard href="/admin/menu"            title="Menú"      Icon={Utensils} />
                    <SuperCard href="/superadmin/empleados"  title="Empleados" Icon={UserCog} />
                </div>
            </section>

            {/* Herramientas */}
            <section className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Herramientas</p>
                <div className="grid grid-cols-2 gap-2.5">
                    <SuperCard href="/admin/estadisticas"  title="Estadísticas" Icon={BarChart2} />
                    <SuperCard href="/admin/configuracion" title="Ajustes"      Icon={Settings} />
                </div>
            </section>
        </div>
    );
}

function SuperCard({
    href, title, Icon, badge, badgeColor, full,
}: {
    href: string;
    title: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    badge?: string;
    badgeColor?: "emerald" | "gray" | "yellow" | "red";
    full?: boolean;
}) {
    const badgeStyles: Record<string, string> = {
        emerald: "bg-emerald-100 text-emerald-700",
        gray:    "bg-gray-100 text-gray-500",
        yellow:  "bg-yellow-100 text-yellow-700",
        red:     "bg-red-100 text-red-600",
    };
    return (
        <Link
            href={href}
            className={`${full ? "col-span-2" : ""} flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm hover:shadow-md hover:border-red-200 hover:bg-red-50 transition-all active:scale-[0.97] group`}
        >
            <div className="bg-gray-100 group-hover:bg-red-100 rounded-xl p-2.5 transition-colors">
                <Icon className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
            </div>
            <div className="min-w-0">
                <span className="font-semibold text-gray-800 group-hover:text-red-700 text-sm transition-colors">{title}</span>
                {badge && (
                    <p className={`text-[10px] font-semibold mt-0.5 ${badgeStyles[badgeColor ?? "gray"]}`}>{badge}</p>
                )}
            </div>
        </Link>
    );
}
