"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusherClient";

export default function Notificador({ userRole }: { userRole: "admin" | "cliente" }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === "undefined") return; // 👈 evita errores en SSR

        const canal = pusherClient.subscribe(`notificaciones-${userRole}`);

        canal.bind("nuevo-mensaje", (data: any) => {
            if (data.remitente === userRole) return;

            const chatUrl =
                userRole === "admin"
                    ? `/admin/pedidos/${data.pedidoId}/chat`
                    : `/cliente/mis-pedidos/${data.pedidoId}/chat`;

            // 🔊 Reproducir sonido
            try {
                const audio = new Audio("/notif.mp3");
                audio.play().catch(() => { });
            } catch { }

            // 🔔 Notificación navegador (solo si existe Notification)
            if (typeof Notification !== "undefined") {
                if (Notification.permission === "granted") {
                    const notification = new Notification("💬 Nuevo mensaje", {
                        body:
                            data.remitente === "admin"
                                ? "El bar te ha enviado un mensaje 🍻"
                                : "Un cliente te ha escrito 💬",
                        icon: "/logo.png",
                    });

                    notification.onclick = () => {
                        window.focus();
                        router.push(chatUrl);
                    };
                } else if (Notification.permission === "default") {
                    Notification.requestPermission();
                }
            }
        });

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`notificaciones-${userRole}`);
        };
    }, [userRole, pathname, router]);

    return null;
}
