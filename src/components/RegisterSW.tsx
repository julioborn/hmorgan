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

                // El nuevo SW se activa silenciosamente sin forzar reload
                // (evita recarga inesperada al volver de otra app)
                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    console.log("🆕 Service Worker actualizado en background.");
                });

                // 🔔 Recibir push en primer plano desde el SW
                navigator.serviceWorker.addEventListener("message", (event) => {
                    if (event.data?.type === "PUSH_NOTIFICATION") {
                        window.dispatchEvent(new CustomEvent("push-notification", {
                            detail: { title: event.data.title, body: event.data.body },
                        }));
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
