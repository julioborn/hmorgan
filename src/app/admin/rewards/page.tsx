"use client";
import useSWR from "swr";
import Link from "next/link";
import { Gift, QrCode } from "lucide-react";

type Reward = {
    _id: string;
    titulo: string;
    puntos: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminRewardsPage() {
    const { data: rewards } = useSWR<Reward[]>("/api/rewards", fetcher);

    if (!rewards) return <p className="p-6">Cargando recompensas…</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Gift className="text-emerald-400" /> Recompensas
            </h1>

            <ul className="space-y-3">
                {rewards.map((r) => (
                    <li key={r._id} className="flex justify-between items-center bg-white/5 rounded p-4">
                        <div>
                            <p className="font-bold">{r.titulo}</p>
                            <p className="text-sm opacity-70">{r.puntos} pts</p>
                        </div>
                        <Link
                            href={`/admin/rewards/scan?rewardId=${r._id}`}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded"
                        >
                            <QrCode size={18} /> Escanear
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
