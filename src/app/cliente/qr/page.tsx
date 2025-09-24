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
        Swal.fire("ℹ️", "Instalá la app (Añadir a inicio) para recibir notificaciones.", "info");
        return;
      }
      if (!hasSW || !hasPush || !hasNotif) {
        Swal.fire("❌", "Este dispositivo no soporta notificaciones push.", "error");
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        Swal.fire("⚠️", "No activaste las notificaciones.", "warning");
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
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04]">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-2xl font-extrabold">Mi QR</h1>
        </div>
        <div className="p-5 grid place-items-center">
          {png && <img src={png} alt="Mi QR" className="rounded-xl shadow-lg" />}
        </div>
        <div className="p-5 bg-white/5 flex items-center justify-between">
          <div className="flex">
            <div className="text-3xl font-extrabold">{user.puntos ?? 0}</div>
            <p className="mt-3 text-emerald-500 font-medium">pts</p>
          </div>
          <a
            href="/cliente/historial"
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
          >
            Ver historial
          </a>
        </div>
      </div>
    </div>
  );
}
