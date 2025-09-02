"use client";
import { useEffect, useRef, useState } from "react";

// Tipos
type CamState = "idle" | "starting" | "on" | "error";
type Person = { id: string; nombre: string; apellido: string; dni: string; points: number };

const RATIO = Number(process.env.NEXT_PUBLIC_POINTS_PER_ARS ?? 0.001);

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<any>(null); // BrowserMultiFormatReader
  const seenIdsRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const inFlightTokensRef = useRef<Set<string>>(new Set());

  const [camState, setCamState] = useState<CamState>("idle");
  const [status, setStatus] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [consumoStr, setConsumoStr] = useState<string>("");
  const [mesa, setMesa] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);

  // 🎉 Toast y flash de escaneo
  const [scanToast, setScanToast] = useState<string>("");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [flash, setFlash] = useState(false);

  // helpers
  function sanitizeMesa(v: string) {
    let s = v.replace(/\D/g, "");
    s = s.replace(/^0+(?=\d)/, "");
    return s;
  }
  function sanitizeMoney(v: string) {
    let s = v.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    if (s.startsWith(".")) s = "0" + s;
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    if (s.includes(".")) {
      const [int, dec] = s.split(".");
      s = int.replace(/^0+(?=\d)/, "") + "." + (dec ?? "");
      if (s.startsWith(".")) s = "0" + s;
    } else {
      s = s.replace(/^0+(?=\d)/, "");
    }
    return s;
  }

  const consumo = moneyToNumber(consumoStr);
  const canStart = Boolean(mesa && consumo > 0);

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) (videoRef.current as HTMLVideoElement).srcObject = null;
    if (zxingReaderRef.current?.reset) {
      try { zxingReaderRef.current.reset(); } catch { }
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function startCamera() {
    if (!canStart) {
      setStatus("Completá Nº de mesa y consumo antes de activar la cámara.");
      setErrMsg("Falta completar datos para iniciar.");
      return;
    }

    setErrMsg("");
    setStatus("Solicitando permisos de cámara…");
    setCamState("starting");
    stopCamera();

    try {
      // @ts-expect-error experimental
      const NativeBD = window.BarcodeDetector;
      if (NativeBD && videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        (videoRef.current as HTMLVideoElement).srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();

        const detector = new NativeBD({ formats: ["qr_code"] });
        const tick = async () => {
          if (!videoRef.current || camState !== "on") return;
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

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
      zxingReaderRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const back =
        devices.find((d) => /back|rear|trase|environment/i.test(d.label || ""))?.deviceId ||
        devices[0]?.deviceId;

      await reader.decodeFromVideoDevice(back ?? undefined, videoRef.current!, async (result) => {
        if (result?.getText) {
          const raw = result.getText();
          await onRawQr(raw);
        }
      });

      setCamState("on");
      setStatus("Cámara activa, escaneá los QRs de la mesa.");
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
    if (busyRef.current) return;
    busyRef.current = true;

    let token = raw.trim();
    try { const parsed = JSON.parse(raw); if (parsed?.qrToken) token = String(parsed.qrToken); } catch { }

    if (inFlightTokensRef.current.has(token)) { busyRef.current = false; return; }
    inFlightTokensRef.current.add(token);

    try {
      const res = await fetch(`/api/scan/resolve?qrToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "QR inválido");
      const user: Person = data.user;

      if (!seenIdsRef.current.has(user.id)) {
        seenIdsRef.current.add(user.id);
        setPeople((prev) => [...prev, user]);
        setStatus(`Agregado: ${user.nombre} ${user.apellido} (${user.dni})`);

        // 🎉 Toast + flash
        setScanToast(`${user.nombre} ${user.apellido}`);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setScanToast(""), 1800);
        setFlash(true);
        setTimeout(() => setFlash(false), 180);
      } else {
        setStatus("Ya estaba escaneado.");
      }
    } catch (e: any) {
      setStatus(e?.message || "QR inválido");
    } finally {
      inFlightTokensRef.current.delete(token);
      setTimeout(() => { busyRef.current = false; }, 700);
    }
  }

  async function finalizeTable() {
    if (!consumo || consumo <= 0) { alert("Ingresá el consumo total de la mesa."); return; }
    if (people.length === 0) { alert("Escaneá al menos un cliente."); return; }

    const userIds = people.map((p) => p.id);

    const res = await fetch("/api/scan/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumoARS: consumo, userIds, mesa: mesa || undefined })
    });

    const data = await res.json();

    if (res.ok) {
      setStatus(`OK: ${data.totalPoints} puntos repartidos entre ${data.repartidos}.`);
      setPeople([]); setConsumoStr(""); setMesa(""); stopCamera(); setCamState("idle");
      seenIdsRef.current.clear(); inFlightTokensRef.current.clear();
    } else {
      alert(data.error || "Error finalizando mesa");
    }
  }

  // PREVIEW
  const totalPoints = Math.floor(Number(consumo || 0) * RATIO);
  const porCabeza = people.length ? Math.floor(totalPoints / people.length) : 0;
  const resto = people.length ? totalPoints - porCabeza * people.length : 0;

  const camPill = {
    idle: { text: "Cámara inactiva", cls: "bg-white/10 text-white" },
    starting: { text: "Activando cámara…", cls: "bg-amber-500/20 text-amber-300" },
    on: { text: "Escaneando…", cls: "bg-emerald-500/20 text-emerald-300" },
    error: { text: "Error de cámara", cls: "bg-rose-500/20 text-rose-300" }
  }[camState];

  // Muestra "12.345,67" mientras el usuario escribe
  function formatMoneyInput(v: string): string {
    // quitar puntos que puedan venir pegados y todo lo que no sea dígito o coma
    v = v.replace(/\./g, "").replace(/[^\d,]/g, "");

    const hasComma = v.includes(",");
    const [rawInt = "", rawDec = ""] = v.split(",");

    // normalizar enteros (sin ceros a la izquierda, salvo 0)
    let int = rawInt.replace(/^0+(?=\d)/, "") || "0";
    // agrupar miles con punto
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // mantener solo 2 decimales
    const dec = rawDec.replace(/,/g, "").slice(0, 2);

    // si el usuario escribió la coma, devolvemos la coma aunque no haya decimales
    return hasComma ? `${int},${dec}` : int;
  }

  // Convierte "12.345,67" -> 12345.67 (número)
  function moneyToNumber(s: string): number {
    if (!s) return 0;
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">

      <div className="grid md:grid-cols-2 gap-6">
        {/* Panel Cámara */}
        <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black">

          {/* Chip estado */}
          <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur bg-black/40 border border-white/10">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${camState === "on" ? "bg-emerald-400 animate-pulse" : camState === "starting" ? "bg-amber-400 animate-pulse" : camState === "error" ? "bg-rose-400" : "bg-zinc-400"}`} />
            <span className={camPill.cls}>{camPill.text}</span>
          </div>

          {/* Toast de escaneo */}
          <div
            aria-live="polite"
            className={`absolute top-3 right-3 z-20 transition-all duration-200
                        ${scanToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
          >
            <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur px-3 py-1.5 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-2" />
              Escaneado: <b>{scanToast}</b>
            </div>
          </div>

          {/* Vídeo (más cuadrado) */}
          <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[3/2] bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* Flash éxito */}
            {flash && <div className="pointer-events-none absolute inset-0 bg-emerald-400/25 animate-pulse" />}

            {/* Overlay de guía */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25" />
              <div className="absolute inset-6 md:inset-8 rounded-2xl border-2 border-white/25" />
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,.15) 0 1px, transparent 1px 24px), repeating-linear-gradient(0deg, rgba(255,255,255,.15) 0 1px, transparent 1px 24px)"
                }}
              />
            </div>
          </div>

          {/* Controles cámara */}
          <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10 bg-black/40 backdrop-blur">
            {camState !== "on" ? (
              <button
                onClick={startCamera}
                disabled={!canStart || camState === "starting"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow hover:shadow-lg transition-shadow"
                title={!canStart ? "Ingresá Nº de mesa y consumo para activar" : ""}
              >
                {camState === "starting" ? "Activando…" : "Activar cámara"}
              </button>
            ) : (
              <button
                onClick={() => { stopCamera(); setCamState("idle"); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold border border-white/10 hover:bg-zinc-800"
              >
                Detener
              </button>
            )}
          </div>

          {errMsg && <div className="px-3 pb-3 text-sm text-rose-300">{errMsg}</div>}
        </div>

        {/* Panel de control */}
        <div className="space-y-4">
          {/* Inputs */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Nº de mesa</label>
                <input
                  className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                  value={mesa}
                  onChange={(e) => setMesa(sanitizeMesa(e.target.value))}
                  inputMode="numeric"
                  type="text"
                  pattern="[0-9]*"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Total $</label>
                <input
                  className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                  placeholder="0,00"
                  value={consumoStr}
                  onChange={(e) => setConsumoStr(formatMoneyInput(e.target.value))}
                  inputMode="decimal"
                  type="text"
                  lang="es-AR"
                />
              </div>
            </div>
          </div>

          {/* Resumen puntos */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4">
            <div className="text-sm font-semibold mb-2">Puntos</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="Total personas" value={people.length} />
              <Metric label="Total puntos" value={totalPoints} />
              <Metric label="Por persona" value={porCabeza} suffix={resto > 0 ? `(+${resto} resto)` : undefined} />
            </div>
          </div>

          {/* Lista */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 text-sm bg-white/[0.04]">
              <div className="opacity-80">Escaneados ({people.length})</div>
              {people.length > 0 && (
                <button
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                  onClick={() => { setPeople([]); seenIdsRef.current.clear(); }}
                >
                  Vaciar
                </button>
              )}
            </div>
            {people.length === 0 ? (
              <div className="p-4 text-sm opacity-70">Sin personas aún.</div>
            ) : (
              <ul className="divide-y divide-white/10 max-h-[260px] overflow-auto">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid place-items-center h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-300 font-bold">
                        {getInitials(p.nombre, p.apellido)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.nombre} {p.apellido}</div>
                        <div className="text-xs opacity-70 truncate">DNI: {p.dni} · Puntos actuales: {p.points}</div>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
                      onClick={() => { setPeople((prev) => prev.filter(x => x.id !== p.id)); seenIdsRef.current.delete(p.id); }}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={finalizeTable}
            className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow hover:shadow-lg transition-shadow disabled:opacity-60"
            disabled={!people.length || !consumo}
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====== Métrica con alineación estable ====== */
function Metric({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
      {/* Reserva 2 líneas para que el número quede alineado entre tarjetas */}
      <div className="h-8 sm:h-9 flex items-end">
        <div className="text-[11px] uppercase tracking-wide opacity-70 leading-tight">{label}</div>
      </div>
      <div className="mt-1 text-xl font-extrabold leading-none tabular-nums">{value}</div>
      {suffix && <div className="mt-0.5 text-[11px] opacity-70 leading-tight">{suffix}</div>}
    </div>
  );
}

function getInitials(n: string, a: string) {
  const i1 = (n?.[0] || "").toUpperCase();
  const i2 = (a?.[0] || "").toUpperCase();
  return `${i1}${i2}` || "?";
}
