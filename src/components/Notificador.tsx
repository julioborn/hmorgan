"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusherClient";
import Swal from "sweetalert2";

export default function Notificador({ userRole }: { userRole: "admin" | "cliente" }) {
    const router = useRouter();

    useEffect(() => {
        const canal = pusherClient.subscribe(`notificaciones-${userRole}`);

        canal.bind("nuevo-mensaje", async (data: any) => {
            // 🔊 Sonido SIEMPRE
            try {
                const audio = new Audio("/notif.mp3");
                await audio.play();
            } catch { }

            const chatUrl =
                userRole === "admin"
                    ? `/admin/pedidos/${data.pedidoId}/chat`
                    : `/cliente/mis-pedidos/${data.pedidoId}/chat`;

            // 🔔 Intentar notificación nativa
            if (Notification.permission === "granted") {
                const notification = new Notification("💬 Nuevo mensaje", {
                    body:
                        data.remitente === "admin"
                            ? "El administrador te ha enviado un mensaje."
                            : "Un cliente te ha escrito.",
                    icon: "/logo.png",
                });
                notification.onclick = () => {
                    window.focus();
                    router.push(chatUrl);
                };
            } else if (Notification.permission === "default") {
                Notification.requestPermission();
            }

            // 🧩 Fallback visual con SweetAlert (garantizado en cualquier navegador)
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "info",
                title:
                    data.remitente === "admin"
                        ? "💬 Nuevo mensaje del administrador"
                        : "💬 Nuevo mensaje de un cliente",
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true,
                background: "#111",
                color: "#fff",
                didOpen: (toast) => {
                    toast.addEventListener("click", () => {
                        router.push(chatUrl);
                    });
                },
            });
        });

        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`notificaciones-${userRole}`);
        };
    }, [userRole, router]);

    return null;
}
