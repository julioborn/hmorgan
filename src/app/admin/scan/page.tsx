"use client";
import { useEffect, useRef, useState } from "react";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [consumo, setConsumo] = useState<number>(0);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameTimer = 0;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // @ts-ignore - BarcodeDetector experimental
        const DetectorCtor = (window as any).BarcodeDetector;
        if (DetectorCtor) {
          const detector = new DetectorCtor({ formats: ["qr_code"] });
          const tick = async () => {
            if (!videoRef.current) return;
            try {
              const detections = await detector.detect(videoRef.current);
              if (detections?.[0]) {
                const raw = detections[0].rawValue;
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed?.qrToken) {
                    setQrPayload(parsed);
                    setStatus("QR leído. Ingresá el consumo y confirmá.");
                  }
                } catch {}
              }
            } catch {}
            frameTimer = requestAnimationFrame(tick);
          };
          frameTimer = requestAnimationFrame(tick);
        } else {
          setStatus("Tu navegador no soporta escaneo nativo. Usá el ingreso manual.");
        }
      } catch {
        setStatus("No se pudo acceder a la cámara. Usá el ingreso manual.");
      }
    }
    start();
    return () => {
      if (frameTimer) cancelAnimationFrame(frameTimer);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function confirmar() {
    if (!qrPayload?.qrToken) { alert("Leé un QR válido."); return; }
    if (!consumo || consumo <= 0) { alert("Ingresá el consumo en ARS."); return; }
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: qrPayload.qrToken, consumoARS: Number(consumo) })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(`+${data.puntosSumados} puntos. Total: ${data.total}`);
      setQrPayload(null);
      setConsumo(0);
    } else {
      alert(data.error || "Error");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-extrabold">Escanear & Sumar Puntos</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full h-[320px] object-cover" />
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">Estado</div>
            <div className="font-bold">{status || "Esperando QR..."}</div>
          </div>

          <input
            type="number"
            placeholder="Consumo en ARS"
            className="w-full p-3 rounded bg-white/10"
            value={consumo || ""}
            onChange={e=>setConsumo(Number(e.target.value))}
          />

          <button onClick={confirmar} className="w-full py-3 rounded bg-emerald-600 text-white font-bold">
            Confirmar y Sumar Puntos
          </button>

          <ManualEntry />
        </div>
      </div>
    </div>
  );
}

function ManualEntry() {
  const [qrToken, setQrToken] = useState("");
  const [consumo, setConsumo] = useState<number>(0);

  async function enviar() {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken, consumoARS: Number(consumo) })
    });
    const data = await res.json();
    if (res.ok) alert(`+${data.puntosSumados} puntos. Total: ${data.total}`);
    else alert(data.error || "Error");
  }

  return (
    <div className="mt-4 p-3 rounded border border-white/10">
      <div className="font-semibold mb-2">Ingreso manual</div>
      <input className="w-full p-2 rounded bg-white/10 mb-2" placeholder="qrToken"
        value={qrToken} onChange={e=>setQrToken(e.target.value)} />
      <input className="w-full p-2 rounded bg-white/10 mb-2" type="number" placeholder="Consumo ARS"
        value={consumo || ""} onChange={e=>setConsumo(Number(e.target.value))} />
      <button onClick={enviar} className="w-full py-2 rounded bg-black text-white">Sumar</button>
    </div>
  );
}
