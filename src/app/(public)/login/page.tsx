"use client";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ensurePushAfterLogin } from "@/lib/ensurePushAfterLogin";

type Errors = { dni?: string; password?: string; general?: string };

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  // 👉 Formatea el DNI como "12.345.678"
  function formatDni(value: string) {
    const clean = value.replace(/\D/g, "");
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  const validate = (vals: { dni: string; password: string }): Errors => {
    const e: Errors = {};
    if (!vals.dni) e.dni = "Ingresá tu DNI";
    else if (onlyDigits(vals.dni).length < 7 || onlyDigits(vals.dni).length > 9)
      e.dni = "DNI inválido";
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
      body: JSON.stringify({ dni: onlyDigits(dni), password }),
      headers: { "Content-Type": "application/json" },
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors((p) => ({
        ...p,
        general: data.error || "No se pudo iniciar sesión",
      }));
      return;
    }

    await refresh(); // 🔹 Primero refrescamos el contexto de autenticación
    await new Promise((r) => setTimeout(r, 300)); // Pequeño delay para evitar race condition

    // 🔹 Activar las notificaciones después del login exitoso
    await ensurePushAfterLogin();

    // 🔁 Finalmente redirigimos al inicio
    window.location.href = "/";

  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 mt-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-md p-6"
      >
        <h1 className="text-3xl font-extrabold text-center mb-6 text-black">
          Ingresar
        </h1>

        {errors.general && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
            {errors.general}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <input
              type="text" // 👈 mantiene formato libre para mostrar los puntos
              inputMode="numeric" // 👈 muestra teclado numérico en móviles
              placeholder="DNI"
              autoComplete="username"
              enterKeyHint="next"
              className={`w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched.dni && currentErrors.dni
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300"
                }`}
              value={dni}
              onChange={(e) => {
                // 🔹 Solo permitir números reales (sin puntos)
                const digits = onlyDigits(e.target.value).slice(0, 8);
                // 🔹 Mostrar con puntos visualmente
                setDni(formatDni(digits));
              }}
              onBlur={() => setTouched((t) => ({ ...t, dni: true }))}
              pattern={undefined} // 👈 elimina validación HTML5
              onInvalid={(e) => e.preventDefault()} // 👈 evita mensaje “formato no válido”
            />
            {touched.dni && currentErrors.dni && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.dni}</p>
            )}
          </div>

          <div>
            <input
              placeholder="Contraseña"
              type="password"
              className={`w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched.password && currentErrors.password
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300"
                }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
            />
            {touched.password && currentErrors.password && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.password}</p>
            )}
          </div>

          <button
            disabled={loading || hasErrors}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
