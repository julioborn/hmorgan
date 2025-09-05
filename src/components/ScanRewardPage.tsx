"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

type Reward = { _id: string; titulo: string; puntos: number };
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
    const [toast, setToast] = useState<string>("");

    // anti-spam refs
    const busyRef = useRef(false);
    const inFlightTokensRef = useRef<Set<string>>(new Set());

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
        if (!selectedReward) {
            setErrMsg("Seleccioná una recompensa antes de activar la cámara.");
            return;
        }
        setErrMsg("");
        setStatus("Solicitando permisos de cámara…");
        setCamState("starting");
        stopCamera();

        try {
            const canNative = await supportsNativeQR();
            // @ts-expect-error experimental
            const NativeBD = window.BarcodeDetector;

            if (canNative && NativeBD && videoRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
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
                setStatus("Cámara activa (nativo). Escaneá el QR.");
                requestAnimationFrame(tick);
                return;
            }

            // fallback ZXing
            const { BrowserMultiFormatReader } = await import("@zxing/browser");
            const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);

            const reader = new BrowserMultiFormatReader(hints, {
                delayBetweenScanAttempts: 120,
            });
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
                {
                    audio: false,
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                },
                videoRef.current!,
                async (result) => {
                    if (result?.getText) await onRawQr(result.getText());
                }
            );

            camStateRef.current = "on";
            setCamState("on");
            setStatus("Cámara activa (ZXing). Escaneá el QR.");
        } catch (err: any) {
            console.error(err);
            setCamState("error");
            if (err?.name === "NotAllowedError") setErrMsg("Permiso de cámara denegado.");
            else if (err?.name === "NotFoundError") setErrMsg("No se encontró cámara.");
            else setErrMsg("No se pudo acceder a la cámara.");
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
        setCamState("idle");
    }

    async function onRawQr(raw: string) {
        if (busyRef.current) return;
        busyRef.current = true;

        let token = raw.trim();
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.qrToken) token = String(parsed.qrToken);
        } catch { }

        if (!selectedReward) {
            setStatus("❌ Seleccioná una recompensa antes de escanear.");
            busyRef.current = false;
            return;
        }

        if (inFlightTokensRef.current.has(token)) {
            busyRef.current = false;
            return;
        }
        inFlightTokensRef.current.add(token);

        setStatus("Procesando canje…");

        try {
            const res = await fetch("/api/canjes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardId: selectedReward, qrToken: token }),
            });

            const data = await res.json();
            if (res.ok) {
                setToast(`Canje realizado: ${data.canje.rewardId.titulo || "Recompensa"}`);
                setFlash(true);
                setTimeout(() => setFlash(false), 200);
            } else {
                setToast(`Error: ${data.message}`);
            }
        } catch (e: any) {
            setToast(`Error de red: ${e.message}`);
        } finally {
            setTimeout(() => {
                busyRef.current = false;
                inFlightTokensRef.current.delete(token);
            }, 1000);
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

            {/* Selector recompensas */}
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
                {/* chip estado */}
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

                {/* video */}
                <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[3/2] bg-black">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                    {flash && <div className="pointer-events-none absolute inset-0 bg-emerald-400/25 animate-pulse" />}
                </div>

                {/* controles */}
                <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10 bg-black/40 backdrop-blur">
                    {camState !== "on" ? (
                        <button
                            onClick={startCamera}
                            disabled={camState === "starting"}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow hover:shadow-lg transition-shadow"
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

            {/* toast resultado */}
            {toast && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
                    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-zinc-900/90 border border-emerald-500/30 shadow-xl backdrop-blur px-4 py-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="font-semibold">{toast}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
