"use client";
import useSWR from "swr";
import { Gift } from "lucide-react";
import Loader from "@/components/Loader";

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

    if (!rewards) {
        return (
            <div className="py-20 flex justify-center items-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen">
            <h1 className="text-4xl font-extrabold mb-10 text-center text-black">Canjes</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rewards.map((r) =>
                    r.tema === "argentina"
                        ? <ArgentinaRewardCard key={r._id} r={r} />
                        : (
                            <div key={r._id}
                                className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 h-44 flex flex-col justify-between overflow-hidden">
                                <div className="flex-1 flex flex-col justify-between">
                                    <h2 className="text-lg font-extrabold truncate">{r.titulo}</h2>
                                    {r.descripcion
                                        ? <p className="text-sm text-gray-600 line-clamp-2">{r.descripcion}</p>
                                        : <p className="text-sm text-gray-400 italic">Canje</p>}
                                    <span className="text-sm font-semibold text-red-600">{r.puntos} pts</span>
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <img src="/icon-192x192.png" alt="Logo" className="h-8 w-8 object-contain opacity-70" />
                                </div>
                                <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                                <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                            </div>
                        )
                )}
            </div>
        </div>
    );
}

function ArgentinaRewardCard({ r }: { r: Reward }) {
    return (
        <div className="relative rounded-2xl shadow-2xl overflow-visible border-2 border-[#74ACDF]"
            style={{ filter: "drop-shadow(0 4px 24px rgba(116,172,223,0.35))" }}>
            <div
                className="relative rounded-2xl p-5 h-52 flex flex-col justify-between overflow-hidden"
                style={{ background: "repeating-linear-gradient(90deg,#74ACDF 0px,#74ACDF 26px,white 26px,white 52px)" }}
            >
                <div className="absolute inset-0 bg-white/55 rounded-2xl" />

                {/* Muescas */}
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />

                {/* Estrellas + badge */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex gap-0.5 text-yellow-400 text-lg drop-shadow">★★★</div>
                    <span className="text-[9px] font-black text-white bg-[#003DA5] px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Mundial 2026
                    </span>
                </div>

                {/* Titulo + descripcion */}
                <div className="relative z-10 flex-1 flex flex-col justify-center gap-1 mt-2">
                    <h2 className="text-xl font-extrabold text-[#003DA5] leading-tight">{r.titulo}</h2>
                    {r.descripcion && (
                        <p className="text-xs text-[#003DA5]/70 line-clamp-2">{r.descripcion}</p>
                    )}
                </div>

                {/* Puntos */}
                <div className="relative z-10 flex items-center justify-between mt-2">
                    <span className="text-sm font-extrabold text-white bg-[#003DA5] px-3 py-1 rounded-full shadow">
                        {r.puntos} pts
                    </span>
                    <span className="text-3xl">⚽</span>
                </div>
            </div>
        </div>
    );
}
