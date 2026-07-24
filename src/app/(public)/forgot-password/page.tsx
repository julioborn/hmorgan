"use client";
import { useState } from "react";
import Link from "next/link";
import { swalBase } from "@/lib/swalConfig";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/request-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al enviar el email");
            }
            setSent(true);
        } catch (err: any) {
            swalBase.fire({ icon: "error", title: "Error", text: err.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-start justify-center p-4 mt-6">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-md p-6">
                <h1 className="text-3xl font-extrabold text-center mb-2 text-black">
                    ¿Olvidaste tu contraseña?
                </h1>

                {!sent ? (
                    <>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            Ingresá el email con el que te registraste y te enviamos un enlace para crear una nueva contraseña.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.trim())}
                                    required
                                    className="w-full h-12 px-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition disabled:opacity-60"
                            >
                                {loading ? "Enviando..." : "Enviar enlace"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-4xl mb-4">📧</p>
                        <p className="font-bold text-gray-800 mb-2">¡Revisá tu email!</p>
                        <p className="text-sm text-gray-500">
                            Si ese email está registrado, vas a recibir un enlace para restablecer tu contraseña. El enlace caduca en 15 minutos.
                        </p>
                    </div>
                )}

                <div className="text-center mt-6">
                    <Link href="/login" className="text-sm text-red-600 font-semibold hover:text-red-500 underline">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
