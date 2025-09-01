"use client";
import { useMemo, useState } from "react";

type RegisterForm = { nombre: string; apellido: string; dni: string; telefono: string; };
type Errors = Partial<Record<keyof RegisterForm | "general", string>>;

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({ nombre: "", apellido: "", dni: "", telefono: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof RegisterForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  // reglas:
  // nombre/apellido >= 2 letras
  // dni 7-9 dígitos
  // teléfono 6-15 dígitos (E.164 máx 15)
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

    // Si el backend ya setea cookie en /register, esto alcanza:
    let me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).catch(() => null);

    // Si no quedó logueado todavía, autologin con provisionalPassword
    if (!me?.user && data?.provisionalPassword) {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: form.dni, password: data.provisionalPassword }),
      });

      if (!loginRes.ok) {
        setErrors((p) => ({ ...p, general: `Registrado. Tu contraseña provisional es: ${data.provisionalPassword}` }));
        return;
      }
      me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).catch(() => null);
    }

    if (me?.user?.role === "admin") window.location.href = "/admin/scan";
    else window.location.href = "/cliente/qr";
  }

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-extrabold text-center mb-4">Crear cuenta</h1>

        {errors.general && (
          <div className="mb-3 p-3 rounded bg-rose-900/20 text-rose-300 text-sm" role="alert">
            {errors.general}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <input
              placeholder="NOMBRE"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.nombre && currentErrors.nombre ? "ring-2 ring-rose-400" : ""}`}
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, nombre: true }))}
              autoComplete="given-name"
              aria-invalid={!!(touched.nombre && currentErrors.nombre)}
            />
            {touched.nombre && currentErrors.nombre && <p className="mt-1 text-xs text-rose-300">{currentErrors.nombre}</p>}
          </div>

          <div>
            <input
              placeholder="APELLIDO"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.apellido && currentErrors.apellido ? "ring-2 ring-rose-400" : ""}`}
              value={form.apellido}
              onChange={(e) => setField("apellido", e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, apellido: true }))}
              autoComplete="family-name"
              aria-invalid={!!(touched.apellido && currentErrors.apellido)}
            />
            {touched.apellido && currentErrors.apellido && <p className="mt-1 text-xs text-rose-300">{currentErrors.apellido}</p>}
          </div>

          <div>
            <input
              placeholder="DNI"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.dni && currentErrors.dni ? "ring-2 ring-rose-400" : ""}`}
              value={form.dni}
              onChange={(e) => setField("dni", onlyDigits(e.target.value))}
              onBlur={() => setTouched(t => ({ ...t, dni: true }))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              aria-invalid={!!(touched.dni && currentErrors.dni)}
            />
            {touched.dni && currentErrors.dni && <p className="mt-1 text-xs text-rose-300">{currentErrors.dni}</p>}
          </div>

          <div>
            <input
              placeholder="TELÉFONO"
              className={`w-full p-3 rounded bg-white/10 focus:outline-none ${touched.telefono && currentErrors.telefono ? "ring-2 ring-rose-400" : ""}`}
              value={form.telefono}
              onChange={(e) => setField("telefono", onlyDigits(e.target.value))}
              onBlur={() => setTouched(t => ({ ...t, telefono: true }))}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!(touched.telefono && currentErrors.telefono)}
            />
            {touched.telefono && currentErrors.telefono && <p className="mt-1 text-xs text-rose-300">{currentErrors.telefono}</p>}
          </div>

          <button
            disabled={loading || hasErrors}
            className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Registrarme"}
          </button>
        </div>
      </form>
    </div>
  );
}
