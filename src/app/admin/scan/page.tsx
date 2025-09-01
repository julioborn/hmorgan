"use client";
import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "starting" | "on" | "error";
type Person = { id: string; nombre: string; apellido: string; dni: string; points: number };

const RATIO = Number(process.env.NEXT_PUBLIC_POINTS_PER_ARS ?? 0.001); // opcional para preview

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<any>(null); // BrowserMultiFormatReader
  const [camState, setCamState] = useState<CamState>("idle");
  const [status, setStatus] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const [mesa, setMesa] = useState<string>("");
  const [consumo, setConsumo] = useState<number>(0);

  const [people, setPeople] = useState<Person[]>([]);

  function stopCamera() {
    // parar getUserMedia
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) (videoRef.current as HTMLVideoElement).srcObject = null;
    // parar ZXing si estaba activo
    if (zxingReaderRef.current?.reset) {
      try { zxingReaderRef.current.reset(); } catch { }
    }
  }

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setErrMsg("");
    setStatus("Solicitando permisos de cámara…");
    setCamState("starting");
    stopCamera();

    try {
      // 1) Intento con BarcodeDetector nativo
      // @ts-expect-error experimental
      const NativeBD = window.BarcodeDetector;
      if (NativeBD && videoRef.current) {
        // arrancar stream normal
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        (videoRef.current as HTMLVideoElement).srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();

        const detector = new NativeBD({ formats: ["qr_code"] });
        let running = true;
        const tick = async () => {
          if (!running || !videoRef.current) return;
          try {
            const det = await detector.detect(videoRef.current);
            const raw = det?.[0]?.rawValue;
            if (raw) await onRawQr(raw);
          } catch { }
          requestAnimationFrame(tick);
        };
        setCamState("on");
        setStatus("Cámara activa. Escaneá QRs de la mesa.");
        requestAnimationFrame(tick);
        return;
      }

      // 2) Fallback ZXing (funciona en iOS/Android)
      // 1) Reader desde @zxing/browser
      const { BrowserMultiFormatReader } = await import("@zxing/browser");

      // 2) Tipos desde @zxing/library
      const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
      zxingReaderRef.current = reader;

      // Elegir cámara trasera si existe
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const back =
        devices.find((d) => /back|rear|trase|environment/i.test(d.label || ""))?.deviceId ||
        devices[0]?.deviceId;

      await reader.decodeFromVideoDevice(back ?? undefined, videoRef.current!, async (result, err) => {
        if (result?.getText) {
          const raw = result.getText();
          await onRawQr(raw);
        }
      });

      setCamState("on");
      setStatus("Cámara activa (ZXing). Escaneá QRs de la mesa.");
    } catch (err: any) {
      console.error(err);
      setCamState("error");
      const name = err?.name || "";
      if (name === "NotAllowedError") setErrMsg("Permiso de cámara denegado.");
      else if (name === "NotFoundError") setErrMsg("No se encontró cámara.");
      else if (name === "NotReadableError") setErrMsg("La cámara está en uso por otra app.");
      else setErrMsg("No se pudo acceder a la cámara.");
    }
  }

  // Acepta JSON {qrToken} o token plano
  async function onRawQr(raw: string) {
    let token = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.qrToken) token = String(parsed.qrToken);
    } catch { }
    try {
      const res = await fetch(`/api/scan/resolve?qrToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "QR inválido");
      const user: Person = data.user;
      if (!people.some((p) => p.id === user.id)) {
        setPeople((prev) => [...prev, user]);
        setStatus(`Agregado: ${user.nombre} ${user.apellido} (${user.dni})`);
      } else {
        setStatus("Ya estaba escaneado.");
      }
    } catch (e: any) {
      setStatus(e?.message || "QR inválido");
    }
  }

  async function finalizeTable() {
    if (!consumo || consumo <= 0) { alert("Ingresá el consumo total de la mesa."); return; }
    if (people.length === 0) { alert("Escaneá al menos un cliente."); return; }

    const userIds = people.map((p) => p.id);
    const res = await fetch("/api/scan/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumoARS: Number(consumo), userIds, mesa: mesa || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(`OK: ${data.totalPoints} puntos repartidos entre ${data.repartidos}.`);
      setPeople([]); setConsumo(0); setMesa("");
      stopCamera(); setCamState("idle");
    } else {
      alert(data.error || "Error finalizando mesa");
    }
  }

  // --- PREVIEW de puntos ---
  const totalPoints = Math.floor(Number(consumo || 0) * RATIO);
  const porCabeza = people.length ? Math.floor(totalPoints / people.length) : 0;
  const resto = people.length ? totalPoints - porCabeza * people.length : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-extrabold">Mesa: escanear & asignar puntos</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-[360px] object-cover"
            playsInline
            muted
            autoPlay
          />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* teclado numérico para mesa */}
            <input
              className="p-3 rounded bg-white/10"
              placeholder="Nº de mesa"
              value={mesa}
              onChange={(e) => setMesa(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            {/* teclado numérico para consumo */}
            <input
              type="number"
              className="p-3 rounded bg-white/10"
              placeholder="Consumo total ARS"
              value={Number.isNaN(consumo) ? "" : consumo}
              onChange={(e) => setConsumo(Number(e.target.value))}
              inputMode="decimal"
              step="1"
              min="0"
            />
          </div>

          {/* PREVIEW puntos */}
          <div className="p-3 rounded bg-white/5 border border-white/10 text-sm">
            <div className="font-semibold mb-1">Resumen de puntos</div>
            <div>Total a generar: <b>{totalPoints}</b></div>
            <div>Personas: <b>{people.length}</b></div>
            <div>
              Por cabeza: <b>{porCabeza}</b>
              {resto > 0 && <> · Sobrante por distribuir: <b>{resto}</b></>}
            </div>
          </div>

          <div className="p-3 rounded bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">Estado</div>
            <div className="font-bold">{status || "Ingresá el monto y activá la cámara para empezar."}</div>
            {errMsg && <div className="mt-2 text-sm text-rose-400">{errMsg}</div>}
          </div>

          {camState !== "on" ? (
            <button onClick={startCamera} className="w-full py-3 rounded bg-indigo-600 text-white font-bold">
              {camState === "starting" ? "Activando..." : "Comenzar mesa (activar cámara)"}
            </button>
          ) : (
            <button onClick={() => { stopCamera(); setCamState("idle"); }} className="w-full py-3 rounded bg-black text-white font-bold">
              Detener cámara
            </button>
          )}

          {/* Lista */}
          <div className="rounded-xl border border-white/10 divide-y divide-white/10">
            <div className="p-2 text-sm opacity-80">Escaneados ({people.length})</div>
            {people.length === 0 && <div className="p-3 opacity-70">Sin personas aún.</div>}
            {people.map((p, i) => (
              <div key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.nombre} {p.apellido}</div>
                  <div className="text-sm opacity-70">DNI: {p.dni} · Puntos actuales: {p.points}</div>
                </div>
                <button
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-sm"
                  onClick={() => setPeople(prev => prev.filter(x => x.id !== p.id))}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <button onClick={finalizeTable} className="w-full py-3 rounded bg-emerald-600 text-white font-bold">
            Finalizar y asignar puntos
          </button>
        </div>
      </div>
    </div>
  );
}
