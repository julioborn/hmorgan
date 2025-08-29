"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ dni, password }),
      headers: { "Content-Type": "application/json" }
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Error");
      return;
    }
    // Traigo el user y redirijo por rol
    await refresh();
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json());
    if (me?.user?.role === "admin") router.push("/admin/scan");
    else router.push("/cliente/qr");
  }

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-extrabold text-center mb-4">Ingresar</h1>
        <div className="space-y-3">
          <input placeholder="DNI" className="w-full p-3 rounded bg-white/10 focus:outline-none" value={dni} onChange={e => setDni(e.target.value)} />
          <input placeholder="Contraseña" type="password" className="w-full p-3 rounded bg-white/10 focus:outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          <button disabled={loading} className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
