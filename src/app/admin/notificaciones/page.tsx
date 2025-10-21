"use client";
import { swalBase } from "@/lib/swalConfig";
import { useState } from "react";
import Swal from "sweetalert2";

export default function EnviarNotificacionPage() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("/");
    const [loading, setLoading] = useState(false);

    async function enviar() {
        if (!title || !body) {
            swalBase.fire("Campos incompletos", "Completá título y mensaje", "warning");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/notify/all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body, url }),
            });

            const data = await res.json();
            console.log("🔍 Respuesta del servidor:", data);

            if (data.ok) {
                swalBase.fire({
                    title: "✅ Notificación enviada",
                    text: `Se envió a ${data.total} dispositivos.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false,
                });
                setTitle("");
                setBody("");
                setUrl("/");
            } else {
                swalBase.fire("❌ Error", data.message || "No se pudo enviar la notificación", "error");
            }
        } catch (error) {
            swalBase.fire("❌", "Error de conexión con el servidor", "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200 p-6">
            <div className="max-w-lg w-full mx-auto p-8 bg-white rounded-2xl shadow-xl border border-red-100">
                <h1 className="text-3xl font-extrabold text-center text-black mb-6">
                    Enviar notificación
                </h1>

                <div className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Título (ej: Viernes 2x1 en fernet)"
                        className="w-full rounded-xl px-4 py-2.5 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                    />

                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Mensaje (ej: Hoy 2x1 en tragos hasta las 23 hs)"
                        className="w-full rounded-xl px-4 py-2.5 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 h-28 focus:border-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                    />

                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="URL destino (opcional)"
                        className="w-full rounded-xl px-4 py-2.5 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                    />

                    <button
                        onClick={enviar}
                        disabled={loading}
                        className={`w-full py-2.5 rounded-xl font-semibold text-lg transition-all ${loading
                                ? "bg-gray-400 cursor-not-allowed text-white"
                                : "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-red-400/40"
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin w-5 h-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 010 16v4l3.5-3.5L12 20v4a8 8 0 01-8-8z"
                                    ></path>
                                </svg>
                                Enviando...
                            </span>
                        ) : (
                            "Enviar notificación"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
