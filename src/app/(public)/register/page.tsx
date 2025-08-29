"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", telefono: "" });
  const [provisional, setProv] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setProv(data.provisionalPassword);
    else alert(data.error || "Error");
  }

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-extrabold text-center mb-4">Crear cuenta</h1>
        <div className="space-y-3">
          {["nombre", "apellido", "dni", "telefono"].map(k => (
            <input key={k} placeholder={k.toUpperCase()} className="w-full p-3 rounded bg-white/10 focus:outline-none"
              value={(form as any)[k]} onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))} />
          ))}
          <button disabled={loading} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
            {loading ? "Registrando..." : "Registrarme"}
          </button>
          {provisional && (
            <p className="text-sm mt-3 text-center opacity-90">
              Tu contraseña provisional: <b>{provisional}</b>. Podés cambiarla luego en tu perfil.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
