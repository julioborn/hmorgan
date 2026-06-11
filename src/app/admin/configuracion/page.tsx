"use client";
import { useEffect, useState } from "react";
import { swalBase } from "@/lib/swalConfig";
import Loader from "@/components/Loader";

export default function ConfiguracionPage() {
    const [valor, setValor] = useState<number | null>(null);
    const [costoEnvio, setCostoEnvio] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/configuracion").then((r) => r.json()),
            fetch("/api/config/envio").then((r) => r.json()),
        ])
            .then(([puntos, envio]) => {
                setValor(puntos.valor);
                setCostoEnvio(envio.costoEnvio ?? 0);
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

    const guardarCostoEnvio = async () => {
        if (costoEnvio === null) return;
        const res = await fetch("/api/config/envio", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ costoEnvio }),
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

            <div className="bg-white text-black p-6 rounded-xl shadow-lg space-y-3">
                <label className="block font-semibold">Costo de envío a domicilio ($)</label>
                <input
                    type="number"
                    min="0"
                    step="1"
                    value={costoEnvio ?? ""}
                    onChange={(e) => setCostoEnvio(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2"
                />
                <button
                    onClick={guardarCostoEnvio}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
}
