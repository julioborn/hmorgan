"use client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { QrCode, Award, UtensilsCrossed, Scan, Users } from "lucide-react";

const container =
  "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={`${container} py-6 space-y-6`}>
        <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 lg:h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <Landing />;

  return user.role === "admin" ? <AdminHome /> : <ClientHome nombre={user.nombre} />;
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
          Sumá puntos con cada consumo y canjealos por beneficios. Mostrá tu QR al finalizar y listo.
        </p>
      </section>

      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          {/* acento decorativo sin overflow */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 lg:h-56 lg:w-56 rounded-full bg-emerald-500/10 blur-2xl" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Clientes</h2>
          <p className="opacity-80 mb-4">Registrate, obtené tu QR y mirá tus puntos en tiempo real.</p>
          <div className="flex gap-2">
            <Link href="/register" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition">
              Crear cuenta
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition">
              Ingresar
            </Link>
          </div>
        </div>

        <div className="text-center lg:text-left mt-6">
          <Link href="/staff" className="text-sm opacity-70 hover:opacity-100 underline underline-offset-4">
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
  return (
    <div
      className={`${container} py-8 space-y-6`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
          Hola{nombre ? `, ${nombre}` : ""}
        </h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <ActionCard href="/cliente/qr" title="Mi QR" subtitle="Mostralo al finalizar tu consumo" Icon={QrCode} accent="from-emerald-500/20 to-transparent" />
        <ActionCard href="/cliente/puntos" title="Mis Puntos" subtitle="Historial y saldo en tiempo real" Icon={Award} accent="from-indigo-500/20 to-transparent" />
        <ActionCard href="/menu" title="Menú" subtitle="Próximamente" Icon={UtensilsCrossed} accent="from-amber-500/20 to-transparent" disabled />
      </div>
    </div>
  );
}

/* =========================
   HOME ADMIN (desktop OK)
   ========================= */
function AdminHome() {
  return (
    <div
      className={`${container} py-8 space-y-8`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
          Panel del administrador
        </h1>
      </header>

      {/* Grilla a ancho completo del container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
        <ActionCard
          href="/admin/scan"
          title="Escanear"
          subtitle="Asignar puntos por mesa"
          Icon={Scan}
          accent="from-emerald-500/20 to-transparent"
        />
        <ActionCard
          href="/admin/clientes"
          title="Clientes"
          subtitle="Ver, editar y administrar"
          Icon={Users}
          accent="from-indigo-500/20 to-transparent"
        />
        <ActionCard
          href="/admin/menu"
          title="Menú"
          subtitle="Configurar productos y precios"
          Icon={UtensilsCrossed}
          accent="from-amber-500/20 to-transparent"
          disabled
        />
      </div>
    </div>
  );
}


/* =========================
   CARD REUTILIZABLE
   ========================= */
function ActionCard({
  href, title, subtitle, Icon, accent, disabled
}: {
  href: string;
  title: string;
  subtitle?: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  disabled?: boolean;
}) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10
                    p-5 lg:p-6 bg-white/[0.04] hover:bg-white/[0.06] transition
                    min-h-28 lg:min-h-32 h-full">
      {/* Accent sin overflow */}
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 lg:h-36 lg:w-36
                       rounded-full blur-2xl bg-gradient-to-tr ${accent || "from-white/10 to-transparent"}`} />
      <div className="flex items-center gap-4 lg:gap-5">
        <div className="grid place-items-center h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-white/10 border border-white/10 shrink-0">
          <Icon className="h-5 w-5 lg:h-6 lg:w-6 opacity-90" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-base lg:text-lg font-bold leading-tight">{title}</div>
          {subtitle && <div className="text-sm opacity-75 truncate">{subtitle}</div>}
        </div>
        <div className="ml-auto opacity-60 group-hover:opacity-100 transition text-emerald-300">→</div>
      </div>
    </div>
  );

  if (disabled) return <div className="opacity-70 cursor-not-allowed h-full">{content}</div>;

  return (
    <Link
      href={href}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl"
    >
      {content}
    </Link>
  );
}