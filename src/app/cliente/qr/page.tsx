"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
import { registerSW, subscribeUser } from "@/lib/push-client";

export default function MiQRPage() {
  const { user } = useAuth();
  const [png, setPng] = useState<string>("");
  const [notifStatus, setNotifStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!user?.qrToken) return;
      const payload = JSON.stringify({ qrToken: user.qrToken });
      const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 360 });
      setPng(dataUrl);
    })();
  }, [user?.qrToken]);

  if (!user) return <div className="p-6">Cargando…</div>;

  async function handleEnableNotifications() {
    try {
      // Diagnóstico de soporte
      const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any).standalone;
      const hasSW = "serviceWorker" in navigator;
      const hasPush = "PushManager" in window;
      const hasNotif = typeof Notification !== "undefined";

      if (!isStandalone) {
        setNotifStatus("iOS: instalá la app como PWA (Añadir a pantalla de inicio).");
        return;
      }
      if (!hasSW) { setNotifStatus("Este navegador no soporta Service Workers."); return; }
      if (!hasNotif) { setNotifStatus("API Notification no disponible en este contexto."); return; }
      if (!hasPush) { setNotifStatus("API PushManager no disponible (iOS requiere PWA e iOS ≥ 16.4)."); return; }

      setNotifStatus("Pidiendo permiso…");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setNotifStatus("Permiso denegado."); return; }

      setNotifStatus("Registrando Service Worker…");
      const reg = await registerSW();
      if (!reg) { setNotifStatus("No se pudo registrar el SW."); return; }

      setNotifStatus("Creando suscripción…");
      const sub = await subscribeUser(reg); // acá veremos el error “real” si falla
      if (!sub) { setNotifStatus("No se pudo crear la suscripción."); return; }

      setNotifStatus("✅ Activadas. Probá cerrar una mesa.");
    } catch (e: any) {
      setNotifStatus(`❌ ${e?.name || "Error"}: ${e?.message || "falló subscribe"}`);
      console.error(e);
    }
  }



  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04]">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-2xl font-extrabold">Mi QR</h1>
          <p className="opacity-80">Mostralo al mozo al finalizar tu consumo.</p>
        </div>
        <div className="p-5 grid place-items-center">
          {png && <img src={png} alt="Mi QR" className="rounded-xl shadow-lg" />}
        </div>
        <div className="p-5 bg-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">Puntos acumulados</div>
            <div className="text-3xl font-extrabold">{user.points ?? 0}</div>
          </div>
          <a
            href="/cliente/puntos"
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
          >
            Ver historial
          </a>
        </div>
      </div>

      {/* Botón para activar notificaciones */}
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={handleEnableNotifications}
          className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 text-white font-semibold transition"
        >
          Activar notificaciones
        </button>
        {notifStatus && <p className="mt-2 text-sm text-center opacity-80">{notifStatus}</p>}
      </div>

    </div>
  );
}
