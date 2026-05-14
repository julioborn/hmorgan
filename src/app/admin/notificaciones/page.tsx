"use client";
import { swalBase } from "@/lib/swalConfig";
import { useState } from "react";

const RUTAS = [
    { label: "Inicio", value: "/" },
    { label: "Escanear QR", value: "/cliente/qr" },
    { label: "Hacer un pedido", value: "/cliente/pedidos" },
    { label: "Historial de pedidos", value: "/cliente/mis-pedidos" },
    { label: "Ver menú", value: "/cliente/menu" },
    { label: "Ruleta", value: "/cliente/ruleta" },
    { label: "Historial de puntos", value: "/cliente/historial" },
    { label: "Canjes", value: "/cliente/canjes" },
];

const inputClass = "w-full rounded-xl px-4 py-2.5 bg-white border border-gray-300 text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

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
        } catch {
            swalBase.fire("❌", "Error de conexión con el servidor", "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6">
            <div className="max-w-lg w-full mx-auto p-8 bg-white rounded-2xl shadow-xl">
                <h1 className="text-4xl font-extrabold mb-10 text-center text-black">
                    Enviar notificación
                </h1>

                <div className="space-y-5">
                    <div>
                        <label className={labelClass}>Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Mensaje</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className={`${inputClass} h-28 resize-none`}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Destino</label>
                        <select
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className={inputClass}
                        >
                            {RUTAS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

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
                                <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 010 16v4l3.5-3.5L12 20v4a8 8 0 01-8-8z" />
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
