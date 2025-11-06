"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { QrCode, Scan, Users, Bell, ChefHat, PackagePlus, Package, Utensils, Ticket, Coins, History, ScanQrCode, ScanText, MessageSquare } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Loader from "@/components/Loader";

const container =
  "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

type Reward = {
  _id: string;
  titulo: string;
  descripcion?: string;
  puntos: number;
};

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={`${container} py-10 flex justify-center`}>
        <Loader size={64} />
      </div>
    );
  }

  if (!user) return <Landing />;

  return user.role === "admin" ? (
    <AdminHome />
  ) : (
    <ClientHome nombre={user.nombre} />
  );
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
          Bienvenido a{" "}
          <span className="bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent drop-shadow-lg">
            H Morgan Bar
          </span>

        </h1>
        <p className="text-red-600 font-semibold text-base sm:text-lg">
          ¡Tu experiencia en el bar ahora tiene canjes!
        </p>

      </section>

      {/* Card de acceso */}
      <section className="flex justify-center">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl p-6 text-center space-x-2">
          {/* Glow solo arriba, chiquito */}
          <Link
            href="/register"
            className="px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-lg hover:scale-105"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="px-5 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition shadow-lg hover:scale-105"
          >
            Ingresar
          </Link>
        </div>
      </section>
    </div>
  );
}

/* =========================
  HOME CLIENTE
   ========================= */
