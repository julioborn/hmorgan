"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusherClient";

export default function Notificador({ userRole }: { userRole: "admin" | "cliente" }) {
    const router = useRouter();
    const pathname = usePathname(); // 👈 detecta en qué página está el usuario

    useEffect(() => {
        const canal = pusherClient.subscribe(`notificaciones-${userRole}`);

        canal.bind("nuevo-mensaje", (data: any) => {
            if (data.remitente === userRole) return;

            // 🔍 Si el usuario ya está dentro del chat de este pedido, no mostrar notificación
            const chatUrl = userRole === "admin"
                ? `/admin/pedidos/${data.pedidoId}/chat`
                : `/cliente/mis-pedidos/${data.pedidoId}/chat`;

            if (pathname === chatUrl) return; // 👈 evita notificar dentro del chat

            // 🔊 Reproducir sonido
            const audio = new Audio("/notif.mp3");
            audio.play().catch(() => { });

            // 🔔 Mostrar notificación del navegador
            if (Notification.permission === "granted") {
                const notification = new Notification("💬 Nuevo mensaje", {
                    body:
                        data.remitente === "admin"
                            ? "El administrador te ha enviado un mensaje."
                            : "Un cliente te ha escrito.",
                    icon: "/logo.png",
                });

                // 🧭 Redirigir al chat correspondiente al hacer clic
                notification.onclick = () => {
                    window.focus();
                    router.push(chatUrl);
                };
            } else if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        });

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`notificaciones-${userRole}`);
        };
    }, [userRole, pathname, router]);

    return null;
}
