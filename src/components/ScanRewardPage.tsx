"use client";
import useSWR from "swr";
import { useRef, useState } from "react";

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
    const [camState, setCamState] = useState<CamState>("idle");
    const [status, setStatus] = useState("");
    const [result, setResult] = useState<string | null>(null);

    async function onRawQr(raw: string) {
        if (!selectedReward) {
            setStatus("❌ Seleccioná una recompensa antes de escanear.");
            return;
        }

        let token = raw.trim();
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.qrToken) token = String(parsed.qrToken);
        } catch { }

        setStatus("Procesando canje…");

        const res = await fetch("/api/canjes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardId: selectedReward, qrToken: token }),
        });

        const data = await res.json();
        if (res.ok) {
            setResult(`✅ Canje realizado: ${data.canje.rewardId.titulo || "Recompensa"}`);
        } else {
            setResult(`❌ Error: ${data.message}`);
        }
    }

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-xl font-bold">Escanear QR para canje</h1>

            {/* Selector de recompensas */}
            {rewards ? (
                <select
                    className="w-full rounded-lg bg-white/10 p-2"
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

            {/* Scanner (resumido) */}
            <video ref={videoRef} className="w-full aspect-square bg-black rounded-lg" />

            <div className="flex gap-3">
                <button
                    onClick={() => {/* lógica startCamera */ }}
                    className="px-4 py-2 rounded bg-emerald-600 text-white"
                >
                    Activar cámara
                </button>
                <button
                    onClick={() => {/* lógica stopCamera */ }}
                    className="px-4 py-2 rounded bg-red-600 text-white"
                >
                    Detener
                </button>
            </div>

            {status && <p className="text-sm opacity-80">{status}</p>}
            {result && <p className="font-semibold">{result}</p>}
        </div>
    );
}
