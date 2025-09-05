"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Canje = {
    _id: string;
    userId: { nombre: string };
    rewardId: { titulo: string };
    puntosGastados: number;
    estado: string;
    fecha: string;
};

export default function AdminCanjesPage() {
    const { data: canjes, mutate } = useSWR<Canje[]>("/api/canjes", fetcher);

    async function cambiarEstado(id: string, estado: string) {
        await fetch(`/api/canjes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
        });
        mutate();
    }

    if (!canjes) return <p className="p-6">Cargando canjes...</p>;

    const formatNumber = (value: number) =>
        new Intl.NumberFormat("es-AR").format(value);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Canjes (Admin)</h1>
            <div className="space-y-3">
                {canjes.map((c) => (
                    <div
                        key={c._id}
                        className="p-4 bg-white/5 rounded-lg flex justify-between items-center"
                    >
                        <div>
                            <p className="font-bold">{c.rewardId?.titulo}</p>
                            <p className="text-sm opacity-70">
                                Cliente: {c.userId?.nombre}
                            </p>
                            <p className="text-sm text-emerald-400">
                                {formatNumber(c.puntosGastados)} pts
                            </p>
                            <p className="text-xs opacity-60">
                                {new Date(c.fecha).toLocaleDateString("es-AR")}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={c.estado}
                                onChange={(e) => cambiarEstado(c._id, e.target.value)}
                                className="bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded"
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="entregado">Entregado</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
