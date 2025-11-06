"use client";
import { useEffect } from "react";
import { registerSW } from "@/lib/push-client";

export default function RegisterSW() {
    useEffect(() => {
        async function init() {
            try {
                const reg = await registerSW(); // Usa tu lógica avanzada del push-client
                if (!reg) return;

                // 🔁 Manejo de actualizaciones automáticas
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                console.log("🆕 Nueva versión del SW detectada, aplicando actualización...");
                                newWorker.postMessage({ type: "SKIP_WAITING" });
                            }
                        });
                    }
                });

                // 🔁 Refrescar al activar nueva versión
                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    if (!sessionStorage.getItem("sw-refreshed")) {
                        sessionStorage.setItem("sw-refreshed", "1");
                        window.location.reload();
                    }
                });
            } catch (err) {
                console.error("❌ Error al registrar el Service Worker:", err);
            }
        }

        if ("serviceWorker" in navigator) init();
    }, []);

    return null;
}
