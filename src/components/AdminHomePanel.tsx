"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package, CalendarDays, Wallet, TrendingUp, Users,
  LayoutGrid, ClipboardList, Ticket, Star, UserCog,
  Utensils, Images, BarChart2, Settings, Bell, ChevronRight,
} from "lucide-react";
import { hoyArgentina } from "@/lib/argentina-time";

const container =
  "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

type CardColor =
  | "red" | "amber" | "emerald" | "sky" | "violet"
  | "orange" | "rose" | "indigo" | "zinc" | "cyan" | "pink" | "yellow";

const colorMap: Record<CardColor, { bg: string; icon: string }> = {
  red:     { bg: "bg-red-50 dark:bg-red-500/10",           icon: "text-red-500 dark:text-red-400" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",       icon: "text-amber-500 dark:text-amber-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10",   icon: "text-emerald-600 dark:text-emerald-400" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-500/10",           icon: "text-sky-500 dark:text-sky-400" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-500/10",     icon: "text-violet-500 dark:text-violet-400" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-500/10",     icon: "text-orange-500 dark:text-orange-400" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-500/10",         icon: "text-rose-500 dark:text-rose-400" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-500/10",     icon: "text-indigo-500 dark:text-indigo-400" },
  zinc:    { bg: "bg-gray-100 dark:bg-zinc-700/30",        icon: "text-gray-500 dark:text-zinc-400" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-500/10",         icon: "text-cyan-500 dark:text-cyan-400" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-500/10",         icon: "text-pink-500 dark:text-pink-400" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-500/10",     icon: "text-yellow-500 dark:text-yellow-400" },
};

export function AdminCard({
  href, title, Icon, full, badge, badgeColor, color = "zinc",
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  full?: boolean;
  badge?: string;
  badgeColor?: "yellow" | "red" | "emerald";
  color?: CardColor;
}) {
  const badgeStyles: Record<string, string> = {
    yellow:  "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    red:     "bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  };
  const c = colorMap[color] ?? colorMap.zinc;

  return (
    <Link
      href={href}
      className={[
        full ? "col-span-2" : "",
        "group flex items-center gap-3.5",
        "bg-white dark:bg-zinc-900",
        "border border-gray-200 dark:border-zinc-800",
        "rounded-2xl px-4 py-4",
        "shadow-sm hover:shadow-md",
        "hover:border-gray-300 dark:hover:border-zinc-700",
        "transition-all duration-200 active:scale-[0.97]",
      ].join(" ")}
    >
      <div className={`shrink-0 ${c.bg} rounded-xl p-2.5`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-gray-800 dark:text-zinc-100 text-sm leading-tight">
          {title}
        </span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeStyles[badgeColor ?? "yellow"]}`}>
            {badge}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-300 shrink-0 transition-colors duration-200" />
    </Link>
  );
}

export function AdminHome() {
  const [pedidosActivos, setPedidosActivos]         = useState<any[]>([]);
  const [clientes, setClientes]                     = useState<number | null>(null);
  const [statsHoy, setStatsHoy]                     = useState<{ pedidos: number; ingresos: number } | null>(null);
  const [reservasPendientes, setReservasPendientes] = useState(0);
  const [cajaAbierta, setCajaAbierta]               = useState<boolean | null>(null);
  const [stockAlertas, setStockAlertas]             = useState(0);
  const [hora, setHora] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = setInterval(() => setHora(new Date().getHours()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/pedidos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setPedidosActivos(
          data?.filter((p: any) => ["pendiente", "preparando", "listo"].includes(p.estado)) ?? []
        );
      } catch {}
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/reservas", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const hoy = hoyArgentina();
        setReservasPendientes(
          data.filter((r: any) => r.estado === "pendiente" && r.fecha?.slice(0, 10) === hoy).length
        );
      } catch {}
    };
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/caja/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCajaAbierta(!!d.abierta))
      .catch(() => {});

    fetch("/api/superadmin/stock", { credentials: "include" })
      .then(r => r.json())
      .then((items: any[]) => {
        if (!Array.isArray(items)) return;
        setStockAlertas(
          items.filter(i => i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo).length
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    fetch(`/api/admin/estadisticas?desde=${hoyStr}&hasta=${hoyStr}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setStatsHoy({ pedidos: d.totalPedidos ?? 0, ingresos: d.totalIngresos ?? 0 });
        setClientes(d.totalUsuarios ?? null);
      })
      .catch(() => {});
  }, []);

  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const pedidosActivosCount = pedidosActivos.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div
        className={`${container} pb-14`}
        style={{ paddingBottom: "max(3.5rem, env(safe-area-inset-bottom))" }}
      >

        {/* ── Welcome banner ── */}
        <div className="relative overflow-hidden rounded-3xl mb-5 mt-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-md">
          {/* Glow detrás del logo */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-red-500 rounded-full opacity-[0.07] dark:opacity-[0.12] blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-red-200 dark:bg-red-900 rounded-full opacity-[0.06] dark:opacity-[0.08] blur-2xl pointer-events-none" />

          {/* Franja superior roja — signature element */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

          <div className="relative px-6 py-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize font-semibold tracking-wider">
                {fechaHoy}
              </p>
              <h1 className="text-[1.6rem] font-black text-gray-900 dark:text-white mt-0.5 leading-tight tracking-tight">
                {saludo}
              </h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1.5 font-medium">
                Panel · H. Morgan
              </p>
            </div>
            <div className="relative shrink-0">
              <div className="absolute -inset-3 bg-red-500 rounded-full opacity-15 dark:opacity-20 blur-xl" />
              <img
                src="/morganwhite.png"
                alt="Logo"
                className="relative h-14 w-14 object-contain drop-shadow-lg dark:drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* ── Stats 2×2 ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">

          {/* Pedidos activos */}
          <Link
            href="/admin/pedidos"
            className={`rounded-2xl p-4 transition-all active:scale-[0.97] border shadow-sm ${
              pedidosActivosCount > 0
                ? "bg-gradient-to-br from-red-500 to-rose-600 border-transparent shadow-red-200 dark:shadow-red-500/20"
                : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <Package className={`h-4 w-4 ${pedidosActivosCount > 0 ? "text-red-100" : "text-gray-400 dark:text-zinc-500"}`} />
              {pedidosActivosCount > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </div>
            <p className={`text-3xl font-black leading-none ${pedidosActivosCount > 0 ? "text-white" : "text-gray-900 dark:text-zinc-100"}`}>
              {pedidosActivosCount}
            </p>
            <p className={`text-[11px] mt-1.5 font-semibold ${pedidosActivosCount > 0 ? "text-red-100" : "text-gray-400 dark:text-zinc-500"}`}>
              Pedidos activos
            </p>
          </Link>

          {/* Reservas */}
          <Link
            href="/admin/reservas"
            className={`rounded-2xl p-4 transition-all active:scale-[0.97] border shadow-sm ${
              reservasPendientes > 0
                ? "bg-gradient-to-br from-amber-400 to-orange-500 border-transparent shadow-amber-200 dark:shadow-amber-500/20"
                : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <CalendarDays className={`h-4 w-4 ${reservasPendientes > 0 ? "text-amber-100" : "text-gray-400 dark:text-zinc-500"}`} />
              {reservasPendientes > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </div>
            <p className={`text-3xl font-black leading-none ${reservasPendientes > 0 ? "text-white" : "text-gray-900 dark:text-zinc-100"}`}>
              {reservasPendientes}
            </p>
            <p className={`text-[11px] mt-1.5 font-semibold ${reservasPendientes > 0 ? "text-amber-100" : "text-gray-400 dark:text-zinc-500"}`}>
              Reservas pendientes hoy
            </p>
          </Link>

          {/* Caja */}
          <Link
            href="/admin/caja"
            className={`rounded-2xl p-4 transition-all active:scale-[0.97] border shadow-sm ${
              cajaAbierta === true
                ? "bg-gradient-to-br from-emerald-500 to-green-600 border-transparent shadow-emerald-200 dark:shadow-emerald-500/20"
                : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <Wallet className={`h-4 w-4 ${cajaAbierta === true ? "text-emerald-100" : "text-gray-400 dark:text-zinc-500"}`} />
              {cajaAbierta === true && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </div>
            <p className={`text-xl font-black leading-none ${cajaAbierta === true ? "text-white" : "text-gray-900 dark:text-zinc-100"}`}>
              {cajaAbierta === null ? "· · ·" : cajaAbierta ? "Abierta" : "Cerrada"}
            </p>
            <p className={`text-[11px] mt-1.5 font-semibold ${cajaAbierta === true ? "text-emerald-100" : "text-gray-400 dark:text-zinc-500"}`}>
              Caja
            </p>
          </Link>

          {/* Ingresos hoy */}
          <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <TrendingUp className="h-4 w-4 text-gray-400 dark:text-zinc-500 mb-2.5" />
            <p className="text-xl font-black leading-none text-gray-900 dark:text-zinc-100">
              {statsHoy ? `$${statsHoy.ingresos.toLocaleString("es-AR")}` : "—"}
            </p>
            <p className="text-[11px] mt-1.5 font-semibold text-gray-400 dark:text-zinc-500">
              Ingresos hoy
            </p>
          </div>
        </div>

        {/* ── Clientes total ── */}
        {clientes !== null && (
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-4 py-3 mb-5 shadow-sm">
            <Users className="h-4 w-4 text-gray-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-gray-500 dark:text-zinc-400">Clientes registrados</span>
            <span className="ml-auto font-black text-gray-900 dark:text-zinc-100">{clientes}</span>
          </div>
        )}

        {/* ── Sections ── */}
        <div className="space-y-6">

          <section>
            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] px-1 mb-2.5">
              Salón
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <AdminCard href="/admin/mesas"       title="Mesas"    Icon={LayoutGrid}   color="indigo" />
              <AdminCard href="/empleado/anotador" title="Anotador" Icon={ClipboardList} color="zinc" />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] px-1 mb-2.5">
              Carta & Stock
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <AdminCard href="/admin/menu" title="Menú" Icon={Utensils} color="orange" />
              <AdminCard
                href="/admin/stock"
                title="Stock"
                Icon={Package}
                color="amber"
                badge={stockAlertas > 0 ? `${stockAlertas} bajo mínimo` : undefined}
                badgeColor="yellow"
              />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] px-1 mb-2.5">
              Clientes & Fidelidad
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <AdminCard href="/admin/clientes"   title="Clientes"       Icon={Users}   color="sky" />
              <AdminCard href="/admin/rewards"    title="Canjes"         Icon={Ticket}  color="violet" />
              <AdminCard href="/caja/retroactivo" title="Asignar puntos" Icon={Star}    color="yellow" full />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] px-1 mb-2.5">
              Comunicación & Contenido
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <AdminCard href="/admin/notificaciones" title="Notificaciones" Icon={Bell}         color="red" />
              <AdminCard href="/admin/invitaciones"   title="Invitaciones"   Icon={CalendarDays} color="cyan" />
              <AdminCard href="/admin/carrousel"      title="Fotos"          Icon={Images}       color="pink" />
              <AdminCard href="/admin/reviews"        title="Reseñas"        Icon={Star}         color="rose" />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.18em] px-1 mb-2.5">
              Gestión
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <AdminCard href="/admin/empleados"     title="Empleados"    Icon={UserCog}   color="zinc" />
              <AdminCard href="/admin/estadisticas"  title="Estadísticas" Icon={BarChart2} color="emerald" />
              <AdminCard href="/admin/configuracion" title="Ajustes"      Icon={Settings}  color="zinc" full />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
