"use client";
import useSWR from "swr";
import { useEffect, useRef, useState } from "react";

type Reward = {
    _id: string;
    titulo: string;
    puntos: number;
};

type CamState = "idle" | "starting" | "on" | "error";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScanRewardPage() {
    const { data: rewards } = useSWR<Reward[]>("/api/rewards", fetcher);
    const [selectedReward, setSelectedReward] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const zxingReaderRef = useRef<any>(null);
    const camStateRef = useRef<CamState>("idle");

    const [camState, setCamState] = useState<CamState>("idle");
    const [status, setStatus] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        camStateRef.current = camState;
    }, [camState]);

    async function supportsNativeQR(): Promise<boolean> {
        // @ts-expect-error experimental
        const BD = window.BarcodeDetector;
        if (!BD) return false;
        try {
            if (typeof BD.getSupportedFormats === "function") {
                const formats: string[] = await BD.getSupportedFormats();
                return formats.includes("qr_code");
            }
            return true;
        } catch {
            return false;
        }
    }

    function stopCamera() {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;

        try {
            zxingReaderRef.current?.reset?.();
        } catch { }
        camStateRef.current = "idle";
    }

    useEffect(() => {
        return () => stopCamera();
    }, []);

    async function startCamera() {
        if (!selectedReward) {
            setStatus("Seleccioná una recompensa antes de activar la cámara.");
            setErrMsg("Falta seleccionar recompensa.");
            return;
        }

        setErrMsg("");
        setStatus("Solicitando permisos de cámara…");
        setCamState("starting");
        stopCamera();

        try {
            const canNative = await supportsNativeQR();

            // Nativo
            // @ts-expect-error experimental
            const NativeBD = window.BarcodeDetector;
            if (canNative && NativeBD && videoRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
                });
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                videoRef.current.setAttribute("playsinline", "true");
                await videoRef.current.play();

                const detector = new NativeBD({ formats: ["qr_code"] });
                const tick = async () => {
                    if (!videoRef.current || camStateRef.current !== "on") return;
                    try {
                        const det = await detector.detect(videoRef.current);
                        const raw = det?.[0]?.rawValue;
                        if (raw) await onRawQr(raw);
                    } catch { }
                    requestAnimationFrame(tick);
                };

                camStateRef.current = "on";
                setCamState("on");
                setStatus("Cámara activa (nativo). Escaneá el QR del cliente.");
                requestAnimationFrame(tick);
                return;
            }

            // ZXing fallback
            const { BrowserMultiFormatReader } = await import("@zxing/browser");
            const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
            hints.set(DecodeHintType.TRY_HARDER, true);

            const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
                { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
                videoRef.current!,
                async (result) => {
                    if (result?.getText) await onRawQr(result.getText());
                }
            );

            camStateRef.current = "on";
            setCamState("on");
            setStatus("Cámara activa (ZXing). Escaneá el QR del cliente.");
        } catch (err: any) {
            console.error(err);
            setCamState("error");
            const name = err?.name || "";
            if (name === "NotAllowedError") setErrMsg("Permiso de cámara denegado.");
            else if (name === "NotFoundError") setErrMsg("No se encontró cámara.");
            else setErrMsg("No se pudo acceder a la cámara.");
        }
    }

    async function onRawQr(raw: string) {
        if (!selectedReward) {
            setStatus("❌ Seleccioná una recompensa primero.");
            return;
        }

        let token = raw.trim();
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.qrToken) token = String(parsed.qrToken);
        } catch { }

        setFlash(true);
        setTimeout(() => setFlash(false), 180);

        setStatus("Procesando canje…");

        const res = await fetch("/api/canjes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardId: selectedReward, qrToken: token }),
        });

        const data = await res.json();
        if (res.ok) {
            setStatus(`✅ Canje realizado: ${data.canje.rewardId.titulo || "Recompensa"}`);
        } else {
            setStatus(`❌ Error: ${data.message}`);
        }
    }

    const camPill = {
        idle: { text: "Cámara inactiva", cls: "bg-white/10 text-white" },
        starting: { text: "Activando cámara…", cls: "bg-amber-500/20 text-amber-300" },
        on: { text: "Escaneando…", cls: "bg-emerald-500/20 text-emerald-300" },
        error: { text: "Error de cámara", cls: "bg-rose-500/20 text-rose-300" },
    }[camState];

    return (
        <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Escanear QR para canje</h1>

            {/* Selector de recompensa */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                {rewards ? (
                    <select
                        className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                        value={selectedReward || ""}
                        onChange={(e) => setSelectedReward(e.target.value)}
                    >
                        <option value="">Seleccioná una recompensa</option>
                        {rewards.map((r) => (
                            <option key={r._id} value={r._id}>
                                {r.titulo} — {r.puntos} pts
                            </option>
                        ))}
                    </select>
                ) : (
                    <p>Cargando recompensas...</p>
                )}
            </div>

            {/* Panel cámara */}
            <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black">
                {/* Chip estado */}
                <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur bg-black/40 border border-white/10">
                    <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${camState === "on"
                                ? "bg-emerald-400 animate-pulse"
                                : camState === "starting"
                                    ? "bg-amber-400 animate-pulse"
                                    : camState === "error"
                                        ? "bg-rose-400"
                                        : "bg-zinc-400"
                            }`}
                    />
                    <span className={camPill.cls}>{camPill.text}</span>
                </div>

                {/* Vídeo */}
                <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[3/2] bg-black">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                    {flash && <div className="pointer-events-none absolute inset-0 bg-emerald-400/25 animate-pulse" />}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25" />
                        <div className="absolute inset-6 md:inset-8 rounded-2xl border-2 border-white/25" />
                    </div>
                </div>

                {/* Controles */}
                <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10 bg-black/40 backdrop-blur">
                    {camState !== "on" ? (
                        <button
                            onClick={startCamera}
                            disabled={!selectedReward || camState === "starting"}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow hover:shadow-lg transition-shadow"
                        >
                            {camState === "starting" ? "Activando…" : "Activar cámara"}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                stopCamera();
                                setCamState("idle");
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold border border-white/10 hover:bg-zinc-800"
                        >
                            Detener
                        </button>
                    )}
                </div>
            </div>

            {status && <div className="text-sm">{status}</div>}
            {errMsg && <div className="text-sm text-rose-300">{errMsg}</div>}
        </div>
    );
}
