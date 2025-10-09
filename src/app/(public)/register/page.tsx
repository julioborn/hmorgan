"use client";
import { useMemo, useState } from "react";
import { ensurePushAfterLogin } from "@/lib/push-auto";

type RegisterForm = { nombre: string; apellido: string; dni: string; telefono: string };
type Errors = Partial<Record<keyof RegisterForm | "general", string>>;

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof RegisterForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));
  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const validate = (f: RegisterForm): Errors => {
    const e: Errors = {};
    if (!f.nombre || f.nombre.trim().length < 2) e.nombre = "Nombre demasiado corto";
    if (!f.apellido || f.apellido.trim().length < 2) e.apellido = "Apellido demasiado corto";
    if (!f.dni) e.dni = "Ingresá DNI";
    else if (f.dni.length < 7 || f.dni.length > 9) e.dni = "DNI inválido";
    if (!f.telefono) e.telefono = "Ingresá teléfono";
    else if (f.telefono.length < 6 || f.telefono.length > 15) e.telefono = "Teléfono inválido";
    return e;
  };

  const currentErrors = useMemo(() => validate(form), [form]);
  const hasErrors = Object.keys(currentErrors).length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ nombre: true, apellido: true, dni: true, telefono: true });
    if (hasErrors) return;

    setLoading(true);
    setErrors((p) => ({ ...p, general: undefined }));

    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErrors((p) => ({ ...p, general: data.error || "No se pudo registrar" }));
      return;
    }

    let me = await fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (!me?.user && data?.provisionalPassword) {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: form.dni, password: data.provisionalPassword }),
      });

      if (!loginRes.ok) {
        setErrors((p) => ({
          ...p,
          general: `Registrado. Tu contraseña provisional es: ${data.provisionalPassword}`,
        }));
        return;
      }

      me = await fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
    }

    try {
      await ensurePushAfterLogin(me?.user?.id || me?.user?._id);
    } catch (err) {
      console.warn("No se pudo activar push automáticamente:", err);
    }

    if (me?.user?.role === "admin") window.location.href = "/admin/scan";
    else window.location.href = "/cliente/qr";
  }

  return (
    <div className="min-h-screen flex items-start justify-centergray-50 to-gray-100 p-4">
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
          {(["nombre", "apellido", "dni", "telefono"] as (keyof RegisterForm)[]).map((field) => (
            <div key={field}>
              <input
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className={`w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched[field] && currentErrors[field]
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300"
                  }`}
                value={form[field]}
                onChange={(e) =>
                  setField(
                    field,
                    field === "dni" || field === "telefono"
                      ? onlyDigits(e.target.value)
                      : e.target.value
                  )
                }
                onBlur={() => setTouched((t) => ({ ...t, [field]: true }))}
              />
              {touched[field] && currentErrors[field] && (
                <p className="mt-1 text-xs text-red-600">{currentErrors[field]}</p>
              )}
            </div>
          ))}

          <button
            disabled={loading || hasErrors}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Registrarme"}
          </button>
        </div>
      </form>
    </div>
  );
}
