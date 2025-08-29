import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Bienvenido a <span className="text-emerald-400">H Morgan Bar</span>
        </h1>
        <p className="opacity-80 max-w-2xl mx-auto">
          Sumá puntos con cada consumo y canjealos por beneficios. Mostrá tu QR al finalizar y listo.
        </p>
      </section>

      <section className="max-w-3xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {/* capa decorativa SIN capturar clicks */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 md:group-hover:opacity-100 transition" />
          <h2 className="text-2xl font-bold mb-2">Clientes</h2>
          <p className="opacity-80 mb-4">Registrate, obtené tu QR y mirá tus puntos en tiempo real.</p>
          <div className="flex gap-2">
            <Link href="/register" className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500">
              Crear cuenta
            </Link>
            <Link href="/login" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15">
              Ingresar
            </Link>
          </div>
        </div>

        {/* Link discreto para el staff */}
        <div className="text-center mt-6">
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
