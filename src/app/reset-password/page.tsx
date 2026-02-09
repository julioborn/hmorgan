// src/app/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

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
    const [checking, setChecking] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

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
            swalBase.fire({
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
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al cambiar contraseña");

            swalBase.fire({
                icon: "success",
                title: "✅ Contraseña actualizada",
                text: "Ya puedes iniciar sesión con tu nueva contraseña.",
                confirmButtonColor: "#10b981",
            }).then(() => {
                window.location.href = "/login";
            });
        } catch (err: any) {
            swalBase.fire({
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
        <div className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-md p-6 text-center">
                <h1 className="text-3xl font-extrabold mb-6 text-black">Restablecer contraseña</h1>

                {timeLeft !== null && timeLeft > 0 ? (
                    <p className="mb-4 text-sm text-gray-600">
                        ⏳ El enlace termina en{" "}
                        <b>
                            {minutes}:{seconds.toString().padStart(2, "0")}
                        </b>
                    </p>
                ) : (
                    <p className="mb-4 text-sm text-rose-400">
                        ❌ El enlace ha vencido o ya fue usado.
                    </p>
                )}

                {timeLeft && timeLeft > 0 ? (
                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        <div>
                            <label className="block mb-1 text-sm font-semibold text-gray-700">
                                Nueva contraseña
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 px-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                minLength={6}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold text-gray-700">
                                Confirmar contraseña
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-12 px-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                minLength={6}
                                required
                            />
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"                        >
                            {loading ? <Loader size={20} /> : "Guardar contraseña"}
                        </button>
                    </form>
                ) : null}
            </div>
        </div>
    );
}
