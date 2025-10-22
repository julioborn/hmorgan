"use client";
import { useEffect } from "react";
import { pusherClient } from "@/lib/pusherClient";

export default function Notificador({ userRole }: { userRole: "admin" | "cliente" }) {
    useEffect(() => {
        // suscripción a todos los canales de pedidos del usuario (opcional: solo los activos)
        const canal = pusherClient.subscribe(`notificaciones-${userRole}`);

        canal.bind("nuevo-mensaje", (data: any) => {
            if (data.remitente !== userRole) {
                const audio = new Audio("/notif.mp3");
                audio.play().catch(() => { });
                if (Notification.permission === "granted") {
                    new Notification("💬 Nuevo mensaje", {
                        body:
                            data.remitente === "admin"
                                ? "El administrador te ha enviado un mensaje."
                                : "Un cliente te ha escrito.",
                        icon: "/logo.png",
                    });
                }
            }
        });

        // pedir permiso de notificación
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`notificaciones-${userRole}`);
        };
    }, [userRole]);

    return null;
}
