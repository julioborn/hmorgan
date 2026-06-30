"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Clock, CheckCircle, XCircle } from "lucide-react";
import Loader from "@/components/Loader";
import { useAuth } from "@/context/auth-context";
import { swalBase } from "@/lib/swalConfig";

export const dynamic = "force-dynamic";

type RewardItem = { _id: string; titulo: string; puntos: number; descripcion?: string; tema?: string };
type Canje = {
    _id: string;
    rewardId: RewardItem;
    puntosGastados: number;
    estado: "pendiente" | "completado" | "rechazado";
    createdAt: string;
};

export default function CanjesClientePage() {
    const { user } = useAuth();
    const puntos = user?.puntos ?? 0;

    const [rewards, setRewards] = useState<RewardItem[]>([]);
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loading, setLoading] = useState(true);
    const [voucherOpen, setVoucherOpen] = useState<Canje | null>(null);
    const [solicitando, setSolicitando] = useState<string | null>(null);
    const [solicitados, setSolicitados] = useState<Set<string>>(new Set());

    useEffect(() => {
        (async () => {
            try {
                const [rRes, cRes] = await Promise.all([
                    fetch("/api/rewards", { cache: "no-store" }),
                    fetch("/api/canjes", { credentials: "include" }),
                ]);
                if (rRes.ok) setRewards(await rRes.json());
                if (cRes.ok) {
                    const data: Canje[] = await cRes.json();
                    setCanjes(data);
                    // Pre-cargar los que ya están pendientes
                    const pendientesIds = data.filter(c => c.estado === "pendiente").map(c => c.rewardId?._id).filter(Boolean);
                    if (pendientesIds.length) setSolicitados(new Set(pendientesIds));
                }
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, []);

    async function canjear(r: RewardItem) {
        if (puntos < r.puntos) {
            await swalBase.fire({ title: "Puntos insuficientes", text: `Necesitás ${r.puntos} pts y tenés ${puntos} pts.`, icon: "warning", confirmButtonText: "Entendido" });
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
            // Refrescar historial
            const cRes = await fetch("/api/canjes", { credentials: "include" });
            if (cRes.ok) setCanjes(await cRes.json());
            await swalBase.fire({ title: "¡Solicitud enviada!", text: "Esperá que lo acepten en caja. Te avisaremos.", icon: "success", confirmButtonText: "OK" });
        } catch {
            await swalBase.fire({ title: "Error", text: "No se pudo conectar", icon: "error" });
        } finally {
            setSolicitando(null);
        }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader size={40} /></div>;

    const pendientes  = canjes.filter(c => c.estado === "pendiente");
    const completados = canjes.filter(c => c.estado === "completado");
    const rechazados  = canjes.filter(c => c.estado === "rechazado");

    return (
        <div className="p-6 space-y-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-white">Canjes</h1>

            {/* Canjes disponibles */}
            {rewards.length > 0 && (
                <section className="space-y-3">
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest">Disponibles</p>
                    <p className="text-sm text-white/50 -mt-1">Tus puntos: <span className="font-black text-red-400">{puntos} pts</span></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {rewards.map(r => {
                            const yaPendiente = solicitados.has(r._id);
                            const puedo = puntos >= r.puntos;
                            return (
                                <div key={r._id}
                                    className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 flex flex-col gap-3 overflow-visible">
                                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                                    <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <h2 className="text-base font-extrabold leading-tight">{r.titulo}</h2>
                                            {r.descripcion
                                                ? <p className="text-sm text-gray-500">{r.descripcion}</p>
                                                : <p className="text-sm text-gray-400 italic">Premio</p>}
                                            <span className="text-sm font-bold text-red-600">{r.puntos} pts</span>
                                        </div>
                                        <img src="/icon-192x192.png" alt="Logo" className="h-8 w-8 object-contain opacity-50 shrink-0" />
                                    </div>
                                    {yaPendiente ? (
                                        <div className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-2.5 rounded-xl text-sm">
                                            <Clock size={14} /> Pendiente de aprobación
                                        </div>
                                    ) : solicitando === r._id ? (
                                        <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
                                            Solicitando...
                                        </div>
                                    ) : (
                                        <button onClick={() => canjear(r)} disabled={!puedo}
                                            className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition active:scale-95 ${puedo ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                                            <Gift size={14} />
                                            {puedo ? "Canjear" : "Sin puntos suficientes"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Historial */}
            {canjes.length > 0 && (
                <section className="space-y-6">
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest">Mi historial</p>

                    {pendientes.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Esperando confirmación</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {pendientes.map(c => (
                                    <div key={c._id}
                                        className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                                            <h2 className="text-sm font-bold">{c.rewardId?.titulo}</h2>
                                        </div>
                                        {c.rewardId?.descripcion && <p className="text-xs opacity-70">{c.rewardId.descripcion}</p>}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-amber-400 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full font-semibold">PENDIENTE</span>
                                        </div>
                                        <p className="text-xs opacity-50">
                                            {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {completados.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Canjeados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {completados.map(c => (
                                    <button key={c._id} onClick={() => setVoucherOpen(c)}
                                        className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-600/20 p-5 flex flex-col gap-2 text-left hover:bg-emerald-600/30 transition active:scale-[0.98]">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                            <h2 className="text-sm font-bold">{c.rewardId?.titulo}</h2>
                                        </div>
                                        {c.rewardId?.descripcion && <p className="text-xs opacity-70">{c.rewardId.descripcion}</p>}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-emerald-400 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full font-semibold">CANJEADO</span>
                                        </div>
                                        <p className="text-xs opacity-50">
                                            {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                            {" · "}Tocá para ver el voucher
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {rechazados.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rechazados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {rechazados.map(c => (
                                    <div key={c._id}
                                        className="relative overflow-hidden rounded-2xl border border-gray-600/30 bg-gray-800/30 p-5 flex flex-col gap-2 opacity-60">
                                        <div className="flex items-center gap-3">
                                            <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                                            <h2 className="text-sm font-bold">{c.rewardId?.titulo}</h2>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-gray-400 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded-full font-semibold">RECHAZADO</span>
                                        </div>
                                        <p className="text-xs opacity-50">
                                            {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {rewards.length === 0 && canjes.length === 0 && (
                <p className="opacity-70 text-center">No hay canjes disponibles por el momento.</p>
            )}

            {/* Voucher modal */}
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
