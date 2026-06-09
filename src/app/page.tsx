"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const BarMap = dynamic(() => import("@/components/BarMap"), { ssr: false });
import { QrCode, Users, Bell, PackagePlus, Package, Utensils, Ticket, History, ScanQrCode, ScanText, Settings, Star, BarChart2, ClipboardList, LayoutGrid, Images, CalendarDays, Wallet, MapPin, TrendingUp, UserCog } from "lucide-react";
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
    if (!loading && user?.role === "superadmin") router.replace("/admin");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={`${container} py-10 flex justify-center`}>
        <Loader size={64} />
      </div>
    );
  }

  if (!user) return <Landing />;

  if (user.role === "cajero") { if (typeof window !== "undefined") window.location.replace("/caja"); return null; }
  if (user.role === "admin" || user.role === "superadmin") return <AdminHome />;
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
          href="/cliente/pedidos"
          title="Pedir"
          Icon={PackagePlus}
          accent="from-red-600 to-red-800"
          disabled={!pedidosActivos}
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
                <div className="aspect-[4/3] shadow-lg relative overflow-hidden">
                  <img
                    src={img.url}
                    alt="Foto del bar"
                    className="w-full h-full object-cover"
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
  const [cajaAbierta, setCajaAbierta]       = useState<boolean | null>(null);
  const [stockAlertas, setStockAlertas]     = useState(0);
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
    <div className="min-h-screen" style={{ background: "#0a0a0a", paddingBottom: "max(3.5rem, env(safe-area-inset-bottom))" }}>
      <div className={container}>

        {/* ── Greeting ── */}
        <div className="pt-7 pb-6 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] capitalize" style={{ color: "#444" }}>{fechaHoy}</p>
          <h1 className="text-[2rem] font-black leading-tight tracking-tight mt-1" style={{ color: "#f0f0f0" }}>{saludo}</h1>
          <p className="text-xs mt-1.5 font-medium" style={{ color: "#3a3a3a" }}>H. Morgan · Panel de control</p>
        </div>

        {/* ── KPI grid ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">

          {/* Pedidos */}
          <Link href="/admin/pedidos" className="rounded-2xl p-4 relative overflow-hidden active:scale-[0.97] transition-transform" style={{
            background: pedidosActivosCount > 0 ? "linear-gradient(135deg, #1a0505 0%, #2a0808 100%)" : "#111",
            border: pedidosActivosCount > 0 ? "1px solid #4a0f0f" : "1px solid #1c1c1c",
          }}>
            {pedidosActivosCount > 0 && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(239,68,68,0.15) 0%, transparent 60%)" }} />}
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg p-1.5" style={{ background: pedidosActivosCount > 0 ? "rgba(239,68,68,0.15)" : "#1c1c1c" }}>
                <Package className="h-3.5 w-3.5" style={{ color: pedidosActivosCount > 0 ? "#f87171" : "#444" }} />
              </div>
              {pedidosActivosCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            </div>
            <p className="text-3xl font-black leading-none" style={{ color: pedidosActivosCount > 0 ? "#f87171" : "#2a2a2a" }}>{pedidosActivosCount}</p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: pedidosActivosCount > 0 ? "#7f1d1d" : "#2a2a2a" }}>Pedidos activos</p>
          </Link>

          {/* Reservas */}
          <Link href="/admin/reservas" className="rounded-2xl p-4 relative overflow-hidden active:scale-[0.97] transition-transform" style={{
            background: reservasPendientes > 0 ? "linear-gradient(135deg, #1a1000 0%, #291800 100%)" : "#111",
            border: reservasPendientes > 0 ? "1px solid #4a2e00" : "1px solid #1c1c1c",
          }}>
            {reservasPendientes > 0 && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(245,158,11,0.15) 0%, transparent 60%)" }} />}
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg p-1.5" style={{ background: reservasPendientes > 0 ? "rgba(245,158,11,0.15)" : "#1c1c1c" }}>
                <CalendarDays className="h-3.5 w-3.5" style={{ color: reservasPendientes > 0 ? "#fbbf24" : "#444" }} />
              </div>
              {reservasPendientes > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-3xl font-black leading-none" style={{ color: reservasPendientes > 0 ? "#fbbf24" : "#2a2a2a" }}>{reservasPendientes}</p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: reservasPendientes > 0 ? "#78350f" : "#2a2a2a" }}>Reservas hoy</p>
          </Link>

          {/* Caja */}
          <Link href="/admin/caja" className="rounded-2xl p-4 relative overflow-hidden active:scale-[0.97] transition-transform" style={{
            background: cajaAbierta === true ? "linear-gradient(135deg, #001a0e 0%, #002918 100%)" : "#111",
            border: cajaAbierta === true ? "1px solid #064e3b" : "1px solid #1c1c1c",
          }}>
            {cajaAbierta === true && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(16,185,129,0.15) 0%, transparent 60%)" }} />}
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg p-1.5" style={{ background: cajaAbierta === true ? "rgba(16,185,129,0.15)" : "#1c1c1c" }}>
                <Wallet className="h-3.5 w-3.5" style={{ color: cajaAbierta === true ? "#34d399" : "#444" }} />
              </div>
              {cajaAbierta === true && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <p className="text-xl font-black leading-none" style={{ color: cajaAbierta === true ? "#34d399" : "#2a2a2a" }}>
              {cajaAbierta === null ? "· · ·" : cajaAbierta ? "Abierta" : "Cerrada"}
            </p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: cajaAbierta === true ? "#064e3b" : "#2a2a2a" }}>Caja</p>
          </Link>

          {/* Ingresos */}
          <div className="rounded-2xl p-4" style={{ background: "#111", border: "1px solid #1c1c1c" }}>
            <div className="rounded-lg p-1.5 w-fit mb-3" style={{ background: "#1c1c1c" }}>
              <TrendingUp className="h-3.5 w-3.5" style={{ color: "#444" }} />
            </div>
            <p className="text-xl font-black leading-none" style={{ color: statsHoy && statsHoy.ingresos > 0 ? "#e5e5e5" : "#2a2a2a" }}>
              {statsHoy ? `$${statsHoy.ingresos.toLocaleString("es-AR")}` : "—"}
            </p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: "#2a2a2a" }}>Ingresos hoy</p>
          </div>
        </div>

        {/* ── Clientes strip ── */}
        {clientes !== null && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-7" style={{ background: "#111", border: "1px solid #1c1c1c" }}>
            <Users className="h-4 w-4 shrink-0" style={{ color: "#333" }} />
            <span className="text-sm font-medium" style={{ color: "#333" }}>Clientes registrados</span>
            <span className="ml-auto font-black text-sm" style={{ color: "#888" }}>{clientes}</span>
          </div>
        )}

        {/* ── Salón ── */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-1 mb-2.5" style={{ color: "#2a2a2a" }}>Salón</p>
          <div className="grid grid-cols-2 gap-2">
            <AdminCard href="/admin/mesas"       title="Mesas"    Icon={LayoutGrid}   iconBg="#1a1a2e" iconColor="#818cf8" />
            <AdminCard href="/empleado/anotador" title="Anotador" Icon={ClipboardList} iconBg="#1a1a2e" iconColor="#818cf8" />
          </div>
        </div>

        {/* ── Inventario ── */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-1 mb-2.5" style={{ color: "#2a2a2a" }}>Inventario</p>
          <AdminCard href="/admin/stock" title="Stock" Icon={Package} iconBg="#1c1400" iconColor="#fbbf24"
            badge={stockAlertas > 0 ? `${stockAlertas} bajo mínimo` : undefined}
            badgeColor="yellow" full />
        </div>

        {/* ── Clientes ── */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-1 mb-2.5" style={{ color: "#2a2a2a" }}>Clientes</p>
          <div className="grid grid-cols-2 gap-2">
            <AdminCard href="/admin/scan"         title="Puntos"    Icon={ScanQrCode} iconBg="#1a0d2e" iconColor="#c084fc" />
            <AdminCard href="/admin/rewards/scan" title="Canjes"    Icon={ScanText}   iconBg="#1a0d2e" iconColor="#c084fc" />
            <AdminCard href="/admin/clientes"     title="Clientes"  Icon={Users}      iconBg="#1a0d2e" iconColor="#c084fc" />
            <AdminCard href="/admin/rewards"      title="Programa"  Icon={Ticket}     iconBg="#1a0d2e" iconColor="#c084fc" />
            <AdminCard href="/admin/empleados"    title="Empleados" Icon={UserCog}    iconBg="#1a0d2e" iconColor="#c084fc" />
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-1 mb-2.5" style={{ color: "#2a2a2a" }}>Contenido</p>
          <div className="grid grid-cols-2 gap-2">
            <AdminCard href="/admin/menu"      title="Menú"    Icon={Utensils} iconBg="#001a2e" iconColor="#38bdf8" />
            <AdminCard href="/admin/reviews"   title="Reseñas" Icon={Star}    iconBg="#001a2e" iconColor="#38bdf8" />
            <AdminCard href="/admin/carrousel" title="Fotos"   Icon={Images}  iconBg="#001a2e" iconColor="#38bdf8" />
          </div>
        </div>

        {/* ── Herramientas ── */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-1 mb-2.5" style={{ color: "#2a2a2a" }}>Herramientas</p>
          <div className="grid grid-cols-2 gap-2">
            <AdminCard href="/admin/estadisticas"  title="Estadísticas"   Icon={BarChart2} iconBg="#001a14" iconColor="#2dd4bf" />
            <AdminCard href="/admin/configuracion" title="Ajustes"        Icon={Settings}  iconBg="#001a14" iconColor="#2dd4bf" />
          </div>
          <div className="mt-2">
            <AdminCard href="/admin/notificaciones" title="Notificaciones" Icon={Bell} iconBg="#001a14" iconColor="#2dd4bf" full />
          </div>
        </div>

      </div>
    </div>
  );
}

function AdminCard({
  href, title, Icon, full, badge, badgeColor, iconBg = "#1c1c1c", iconColor = "#555",
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  full?: boolean;
  badge?: string;
  badgeColor?: "yellow" | "red" | "emerald";
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <Link
      href={href}
      className={`${full ? "col-span-2" : ""} group flex items-center gap-3.5 rounded-2xl px-4 py-4 active:scale-[0.97] transition-all`}
      style={{ background: "#111", border: "1px solid #1c1c1c" }}
    >
      <div className="shrink-0 rounded-xl p-2.5 transition-all" style={{ background: iconBg }}>
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-sm leading-tight transition-colors" style={{ color: "#888" }}>{title}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
            background: badgeColor === "yellow" ? "rgba(251,191,36,0.15)" : badgeColor === "red" ? "rgba(239,68,68,0.15)" : "rgba(52,211,153,0.15)",
            color: badgeColor === "yellow" ? "#fbbf24" : badgeColor === "red" ? "#f87171" : "#34d399",
          }}>
            {badge}
          </span>
        )}
      </div>
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
