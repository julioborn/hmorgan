"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusherClient";

export default function Notificador({ userRole }: { userRole: "admin" | "cliente" }) {
    const router = useRouter();

    useEffect(() => {
        // 🚀 Suscribirse al canal global de notificaciones
        const canal = pusherClient.subscribe(`notificaciones-${userRole}`);

        // 🧭 Escuchar los nuevos mensajes en tiempo real
        canal.bind("nuevo-mensaje", (data: any) => {
            // Evitar que el remitente se notifique a sí mismo
            if (data.remitente === userRole) return;

            // 🔊 Sonido
            const audio = new Audio("/notif.mp3");
            audio.play().catch(() => { });

            // 🧭 Redirección dinámica según rol
            const base = userRole === "admin" ? "/admin/pedidos" : "/cliente/mis-pedidos";
            const chatUrl = `${base}/${data.pedidoId}/chat`;

            // 💬 Notificación del navegador
            if (Notification.permission === "granted") {
                const notification = new Notification("💬 Nuevo mensaje", {
                    body:
                        data.remitente === "admin"
                            ? "El administrador te ha enviado un mensaje."
                            : "Un cliente te ha escrito.",
                    icon: "/logo.png",
                });

                // 👇 Al hacer clic, ir directamente al chat
                notification.onclick = () => {
                    window.focus();
                    router.push(chatUrl);
                };
            } else if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        });

        // 🧹 Limpieza al desmontar
        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`notificaciones-${userRole}`);
        };
    }, [userRole, router]);

    return null;
}
