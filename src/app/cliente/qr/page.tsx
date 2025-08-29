"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
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

  if (!user) return <div className="p-6">Cargando…</div>;

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
          <a href="/cliente/puntos" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15">Ver historial</a>
        </div>
      </div>
    </div>
  );
}
