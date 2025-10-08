"use client";
import { useState } from "react";
import Swal from "sweetalert2";

export default function EnviarNotificacionPage() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("/");

    async function enviar() {
        if (!title || !body) {
            Swal.fire("Campos incompletos", "Completá título y mensaje", "warning");
            return;
        }

        const res = await fetch("/api/notify/all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body, url }),
        });

        const data = await res.json();
        console.log("🔍 Respuesta del servidor:", data); // 👈 agrega esto

        if (data.ok) {
            Swal.fire("Notificación enviada", `Se envió a ${data.total} dispositivos.`, "success");
            setTitle("");
            setBody("");
        } else {
            Swal.fire("Error", data.message || "No se pudo enviar la notificación", "error");
        }
    }

    return (
        <div className="max-w-lg mx-auto p-6 space-y-4 bg-black/40 rounded-2xl border border-white/10">
            <h1 className="text-2xl font-bold flex justify-center text-white mb-4">Enviar notificación</h1>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título (ej: Viernes 2x1 en fernet)"
                className="w-full rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mensaje (ej: Hoy 2x1 en tragos hasta las 23 hs)"
                className="w-full rounded-lg px-3 py-2 bg-white/10 text-white h-24 focus:ring-2 focus:ring-emerald-500"
            />
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL destino (opcional)"
                className="w-full rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            />
            <button
                onClick={enviar}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
                Enviar notificación
            </button>
        </div>
    );
}
