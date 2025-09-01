"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", telefono: "" });
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Error");
      return;
    }

    // ✅ Auto-login con la contraseña provisional devuelta
    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: form.dni, password: data.provisionalPassword }),
    });

    if (!loginRes.ok) {
      // fallback: mostrar la provisional si por alguna razón no loguea
      alert(`Registrado. Tu contraseña provisional es: ${data.provisionalPassword}`);
      return;
    }

    // Redirigir por rol
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
    if (me?.user?.role === "admin") {
      window.location.href = "/admin/scan";
    } else {
      window.location.href = "/cliente/qr";
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-extrabold text-center mb-4">Crear cuenta</h1>
        <div className="space-y-3">
          <input
            placeholder="NOMBRE"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            autoComplete="given-name"
          />
          <input
            placeholder="APELLIDO"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={form.apellido}
            onChange={(e) => setField("apellido", e.target.value)}
            autoComplete="family-name"
          />
          <input
            placeholder="DNI"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={form.dni}
            onChange={(e) => setField("dni", onlyDigits(e.target.value))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="username"
          />
          <input
            placeholder="TELÉFONO"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={form.telefono}
            onChange={(e) => setField("telefono", onlyDigits(e.target.value))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />

          <button disabled={loading} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
            {loading ? "Registrando..." : "Registrarme"}
          </button>
        </div>
      </form>
    </div>
  );
}
