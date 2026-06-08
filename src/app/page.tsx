"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const BarMap = dynamic(() => import("@/components/BarMap"), { ssr: false });
import { QrCode, Users, Bell, PackagePlus, Package, Utensils, Ticket, History, ScanQrCode, ScanText, Settings, Star, BarChart2, ClipboardList, LayoutGrid, Images, CalendarDays, Wallet, MapPin, TrendingUp } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Loader from "@/components/Loader";

const container =
  "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

type Reward = {
  _id: string;
  titulo: string;
  descripcion?: string;
  puntos: number;
  tema?: string;
};

type CarouselImg = { _id: string; url: string };

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === "superadmin") router.replace("/superadmin");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={`${container} py-10 flex justify-center`}>
        <Loader size={64} />
      </div>
    );
  }

  if (!user) return <Landing />;

  if (user.role === "superadmin") return null;
  if (user.role === "cajero") { if (typeof window !== "undefined") window.location.replace("/caja"); return null; }
  if (user.role === "admin") return <AdminHome />;
  if (user.role === "empleado") return <EmployeeHome nombre={user.nombre} />;
  return <ClientHome nombre={user.nombre} puntos={user.puntos ?? 0} />;
}

/* =========================
  LANDING (no logueado)
   ========================= */
function Landing() {
  return (
    <div
      className={`${container} pt-4 pb-12 lg:pt-6 lg:pb-16 space-y-8 relative`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {/* Fondo decorativo: solo arriba */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-3xl animate-pulse -translate-x-1/2" />
      </div>

      {/* Hero principal */}
      <section className="text-center space-y-3">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          Bienvenido
        </h1>
        <p className="text-red-600 font-semibold text-base sm:text-lg">
          ¡Mejorá tu experiencia en el bar!
        </p>
      </section>

      {/* Card de acceso */}
      <section className="flex justify-center">
        <div className="w-full max-w-xs flex flex-col gap-3 px-2">
          <Link
            href="/login"
            className="w-full text-center px-5 py-3.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition shadow-lg hover:scale-105"
          >
            Ingresar
          </Link>
          <Link
            href="/register"
            className="w-full text-center px-5 py-3.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-lg hover:scale-105"
          >
            Crear cuenta
          </Link>
          <Link
            href="/menu"
            className="w-full text-center px-5 py-3.5 rounded-xl bg-gray-200 text-black font-semibold hover:bg-gray-300 transition shadow-lg hover:scale-105"
          >
            Menú
          </Link>
        </div>
      </section>
    </div>
  );
}

/* =========================
  HOME CLIENTE
   ========================= */
function ClientHome({ nombre, puntos }: { nombre?: string; puntos: number }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImg[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [pedidosActivosCount, setPedidosActivosCount] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(true);
  const [reservasActivas, setReservasActivas] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await fetch("/api/rewards", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setRewards(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error cargando recompensas:", e);
      } finally {
        setLoadingRewards(false);
      }
    };

    const fetchCarousel = async () => {
      try {
        const res = await fetch("/api/carousel", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setCarouselImages(Array.isArray(data) ? data : []);
      } catch {
        // silencioso
      }
    };

    fetchRewards();
    fetchCarousel();
  }, []);

  useEffect(() => {
    fetch("/api/config/pedidos", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setPedidosActivos(data.activo); });
    fetch("/api/config/reservas", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setReservasActivas(data.activo ?? true); });
  }, []);

  if (loadingRewards) {
    return (
      <div className={`${container} py-10 flex justify-center`}>
        <Loader size={64} />
      </div>
    );
  }

  return (
    <div
      className={`${container} py-8 space-y-8`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >

      {/* Saludo + puntos */}
      <div className="flex items-center justify-between px-1">
        <p className="text-base text-gray-500">
          Hola, <span className="font-bold text-black">{nombre}</span>
        </p>
        <span className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-full">
          ★ {puntos} pts
        </span>
      </div>

      {/* Carrusel de recompensas */}
      {rewards.length > 0 && (
      <section className="relative">
        <div className="relative rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 shadow-xl p-5 border border-gray-200">
          <>

              {/* Swiper */}
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{
                  delay: 3250,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: false,
                }}
                speed={1250}
                loop={true}
                spaceBetween={16}
                slidesPerView={1.1}
                pagination={{
                  clickable: true,
                  dynamicBullets: true,
                }}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
              >
                {rewards.map((r) => (
                  <SwiperSlide key={r._id}>
                    {r.tema === "argentina" ? (
                      <div
                        className="relative rounded-2xl border-2 border-[#74ACDF] h-44 flex flex-col justify-between overflow-hidden shadow-lg"
                        style={{ background: "repeating-linear-gradient(90deg,#74ACDF 0px,#74ACDF 26px,white 26px,white 52px)" }}
                      >
                        <div className="absolute inset-0 bg-white/55" />
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />
                        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />
                        <div className="relative z-10 p-4 flex flex-col h-full justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-400 text-base drop-shadow">★★★</span>
                            <span className="text-[9px] font-black text-white bg-[#003DA5] px-2 py-0.5 rounded-full uppercase tracking-widest">Mundial 2026</span>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#003DA5] line-clamp-2">{r.titulo}</h3>
                            {r.descripcion && <p className="text-xs text-[#003DA5]/70 line-clamp-1 mt-0.5">{r.descripcion}</p>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-white bg-[#003DA5] px-2.5 py-1 rounded-full">{r.puntos} pts</span>
                            <span className="text-2xl">⚽</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 h-44 flex flex-col justify-between overflow-hidden">
                        <div className="flex-1 flex flex-col justify-between">
                          <h3 className="font-extrabold text-base md:text-lg line-clamp-2">{r.titulo}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{r.descripcion || "Canje"}</p>
                          <span className="text-sm font-semibold text-red-600">{r.puntos} pts</span>
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <img src="/icon-192x192.png" alt="Logo" className="h-8 w-8 object-contain opacity-70" />
                        </div>
                        <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                        <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/cliente/rewards"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                >
                  Ver todos los canjes
                </Link>
              </div>
          </>
        </div>
      </section>
      )}

      {/* Botonera */}
      <div className="grid grid-cols-2 gap-4">
        <ActionCard
          href="/cliente/qr"
          title="Mi QR"
          Icon={QrCode}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/cliente/menu"
          title="Menú"
          Icon={Utensils}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/cliente/pedidos"
          title="Pedir"
          Icon={PackagePlus}
          accent="from-red-600 to-red-800"
          disabled={!pedidosActivos}
        />
        <ActionCard
          href="/cliente/mis-pedidos"
          title="Pedidos"
          Icon={Package}
          accent="from-red-600 to-red-800"
          notificationCount={pedidosActivosCount}
        />
        <ActionCard
          href="/cliente/rewards"
          title="Canjes"
          Icon={Ticket}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/cliente/reservas"
          title="Reservas"
          Icon={CalendarDays}
          accent="from-red-600 to-red-800"
          disabled={!reservasActivas}
        />
      </div>

      {/* 👇 Invitación a la ruleta */}
      <Link
        href="/cliente/ruleta"
        className="block w-full rounded-2xl bg-black text-white text-center p-6 shadow-xl hover:scale-[1.02] hover:shadow-red-500/30 transition-all duration-300"
      >
        <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
          ¿No sabés qué tomar?
        </h2>
        <p className="opacity-90 text-sm sm:text-base">
          Dejalo en manos de la suerte con nuestra <span className="font-bold">Ruleta de Tragos</span>
        </p>
      </Link>

      {/* Carrusel de fotos del bar */}
      {carouselImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-center tracking-tight">Nuestro bar</h2>
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            speed={900}
            loop={carouselImages.length > 1}
            spaceBetween={12}
            slidesPerView={1.05}
            centeredSlides={true}
            pagination={{ clickable: true, dynamicBullets: true }}
            breakpoints={{ 640: { slidesPerView: 1.4 }, 1024: { slidesPerView: 2 } }}
            className="!pb-8"
          >
            {carouselImages.map((img) => (
              <SwiperSlide key={img._id}>
                <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-lg relative">
                  <img
                    src={img.url}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl brightness-75 pointer-events-none"
                  />
                  <img
                    src={img.url}
                    alt="Foto del bar"
                    className="relative w-full h-full object-contain"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      )}

      {/* Ubicación */}
      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-extrabold text-center tracking-tight">¿Dónde estamos?</h2>
        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 h-56 sm:h-72">
          <BarMap />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-sm text-gray-500 text-center sm:text-left">
            San Martín y Blvd. Belgrano, Calchaquí, Santa Fe
          </p>
          <a
            href="https://maps.google.com/?q=H.+MORGAN+Calchaqui+Santa+Fe+Argentina"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow"
          >
            Cómo llegar
          </a>
        </div>
      </section>
    </div>
  );
}

/* =========================
  HOME ADMIN
   ========================= */
function AdminHome() {
  const [pedidosActivos, setPedidosActivos] = useState<any[]>([]);
  const [clientes, setClientes]             = useState<number | null>(null);
  const [statsHoy, setStatsHoy]             = useState<{ pedidos: number; ingresos: number } | null>(null);
  const [reservasPendientes, setReservasPendientes] = useState(0);
  const [hora, setHora] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = setInterval(() => setHora(new Date().getHours()), 60000);
    return () => clearInterval(tick);
  }, []);

  // Pedidos en tiempo real
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

  // Reservas pendientes hoy en tiempo real
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

  // Stats del día
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
          { label: "Reservas hoy",    value: reservasPendientes,  color: reservasPendientes > 0  ? "text-amber-600" : "text-gray-800" },
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

      {/* Live: Reservas (solo stat, sin link a superadmin) */}
      <div className={`block rounded-2xl px-5 py-4 shadow-sm border ${
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
      </div>

      {/* Salón */}
      <section className="space-y-2.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Salón</p>
        <div className="grid grid-cols-2 gap-2.5">
          <AdminCard href="/admin/mesas"        title="Mesas"    Icon={LayoutGrid} />
          <AdminCard href="/empleado/anotador"  title="Anotador" Icon={ClipboardList} />
        </div>
      </section>

      {/* Clientes */}
      <section className="space-y-2.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Clientes</p>
        <div className="grid grid-cols-2 gap-2.5">
          <AdminCard href="/admin/scan"         title="Escanear Puntos" Icon={ScanQrCode} />
          <AdminCard href="/admin/rewards/scan" title="Escanear Canjes" Icon={ScanText} />
          <AdminCard href="/admin/clientes"     title="Clientes"        Icon={Users} />
          <AdminCard href="/admin/rewards"      title="Canjes"          Icon={Ticket} />
        </div>
      </section>

      {/* Contenido */}
      <section className="space-y-2.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Contenido</p>
        <div className="grid grid-cols-2 gap-2.5">
          <AdminCard href="/admin/menu"      title="Menú"    Icon={Utensils} />
          <AdminCard href="/admin/reviews"   title="Reseñas" Icon={Star} />
          <AdminCard href="/admin/carrousel" title="Fotos"   Icon={Images} />
        </div>
      </section>

      {/* Herramientas */}
      <section className="space-y-2.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Herramientas</p>
        <div className="grid grid-cols-2 gap-2.5">
          <AdminCard href="/admin/estadisticas"  title="Estadísticas" Icon={BarChart2} />
          <AdminCard href="/admin/configuracion" title="Ajustes"      Icon={Settings} />
        </div>
        <AdminCard href="/admin/notificaciones" title="Notificaciones" Icon={Bell} full />
      </section>
    </div>
  );
}

function AdminCard({
  href, title, Icon, full,
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  full?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${full ? "col-span-2" : ""} flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm hover:shadow-md hover:border-red-200 hover:bg-red-50 transition-all active:scale-[0.97] group`}
    >
      <div className="bg-gray-100 group-hover:bg-red-100 rounded-xl p-2.5 transition-colors">
        <Icon className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
      </div>
      <span className="font-semibold text-gray-800 group-hover:text-red-700 text-sm transition-colors">{title}</span>
    </Link>
  );
}

/* =========================
  HOME EMPLEADO
   ========================= */
function EmployeeHome({ nombre }: { nombre?: string }) {
  const [hora, setHora] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = setInterval(() => setHora(new Date().getHours()), 60000);
    return () => clearInterval(tick);
  }, []);

  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div
      className={`${container} pb-10 space-y-6`}
      style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* ── Header ── */}
      <div className="rounded-2xl bg-black text-white px-5 py-6 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-sm text-gray-400 capitalize">{fechaHoy}</p>
          <h1 className="text-2xl font-extrabold mt-0.5">
            {saludo}{nombre ? `, ${nombre}` : ""}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Panel de Empleado</p>
        </div>
        <img src="/morganwhite.png" alt="Logo" className="h-14 w-14 object-contain opacity-90" />
      </div>

      {/* ── Acción principal ── */}
      <Link
        href="/empleado/anotador"
        className="block rounded-2xl bg-red-600 text-white px-5 py-5 shadow-lg hover:bg-red-700 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2.5">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-lg leading-tight">Anotador de Pedidos</p>
            <p className="text-red-100 text-sm">Tomá pedidos de las mesas</p>
          </div>
        </div>
      </Link>

      {/* ── Acciones ── */}
      <section className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Acciones</p>
        <div className="grid grid-cols-2 gap-3">
          <AdminCard href="/admin/scan" title="Escanear Puntos" Icon={ScanQrCode} />
          <AdminCard href="/admin/rewards/scan" title="Escanear Canjes" Icon={ScanText} />
          <AdminCard href="/admin/rewards" title="Canjes" Icon={Ticket} />
          <AdminCard href="/menu" title="Menú" Icon={Utensils} />
        </div>
      </section>
    </div>
  );
}

/* =========================
  CARD ESTILO BOTONERA
   ========================= */
function ActionCard({
  href,
  title,
  Icon,
  accent,
  disabled,
  notificationCount,
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  disabled?: boolean;
  notificationCount?: number;
}) {
  const content = (
    <div
      className={`group relative flex flex-col items-center justify-center
                  rounded-2xl border border-gray-200
                  p-6 sm:p-8 min-h-[140px] lg:min-h-[160px]
                  bg-gradient-to-br ${accent || "from-gray-100 to-gray-200"}
                  hover:scale-105 hover:shadow-xl hover:shadow-red-500/30
                  transition-all duration-300 text-white`}
    >
      <Icon className="h-10 w-10 lg:h-12 lg:w-12 mb-3 opacity-95" aria-hidden />
      {(notificationCount ?? 0) > 0 && (
        <span
          className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ring-2 ring-white shadow-md animate-pulse"
        >
          {notificationCount}
        </span>
      )}
      <div className="text-base lg:text-lg font-extrabold text-center tracking-wide">
        {title}
      </div>
    </div>
  );

  if (disabled) return <div className="opacity-50 cursor-not-allowed">{content}</div>;

  return (
    <Link
      href={href}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl"
    >
      {content}
    </Link>
  );
}
