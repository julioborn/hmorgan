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
import { QrCode, Users, Bell, PackagePlus, Package, Utensils, Ticket, History, ScanQrCode, ScanText, Settings, Star, BarChart2, ClipboardList, LayoutGrid, Images, CalendarDays, Wallet, TrendingUp, UserCog, Truck, Gift, X, Clock, Tablet, Receipt } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Loader from "@/components/Loader";
import { AdminHome, AdminCard } from "@/components/AdminHomePanel";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";

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
  return <ClientHome nombre={user.nombre} puntos={user.puntos ?? 0} userId={user.id} />;
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
type Invitacion = { _id: string; titulo: string; descripcion?: string; fecha: string; hora?: string; precio?: number; imagenUrl?: string; colorFondo?: string; tema?: string };

function ClientHome({ nombre, puntos, userId }: { nombre?: string; puntos: number; userId?: string }) {
  const isOwner = userId === "68b212ac8a60afb869a18626";
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImg[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const categoryConfigMap = useCategoryConfigs();
  const [menuDelDia, setMenuDelDia] = useState<MenuDelDiaItem[]>([]);
  const [menuDelDiaLoading, setMenuDelDiaLoading] = useState(true);
  const [menuDelDiaTiene, setMenuDelDiaTiene] = useState(false);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [pedidosActivosCount, setPedidosActivosCount] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(true);
  const [reservasActivas, setReservasActivas] = useState(true);
  const [sesionAutoserv, setSesionAutoserv] = useState(false);
  const [repartidorAfuera, setRepartidorAfuera] = useState(false);
  const [canjeModal, setCanjeModal] = useState<Reward | null>(null);
  const [canjeSolicitando, setCanjeSolicitando] = useState(false);
  const [canjeSolicitados, setCanjeSolicitados] = useState<Set<string>>(new Set());
  const [comandaActiva, setComandaActiva] = useState<{ _id: string; mesa?: string; nombreComanda?: string; total?: number; items?: { cantidad: number }[] } | null>(null);
  const [llamadaEnviada, setLlamadaEnviada] = useState<Set<"mozo" | "cuenta">>(new Set());
  const [llamarConfirm, setLlamarConfirm] = useState<"mozo" | "cuenta" | null>(null);

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
      } catch { }
      finally { setMenuDelDiaLoading(false); }
    };

    const fetchInvitaciones = async () => {
      try {
        const res = await fetch("/api/cliente/invitaciones", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setInvitaciones(Array.isArray(data) ? data : []);
      } catch { }
    };

    fetchRewards();
    fetchCarousel();
    fetchMenuDelDia();
    fetchInvitaciones();
  }, []);

  useEffect(() => {
    fetch("/api/config/pedidos", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setPedidosActivos(data.activo); });
    fetch("/api/config/reservas", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setReservasActivas(data.activo ?? true); });
    fetch("/api/autoservicio", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setSesionAutoserv(!!(d?.sesion)); })
      .catch(() => {});
  }, []);

  // Banner: repartidor afuera + conteo de pedidos activos + comanda activa como comensal
  useEffect(() => {
    const fetchEnvios = async () => {
      try {
        const res = await fetch("/api/pedidos?mios=true", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        setRepartidorAfuera(data.some((p: any) => p.tipoEntrega === "envio" && p.estado === "listo" && p.repartidorAfuera));
        setPedidosActivosCount(data.filter((p: any) =>
            ["pendiente", "aceptado", "preparando", "listo"].includes(p.estado) &&
            p.fuente !== "autoservicio"
        ).length);
      } catch { }
    };
    const fetchComandaActiva = async () => {
      try {
        const res = await fetch("/api/llamar-mozo", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setComandaActiva(data.pedido ?? null);
      } catch { }
    };
    fetchEnvios();
    fetchComandaActiva();
    const iv = setInterval(() => { fetchEnvios(); fetchComandaActiva(); }, 8000);
    return () => clearInterval(iv);
  }, []);

  function llamar(tipo: "mozo" | "cuenta") {
    if (llamadaEnviada.has(tipo) || !comandaActiva) return;
    setLlamarConfirm(tipo);
  }

  function confirmarLlamar() {
    if (!llamarConfirm) return;
    const tipo = llamarConfirm;
    setLlamarConfirm(null);
    setLlamadaEnviada(prev => new Set([...prev, tipo]));
    setTimeout(() => setLlamadaEnviada(prev => { const s = new Set(prev); s.delete(tipo); return s; }), 60000);
    fetch("/api/llamar-mozo", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    }).catch(() => { });
  }

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

      {/* Mi Mesa — comanda activa como comensal */}
      {comandaActiva && (
        <div className="space-y-3">
          {/* Card resumen → link a mi-cuenta */}
          <Link href="/cliente/mi-cuenta"
            className="block bg-black rounded-2xl px-5 py-4 active:scale-[0.98] transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-0.5">Mi cuenta</p>
                <p className="text-white font-black text-lg leading-tight">
                  {comandaActiva.mesa ? `Mesa ${comandaActiva.mesa}` : comandaActiva.nombreComanda || "Mi comanda"}
                </p>
                {(comandaActiva.items?.length ?? 0) > 0 && (
                  <p className="text-white/60 text-xs mt-1">
                    {comandaActiva.items!.reduce((s, it) => s + it.cantidad, 0)} productos
                    {comandaActiva.total ? ` · $${new Intl.NumberFormat("es-AR").format(Math.round(comandaActiva.total))}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Receipt size={22} className="text-white/70" />
                <span className="text-white/60 text-xs font-semibold">Ver detalle →</span>
              </div>
            </div>
          </Link>

          {/* Llamar mozo / Pedir cuenta */}
          <div className="flex gap-3">
            <button
              onClick={() => llamar("mozo")}
              disabled={llamadaEnviada.has("mozo")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                ${llamadaEnviada.has("mozo")
                  ? "bg-red-50 border-2 border-red-200 text-red-600 cursor-default"
                  : "bg-red-600 text-white hover:bg-red-700"
                }`}
            >
              <Bell size={20} />
              {llamadaEnviada.has("mozo") ? "¡En camino!" : "Llamar mozo"}
            </button>
            <button
              onClick={() => llamar("cuenta")}
              disabled={llamadaEnviada.has("cuenta")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                ${llamadaEnviada.has("cuenta")
                  ? "bg-green-50 border-2 border-green-200 text-green-700 cursor-default"
                  : "bg-gray-900 text-white hover:bg-black"
                }`}
            >
              <Receipt size={20} />
              {llamadaEnviada.has("cuenta") ? "¡Avisado!" : "Pedir cuenta"}
            </button>
          </div>
        </div>
      )}

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

      {/* Invitaciones a eventos */}
      {invitaciones.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Eventos</h2>
          <div className="space-y-3">
            {invitaciones.map(inv => {
              const fechaEvento = new Date(inv.fecha.slice(0, 10) + "T12:00:00");
              const fechaStr = fechaEvento.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

              if (inv.tema === "trasnoche") {
                return (
                  <div key={inv._id} className="trasnoche-card relative rounded-2xl overflow-hidden shadow-2xl border border-purple-900/60" style={{ minHeight: "180px" }}>
                    {/* Fondo oscuro */}
                    <div className="absolute inset-0 bg-[#07000f]" />
                    {/* Orbes de luz animados */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="tn-orb1 absolute w-56 h-56 rounded-full bg-purple-600 blur-3xl opacity-50 -top-16 -left-10" />
                      <div className="tn-orb2 absolute w-44 h-44 rounded-full bg-pink-500 blur-3xl opacity-40 -bottom-12 -right-8" />
                      <div className="tn-orb3 absolute w-36 h-36 rounded-full bg-blue-600 blur-2xl opacity-35 top-1/2 right-1/4" />
                    </div>
                    {/* Grid suave de textura */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
                    {/* Destellos */}
                    <span className="tn-spark1  absolute top-3    right-5  text-white      text-base  select-none leading-none">✦</span>
                    <span className="tn-spark2  absolute top-9    right-14 text-pink-200   text-sm    select-none leading-none">✦</span>
                    <span className="tn-spark3  absolute bottom-7 left-7   text-purple-200 text-sm    select-none leading-none">✦</span>
                    <span className="tn-spark4  absolute top-5    left-16  text-white      text-xs    select-none leading-none">✦</span>
                    <span className="tn-spark5  absolute bottom-4 right-8  text-white      text-xs    select-none leading-none">✦</span>
                    <span className="tn-spark6  absolute top-14   left-5   text-pink-300   text-base  select-none leading-none">✦</span>
                    <span className="tn-spark7  absolute bottom-9 right-20 text-purple-100 text-xs    select-none leading-none">✦</span>
                    <span className="tn-spark8  absolute top-7    right-28 text-white      text-sm    select-none leading-none">✦</span>
                    <span className="tn-twinkle1 absolute top-2   left-1/2 text-white      text-[10px] select-none leading-none">•</span>
                    <span className="tn-twinkle2 absolute top-1/2 right-3  text-pink-100  text-[8px]  select-none leading-none">•</span>
                    <span className="tn-twinkle3 absolute bottom-3 left-1/3 text-white     text-[10px] select-none leading-none">•</span>
                    <span className="tn-twinkle4 absolute top-1/3 left-10  text-purple-100 text-[8px] select-none leading-none">•</span>
                    <span className="tn-twinkle5 absolute bottom-8 right-1/3 text-white    text-[10px] select-none leading-none">•</span>
                    {/* Contenido */}
                    <div className="relative z-10 p-5 flex flex-col" style={{ minHeight: "180px" }}>
                      {/* Título + precio */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="tn-shimmer-text font-black text-2xl leading-tight">{inv.titulo}</h3>
                        {(inv.precio ?? 0) > 0 && (
                          <span className="shrink-0 bg-white/10 border border-purple-400/40 backdrop-blur-sm text-purple-200 text-sm font-black px-3 py-1 rounded-full">
                            ${new Intl.NumberFormat("es-AR").format(inv.precio!)}
                          </span>
                        )}
                      </div>
                      {inv.descripcion && (
                        <p className="text-sm text-purple-200/80 line-clamp-2 mt-2">{inv.descripcion}</p>
                      )}
                      {/* Fecha y hora — esquina inferior derecha */}
                      <div className="flex items-center justify-end gap-2 mt-auto pt-4">
                        <span className="flex items-center gap-1.5 bg-white/10 border border-purple-400/30 backdrop-blur-sm text-purple-100 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                          <CalendarDays size={12} />
                          {fechaStr}
                        </span>
                        {inv.hora && (
                          <span className="bg-white/10 border border-purple-400/30 backdrop-blur-sm text-purple-100 text-xs font-semibold px-3 py-1 rounded-full">
                            {inv.hora}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={inv._id}
                  className="relative rounded-2xl overflow-hidden shadow-lg"
                  style={{
                    background: inv.imagenUrl ? undefined : (inv.colorFondo || "#111111"),
                    minHeight: "160px",
                  }}
                >
                  {inv.imagenUrl && (
                    <>
                      <img src={inv.imagenUrl} alt={inv.titulo} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/55" />
                    </>
                  )}
                  <div className="relative z-10 p-5 flex flex-col gap-2 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black text-xl leading-tight">{inv.titulo}</h3>
                      {(inv.precio ?? 0) > 0 && (
                        <span className="shrink-0 bg-white/20 border border-white/30 backdrop-blur-sm text-white text-sm font-black px-3 py-1 rounded-full">
                          ${new Intl.NumberFormat("es-AR").format(inv.precio!)}
                        </span>
                      )}
                    </div>
                    {inv.descripcion && (
                      <p className="text-sm text-white/80 line-clamp-2">{inv.descripcion}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1.5 bg-white/20 border border-white/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
                        <CalendarDays size={12} />
                        {fechaStr}
                      </span>
                      {inv.hora && (
                        <span className="bg-white/20 border border-white/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                          {inv.hora}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
                {/* <Link
                  href="/cliente/rewards"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                >
                  Ver todos los canjes
                </Link> */}
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
              <img src={categoryConfigMap["MENÚ DEL DÍA"]?.imageUrl || "/menu-del-dia.jpeg"} alt="Menú del Día" className="w-full h-full object-cover" style={{ objectPosition: categoryConfigMap["MENÚ DEL DÍA"]?.imagePosition || "50% 50%" }} />
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
          href="/autoservicio"
          title="Autoservicio"
          Icon={Tablet}
          accent="from-red-600 to-red-800"
          greenDot={sesionAutoserv}
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
            ¿Cómo llegar?
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

      {/* Modal confirmación llamar mozo / pedir cuenta */}
      {llamarConfirm && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
          onClick={() => setLlamarConfirm(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-3xl">{llamarConfirm === "cuenta" ? "🟢" : "🔴"}</span>
              <button onClick={() => setLlamarConfirm(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-2 space-y-1">
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                {llamarConfirm === "cuenta" ? "¿Pedimos la cuenta?" : "¿Llamamos al mozo?"}
              </h2>
              <p className="text-sm text-gray-500">
                {llamarConfirm === "cuenta"
                  ? "Se le avisará al mozo que querés pagar."
                  : "El mozo irá de inmediato."}
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={confirmarLlamar}
                className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-2xl text-sm transition active:scale-[0.98] ${llamarConfirm === "cuenta" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                {llamarConfirm === "cuenta" ? <Receipt size={15} /> : <Bell size={15} />}
                {llamarConfirm === "cuenta" ? "Sí, pedir la cuenta" : "Sí, llamar al mozo"}
              </button>
              <button
                onClick={() => setLlamarConfirm(null)}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">
                Cancelar
              </button>
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

/* =========================
  HOME EMPLEADO
   ========================= */
function EmployeeHome({ nombre }: { nombre?: string }) {
  const router = useRouter();
  const [hora, setHora] = useState(() => new Date().getHours());
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [comandasCount, setComandasCount] = useState(0);
  const [reservasHoyCount, setReservasHoyCount] = useState(0);
  const [autoservActivasCount, setAutoservActivasCount] = useState(0);

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
      .catch(() => { });
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
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch("/api/autoservicio", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAutoservActivasCount(d.length); })
      .catch(() => { });
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

        <div className="relative">
          <Link
            href="/empleado/autoservicio"
            className="w-full flex items-center gap-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl px-6 py-5 transition shadow-sm active:scale-[0.98] block"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Tablet className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight">Autoservicio</p>
              <p className="text-purple-200 text-sm">Asignar mesas para autopedido</p>
            </div>
          </Link>
          {autoservActivasCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-white text-purple-700 text-xs font-black rounded-full flex items-center justify-center shadow-md border-2 border-purple-700 pointer-events-none">
              {autoservActivasCount}
            </span>
          )}
        </div>

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
  greenDot,
  onDisabledClick,
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  disabled?: boolean;
  notificationCount?: number;
  greenDot?: boolean;
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
      {greenDot && (
        <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow pointer-events-none" />
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
