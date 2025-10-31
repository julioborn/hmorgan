"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
import { registerSW, subscribeUser } from "@/lib/push-client";
import Loader from "@/components/Loader";
import Swal from "sweetalert2";
import { swalBase } from "@/lib/swalConfig";

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
        swalBase.fire(
          "ℹ️",
          "Instalá la app (Añadir a inicio) para recibir notificaciones.",
          "info"
        );
        return;
      }
      if (!hasSW || !hasPush || !hasNotif) {
        swalBase.fire("❌", "Este dispositivo no soporta notificaciones push.", "error");
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        swalBase.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
      }

      const reg = await registerSW();
      if (!reg) {
        swalBase.fire("❌", "No se pudo registrar el Service Worker.", "error");
        return;
      }

      const sub = await subscribeUser(reg);
      if (!sub) {
        swalBase.fire("❌", "No se pudo crear la suscripción.", "error");
        return;
      }

      swalBase.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
    } catch (e: any) {
      console.error(e);
      swalBase.fire("❌ Error", e?.message || "Falló la activación", "error");
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
    <div className="max-w-xl mx-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {/* Card principal */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-md">
        {/* Encabezado */}
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold text-black">Mi QR</h1>
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

        {/* Puntos y botón */}
        <div className="p-5 bg-gray-100 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-end">
            <div className="text-3xl font-extrabold text-black">
              {user.puntos ?? 0}
            </div>
            <p className="ml-2 mb-[2px] text-red-600 font-semibold text-lg">pts</p>
          </div>

          <a
            href="/cliente/historial"
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-sm"
          >
            Ver historial
          </a>
        </div>
      </div>

    </div>
  );
}
