"use client";
import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "starting" | "on" | "error";
type Person = { id: string; nombre: string; apellido: string; dni: string; points: number };

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camState, setCamState] = useState<CamState>("idle");
  const [status, setStatus] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const [mesa, setMesa] = useState<string>("");
  const [consumo, setConsumo] = useState<number>(0);

  const [people, setPeople] = useState<Person[]>([]);
  const [scanning, setScanning] = useState(false); // loop del detector

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) {
      (videoRef.current as HTMLVideoElement).srcObject = null;
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setErrMsg("");
    setStatus("Solicitando permisos de cámara…");
    setCamState("starting");
    stopCamera();

    try {
      let stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (!videoRef.current) return;
      (videoRef.current as HTMLVideoElement).srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.setAttribute("playsinline", "true");
      await videoRef.current.play();

      setCamState("on");
      setStatus("Cámara activa. Escaneá QRs de la mesa.");
      setScanning(true);
      startDetectorLoop();
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

  // Lector robusto: acepta JSON {qrToken} o token plano
  async function resolveQrToken(raw: string) {
    let token = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.qrToken) token = String(parsed.qrToken);
    } catch { }
    const res = await fetch(`/api/scan/resolve?qrToken=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "QR inválido");
    return data.user as Person;
  }

  function alreadyAdded(id: string) {
    return people.some((p) => p.id === id);
  }

  function startDetectorLoop() {
    // @ts-expect-error experimental
    const Detector = window.BarcodeDetector;
    if (!Detector) {
      setStatus("Sin lector nativo de QR. Usá el ingreso manual.");
      return;
    }
    const detector = new Detector({ formats: ["qr_code"] });
    let running = true;

    const tick = async () => {
      if (!running || !videoRef.current || !scanning) return;
      try {
        const detections = await detector.detect(videoRef.current);
        const raw = detections?.[0]?.rawValue;
        if (raw) {
          try {
            const user = await resolveQrToken(raw);
            if (!alreadyAdded(user.id)) {
              setPeople((prev) => [...prev, user]);
              setStatus(`Agregado: ${user.nombre} ${user.apellido} (${user.dni})`);
            } else {
              setStatus("Ya estaba escaneado.");
            }
            // pequeña pausa para evitar doble lectura instantánea
            await new Promise((r) => setTimeout(r, 800));
          } catch (e: any) {
            setStatus(e?.message || "QR inválido");
          }
        }
      } catch { }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }

  async function finalizeTable() {
    if (!consumo || consumo <= 0) {
      alert("Ingresá el consumo total de la mesa.");
      return;
    }
    if (people.length === 0) {
      alert("Escaneá al menos un cliente.");
      return;
    }
    const userIds = people.map((p) => p.id);
    const res = await fetch("/api/scan/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumoARS: Number(consumo), userIds, mesa: mesa || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(`OK: ${data.totalPoints} puntos repartidos entre ${data.repartidos}.`);
      setPeople([]);
      setConsumo(0);
      setMesa("");
      setScanning(false);
      stopCamera();
      setCamState("idle");
    } else {
      alert(data.error || "Error finalizando mesa");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-extrabold">Mesa: escanear & asignar puntos</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Columna cámara */}
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-[360px] object-cover"
            playsInline
            muted
            autoPlay
          />
        </div>

        {/* Columna control */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="p-3 rounded bg-white/10"
              placeholder="Nº de mesa (opcional)"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
            />
            <input
              type="number"
              className="p-3 rounded bg-white/10"
              placeholder="Consumo total ARS"
              value={consumo || ""}
              onChange={(e) => setConsumo(Number(e.target.value))}
            />
          </div>

          <div className="p-3 rounded bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">Estado</div>
            <div className="font-bold">{status || "Ingresá el monto y activá la cámara para empezar."}</div>
            {errMsg && <div className="mt-2 text-sm text-rose-400">{errMsg}</div>}
          </div>

          {camState !== "on" ? (
            <button
              onClick={startCamera}
              className="w-full py-3 rounded bg-indigo-600 text-white font-bold"
            >
              {camState === "starting" ? "Activando..." : "Comenzar mesa (activar cámara)"}
            </button>
          ) : (
            <button
              onClick={() => { setScanning(false); stopCamera(); setCamState("idle"); }}
              className="w-full py-3 rounded bg-black text-white font-bold"
            >
              Detener cámara
            </button>
          )}

          {/* Lista de personas escaneadas */}
          <div className="rounded-xl border border-white/10 divide-y divide-white/10">
            <div className="p-2 text-sm opacity-80">
              Escaneados ({people.length})
            </div>
            {people.map((p) => (
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
            {people.length === 0 && <div className="p-3 opacity-70">Sin personas aún.</div>}
          </div>

          <button
            onClick={finalizeTable}
            className="w-full py-3 rounded bg-emerald-600 text-white font-bold"
          >
            Finalizar y asignar puntos
          </button>

          {/* Ingreso manual de token */}
          <ManualEntry onResolved={async (token) => {
            try {
              const user = await resolveQrToken(token);
              if (!alreadyAdded(user.id)) {
                setPeople(prev => [...prev, user]);
                setStatus(`Agregado: ${user.nombre} ${user.apellido} (${user.dni})`);
              } else {
                setStatus("Ya estaba escaneado.");
              }
            } catch (e: any) {
              alert(e?.message || "QR inválido");
            }
          }} />
        </div>
      </div>
    </div>
  );
}

function ManualEntry({ onResolved }: { onResolved: (token: string) => void | Promise<void> }) {
  const [qrToken, setQrToken] = useState("");
  return (
    <div className="mt-2 p-3 rounded border border-white/10">
      <div className="font-semibold mb-2">Ingreso manual</div>
      <div className="flex gap-2">
        <input
          className="w-full p-2 rounded bg-white/10"
          placeholder="Pegá el QR o token"
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
        />
        <button
          className="px-4 rounded bg-white/10 hover:bg-white/15"
          onClick={() => onResolved(qrToken)}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
