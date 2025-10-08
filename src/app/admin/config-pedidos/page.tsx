"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function ConfigPedidosPage() {
    const [activo, setActivo] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/admin/config-pedidos");
            const data = await res.json();
            setActivo(data.activo);
        })();
    }, []);

    async function togglePedidos() {
        const nuevoEstado = !activo;
        const res = await fetch("/api/admin/config-pedidos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: nuevoEstado }),
        });
        if (res.ok) {
            setActivo(nuevoEstado);
            Swal.fire(
                "✅",
                nuevoEstado ? "Pedidos habilitados" : "Pedidos deshabilitados",
                "success"
            );
        }
    }

    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">⚙️ Sistema de Pedidos</h1>
            <button
                onClick={togglePedidos}
                className={`px-6 py-3 rounded-xl font-semibold ${activo ? "bg-emerald-600" : "bg-rose-600"
                    }`}
            >
                {activo ? "Desactivar Pedidos" : "Activar Pedidos"}
            </button>
        </div>
    );
}
