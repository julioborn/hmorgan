"use client";
import { useState, useEffect } from "react";
import { RotateCw } from "lucide-react";

export default function ActualizarAppButton() {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (!reg) return;
                reg.addEventListener("updatefound", () => {
                    setShowButton(true); // Aparece cuando hay una versión nueva
                });
            });
        }
    }, []);

    const handleUpdate = async () => {
        try {
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                await caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
            }
            window.location.reload(); // ✅ sin parámetros
        } catch (err) {
            console.error("Error al actualizar:", err);
            window.location.reload();
        }
    };

    if (!showButton) return null; // 👈 solo aparece si hay una nueva versión detectada

    return (
        <button
            onClick={handleUpdate}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-4 rounded-xl 
                 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold 
                 hover:scale-105 transition-all shadow-md"
        >
            <RotateCw className="h-5 w-5" />
            Actualizar aplicación
        </button>
    );
}
