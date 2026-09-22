"use client";
import { useState } from "react";
import useSWR from "swr";
import { Clock } from "lucide-react";
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
        <div className="min-h-screen bg-gray-50 px-4 pt-5 pb-20">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-gray-900">Canjes</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    Tus puntos: <span className="font-black text-red-600">{puntos} pts</span>
                </p>
            </div>

            <div className="flex flex-col gap-5">
                {rewards.map((r) =>
                    r.tema === "argentina"
                        ? <ArgentinaTicket key={r._id} r={r} puntos={puntos} solicitado={solicitados.has(r._id)} solicitando={solicitando === r._id} onCanjear={() => canjear(r)} />
                        : <Ticket key={r._id} r={r} puntos={puntos} solicitado={solicitados.has(r._id)} solicitando={solicitando === r._id} onCanjear={() => canjear(r)} />
                )}
            </div>
        </div>
    );
}

type TicketProps = { r: Reward; puntos: number; solicitado: boolean; solicitando: boolean; onCanjear: () => void };

function Ticket({ r, puntos, solicitado, solicitando, onCanjear }: TicketProps) {
    const puedo = puntos >= r.puntos;

    return (
        /* Outer wrapper: overflow-visible so notch circles aren't clipped */
        <div className="relative">
            {/* Notch circles at the perforation line — bg-gray-50 matches page, creating "hole" illusion */}
            <span
                className="absolute z-20 w-5 h-5 rounded-full bg-gray-50"
                style={{ top: 0, left: "68%", transform: "translate(-50%, -50%)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)" }}
            />
            <span
                className="absolute z-20 w-5 h-5 rounded-full bg-gray-50"
                style={{ bottom: 0, left: "68%", transform: "translate(-50%, 50%)", boxShadow: "inset 0 -1px 3px rgba(0,0,0,0.12)" }}
            />

            {/* Inner card: overflow-hidden so both halves clip to rounded corners */}
            <div className="flex rounded-2xl shadow-sm overflow-hidden border border-gray-200" style={{ minHeight: 112 }}>

                {/* Left — ticket body */}
                <div className="bg-white flex flex-col justify-between px-5 py-4" style={{ width: "68%" }}>
                    <div className="flex items-center gap-1.5">
                        <img src="/icon-192x192.png" alt="" className="h-4 w-4 object-contain opacity-30" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">H. Morgan Bar</span>
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-900 leading-snug">{r.titulo}</h2>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                            {r.descripcion || "Premio de fidelidad"}
                        </p>
                    </div>
                </div>

                {/* Perforation */}
                <div
                    className="self-stretch shrink-0 border-l-2 border-dashed"
                    style={{ width: 0, borderColor: "#D1D5DB" }}
                />

                {/* Right — stub */}
                <div
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 shrink-0"
                    style={{ width: "32%", background: puedo ? "#B91C1C" : "#9CA3AF" }}
                >
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/60">puntos</span>
                    <span className="text-3xl font-black text-white leading-none">{r.puntos}</span>

                    {solicitado ? (
                        <span className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-300 flex items-center gap-0.5">
                            <Clock size={8} /> Pendiente
                        </span>
                    ) : solicitando ? (
                        <span className="mt-0.5 text-[8px] text-white/50 font-bold animate-pulse">...</span>
                    ) : (
                        <button
                            onClick={onCanjear}
                            disabled={!puedo}
                            className={`mt-0.5 w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition active:scale-95 ${puedo ? "bg-white text-red-700 hover:bg-red-50" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
                        >
                            {puedo ? "Canjear" : "Sin pts"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ArgentinaTicket({ r, puntos, solicitado, solicitando, onCanjear }: TicketProps) {
    const puedo = puntos >= r.puntos;

    return (
        <div className="relative" style={{ filter: "drop-shadow(0 4px 20px rgba(116,172,223,0.3))" }}>
            <span
                className="absolute z-20 w-5 h-5 rounded-full bg-gray-50"
                style={{ top: 0, left: "68%", transform: "translate(-50%, -50%)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)" }}
            />
            <span
                className="absolute z-20 w-5 h-5 rounded-full bg-gray-50"
                style={{ bottom: 0, left: "68%", transform: "translate(-50%, 50%)", boxShadow: "inset 0 -1px 3px rgba(0,0,0,0.12)" }}
            />

            <div className="flex rounded-2xl overflow-hidden border-2 border-[#74ACDF]" style={{ minHeight: 112 }}>

                {/* Left — Argentina body */}
                <div
                    className="flex flex-col justify-between px-5 py-4 relative overflow-hidden"
                    style={{ width: "68%", background: "repeating-linear-gradient(90deg,#74ACDF 0px,#74ACDF 16px,white 16px,white 32px)" }}
                >
                    <div className="absolute inset-0 bg-white/60" />
                    <div className="relative z-10 flex items-center gap-1.5">
                        <span className="text-yellow-400 text-sm drop-shadow leading-none">★★★</span>
                        <span className="text-[8px] font-black text-white bg-[#003DA5] px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Mundial 2026
                        </span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-base font-black text-[#003DA5] leading-snug">{r.titulo}</h2>
                        {r.descripcion && (
                            <p className="text-xs text-[#003DA5]/70 mt-0.5 line-clamp-2">{r.descripcion}</p>
                        )}
                    </div>
                </div>

                {/* Perforation */}
                <div
                    className="self-stretch shrink-0 border-l-2 border-dashed"
                    style={{ width: 0, borderColor: "#74ACDF" }}
                />

                {/* Right — stub */}
                <div
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 shrink-0 bg-[#003DA5]"
                    style={{ width: "32%" }}
                >
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/60">puntos</span>
                    <span className="text-3xl font-black text-white leading-none">{r.puntos}</span>

                    {solicitado ? (
                        <span className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-300 flex items-center gap-0.5">
                            <Clock size={8} /> Pendiente
                        </span>
                    ) : solicitando ? (
                        <span className="mt-0.5 text-[8px] text-white/50 font-bold animate-pulse">...</span>
                    ) : (
                        <button
                            onClick={onCanjear}
                            disabled={!puedo}
                            className={`mt-0.5 w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition active:scale-95 ${puedo ? "bg-white text-[#003DA5] hover:bg-blue-50" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
                        >
                            {puedo ? "Canjear" : "Sin pts"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
