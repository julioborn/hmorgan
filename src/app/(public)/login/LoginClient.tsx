"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type Errors = { username?: string; password?: string; general?: string };

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Errors>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validate = (vals: { username: string; password: string }): Errors => {
        const e: Errors = {};

        if (!vals.username || vals.username.length < 3) {
            e.username = "Ingresá tu usuario";
        }

        if (!vals.password) {
            e.password = "Ingresá tu contraseña";
        }

        return e;
    };

    const currentErrors = useMemo(
        () => validate({ username, password }),
        [username, password]
    );
    const hasErrors = Object.keys(currentErrors).length > 0;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched({ username: true, password: true });
        if (hasErrors) return;

        setLoading(true);
        setErrors((p) => ({ ...p, general: undefined }));

        const res = await fetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            credentials: "same-origin",
        });

        setLoading(false);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setErrors((p) => ({ ...p, general: data.error || "No se pudo iniciar sesión" }));
            return;
        }

        // ✅ NO dejes que push/refresh bloqueen el redirect
        try {
            //await refresh();
        } catch (err) {
            console.warn("refresh falló:", err);
        }

        try {
            //await ensurePushAfterLogin();
        } catch (err) {
            console.warn("ensurePushAfterLogin falló:", err);
        }

        window.location.href = "/";

    }

    return (
        <div className="min-h-screen flex items-start justify-center p-4 mt-6">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-md p-6"
            >
                <h1 className="text-3xl font-extrabold text-center mb-6 text-black">
                    Ingresar
                </h1>

                {errors.general && (
                    <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
                        {errors.general}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-semibold text-gray-700">
                            Nombre de usuario
                        </label>

                        <input
                            type="text"
                            placeholder="Usuario"
                            autoComplete="username"
                            enterKeyHint="next"
                            className={`w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched.username && currentErrors.username
                                ? "border-red-400 focus:ring-red-400"
                                : "border-gray-300"
                                }`}
                            value={username}
                            onChange={(e) =>
                                setUsername(e.target.value.toLowerCase().trim())
                            }
                            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                        />

                        {touched.username && currentErrors.username && (
                            <p className="mt-1 text-xs text-red-600">
                                {currentErrors.username}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-gray-700">
                            Contraseña
                        </label>

                        <input
                            placeholder="Contraseña"
                            type={showPassword ? "text" : "password"}
                            className={`w-full h-12 px-3 rounded-xl border text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${touched.password && currentErrors.password
                                ? "border-red-400 focus:ring-red-400"
                                : "border-gray-300"
                                }`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                            autoComplete="current-password"
                        />
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
                                Mostrar contraseña
                            </label>
                        </div>
                        {touched.password && currentErrors.password && (
                            <p className="mt-1 text-xs text-red-600">{currentErrors.password}</p>
                        )}
                    </div>
                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-600">
                            ¿No tenés cuenta?{" "}
                            <Link
                                href="/register"
                                className="font-semibold text-red-600 hover:text-red-500 underline"
                            >
                                Registrate acá
                            </Link>
                        </p>
                    </div>
                    <button
                        type="submit"   // 👈 ESTO ES CLAVE
                        disabled={loading || hasErrors}
                        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"
                    >
                        {loading ? "Ingresando..." : "Entrar"}
                    </button>
                </div>
            </form>
        </div>
    );
}
