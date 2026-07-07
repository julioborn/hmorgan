"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { hoyArgentina } from "@/lib/argentina-time";
import { swalBase } from "@/lib/swalConfig";

const BarMap = dynamic(() => import("@/components/BarMap"), { ssr: false });
import { QrCode, Users, Bell, PackagePlus, Package, Utensils, Ticket, History, ScanQrCode, ScanText, Settings, Star, BarChart2, ClipboardList, LayoutGrid, Images, CalendarDays, Wallet, TrendingUp, UserCog, Truck, Gift, X, Clock, Tablet } from "lucide-react";
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
  if (user.role === "delivery") { if (typeof window !== "undefined") window.location.replace("/delivery"); return null; }
  if (user.role === "cocina") { if (typeof window !== "undefined") window.location.replace("/cocina"); return null; }
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
            className="w-full text-center px-5 py-3.5 rounded-xl bg-black text-white font-semibold transition shadow-lg hover:scale-105"
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
type MenuDelDiaItem = { _id: string; nombre: string; descripcion?: string; precio: number };

function ClientHome({ nombre, puntos }: { nombre?: string; puntos: number }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImg[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [menuDelDia, setMenuDelDia] = useState<MenuDelDiaItem[]>([]);
  const [menuDelDiaLoading, setMenuDelDiaLoading] = useState(true);
  const [menuDelDiaTiene, setMenuDelDiaTiene] = useState(false);
  const [pedidosActivosCount, setPedidosActivosCount] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(true);
  const [reservasActivas, setReservasActivas] = useState(true);
  const [repartidorAfuera, setRepartidorAfuera] = useState(false);
  const [canjeModal, setCanjeModal] = useState<Reward | null>(null);
  const [canjeSolicitando, setCanjeSolicitando] = useState(false);
  const [canjeSolicitados, setCanjeSolicitados] = useState<Set<string>>(new Set());

  async function solicitarCanje(r: Reward) {
    if (puntos < r.puntos) {
      await swalBase.fire({ title: "Puntos insuficientes", text: `Necesitás ${r.puntos} pts y tenés ${puntos} pts.`, icon: "warning" });
      return;
    }
    const confirm = await swalBase.fire({ title: `Canjear "${r.titulo}"`, text: `Usarás ${r.puntos} puntos. La solicitud quedará pendiente hasta que la acepten en caja.`, icon: "question", showCancelButton: true, confirmButtonText: "Solicitar canje", cancelButtonText: "Cancelar" });
    if (!confirm.isConfirmed) return;
    setCanjeSolicitando(true);
    try {
      const res = await fetch("/api/canjes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ rewardId: r._id }) });
      const data = await res.json();
      if (!res.ok) { await swalBase.fire({ title: "Error", text: data.message || "No se pudo solicitar", icon: "error" }); return; }
      setCanjeSolicitados(prev => new Set([...prev, r._id]));
      setCanjeModal(null);
      await swalBase.fire({ title: "¡Solicitud enviada!", text: "Esperá que lo acepten en caja. Te avisaremos.", icon: "success" });
    } catch { await swalBase.fire({ title: "Error", text: "No se pudo conectar", icon: "error" }); }
    finally { setCanjeSolicitando(false); }
  }

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

    const fetchMenuDelDia = async () => {
      try {
        const res = await fetch("/api/menu?cliente=true", { cache: "no-store" });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const items = data.filter(i => i.categoria === "MENÚ DEL DÍA");
        setMenuDelDia(items);
        setMenuDelDiaTiene(items.length > 0);
      } catch {}
      finally { setMenuDelDiaLoading(false); }
    };

    fetchRewards();
    fetchCarousel();
    fetchMenuDelDia();
  }, []);

  useEffect(() => {
    fetch("/api/config/pedidos", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setPedidosActivos(data.activo); });
    fetch("/api/config/reservas", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setReservasActivas(data.activo ?? true); });
  }, []);

  // Banner: repartidor afuera + conteo de pedidos activos
  useEffect(() => {
    const fetchEnvios = async () => {
      try {
        const res = await fetch("/api/pedidos", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        setRepartidorAfuera(data.some((p: any) => p.tipoEntrega === "envio" && p.estado === "listo" && p.repartidorAfuera));
        setPedidosActivosCount(data.filter((p: any) => ["pendiente", "aceptado", "preparando", "listo"].includes(p.estado)).length);
      } catch {}
    };
    fetchEnvios();
    const iv = setInterval(fetchEnvios, 8000);
    return () => clearInterval(iv);
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

      {/* Repartidor afuera del domicilio */}
      {repartidorAfuera && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <Truck size={22} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">¡Tu repartidor está afuera!</p>
            <p className="text-xs text-blue-600">Te está esperando en la puerta con tu pedido 🛵</p>
          </div>
        </div>
      )}

      {/* Carrusel de recompensas */}
      {rewards.length > 0 && (
      <section className="relative">
        <div className="relative rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 shadow-xl p-5 border border-gray-200">
          <>

              {rewards.length === 1 ? (
                <div className="flex justify-center">
                  <div className="w-full max-w-xs">
                    <RewardCard r={rewards[0]} onClick={() => setCanjeModal(rewards[0])} />
                  </div>
                </div>
              ) : (
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
                    <RewardCard r={r} onClick={() => setCanjeModal(r)} />
                  </SwiperSlide>
                ))}
              </Swiper>
              )}
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

      {/* Menú del Día */}
      {(menuDelDiaLoading || menuDelDiaTiene) && (
        menuDelDiaLoading ? (
          <div className="w-full h-56 rounded-2xl overflow-hidden bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : (
          <Link href="/cliente/menu" className="block">
            <div className="relative rounded-2xl overflow-hidden shadow-lg h-56">
              <img src="/menu-del-dia.jpeg" alt="Menú del Día" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2">
                <p className="text-white font-black text-base tracking-tight mb-2">MENÚ DEL DÍA</p>
                <div className="flex flex-wrap gap-1.5">
                  {menuDelDia.slice(0, 4).map(item => (
                    <span key={item._id} className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/30">
                      {item.nombre}
                    </span>
                  ))}
                  {menuDelDia.length > 4 && (
                    <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/30">
                      +{menuDelDia.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
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
          title="Delivery"
          Icon={Truck}
          accent="from-red-600 to-red-800"
          notificationCount={pedidosActivosCount}
          disabled={!pedidosActivos}
        />
        <ActionCard
          href="/cliente/rewards"
          title="Canjes"
          Icon={Ticket}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/"
          title="Autoservicio"
          Icon={Tablet}
          accent="from-gray-400 to-gray-500"
          disabled={true}
          onDisabledClick={() => swalBase.fire({
            title: "Próximamente",
            text: "Esta función estará disponible muy pronto.",
            icon: "info",
            timer: 2200,
            showConfirmButton: false,
          })}
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

      {/* Modal de canje desde carrusel — renderizado en document.body para evitar will-change:transform */}
      {canjeModal && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
          onClick={() => setCanjeModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-red-600" />
                <p className="font-black text-gray-900">Canjear</p>
              </div>
              <button onClick={() => setCanjeModal(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-2 space-y-1">
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{canjeModal.titulo}</h2>
              {canjeModal.descripcion && <p className="text-sm text-gray-500">{canjeModal.descripcion}</p>}
              <p className="text-2xl font-black text-red-600">{canjeModal.puntos} pts</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Tus puntos</span>
                <span className="font-bold text-gray-900">★ {puntos} pts</span>
              </div>
              {puntos < canjeModal.puntos && (
                <p className="text-xs text-red-500 font-semibold text-center">Te faltan {canjeModal.puntos - puntos} puntos para este canje</p>
              )}
              {canjeSolicitados.has(canjeModal._id) ? (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-3 rounded-2xl text-sm">
                  <Clock size={14} /> Pendiente de aprobación
                </div>
              ) : (
                <button
                  onClick={() => solicitarCanje(canjeModal)}
                  disabled={canjeSolicitando || puntos < canjeModal.puntos}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-2xl text-sm transition active:scale-[0.98]">
                  <Gift size={15} />
                  {canjeSolicitando ? "Solicitando..." : "Solicitar canje"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function RewardCard({ r, onClick }: { r: Reward; onClick?: () => void }) {
  if (r.tema === "argentina") {
    return (
      <button onClick={onClick}
        className="w-full text-left relative rounded-2xl border-2 border-[#74ACDF] h-44 flex flex-col justify-between overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
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
      </button>
    );
  }

  return (
    <button onClick={onClick}
      className="w-full text-left relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 h-44 flex flex-col justify-between overflow-hidden active:scale-[0.98] transition-transform">
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
    </button>
  );
}

/* =========================
  HOME ADMIN
   ========================= */
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

        {/* Pedidos activos */}
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

        {/* Reservas hoy */}
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

        {/* Caja */}
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

        {/* Ingresos hoy */}
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

        {/* Salón */}
        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Salón</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/mesas"        title="Mesas"    Icon={LayoutGrid} />
            <AdminCard href="/empleado/anotador"  title="Anotador" Icon={ClipboardList} />
          </div>
        </section>

        {/* Inventario */}
        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Inventario</p>
          <AdminCard href="/admin/stock" title="Stock" Icon={Package}
            badge={stockAlertas > 0 ? `${stockAlertas} bajo mínimo` : undefined}
            badgeColor="yellow" full />
        </section>

        {/* Clientes */}
        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Clientes</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/scan"         title="Escanear Puntos" Icon={ScanQrCode} />
            <AdminCard href="/admin/rewards/scan" title="Escanear Canjes" Icon={ScanText} />
            <AdminCard href="/admin/clientes"     title="Clientes"        Icon={Users} />
            <AdminCard href="/admin/rewards"      title="Canjes"          Icon={Ticket} />
            <AdminCard href="/caja/retroactivo"   title="Asignar puntos" Icon={Star} />
            <AdminCard href="/admin/empleados"    title="Empleados"       Icon={UserCog} />
          </div>
        </section>

        {/* Contenido */}
        <section>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] px-1 mb-2.5">Contenido</p>
          <div className="grid grid-cols-2 gap-2.5">
            <AdminCard href="/admin/menu"      title="Menú"    Icon={Utensils} />
            <AdminCard href="/admin/reviews"   title="Reseñas" Icon={Star} />
            <AdminCard href="/admin/carrousel" title="Fotos"   Icon={Images} />
          </div>
        </section>

        {/* Herramientas */}
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

/* =========================
  HOME EMPLEADO
   ========================= */
function EmployeeHome({ nombre }: { nombre?: string }) {
  const router = useRouter();
  const [hora, setHora] = useState(() => new Date().getHours());
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [comandasCount, setComandasCount] = useState(0);
  const [reservasHoyCount, setReservasHoyCount] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setHora(new Date().getHours()), 60000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    fetch("/api/caja/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCajaAbierta(!!d.abierta))
      .catch(() => setCajaAbierta(false));
  }, []);

  useEffect(() => {
    fetch("/api/pedidos?activos=true&fuente=empleado&propias=true", { credentials: "include" })
      .then(r => r.json())
      .then(d => setComandasCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hoy = hoyArgentina();
    fetch("/api/reservas", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        const count = d.filter((r: any) => r.fecha?.slice(0, 10) === hoy && r.estado !== "cancelada").length;
        setReservasHoyCount(count);
      })
      .catch(() => {});
  }, []);

  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className={`${container} pb-10 space-y-5`} style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

      {/* ── Header ── */}
      <div className="rounded-2xl bg-black text-white px-5 py-6 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-sm text-gray-400 capitalize">{fechaHoy}</p>
          <h1 className="text-2xl font-extrabold mt-0.5">{saludo}{nombre ? `, ${nombre}` : ""}</h1>
          <p className="text-sm text-gray-400 mt-1">Panel de Empleado</p>
        </div>
        <img src="/morganwhite.png" alt="Logo" className="h-14 w-14 object-contain opacity-90" />
      </div>

      {/* ── Acciones principales ── */}
      <div className="space-y-3">
        <div className="relative">
          <Link
            href="/empleado/anotador"
            className="w-full flex items-center gap-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl px-6 py-5 transition shadow-sm active:scale-[0.98] block"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight">Anotador de Pedidos</p>
              <p className="text-red-200 text-sm">Tomá y gestioná las comandas</p>
            </div>
          </Link>
          {comandasCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-white text-red-600 text-xs font-black rounded-full flex items-center justify-center shadow-md border-2 border-black pointer-events-none">
              {comandasCount}
            </span>
          )}
        </div>

        <Link
          href="/menu"
          className="w-full flex items-center gap-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-6 py-5 transition shadow-sm active:scale-[0.98] block"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-lg leading-tight">Menú</p>
            <p className="text-gray-400 text-sm">Ver la carta del restaurante</p>
          </div>
        </Link>

        <div className="relative">
          <Link
            href="/empleado/reservas"
            className="w-full flex items-center gap-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-6 py-5 transition shadow-sm active:scale-[0.98] block"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight">Reservas del día</p>
              <p className="text-gray-400 text-sm">Ver las reservas de hoy</p>
            </div>
          </Link>
          {reservasHoyCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-white text-red-600 text-xs font-black rounded-full flex items-center justify-center shadow-md border-2 border-black pointer-events-none">
              {reservasHoyCount}
            </span>
          )}
        </div>
      </div>

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
  onDisabledClick,
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  disabled?: boolean;
  notificationCount?: number;
  onDisabledClick?: () => void;
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
        <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-white text-black text-xs font-black rounded-full flex items-center justify-center shadow-md border-2 border-black pointer-events-none">
          {notificationCount}
        </span>
      )}
      <div className="text-base lg:text-lg font-extrabold text-center tracking-wide">
        {title}
      </div>
    </div>
  );

  if (disabled) {
    return (
      <div
        className={`opacity-50 ${onDisabledClick ? "cursor-pointer" : "cursor-not-allowed"}`}
        onClick={onDisabledClick}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl"
    >
      {content}
    </Link>
  );
}
