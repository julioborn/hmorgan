// src/app/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Loader from "@/components/Loader";

export default function ResetPasswordPage({
    searchParams,
}: {
    searchParams: { token?: string };
}) {
    const token = searchParams.token;
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true); // 👈 nuevo estado para validar token

    // 🔎 al montar: pedimos al backend cuánto tiempo queda
    useEffect(() => {
        if (!token) {
            setTimeLeft(0);
            setChecking(false);
            return;
        }

        (async () => {
            try {
                const res = await fetch("/api/auth/check-token?token=" + token);
                const data = await res.json();
                if (res.ok) {
                    setTimeLeft(data.timeLeft); // segundos restantes
                } else {
                    setTimeLeft(0);
                }
            } catch {
                setTimeLeft(0);
            } finally {
                setChecking(false); // ✅ deja de mostrar loader
            }
        })();
    }, [token]);

    // ⏱ contador decreciente
    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft]);

    const minutes = Math.floor((timeLeft || 0) / 60);
    const seconds = (timeLeft || 0) % 60;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token) return;

        if (password !== confirmPassword) {
            Swal.fire({
                icon: "error",
                title: "Las contraseñas no coinciden",
                confirmButtonColor: "#ef4444",
            });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al cambiar contraseña");

            Swal.fire({
                icon: "success",
                title: "✅ Contraseña actualizada",
                text: "Ya puedes iniciar sesión con tu nueva contraseña.",
                confirmButtonColor: "#10b981",
            }).then(() => {
                window.location.href = "/login";
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#ef4444",
            });
        } finally {
            setLoading(false);
        }
    }

    // 🔄 mientras se valida el token mostramos loader
    if (checking) {
        return (
            <div className="py-20 flex justify-center">
                <Loader size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto py-10 px-4 text-center">
            <h1 className="text-2xl font-extrabold mb-6">Restablecer contraseña</h1>

            {timeLeft !== null && timeLeft > 0 ? (
                <p className="mb-4 text-sm text-gray-300">
                    ⏳ El enlace caduca en{" "}
                    <b>
                        {minutes}:{seconds.toString().padStart(2, "0")}
                    </b>
                </p>
            ) : (
                <p className="mb-4 text-sm text-rose-400">
                    ❌ El enlace ha caducado o ya fue usado.
                </p>
            )}

            {timeLeft && timeLeft > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
                        <label className="block text-sm mb-1">
                            Confirmar contraseña
                        </label>
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
            ) : null}
        </div>
    );
}
