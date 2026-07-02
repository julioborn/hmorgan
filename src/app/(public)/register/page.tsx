"use client";
import { useEffect, useMemo, useState } from "react";
import { ensurePushAfterLogin } from "@/lib/push-auto";

type RegisterForm = {
  username: string;
  password: string;
  confirmPassword: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  dni?: string; // ⬅️ opcional
  telefono?: string;
};
type Errors = Partial<Record<keyof RegisterForm | "general", string>>;

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    username: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    dni: "",
    telefono: "",
  });
  const hoyStr = new Date().toISOString().slice(0, 10);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const setField = (k: keyof RegisterForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

  const validate = (f: RegisterForm): Errors => {
    const e: Errors = {};
    if (!f.username || f.username.length < 3)
      e.username = "Usuario mínimo 3 caracteres";
    else if (!USERNAME_REGEX.test(f.username))
      e.username = "Solo letras minúsculas, números, . y _";
    if (!f.password || f.password.length < 6)
      e.password = "Mínimo 6 caracteres";
    if (f.password !== f.confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden";
    if (!f.nombre || f.nombre.trim().length < 2) e.nombre = "Nombre demasiado corto";
    if (!f.apellido || f.apellido.trim().length < 2) e.apellido = "Apellido demasiado corto";
    if (!f.fechaNacimiento) {
      e.fechaNacimiento = "La fecha de nacimiento es obligatoria";
    } else {
      const d = new Date(f.fechaNacimiento);
      if (isNaN(d.getTime()) || d > new Date()) e.fechaNacimiento = "Fecha inválida";
    }
    if (f.dni) {
      const d = onlyDigits(f.dni);
      if (d.length < 7 || d.length > 9) {
        e.dni = "DNI inválido";
      }
    }
    if (f.telefono) {
      if (f.telefono.length < 6 || f.telefono.length > 15) {
        e.telefono = "Teléfono inválido";
      }
    }
    return e;
  };

  const currentErrors = useMemo(() => validate(form), [form]);
  const hasErrors = Object.keys(currentErrors).some((k) => touched[k]);

  useEffect(() => {
    const username = form.username;
    if (!username || username.length < 3 || !USERNAME_REGEX.test(username)) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = {
      username: true,
      password: true,
      confirmPassword: true,
      nombre: true,
      apellido: true,
      fechaNacimiento: true,
      dni: true,
      telefono: true,
    };
    setTouched(allTouched);
    const submitErrors = Object.keys(currentErrors).some((k) => allTouched[k as keyof typeof allTouched]);
    if (submitErrors) return;
    if (usernameStatus === "taken") return;
    if (usernameStatus === "checking") return;

    setLoading(true);
    setErrors((p) => ({ ...p, general: undefined }));

    const payload: any = {
      username: form.username,
      password: form.password,
      nombre: form.nombre,
      apellido: form.apellido,
      fechaNacimiento: form.fechaNacimiento,
    };

    if (form.telefono) payload.telefono = form.telefono;
    if (form.dni) payload.dni = onlyDigits(form.dni);

    // 1️⃣ Registrar usuario (esto YA crea la cookie)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin", // 🔥 CLAVE
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErrors((p) => ({ ...p, general: data.error || "No se pudo registrar" }));
      return;
    }

    // 2️⃣ Intentar activar push (no es crítico)
    // 🔔 fire-and-forget (NO bloquear auth)
    ensurePushAfterLogin().catch((err) =>
      console.warn("No se pudo activar push automáticamente:", err)
    );

    // 🚀 redirect inmediato
    window.location.href = "/";

  }

  // 👉 Formatea el DNI como "12.345.678"
  function formatDni(value: string) {
    const clean = value.replace(/\D/g, "");
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  const inputClass = (field: keyof RegisterForm) =>
    `w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched[field] && currentErrors[field]
      ? "border-red-400 focus:ring-red-400"
      : "border-gray-300"
    }`;

  return (
    <div className="min-h-screen flex items-start mt-6 justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-[env(safe-area-inset-bottom)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-md p-6"
      >
        <h1 className="text-3xl font-extrabold text-center mb-5 text-black">
          Crear cuenta
        </h1>

        {errors.general && (
          <div className="mb-3 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
            {errors.general}
          </div>
        )}

        <div className="space-y-4">
          {/* Usuario */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">
              Nombre de usuario
              <span className="ml-1 text-xs font-normal text-gray-400">— debe ser único</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-gray-500 font-semibold text-sm pointer-events-none select-none">@</span>
              <input
                type="text"
                placeholder="usuario"
                autoComplete="username"
                enterKeyHint="next"
                className={`${inputClass("username")} pl-8 pr-28`}
                value={form.username}
                onChange={(e) => setField("username", e.target.value.toLowerCase().trim())}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              />
              <span className="absolute right-3 text-xs font-medium pointer-events-none">
                {usernameStatus === "checking" && <span className="text-gray-400">verificando...</span>}
                {usernameStatus === "available" && <span className="text-green-600">✓ disponible</span>}
                {usernameStatus === "taken" && <span className="text-red-500">✗ en uso</span>}
              </span>
            </div>
            {touched.username && currentErrors.username && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.username}</p>
            )}
            {usernameStatus === "taken" && !(touched.username && currentErrors.username) && (
              <p className="mt-1 text-xs text-red-600">Este usuario ya está registrado</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">
              Contraseña
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              autoComplete="new-password"
              enterKeyHint="next"
              className={inputClass("password")}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            />
            {touched.password && currentErrors.password && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">
              Confirmar contraseña
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirmar contraseña"
              autoComplete="new-password"
              enterKeyHint="next"
              className={inputClass("confirmPassword")}
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            />
            {touched.confirmPassword && currentErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              id="show-password"
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label
              htmlFor="show-password"
              className="text-sm text-gray-600 select-none cursor-pointer"
            >
              Mostrar contraseñas
            </label>
          </div>

          {(["nombre", "apellido", "fechaNacimiento", "dni", "telefono"] as (keyof RegisterForm)[]).map((field) => (
            <div key={field}>
              <label className="block mb-1 text-sm font-semibold text-gray-700">
                {field === "dni"
                  ? "DNI (opcional)"
                  : field === "telefono"
                    ? "Teléfono (opcional)"
                    : field === "nombre"
                      ? "Nombre"
                      : field === "apellido"
                        ? "Apellido"
                        : "Fecha de nacimiento"}
              </label>
              <input
                type={field === "fechaNacimiento" ? "date" : "text"}
                inputMode={field === "dni" || field === "telefono" ? "numeric" : "text"}
                placeholder={
                  field === "dni"
                    ? "DNI (opcional)"
                    : field === "telefono"
                      ? "Teléfono (opcional)"
                      : field.charAt(0).toUpperCase() + field.slice(1)
                }
                max={field === "fechaNacimiento" ? hoyStr : undefined}
                lang={field === "fechaNacimiento" ? "es-AR" : undefined}
                style={field === "fechaNacimiento" ? { fontSize: "16px" } : undefined}
                enterKeyHint="next"
                className={inputClass(field)}
                value={form[field]}
                onChange={(e) => {
                  let value = e.target.value;

                  if (field === "dni") {
                    // 🔹 Solo permitir números reales (sin puntos)
                    const digits = onlyDigits(value).slice(0, 8);
                    // 🔹 Mostrar con puntos visualmente
                    value = formatDni(digits);
                  } else if (field === "telefono") {
                    // 🔹 Permitir solo números, sin formateo visual
                    value = onlyDigits(value).slice(0, 15);
                  }

                  setField(field, value);
                }}
                onBlur={() => setTouched((t) => ({ ...t, [field]: true }))}
                // 🚫 Evita validaciones HTML5 nativas
                pattern={undefined}
                onInvalid={(e) => e.preventDefault()}
              />

              {touched[field] && currentErrors[field] && (
                <p className="mt-1 text-xs text-red-600">{currentErrors[field]}</p>
              )}
            </div>
          ))}
          <button
            disabled={loading || hasErrors || usernameStatus === "taken" || usernameStatus === "checking"}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Registrarme"}
          </button>
          <div className="pt-3 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tenés cuenta?{" "}
              <a
                href="/login"
                className="font-semibold text-red-600 hover:text-red-500 transition"
              >
                Iniciar sesión
              </a>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
