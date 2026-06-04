"use client";
import { useEffect, useState } from "react";
import { swalBase } from "@/lib/swalConfig";
import Loader from "@/components/Loader";

export default function ConfiguracionPage() {
    const [valor, setValor] = useState<number | null>(null);
    const [mensaje, setMensaje] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/configuracion").then((r) => r.json()),
            fetch("/api/configuracion/whatsapp").then((r) => r.json()),
        ])
            .then(([config, ws]) => {
                setValor(config.valor);
                setMensaje(ws.mensaje);
            })
            .catch(() =>
                swalBase.fire({ icon: "error", title: "Error", text: "No se pudo cargar la configuración" })
            )
            .finally(() => setLoading(false));
    }, []);

    const guardarPuntos = async () => {
        if (valor === null) return;
        const res = await fetch("/api/configuracion", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ valor }),
        });
        if (res.ok) swalBase.fire({ icon: "success", title: "Guardado", timer: 1500, showConfirmButton: false });
        else swalBase.fire({ icon: "error", title: "Error al guardar" });
    };

    const guardarMensaje = async () => {
        const res = await fetch("/api/configuracion/whatsapp", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje }),
        });
        if (res.ok) swalBase.fire({ icon: "success", title: "Guardado", timer: 1500, showConfirmButton: false });
        else swalBase.fire({ icon: "error", title: "Error al guardar" });
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-6 px-4 py-6">
            <h1 className="text-2xl font-bold text-center">Configuración General</h1>

            {/* Puntos por ARS */}
            <div className="bg-white text-black p-6 rounded-xl shadow-lg space-y-3">
                <label className="block font-semibold">Puntos por ARS ($1)</label>
                <input
                    type="number"
                    step="0.0001"
                    value={valor ?? ""}
                    onChange={(e) => setValor(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2"
                />
                <button
                    onClick={guardarPuntos}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                    Guardar
                </button>
            </div>

            {/* Mensaje de confirmación por WhatsApp */}
            <div className="bg-white text-black p-6 rounded-xl shadow-lg space-y-3">
                <div>
                    <label className="block font-semibold">Mensaje de confirmación (WhatsApp)</label>
                    <p className="text-xs text-gray-500 mt-1">
                        Usá <span className="font-mono bg-gray-100 px-1 rounded">{"{nombre}"}</span> para insertar el nombre del cliente.
                    </p>
                </div>
                <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                    onClick={guardarMensaje}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
}
