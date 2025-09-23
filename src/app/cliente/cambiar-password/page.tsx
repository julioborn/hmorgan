"use client";

import { useState } from "react";
import Loader from "@/components/Loader";

export default function CambiarPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setOk(false);

        try {
            const res = await fetch("/api/cliente/cambiar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al cambiar contraseña");

            setOk(true);
            setPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto py-10 px-4">
            <h1 className="text-2xl font-extrabold text-center mb-6">Cambiar contraseña</h1>

            {error && (
                <div className="mb-4 p-3 rounded bg-rose-900/20 text-rose-300 text-sm">{error}</div>
            )}
            {ok && (
                <div className="mb-4 p-3 rounded bg-emerald-900/20 text-emerald-300 text-sm">
                    ✅ Contraseña actualizada correctamente
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1">Nueva contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                        minLength={6}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Confirmar contraseña</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                        minLength={6}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60"
                >
                    {loading ? <Loader size={20} /> : "Guardar contraseña"}
                </button>
            </form>
        </div>
    );
}
