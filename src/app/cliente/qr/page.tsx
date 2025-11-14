"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
import { registerSW, subscribeUser } from "@/lib/push-client";
import Loader from "@/components/Loader";
import Swal from "sweetalert2";

export default function MiQRPage() {
    const { user } = useAuth();
    const [png, setPng] = useState<string>("");

    useEffect(() => {
        (async () => {
            if (!user?.qrToken) return;
            const payload = JSON.stringify({ qrToken: user.qrToken });
            const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 360 });
            setPng(dataUrl);
        })();
    }, [user?.qrToken]);

    async function handleEnableNotifications() {
        try {
            const isStandalone =
                window.matchMedia?.("(display-mode: standalone)")?.matches ||
                (window.navigator as any).standalone;
            const hasSW = "serviceWorker" in navigator;
            const hasPush = "PushManager" in window;
            const hasNotif = typeof Notification !== "undefined";

            if (!isStandalone) {
                Swal.fire(
                    "ℹ️",
                    "Instalá la app (Añadir a inicio) para recibir notificaciones.",
                    "info"
                );
                return;
            }
            if (!hasSW || !hasPush || !hasNotif) {
                Swal.fire("❌", "Este dispositivo no soporta notificaciones push.", "error");
                return;
            }

            const perm = await Notification.requestPermission();
            if (perm !== "granted") {
                //Swal.fire("⚠️", "No activaste las notificaciones.", "warning");
                return;
            }

            const reg = await registerSW();
            if (!reg) {
                Swal.fire("❌", "No se pudo registrar el Service Worker.", "error");
                return;
            }

            const sub = await subscribeUser(reg);
            if (!sub) {
                Swal.fire("❌", "No se pudo crear la suscripción.", "error");
                return;
            }

            Swal.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
        } catch (e: any) {
            console.error(e);
            Swal.fire("❌ Error", e?.message || "Falló la activación", "error");
        }
    }

    if (!user) {
        return (
            <div className="py-20 flex justify-center items-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-6 space-y-4 bg-white min-h-screen">
            {/* Card principal */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-md">
                {/* Encabezado */}
                <div className="p-5 border-b border-gray-200">
                    <h1 className="text-4xl font-extrabold text-center text-black">Mi QR</h1>
                </div>

                {/* QR generado */}
                <div className="p-6 grid place-items-center bg-gray-50">
                    {png ? (
                        <img
                            src={png}
                            alt="Mi QR"
                            className="rounded-xl shadow-lg border border-gray-200"
                        />
                    ) : (
                        <Loader size={48} />
                    )}
                </div>

                {/* Puntos y botón — centrados verticalmente */}
                <div className="p-6 bg-gray-100 border-t border-gray-200 text-center">
                    <div>
                        <div className="text-4xl font-extrabold text-black">
                            {user.puntos ?? 0}
                            <span className="ml-1 text-red-600 text-2xl font-bold">pts</span>
                        </div>
                        <a
                            href="/cliente/historial"
                            className="inline-block mt-4 px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-sm"
                        >
                            Ver historial
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
