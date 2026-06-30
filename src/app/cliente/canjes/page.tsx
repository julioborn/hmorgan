"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Clock, CheckCircle, XCircle } from "lucide-react";
import Loader from "@/components/Loader";

export const dynamic = "force-dynamic";

type Reward = { titulo: string; puntos: number; descripcion?: string };
type Canje = {
    _id: string;
    rewardId: Reward;
    puntosGastados: number;
    estado: "pendiente" | "completado" | "rechazado";
    createdAt: string;
};

export default function CanjesClientePage() {
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loading, setLoading] = useState(true);
    const [voucherOpen, setVoucherOpen] = useState<Canje | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/canjes", { credentials: "include" });
                if (!res.ok) throw new Error();
                setCanjes(await res.json());
            } catch { setCanjes([]); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="py-20 flex justify-center"><Loader size={40} /></div>;

    const pendientes  = canjes.filter(c => c.estado === "pendiente");
    const completados = canjes.filter(c => c.estado === "completado");
    const rechazados  = canjes.filter(c => c.estado === "rechazado");

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-white">Mis Canjes</h1>

            {canjes.length === 0 && (
                <p className="opacity-70 text-center">Aún no realizaste canjes.</p>
            )}

            {/* Pendientes */}
            {pendientes.length > 0 && (
                <section>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Esperando confirmación</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pendientes.map(c => (
                            <div key={c._id}
                                className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-amber-400 shrink-0" />
                                    <h2 className="text-base font-bold">{c.rewardId?.titulo}</h2>
                                </div>
                                {c.rewardId?.descripcion && <p className="text-sm opacity-70">{c.rewardId.descripcion}</p>}
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-amber-400 font-extrabold text-lg">{c.puntosGastados} pts</span>
                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full font-semibold">
                                        PENDIENTE
                                    </span>
                                </div>
                                <p className="text-xs opacity-50">
                                    {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Completados — vouchers */}
            {completados.length > 0 && (
                <section>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">Canjeados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {completados.map(c => (
                            <button key={c._id} onClick={() => setVoucherOpen(c)}
                                className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-600/20 p-5 flex flex-col gap-2 text-left hover:bg-emerald-600/30 transition active:scale-[0.98]">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                                    <h2 className="text-base font-bold">{c.rewardId?.titulo}</h2>
                                </div>
                                {c.rewardId?.descripcion && <p className="text-sm opacity-70">{c.rewardId.descripcion}</p>}
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-emerald-400 font-extrabold text-lg">{c.puntosGastados} pts</span>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full font-semibold">
                                        CANJEADO
                                    </span>
                                </div>
                                <p className="text-xs opacity-50">
                                    {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                    {" · "}Tocá para ver el voucher
                                </p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Rechazados */}
            {rechazados.length > 0 && (
                <section>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Rechazados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {rechazados.map(c => (
                            <div key={c._id}
                                className="relative overflow-hidden rounded-2xl border border-gray-600/30 bg-gray-800/30 p-5 flex flex-col gap-2 opacity-60">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-6 h-6 text-gray-400 shrink-0" />
                                    <h2 className="text-base font-bold">{c.rewardId?.titulo}</h2>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-400 font-extrabold text-lg">{c.puntosGastados} pts</span>
                                    <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded-full font-semibold">
                                        RECHAZADO
                                    </span>
                                </div>
                                <p className="text-xs opacity-50">
                                    {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Voucher modal — portal para evitar will-change:transform */}
            {voucherOpen && createPortal(
                <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6"
                    onClick={() => setVoucherOpen(null)}>
                    <div className="w-full max-w-sm bg-white text-black rounded-3xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-emerald-600 text-white px-6 py-5 text-center">
                            <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-80">H. Morgan Bar</p>
                            <p className="text-xs opacity-60 mt-0.5">VOUCHER DE CANJE</p>
                        </div>
                        <div className="px-6 py-6 text-center space-y-2">
                            <h2 className="text-2xl font-extrabold leading-tight">{voucherOpen.rewardId?.titulo}</h2>
                            {voucherOpen.rewardId?.descripcion && (
                                <p className="text-sm text-gray-600">{voucherOpen.rewardId.descripcion}</p>
                            )}
                            <p className="text-3xl font-black text-emerald-600 mt-3">{voucherOpen.puntosGastados} pts</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(voucherOpen.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        <div className="border-t border-dashed border-gray-200 mx-6" />
                        <div className="px-6 py-4 flex items-center gap-3">
                            <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
                            <p className="text-xs text-gray-500">Mostrá esta pantalla al staff para recibir tu premio.</p>
                        </div>
                        <button onClick={() => setVoucherOpen(null)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 text-sm transition">
                            Cerrar
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
