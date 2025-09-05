"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "starting" | "on" | "error";

export default function ScanRewardPage() {
    const params = useSearchParams();
    const rewardId = params.get("rewardId");

    const videoRef = useRef<HTMLVideoElement>(null);
    const zxingReaderRef = useRef<any>(null);
    const camStateRef = useRef<CamState>("idle");

    const [camState, setCamState] = useState<CamState>("idle");
    const [status, setStatus] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [flash, setFlash] = useState(false);
    const [scanToast, setScanToast] = useState<string>("");

    useEffect(() => {
        return () => stopCamera();
    }, []);

    async function supportsNativeQR(): Promise<boolean> {
        // @ts-expect-error experimental
        const BD = window.BarcodeDetector;
        if (!BD) return false;
        try {
            const formats: string[] = await BD.getSupportedFormats();
            return formats.includes("qr_code");
        } catch {
            return false;
        }
    }

    async function startCamera() {
        setCamState("starting");
        setStatus("Activando cámara…");
        stopCamera();

        try {
            const canNative = await supportsNativeQR();
            // @ts-expect-error experimental
            const NativeBD = window.BarcodeDetector;

            if (canNative && NativeBD && videoRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                });
                videoRef.current.srcObject = stream;
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
                requestAnimationFrame(tick);
                return;
            }

            // fallback ZXing
            const { BrowserMultiFormatReader } = await import("@zxing/browser");
            const reader = new BrowserMultiFormatReader();
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
                { video: { facingMode: "environment" } },
                videoRef.current!,
                async (result) => {
                    if (result?.getText) await onRawQr(result.getText());
                }
            );

            camStateRef.current = "on";
            setCamState("on");
        } catch (err) {
            console.error(err);
            setCamState("error");
            setStatus("No se pudo iniciar cámara");
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

    async function onRawQr(raw: string) {
        let token = raw.trim();
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.qrToken) token = String(parsed.qrToken);
        } catch { }

        if (!rewardId) {
            setStatus("❌ Falta rewardId en la URL");
            return;
        }

        setStatus("Procesando canje…");

        const res = await fetch("/api/canjes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardId, qrToken: token }),
        });

        const data = await res.json();
        if (res.ok) {
            setScanToast(`Canje: ${data.canje?.rewardId?.titulo || "Recompensa"}`);
            setFlash(true);
            setTimeout(() => setFlash(false), 180);
            setTimeout(() => setScanToast(""), 2000);
            setStatus("✅ Canje realizado correctamente");
        } else {
            setStatus(`❌ Error: ${data.message}`);
        }

        stopCamera();
        setCamState("idle");
    }

    const camPill = {
        idle: { text: "Cámara inactiva", cls: "bg-white/10 text-white" },
        starting: { text: "Activando cámara…", cls: "bg-amber-500/20 text-amber-300" },
        on: { text: "Escaneando…", cls: "bg-emerald-500/20 text-emerald-300" },
        error: { text: "Error de cámara", cls: "bg-rose-500/20 text-rose-300" },
    }[camState];

    return (
        <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Escanear QR para canje</h1>

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

                {/* Toast de escaneo */}
                <div
                    aria-live="polite"
                    className={`absolute top-3 right-3 z-20 transition-all duration-200 ${scanToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                        }`}
                >
                    <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur px-3 py-1.5 text-xs">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-2" />
                        {scanToast}
                    </div>
                </div>

                {/* Video */}
                <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[3/2] bg-black">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                    {/* Flash éxito */}
                    {flash && (
                        <div className="pointer-events-none absolute inset-0 bg-emerald-400/25 animate-pulse" />
                    )}

                    {/* Overlay guía */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25" />
                        <div className="absolute inset-6 md:inset-8 rounded-2xl border-2 border-white/25" />
                    </div>
                </div>

                {/* Controles cámara */}
                <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10 bg-black/40 backdrop-blur">
                    {camState !== "on" ? (
                        <button
                            onClick={startCamera}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:shadow-lg transition-shadow"
                        >
                            {camState === "starting" ? "Activando…" : "Activar cámara"}
                        </button>
                    ) : (
                        <button
                            onClick={stopCamera}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold border border-white/10 hover:bg-zinc-800"
                        >
                            Detener
                        </button>
                    )}
                </div>

                {errMsg && <div className="px-3 pb-3 text-sm text-rose-300">{errMsg}</div>}
            </div>

            {status && <p className="text-sm opacity-80">{status}</p>}
        </div>
    );
}
