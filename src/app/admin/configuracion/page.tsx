"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function ConfiguracionPage() {
    const [valor, setValor] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/configuracion")
            .then((res) => res.json())
            .then((data) => setValor(data.valor))
            .catch(() => Swal.fire("Error", "No se pudo cargar la configuración", "error"))
            .finally(() => setLoading(false));
    }, []);

    const guardar = async () => {
        if (valor === null) return;

        const res = await fetch("/api/configuracion", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ valor }),
        });

        if (res.ok) {
            Swal.fire("✅ Guardado", "El valor fue actualizado correctamente", "success");
        } else {
            Swal.fire("❌ Error", "No se pudo actualizar el valor", "error");
        }
    };

    if (loading) return <p className="text-center py-10">Cargando...</p>;

    return (
        <div className="max-w-md mx-auto bg-white text-black p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold mb-4 text-center">Configuración General</h1>

            <label className="block mb-2 font-semibold">Puntos por ARS ($1)</label>
            <input
                type="number"
                step="0.0001"
                value={valor ?? ""}
                onChange={(e) => setValor(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 mb-4"
            />

            <button
                onClick={guardar}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
            >
                Guardar cambios
            </button>
        </div>
    );
}
