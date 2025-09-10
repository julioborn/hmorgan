"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { QrCode, Award, Utensils, Scan, Users } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Loader from "@/components/Loader";
import { Coins } from "phosphor-react";

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
      className={`${container} py-8 lg:py-10 space-y-10`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <section className="text-center lg:text-left space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
          Bienvenido a <span className="text-emerald-400">H Morgan Bar</span>
        </h1>
        <p className="opacity-80 max-w-2xl">
          Sumá puntos con cada consumo y canjealos por beneficios. Mostrá tu QR
          al finalizar y listo.
        </p>
      </section>

      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 lg:h-56 lg:w-56 rounded-full bg-emerald-500/10 blur-2xl" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Clientes</h2>
          <p className="opacity-80 mb-4">
            Registrate, obtené tu QR y mirá tus puntos en tiempo real.
          </p>
          <div className="flex gap-2">
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
            >
              Ingresar
            </Link>
          </div>
        </div>

        <div className="text-center lg:text-left mt-6">
          <Link
            href="/staff"
            className="text-sm opacity-70 hover:opacity-100 underline underline-offset-4"
          >
            ¿Sos staff? Ingresar
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rewards", { cache: "no-store" });
        if (!res.ok) throw new Error("Error al cargar recompensas");
        const data = await res.json();
        setRewards(data || []);
      } catch (e) {
        console.error(e);
        setRewards([]);
      } finally {
        setLoadingRewards(false);
      }
    })();
  }, []);

  // 👇 Si aún está cargando las recompensas, mostrar loader global
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
      <header>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-center font-extrabold">
          Hola{nombre ? `, ${nombre}` : ""}
        </h1>
      </header>

      {/* 👇 Carrusel de recompensas estilo ticket */}
      <section className="relative">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl p-4">
          <h2 className="text-xl font-bold mb-3 text-center">Canjes disponibles</h2>

          {rewards.length === 0 ? (
            <p className="text-center py-10 opacity-70">
              No hay recompensas disponibles.
            </p>
          ) : (
            <>
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{
                  delay: 2000, // 2s entre cada movimiento
                  disableOnInteraction: false,
                  pauseOnMouseEnter: false,
                }}
                speed={800} // velocidad de transición entre slides
                loop={true}
                spaceBetween={16}
                slidesPerView={1.1}
                pagination={{ clickable: true }}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
              >
                {rewards.map((r) => (
                  <SwiperSlide key={r._id}>
                    <div className="relative bg-white text-black rounded-2xl shadow-xl p-5 h-44 flex flex-col justify-between overflow-hidden">
                      <div className="flex-1 flex flex-col justify-between">
                        <h3 className="text-lg font-extrabold truncate">{r.titulo}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {r.descripcion || "Canje"}
                        </p>
                        <span className="text-sm font-semibold text-emerald-600">
                          {r.puntos} pts
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <img
                          src="/icon-192x192.png"
                          alt="Logo"
                          className="h-8 w-8 object-contain opacity-80"
                        />
                      </div>
                      <span className="absolute -left-3 top-1/2 w-6 h-6 bg-slate-900 rounded-full" />
                      <span className="absolute -right-3 top-1/2 w-6 h-6 bg-slate-900 rounded-full" />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/cliente/rewards"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
                >
                  Ver todos
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 👇 Botonera */}
      <div className="grid grid-cols-2 gap-4">
        <ActionCard href="/cliente/qr" title="Mi QR" Icon={QrCode} accent="from-red-600 to-red-800" />
        <ActionCard href="/cliente/menu" title="Menú" Icon={Utensils} accent="from-blue-600 to-blue-800" />
        <ActionCard href="/cliente/rewards" title="Canjes" Icon={Award} accent="from-yellow-500 to-yellow-700" />
        <ActionCard
          href="/cliente/historial"
          title="Historial"
          Icon={Coins}
          accent="from-green-600 to-green-800"
        />
      </div>
    </div>
  );
}

/* =========================
  HOME ADMIN
   ========================= */
function AdminHome() {
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

      <div className="grid grid-cols-2 gap-4">
        <ActionCard href="/admin/scan" title="Escanear Puntos" Icon={Scan} accent="from-red-600 to-red-800" />
        <ActionCard href="/admin/rewards/scan" title="Escanear Canjes" Icon={Scan} accent="from-blue-600 to-blue-800" />
        <ActionCard href="/admin/clientes" title="Clientes" Icon={Users} accent="from-green-600 to-green-800" />
        <ActionCard href="/admin/menu" title="Menú" Icon={Utensils} accent="from-violet-600 to-violet-800" />
        <ActionCard href="/admin/rewards" title="Canjes" Icon={Award} accent="from-yellow-500 to-yellow-700" />
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
}: {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`group relative flex flex-col items-center justify-center
                  rounded-2xl border border-white/10
                  p-6 sm:p-8 min-h-[140px] lg:min-h-[160px]
                  bg-gradient-to-br ${accent || "from-slate-800 to-slate-900"}
                  hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30
                  transition-all duration-300 text-white`}
    >
      <Icon className="h-10 w-10 lg:h-12 lg:w-12 mb-3 opacity-95" aria-hidden />
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
