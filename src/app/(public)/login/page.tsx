"use client";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";

type Errors = { dni?: string; password?: string; general?: string };

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  // reglas simples:
  // DNI 7-9 dígitos (la mayoría en AR son 7-8; dejamos 9 por seguridad)
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

    await refresh();
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
    if (me?.user?.role === "admin") window.location.href = "/admin/scan";
    else window.location.href = "/cliente/qr";
  }

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-extrabold text-center mb-4">Ingresar</h1>

        {errors.general && (
          <div className="mb-3 p-3 rounded bg-rose-900/20 text-rose-300 text-sm" role="alert">
            {errors.general}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <input
              placeholder="DNI"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.dni && currentErrors.dni ? "ring-2 ring-rose-400" : ""}`}
              value={dni}
              onChange={(e) => setDni(onlyDigits(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, dni: true }))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              aria-invalid={!!(touched.dni && currentErrors.dni)}
            />
            {touched.dni && currentErrors.dni && (
              <p className="mt-1 text-xs text-rose-300">{currentErrors.dni}</p>
            )}
          </div>

          <div>
            <input
              placeholder="Contraseña"
              type="password"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.password && currentErrors.password ? "ring-2 ring-rose-400" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
              aria-invalid={!!(touched.password && currentErrors.password)}
            />
            {touched.password && currentErrors.password && (
              <p className="mt-1 text-xs text-rose-300">{currentErrors.password}</p>
            )}
          </div>

          <button
            disabled={loading || hasErrors}
            className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
