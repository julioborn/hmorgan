"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Swal from "sweetalert2";
import Loader from "./Loader";
import { swalBase } from "@/lib/swalConfig";

type Reward = { _id: string; titulo: string; puntos: number };
type CamState = "idle" | "starting" | "on" | "error";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScanRewardPage() {
    const { data: rewards } = useSWR<Reward[]>("/api/rewards", fetcher);

    const [selectedReward, setSelectedReward] = useState<string | null>(null);
    const [camState, setCamState] = useState<CamState>("idle");
    const [errMsg, setErrMsg] = useState("");
    const [flash, setFlash] = useState(false);
    const [toast, setToast] = useState<string>("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const zxingReaderRef = useRef<any>(null);
    const camStateRef = useRef<CamState>("idle");
    const busyRef = useRef(false);
    const inFlightTokensRef = useRef<Set<string>>(new Set());

    useEffect(() => () => stopCamera(), []);

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
            setErrMsg("Seleccioná un canje antes de activar la cámara.");
            return;
        }
        setErrMsg("");
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
                        advanced: [{ focusMode: "continuous" } as any],
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
                requestAnimationFrame(tick);
                return;
            }

            // fallback ZXing
            const { BrowserMultiFormatReader } = await import("@zxing/browser");
            const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);

            const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
                {
                    audio: false,
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
                },
                videoRef.current!,
                async (result) => {
                    if (result?.getText) await onRawQr(result.getText());
                }
            );

            camStateRef.current = "on";
            setCamState("on");
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

        try {
            const res = await fetch(`/api/usuarios/qr/${token}`);
            if (!res.ok) throw new Error("QR inválido");
            const user = await res.json();
            const reward = rewards?.find((r) => r._id === selectedReward);

            const result = await swalBase.fire({
                title: "",
                html: `
        <div style="background: linear-gradient(145deg,#0f172a,#111827);border-radius:1rem;padding:1.5rem;text-align:left;
          box-shadow:0 0 25px rgba(239,68,68,0.15);color:#f1f5f9;font-family:'Inter',sans-serif;">
          <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:.8rem;color:#fca5a5;">Confirmar canje</h2>
          <p>${user.nombre} ${user.apellido || ""} — <b>${user.puntos ?? 0} pts</b></p>
          <hr style="margin:1rem 0;border:none;border-top:1px solid rgba(255,255,255,0.1);" />
          <p><b>${reward?.titulo}</b> — <span style="color:#f87171;">-${reward?.puntos ?? 0} pts</span></p>
        </div>`,
                showCancelButton: true,
                confirmButtonText: "Confirmar",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#374151",
                background: "#0f172a",
                color: "#f1f5f9",
            });

            if (!result.isConfirmed) {
                busyRef.current = false;
                return;
            }

            const canjeRes = await fetch("/api/canjes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardId: selectedReward, qrToken: token }),
            });

            if (canjeRes.ok) {
                await swalBase.fire({
                    icon: "success",
                    title: "Canje realizado",
                    html: `<b>${reward?.titulo}</b><br/><span style="color:#f87171;">-${reward?.puntos} pts</span>`,
                    confirmButtonColor: "#ef4444",
                    background: "#0f172a",
                    color: "#f1f5f9",
                    timer: 2000,
                    showConfirmButton: false,
                });

                setFlash(true);
                setTimeout(() => setFlash(false), 200);
            } else {
                await swalBase.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo completar el canje.",
                    confirmButtonColor: "#ef4444",
                    background: "#0f172a",
                    color: "#f1f5f9",
                });
            }
        } catch (e: any) {
            console.error(e);
            setToast("QR inválido o error de red");
            setTimeout(() => setToast(""), 2500);
        } finally {
            setTimeout(() => {
                busyRef.current = false;
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
        <div
            className="mx-auto max-w-6xl p-4 md:p-6 space-y-6"
            style={{
                paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            }}
        >

            {/* Selector de recompensa */}
            <div className="rounded-2xl border border-red-200 bg-gray-50 p-4">
                {rewards ? (
                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <select
                                className="w-full appearance-none rounded-xl border-2 border-red-300 bg-white text-gray-800 text-lg font-medium
                     px-4 py-3 pr-10 shadow-sm outline-none
                     focus:border-red-500 focus:ring-2 focus:ring-red-200 transition"
                                value={selectedReward || ""}
                                onChange={(e) => setSelectedReward(e.target.value)}
                            >
                                <option value="">Seleccioná un canje</option>
                                {rewards.map((r) => (
                                    <option key={r._id} value={r._id}>
                                        {r.titulo} — {r.puntos} pts
                                    </option>
                                ))}
                            </select>

                            {/* 🔽 Flecha personalizada */}
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-5 h-5 text-red-500"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.173l3.71-3.942a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* 💬 Texto informativo (opcional) */}
                        {selectedReward && (
                            <p className="text-sm text-gray-500 mt-1">
                                Has seleccionado:{" "}
                                <span className="font-semibold text-red-600">
                                    {rewards.find((r) => r._id === selectedReward)?.titulo}
                                </span>
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="py-8 flex justify-center">
                        <Loader size={32} />
                    </div>
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
                    <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
                    {flash && <div className="pointer-events-none absolute inset-0 bg-rose-400/25 animate-pulse" />}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25" />
                        <div className="absolute inset-6 md:inset-8 rounded-2xl border-2 border-white/25" />
                    </div>
                </div>

                {/* controles */}
                <div className="flex items-center justify-center p-3 border-t border-white/10 bg-black/40 backdrop-blur">
                    {camState !== "on" ? (
                        <button
                            onClick={startCamera}
                            disabled={!selectedReward || camState === "starting"}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow hover:shadow-lg transition-shadow"
                        >
                            {!selectedReward ? "Seleccioná un canje" : camState === "starting" ? "Activando…" : "Activar cámara"}
                        </button>
                    ) : (
                        <button
                            onClick={stopCamera}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold border border-white/10 hover:bg-zinc-800"
                        >
                            Detener
                        </button>
                    )}
                </div>

                {errMsg && <div className="px-3 pb-3 text-sm text-rose-300">{errMsg}</div>}
            </div>

            {/* toast */}
            {toast && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
                    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-zinc-900/90 border border-rose-500/30 shadow-xl backdrop-blur px-4 py-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="font-semibold text-rose-400">{toast}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