function ClientHome({ nombre }: { nombre?: string }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [pedidosActivosCount, setPedidosActivosCount] = useState(0);

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
        setLoadingRewards(false); // 👈 importante
      }
    };

    fetchRewards();
  }, []);

  if (loadingRewards) {
    return (
      <div className={`${container} py-10 flex justify-center`}>
        <Loader size={64} />
      </div>
    );
  }

  const [chatsActivosCount, setChatsActivosCount] = useState(0);

  useEffect(() => {
    const fetchChatsActivos = async () => {
      try {
        const res = await fetch("/api/pedidos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        // Filtramos los pedidos que tengan chat activo (según tu campo o condición)
        const activos = data.filter((p: any) => p.chatActivo || ["pendiente", "preparando", "listo"].includes(p.estado));
        setChatsActivosCount(activos.length || 0);
      } catch (e) {
        console.error("Error cargando chats activos:", e);
      }
    };

    fetchChatsActivos();
    const interval = setInterval(fetchChatsActivos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`${container} py-8 space-y-8`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >

      {/* Carrusel de recompensas */}
      <section className="relative">
        <div className="relative rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 shadow-xl p-5 border border-gray-200">

          {rewards.length === 0 ? (
            <p className="text-center py-10 opacity-70">
              No hay recompensas disponibles.
            </p>
          ) : (
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
                    <div className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 h-44 flex flex-col justify-between overflow-hidden">
                      <div className="flex-1 flex flex-col justify-between">
                        <h3 className="font-extrabold text-base md:text-lg line-clamp-2">
                          {r.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {r.descripcion || "Canje"}
                        </p>
                        <span className="text-sm font-semibold text-red-600">
                          {r.puntos} pts
                        </span>
                      </div>

                      {/* Logo */}
                      <div className="absolute bottom-3 right-3">
                        <img
                          src="/icon-192x192.png"
                          alt="Logo"
                          className="h-8 w-8 object-contain opacity-70"
                        />
                      </div>

                      {/* Círculos laterales */}
                      <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                      <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                    </div>
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
          )}
        </div>
      </section>

      {/* 🗨️ Chats activos (botón negro largo con burbuja) */}
      {/* <div className="relative">
        <Link
          href="/cliente/chats"
          className="flex items-center justify-between w-full bg-black text-white rounded-2xl px-5 py-4 shadow-lg hover:scale-[1.02] transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold">Chats Activos</span>
              <span className="text-xs opacity-80">Habla con el bar sobre tu pedido</span>
            </div>
          </div>

          {chatsActivosCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ring-2 ring-white shadow-md animate-pulse">
              {chatsActivosCount}
            </span>
          )}
        </Link>
      </div> */}

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
        {/* 🆕 Pedido y Mis Pedidos */}
        <ActionCard
          href="/cliente/pedidos"
          title="Pedir"
          Icon={PackagePlus}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/cliente/mis-pedidos"
          title="Mis Pedidos"
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
          href="/cliente/historial"
          title="Historial"
          Icon={History}
          accent="from-red-600 to-red-800"
        />
      </div>

      {/* 👇 Invitación a la ruleta */}
      <Link
        href="/cliente/ruleta"
        className="block w-full rounded-2xl bg-black text-white text-center p-6 shadow-xl hover:scale-[1.02] hover:shadow-emerald-500/30 transition-all duration-300"
      >
        <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
          ¿No sabés qué tomar?
        </h2>
        <p className="opacity-90 text-sm sm:text-base">
          Dejalo en manos de la suerte con nuestra <span className="font-bold">Ruleta de Tragos</span>
        </p>
      </Link>
    </div>
  );
}

/* =========================
  HOME ADMIN
   ========================= */
function AdminHome() {
  const [pedidosActivosCount, setPedidosActivosCount] = useState(0);

  useEffect(() => {
    const fetchPedidosActivos = async () => {
      try {
        const res = await fetch("/api/pedidos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const activos = data?.filter((p: any) =>
          ["pendiente", "preparando", "listo"].includes(p.estado)
        );
        setPedidosActivosCount(activos?.length || 0);
      } catch (e) {
        console.error("Error cargando pedidos activos:", e);
      }
    };
    fetchPedidosActivos();
    const interval = setInterval(fetchPedidosActivos, 5000);
    return () => clearInterval(interval);
  }, []);

  const [chatsActivosCount, setChatsActivosCount] = useState(0);

  useEffect(() => {
    const fetchChatsActivos = async () => {
      try {
        const res = await fetch("/api/pedidos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const activos = data.filter((p: any) => p.chatActivo || ["pendiente", "preparando", "listo"].includes(p.estado));
        setChatsActivosCount(activos.length || 0);
      } catch (e) {
        console.error("Error cargando chats activos:", e);
      }
    };

    fetchChatsActivos();
    const interval = setInterval(fetchChatsActivos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`${container} py-8 space-y-8`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center">
          Administración
        </h1>
      </header>

      {/* 🗨️ Chats activos (botón negro largo con burbuja) */}
      <div className="relative">
        <Link
          href="/admin/chats"
          className="flex items-center justify-between w-full bg-black text-white rounded-2xl px-5 py-4 shadow-lg hover:scale-[1.02] transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold">Chats Activos</span>
              <span className="text-xs opacity-80">Ver todos los pedidos con chat</span>
            </div>
          </div>

          {chatsActivosCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ring-2 ring-white shadow-md animate-pulse">
              {chatsActivosCount}
            </span>
          )}
        </Link>
      </div>


      <div className="grid grid-cols-2 gap-4">
        <ActionCard
          href="/admin/scan"
          title="Escanear Puntos"
          Icon={ScanQrCode}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/admin/rewards/scan"
          title="Escanear Canjes"
          Icon={ScanText}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/admin/clientes"
          title="Clientes"
          Icon={Users}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/admin/menu"
          title="Menú"
          Icon={Utensils}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/admin/rewards"
          title="Canjes"
          Icon={Ticket}
          accent="from-red-600 to-red-800"
        />
        <ActionCard
          href="/admin/pedidos"
          title="Pedidos"
          Icon={Package}
          accent="from-red-600 to-red-800"
          notificationCount={pedidosActivosCount}
        />

        {/* ✅ Notificaciones - ocupa todo el ancho y fondo negro */}
        <div className="col-span-2">
          <ActionCard
            href="/admin/notificaciones"
            title="Notificaciones"
            Icon={Bell}
            accent="from-black to-gray-900"
          />
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
