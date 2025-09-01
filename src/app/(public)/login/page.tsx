"use client";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();

  const onChangeDni = (v: string) => setDni(v.replace(/\D/g, "")); // solo dígitos

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ dni, password }),
      headers: { "Content-Type": "application/json" },
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Error");
      return;
    }
    await refresh();
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
        <h1 className="text-2xl font-extrabold text-center mb-4">Ingresar</h1>
        <div className="space-y-3">
          <input
            placeholder="DNI"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={dni}
            onChange={(e) => onChangeDni(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="username"
          />
          <input
            placeholder="Contraseña"
            type="password"
            className="w-full p-3 rounded bg-white/10 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button disabled={loading} className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
