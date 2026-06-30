"use client";
import { useState } from "react";
import useSWR from "swr";
import { Gift, CheckCircle, Clock } from "lucide-react";
import Loader from "@/components/Loader";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";

type Reward = {
    _id: string;
    titulo: string;
    descripcion?: string;
    puntos: number;
    tema?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RewardsClientePage() {
    const { data: rewards } = useSWR<Reward[]>("/api/rewards", fetcher);
    const { user } = useAuth();
    const router = useRouter();
    const [solicitando, setSolicitando] = useState<string | null>(null);
    const [solicitados, setSolicitados] = useState<Set<string>>(new Set());

    if (!rewards) {
        return (
            <div className="py-20 flex justify-center items-center">
                <Loader size={40} />
            </div>
        );
    }

    async function canjear(r: Reward) {
        const puntos = user?.puntos ?? 0;
        if (puntos < r.puntos) {
            await swalBase.fire({
                title: "Puntos insuficientes",
                text: `Necesitás ${r.puntos} pts y tenés ${puntos} pts.`,
                icon: "warning",
                confirmButtonText: "Entendido",
            });
            return;
        }

        const confirm = await swalBase.fire({
            title: `Canjear "${r.titulo}"`,
            text: `Usarás ${r.puntos} puntos. La solicitud quedará pendiente hasta que la acepten en caja.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Solicitar canje",
            cancelButtonText: "Cancelar",
        });
        if (!confirm.isConfirmed) return;

        setSolicitando(r._id);
        try {
            const res = await fetch("/api/canjes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ rewardId: r._id }),
            });
            const data = await res.json();
            if (!res.ok) {
                await swalBase.fire({ title: "Error", text: data.message || "No se pudo solicitar", icon: "error" });
                return;
            }
            setSolicitados(prev => new Set([...prev, r._id]));
            await swalBase.fire({
                title: "¡Solicitud enviada!",
                text: "Esperá que lo acepten en caja. Te avisaremos.",
                icon: "success",
                confirmButtonText: "Ver mis canjes",
            });
            router.push("/cliente/canjes");
        } catch {
            await swalBase.fire({ title: "Error", text: "No se pudo conectar", icon: "error" });
        } finally {
            setSolicitando(null);
        }
    }

    const puntos = user?.puntos ?? 0;

    return (
        <div className="p-6 min-h-screen">
            <h1 className="text-4xl font-extrabold mb-2 text-center text-black">Canjes</h1>
            <p className="text-center text-sm text-gray-500 mb-8">Tus puntos: <span className="font-black text-red-600">{puntos} pts</span></p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rewards.map((r) =>
                    r.tema === "argentina"
                        ? <ArgentinaRewardCard key={r._id} r={r} puntos={puntos} solicitado={solicitados.has(r._id)} solicitando={solicitando === r._id} onCanjear={() => canjear(r)} />
                        : (
                            <div key={r._id}
                                className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 flex flex-col gap-3 overflow-visible">
                                <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                                <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <h2 className="text-lg font-extrabold leading-tight">{r.titulo}</h2>
                                        {r.descripcion
                                            ? <p className="text-sm text-gray-600">{r.descripcion}</p>
                                            : <p className="text-sm text-gray-400 italic">Canje</p>}
                                        <span className="text-sm font-semibold text-red-600">{r.puntos} pts</span>
                                    </div>
                                    <img src="/icon-192x192.png" alt="Logo" className="h-8 w-8 object-contain opacity-60 shrink-0" />
                                </div>
                                <CanjearButton r={r} puntos={puntos} solicitado={solicitados.has(r._id)} solicitando={solicitando === r._id} onCanjear={() => canjear(r)} />
                            </div>
                        )
                )}
            </div>
        </div>
    );
}

function CanjearButton({ r, puntos, solicitado, solicitando, onCanjear }: { r: Reward; puntos: number; solicitado: boolean; solicitando: boolean; onCanjear: () => void }) {
    if (solicitado) return (
        <button disabled className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-2.5 rounded-xl text-sm">
            <Clock size={14} /> Pendiente de aprobación
        </button>
    );
    if (solicitando) return (
        <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
            Solicitando...
        </button>
    );
    const puedo = puntos >= r.puntos;
    return (
        <button onClick={onCanjear} disabled={!puedo}
            className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition active:scale-95 ${puedo ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
            <Gift size={14} />
            {puedo ? "Canjear" : "Sin puntos suficientes"}
        </button>
    );
}

function ArgentinaRewardCard({ r, puntos, solicitado, solicitando, onCanjear }: { r: Reward; puntos: number; solicitado: boolean; solicitando: boolean; onCanjear: () => void }) {
    return (
        <div className="relative rounded-2xl shadow-2xl overflow-visible border-2 border-[#74ACDF]"
            style={{ filter: "drop-shadow(0 4px 24px rgba(116,172,223,0.35))" }}>
            <div
                className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden gap-3"
                style={{ background: "repeating-linear-gradient(90deg,#74ACDF 0px,#74ACDF 26px,white 26px,white 52px)" }}
            >
                <div className="absolute inset-0 bg-white/55 rounded-2xl" />

                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex gap-0.5 text-yellow-400 text-lg drop-shadow">★★★</div>
                    <span className="text-[9px] font-black text-white bg-[#003DA5] px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Mundial 2026
                    </span>
                </div>

                <div className="relative z-10 flex flex-col gap-1">
                    <h2 className="text-xl font-extrabold text-[#003DA5] leading-tight">{r.titulo}</h2>
                    {r.descripcion && <p className="text-xs text-[#003DA5]/70">{r.descripcion}</p>}
                    <span className="text-sm font-extrabold text-white bg-[#003DA5] px-3 py-1 rounded-full shadow self-start">{r.puntos} pts</span>
                </div>

                <div className="relative z-10">
                    <CanjearButton r={r} puntos={puntos} solicitado={solicitado} solicitando={solicitando} onCanjear={onCanjear} />
                </div>
            </div>
        </div>
    );
}
