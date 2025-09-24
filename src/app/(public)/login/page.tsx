"use client";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ensurePushAfterLogin } from "@/lib/push-auto";
import Swal from "sweetalert2";

type Errors = { dni?: string; password?: string; general?: string };

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const validate = (vals: { dni: string; password: string }): Errors => {
    const e: Errors = {};
    if (!vals.dni) e.dni = "Ingresá tu DNI";
    else if (vals.dni.length < 7 || vals.dni.length > 9) e.dni = "DNI inválido";
    if (!vals.password) e.password = "Ingresá tu contraseña";
    return e;
  };

  const currentErrors = useMemo(() => validate({ dni, password }), [dni, password]);
  const hasErrors = Object.keys(currentErrors).length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ dni: true, password: true });
    if (hasErrors) return;

    setLoading(true);
    setErrors((p) => ({ ...p, general: undefined }));

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ dni, password }),
      headers: { "Content-Type": "application/json" },
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors((p) => ({ ...p, general: data.error || "No se pudo iniciar sesión" }));
      return;
    }

    // ✅ mostrar Swal después de login exitoso
    const { value: activar } = await Swal.fire({
      title: "¡Bienvenido!",
      text: "No te pierdas de nada activando las notificaciones 🔔",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Activar",
      cancelButtonText: "Ahora no",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
    });

    if (activar) {
      try {
        await ensurePushAfterLogin(); // 👈 activa notificaciones
        Swal.fire({
          icon: "success",
          title: "✅ Notificaciones activadas",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "❌ No se pudo activar",
          text: err.message || "Error desconocido",
        });
      }
    }

    // refrescar contexto y redirigir
    await refresh();
    window.location.href = "/";
  }

  return (
    <div
      className="min-h-[100dvh] flex items-start justify-center p-4 pt-20"
      style={{ paddingBottom: "max(1rem, env(safe-area-ineset-bottom))" }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur"
      >
        <h1 className="text-2xl font-extrabold text-center mb-5">Ingresar</h1>

        {errors.general && (
          <div className="mb-4 p-3 rounded bg-rose-900/20 text-rose-300 text-sm" role="alert">
            {errors.general}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="sr-only" htmlFor="dni">DNI</label>
            <input
              id="dni"
              placeholder="DNI"
              className={`w-full h-12 px-3 rounded-xl bg-white/10 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 ${touched.dni && currentErrors.dni ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""
                }`}
              value={dni}
              onChange={(e) => setDni(onlyDigits(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, dni: true }))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              aria-invalid={!!(touched.dni && currentErrors.dni)}
            />
            {touched.dni && currentErrors.dni && (
              <p className="mt-1 text-xs text-rose-300">{currentErrors.dni}</p>
            )}
          </div>

          <div>
            <label className="sr-only" htmlFor="password">Contraseña</label>
            <input
              id="password"
              placeholder="Contraseña"
              type="password"
              className={`w-full h-12 px-3 rounded-xl bg-white/10 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 ${touched.password && currentErrors.password ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""
                }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              aria-invalid={!!(touched.password && currentErrors.password)}
            />
            {touched.password && currentErrors.password && (
              <p className="mt-1 text-xs text-rose-300">{currentErrors.password}</p>
            )}
          </div>

          <button
            disabled={loading || hasErrors}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60 transition"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
