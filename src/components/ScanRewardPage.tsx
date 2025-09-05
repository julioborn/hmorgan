// src/components/admin/ScanRewardPage.tsx
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
    const [result, setResult] = useState<string | null>(null);

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
            setResult(`✅ Canje realizado: ${data.canje.rewardId.titulo || "Recompensa"}`);
        } else {
            setResult(`❌ Error: ${data.message}`);
        }
        stopCamera();
        setCamState("idle");
    }

    return (
        <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
            <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black">
                {/* Estado */}
                <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur bg-black/40 border border-white/10">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{camState === "on" ? "Escaneando…" : "Inactivo"}</span>
                </div>

                {/* Cámara */}
                <div className="relative aspect-square bg-black">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                </div>

                {/* Botones */}
                <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10 bg-black/40 backdrop-blur">
                    {camState !== "on" ? (
                        <button
                            onClick={startCamera}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:shadow-lg transition-shadow"
                        >
                            Activar cámara
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
            </div>

            {status && <p className="text-sm opacity-80">{status}</p>}
            {result && <p className="font-semibold">{result}</p>}
        </div>
    );
}
