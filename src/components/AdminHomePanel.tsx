"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package, CalendarDays, Wallet, TrendingUp, Users,
  LayoutGrid, ClipboardList, ScanQrCode, ScanText,
  Ticket, Star, UserCog, Utensils, Images, BarChart2,
  Settings, Bell, Receipt,
} from "lucide-react";
import { hoyArgentina } from "@/lib/argentina-time";

const container =
  "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

export function AdminCard({
  href, title, Icon, full, badge, badgeColor,
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  full?: boolean;
  badge?: string;
  badgeColor?: "yellow" | "red" | "emerald";
}) {
  const badgeStyles: Record<string, string> = {
    yellow:  "bg-amber-100 text-amber-700",
    red:     "bg-red-100 text-red-600",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Link
      href={href}
      className={`${full ? "col-span-2" : ""} group relative flex items-center gap-3.5 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.97] overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="relative shrink-0 bg-gray-100 group-hover:bg-gray-900 rounded-xl p-2.5 transition-all duration-200">
        <Icon className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors duration-200" />
      </div>
      <div className="relative min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-gray-800 text-sm leading-tight">{title}</span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeStyles[badgeColor ?? "yellow"]}`}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export function AdminHome() {
  const [pedidosActivos, setPedidosActivos] = useState<any[]>([]);
  const [clientes, setClientes]             = useState<number | null>(null);
  const [statsHoy, setStatsHoy]             = useState<{ pedidos: number; ingresos: number } | null>(null);
  const [reservasPendientes, setReservasPendientes] = useState(0);
  const [cajaAbierta, setCajaAbierta]       = useState<boolean | null>(null);
  const [stockAlertas, setStockAlertas]     = useState(0);
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
        const hoy = hoyArgentina();
        setReservasPendientes(data.filter((r: any) => r.estado === "pendiente" && r.fecha?.slice(0, 10) === hoy).length);
      } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 10000);
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
        setStockAlertas(items.filter(i => i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo).length);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
    fetch(`/api/admin/estadisticas?desde=${hoyStr}&hasta=${hoyStr}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setStatsHoy({ pedidos: d.totalPedidos ?? 0, ingresos: d.totalIngresos ?? 0 });
        setClientes(d.totalUsuarios ?? null);
      }).catch(() => {});
  }, []);

  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const pedidosActivosCount = pedidosActivos.length;

  return (
    <div className={`${container} pb-14`} style={{ paddingBottom: "max(3.5rem, env(safe-area-inset-bottom))" }}>

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden rounded-3xl mb-5 shadow-xl" style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 60%, #111 100%)" }}>
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-red-600 rounded-full opacity-[0.12] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-900 rounded-full opacity-[0.08] blur-2xl pointer-events-none" />
        <div className="relative px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 capitalize font-semibold tracking-wider">{fechaHoy}</p>
            <h1 className="text-[1.6rem] font-black text-white mt-0.5 leading-tight tracking-tight">{saludo}</h1>
            <p className="text-[11px] text-gray-600 mt-1.5 font-medium">Panel · H. Morgan</p>
          </div>
          <div className="relative shrink-0">
            <div className="absolute -inset-3 bg-red-600 rounded-full opacity-20 blur-xl" />
            <img src="/morganwhite.png" alt="Logo" className="relative h-14 w-14 object-contain drop-shadow-2xl" />
          </div>
        </div>
      </div>

      {/* ── Stats 2×2 ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/admin/pedidos" className={`rounded-2xl p-4 transition-all active:scale-[0.97] ${
          pedidosActivosCount > 0
            ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-lg shadow-red-500/25"
            : "bg-white border border-gray-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <Package className={`h-4 w-4 ${pedidosActivosCount > 0 ? "text-red-200" : "text-gray-400"}`} />
            {pedidosActivosCount > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </div>
          <p className={`text-3xl font-black leading-none ${pedidosActivosCount > 0 ? "text-white" : "text-gray-900"}`}>
            {pedidosActivosCount}
          </p>
          <p className={`text-[11px] mt-1.5 font-semibold ${pedidosActivosCount > 0 ? "text-red-100" : "text-gray-400"}`}>
            Pedidos activos
          </p>
        </Link>

        <Link href="/admin/reservas" className={`rounded-2xl p-4 transition-all active:scale-[0.97] ${
          reservasPendientes > 0
            ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25"
            : "bg-white border border-gray-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <CalendarDays className={`h-4 w-4 ${reservasPendientes > 0 ? "text-amber-200" : "text-gray-400"}`} />
            {reservasPendientes > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </div>
          <p className={`text-3xl font-black leading-none ${reservasPendientes > 0 ? "text-white" : "text-gray-900"}`}>
            {reservasPendientes}
          </p>
          <p className={`text-[11px] mt-1.5 font-semibold ${reservasPendientes > 0 ? "text-amber-100" : "text-gray-400"}`}>
            Reservas hoy
          </p>
        </Link>

        <Link href="/admin/caja" className={`rounded-2xl p-4 transition-all active:scale-[0.97] ${
          cajaAbierta === true
            ? "bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg shadow-emerald-500/25"
            : "bg-white border border-gray-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <Wallet className={`h-4 w-4 ${cajaAbierta === true ? "text-emerald-200" : "text-gray-400"}`} />
            {cajaAbierta === true && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </div>
          <p className={`text-xl font-black leading-none ${cajaAbierta === true ? "text-white" : "text-gray-900"}`}>
            {cajaAbierta === null ? "· · ·" : cajaAbierta ? "Abierta" : "Cerrada"}
          </p>
          <p className={`text-[11px] mt-1.5 font-semibold ${cajaAbierta === true ? "text-emerald-100" : "text-gray-400"}`}>
            Caja
          </p>
        </Link>

        <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
          <TrendingUp className="h-4 w-4 text-gray-400 mb-2.5" />
          <p className="text-xl font-black leading-none text-gray-900">
            {statsHoy ? `$${statsHoy.ingresos.toLocaleString("es-AR")}` : "—"}
          </p>
          <p className="text-[11px] mt-1.5 font-semibold text-gray-400">Ingresos hoy</p>
        </div>
      </div>

      {/* ── Clientes total ── */}
      {clientes !== null && (
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm mb-5">
          <Users className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500">Clientes registrados</span>
          <span className="ml-auto font-black text-gray-900">{clientes}</span>
        </div>
      )}

      {/* ── Sections ── */}
      <div className="space-y-6">
        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Salón</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/mesas"        title="Mesas"    Icon={LayoutGrid} />
            <AdminCard href="/empleado/anotador"  title="Anotador" Icon={ClipboardList} />
            <AdminCard href="/admin/cobrar" title="Cobrar" Icon={Receipt} full
              badge={pedidosActivosCount > 0 ? `${pedidosActivosCount} activos` : undefined}
              badgeColor="red" />
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Inventario</p>
          <AdminCard href="/admin/stock" title="Stock" Icon={Package}
            badge={stockAlertas > 0 ? `${stockAlertas} bajo mínimo` : undefined}
            badgeColor="yellow" full />
        </section>

        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Clientes</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/scan"         title="Escanear Puntos" Icon={ScanQrCode} />
            <AdminCard href="/admin/rewards/scan" title="Escanear Canjes" Icon={ScanText} />
            <AdminCard href="/admin/clientes"     title="Clientes"        Icon={Users} />
            <AdminCard href="/admin/rewards"      title="Canjes"          Icon={Ticket} />
            <AdminCard href="/caja/retroactivo"   title="Asignar puntos"  Icon={Star} />
            <AdminCard href="/admin/empleados"    title="Empleados"       Icon={UserCog} />
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Contenido</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/menu"      title="Menú"    Icon={Utensils} />
            <AdminCard href="/admin/reviews"   title="Reseñas" Icon={Star} />
            <AdminCard href="/admin/carrousel" title="Fotos"   Icon={Images} />
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Herramientas</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/estadisticas"  title="Estadísticas" Icon={BarChart2} />
            <AdminCard href="/admin/configuracion" title="Ajustes"      Icon={Settings} />
          </div>
          <div className="mt-2.5">
            <AdminCard href="/admin/notificaciones" title="Notificaciones" Icon={Bell} full />
          </div>
        </section>
      </div>
    </div>
  );
}
