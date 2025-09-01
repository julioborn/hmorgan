"use client";
import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "starting" | "on" | "error";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [consumo, setConsumo] = useState<number>(0);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [camState, setCamState] = useState<CamState>("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    // Limpieza al salir
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setErrMsg("");
    setStatus("Solicitando permisos de cámara…");
    setCamState("starting");

    // 🔧 si ya había stream, lo corto antes de pedir otro
    stopCamera();

    try {
      let stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (stream && !isBackCamera(stream)) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const back = devices.find(
          (d) => d.kind === "videoinput" && /back|trase|rear|environment/i.test(d.label || "")
        );
        if (back?.deviceId) {
          stream.getTracks().forEach((t) => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: back.deviceId } },
          });
        }
      }

      if (!videoRef.current) return;
      // 👇 a veces TS se queja de srcObject; este cast evita ruido
      (videoRef.current as HTMLVideoElement).srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.setAttribute("playsinline", "true");
      await videoRef.current.play();

      setCamState("on");
      setStatus("Cámara activa. Apuntá al QR.");

      // @ts-expect-error experimental
      const Detector = window.BarcodeDetector;
      if (Detector) {
        const detector = new Detector({ formats: ["qr_code"] });
        let running = true;
        const tick = async () => {
          if (!running || !videoRef.current) return;
          try {
            const detections = await detector.detect(videoRef.current);
            const raw = detections?.[0]?.rawValue;
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed?.qrToken) {
                  setQrPayload(parsed);
                  setStatus("QR leído. Ingresá el consumo y confirmá.");
                  running = false;
                }
              } catch { }
            }
          } catch { }
          if (running) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } else {
        setStatus("Tu navegador no soporta lectura nativa de QR. Usá Ingreso manual.");
      }
    } catch (err: any) {
      console.error(err);
      setCamState("error");
      const name = err?.name || "";
      if (name === "NotAllowedError") {
        setErrMsg("Permiso de cámara denegado. Habilitalo en los Ajustes del navegador/sistema para este sitio.");
      } else if (name === "NotFoundError") {
        setErrMsg("No se encontró cámara. Verificá que el dispositivo tenga cámara disponible.");
      } else if (name === "NotReadableError") {
        setErrMsg("La cámara está en uso por otra app. Cerrala y reintentá.");
      } else {
        setErrMsg("No se pudo acceder a la cámara. Probá ingreso manual o revisá permisos.");
      }
    }
  }

  function isBackCamera(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.(); // 👈 opcional chain
    // @ts-ignore
    const facing = caps?.facingMode || track.getSettings?.().facingMode;
    return Array.isArray(facing) ? facing.includes("environment") : facing === "environment";
  }

  async function confirmar() {
    if (!qrPayload?.qrToken) { alert("Leé un QR válido o usá ingreso manual."); return; }
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
          <video
            ref={videoRef}
            className="w-full h-[340px] object-cover"
            // props importantes para iOS
            playsInline
            muted
            autoPlay
          />
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">Estado</div>
            <div className="font-bold">{status || "Listo para activar la cámara."}</div>
            {errMsg && <div className="mt-2 text-sm text-rose-400">{errMsg}</div>}
          </div>

          {camState !== "on" && (
            <button onClick={startCamera} className="w-full py-3 rounded bg-indigo-600 text-white font-bold">
              {camState === "starting" ? "Activando..." : "Activar cámara"}
            </button>
          )}

          <input
            type="number"
            placeholder="Consumo en ARS"
            className="w-full p-3 rounded bg-white/10"
            value={consumo || ""}
            onChange={e => setConsumo(Number(e.target.value))}
          />

          <button onClick={confirmar} className="w-full py-3 rounded bg-emerald-600 text-white font-bold">
            Confirmar y Sumar Puntos
          </button>

          <ManualEntry setStatus={setStatus} />
        </div>
      </div>
    </div>
  );
}

function ManualEntry({ setStatus }: { setStatus: (s: string) => void }) {
  const [qrToken, setQrToken] = useState("");
  const [consumo, setConsumo] = useState<number>(0);

  async function enviar() {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken, consumoARS: Number(consumo) })
    });
    const data = await res.json();
    if (res.ok) setStatus(`+${data.puntosSumados} puntos. Total: ${data.total}`);
    else alert(data.error || "Error");
  }

  return (
    <div className="mt-4 p-3 rounded border border-white/10">
      <div className="font-semibold mb-2">Ingreso manual</div>
      <input className="w-full p-2 rounded bg-white/10 mb-2" placeholder="qrToken"
        value={qrToken} onChange={e => setQrToken(e.target.value)} />
      <input className="w-full p-2 rounded bg-white/10 mb-2" type="number" placeholder="Consumo ARS"
        value={consumo || ""} onChange={e => setConsumo(Number(e.target.value))} />
      <button onClick={enviar} className="w-full py-2 rounded bg-black text-white">Sumar</button>
    </div>
  );
}
