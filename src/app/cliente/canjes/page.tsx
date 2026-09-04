"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import Loader from "@/components/Loader";
import { useAuth } from "@/context/auth-context";
import { swalBase } from "@/lib/swalConfig";

const HORAS_RESERVA = ["19:00","19:30","20:00","20:30","21:00","21:30","22:00"];

export const dynamic = "force-dynamic";

type RewardItem = { _id: string; titulo: string; puntos: number; descripcion?: string; tema?: string };
type Canje = {
    _id: string;
    rewardId: RewardItem;
    puntosGastados: number;
    estado: "pendiente" | "completado" | "rechazado";
    createdAt: string;
    tipo?: "cumpleanos";
    expiraEl?: string;
};

export default function CanjesClientePage() {
    const { user } = useAuth();
    const puntos = user?.puntos ?? 0;

    const [rewards, setRewards] = useState<RewardItem[]>([]);
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loading, setLoading] = useState(true);
    const [voucherOpen, setVoucherOpen] = useState<Canje | null>(null);
    const [cumpleVoucherOpen, setCumpleVoucherOpen] = useState(false);
    const [solicitando, setSolicitando] = useState<string | null>(null);
    const [solicitados, setSolicitados] = useState<Set<string>>(new Set());

    // Reserva desde canje cumpleaños
    const [reservaModal, setReservaModal] = useState(false);
    const [reservaFecha, setReservaFecha] = useState("");
    const [reservaHora, setReservaHora] = useState("");
    const [reservaComensales, setReservaComensales] = useState(4);
    const [reservaNotas, setReservaNotas] = useState("");
    const [reservaSaving, setReservaSaving] = useState(false);
    const [reservaExistente, setReservaExistente] = useState<{ fecha: string; hora: string; comensales: number; estado: string } | null>(null);
    const [reservaFechaError, setReservaFechaError] = useState("");

    function diaCumple(dateStr: string): { valido: boolean; descuento: number } {
        if (!dateStr) return { valido: false, descuento: 0 };
        const [y, m, d] = dateStr.split("-").map(Number);
        const dia = new Date(y, m - 1, d).getDay();
        if (dia === 4) return { valido: true, descuento: 20 }; // jueves
        if (dia === 0) return { valido: true, descuento: 10 }; // domingo
        return { valido: false, descuento: 0 };
    }

    function handleFechaCumple(val: string) {
        setReservaFecha(val);
        if (!val) { setReservaFechaError(""); return; }
        const { valido } = diaCumple(val);
        setReservaFechaError(valido ? "" : "Este canje solo es válido los jueves y domingos.");
    }

    useEffect(() => {
        (async () => {
            try {
                const [rRes, cRes, rvRes] = await Promise.all([
                    fetch("/api/rewards", { cache: "no-store" }),
                    fetch("/api/canjes", { credentials: "include" }),
                    fetch("/api/reservas", { credentials: "include" }),
                ]);
                if (rRes.ok) setRewards(await rRes.json());
                let canjesData: Canje[] = [];
                if (cRes.ok) {
                    canjesData = await cRes.json();
                    setCanjes(canjesData);
                    const pendientesIds = canjesData.filter(c => c.estado === "pendiente").map(c => c.rewardId?._id).filter(Boolean);
                    if (pendientesIds.length) setSolicitados(new Set(pendientesIds));
                }
                if (rvRes.ok) {
                    const reservas: any[] = await rvRes.json();
                    const cumple = canjesData.find(c => c.tipo === "cumpleanos");
                    if (cumple) {
                        const rv = reservas.find((r: any) => r.canjeId?._id === cumple._id || r.canjeId === cumple._id);
                        if (rv) setReservaExistente({ fecha: rv.fecha, hora: rv.hora, comensales: rv.comensales, estado: rv.estado });
                    }
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

    async function crearReservaCumple(canjeId: string) {
        if (!reservaFecha || !reservaHora) {
            await swalBase.fire({ title: "Faltan datos", text: "Elegí fecha y horario.", icon: "warning", confirmButtonText: "OK" });
            return;
        }
        const { valido, descuento } = diaCumple(reservaFecha);
        if (!valido) {
            await swalBase.fire({ title: "Día no válido", text: "Este canje solo puede usarse los jueves (20% off) o domingos (10% off).", icon: "warning", confirmButtonText: "OK" });
            return;
        }
        setReservaSaving(true);
        try {
            const res = await fetch("/api/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    fecha: reservaFecha,
                    hora: reservaHora,
                    comensales: reservaComensales,
                    notas: reservaNotas.trim() || `Canje de cumpleaños 🎂 · ${descuento}% off`,
                    canjeId,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                await swalBase.fire({ title: "Error", text: data.error || "No se pudo crear la reserva", icon: "error" });
                return;
            }
            setReservaExistente({ fecha: reservaFecha, hora: reservaHora, comensales: reservaComensales, estado: "pendiente" });
            setReservaModal(false);
            await swalBase.fire({ title: "¡Reserva enviada! 🎂", text: "Te avisaremos cuando la confirmen.", icon: "success", confirmButtonText: "OK" });
        } finally { setReservaSaving(false); }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader size={40} /></div>;

    function formatExpira(iso?: string) {
        if (!iso) return null;
        const d = new Date(iso);
        // Mostrar el último día del mes (expiraEl es el día 1 del mes siguiente a medianoche ART)
        d.setDate(d.getDate() - 1);
        return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
    }

    const canjeCumple = canjes.find(c => c.tipo === "cumpleanos");
    const pendientes  = canjes.filter(c => c.estado === "pendiente" && c.tipo !== "cumpleanos");
    const completados = canjes.filter(c => c.estado === "completado");
    const rechazados  = canjes.filter(c => c.estado === "rechazado");
    const rewardsNormales = rewards.filter(r => r.tema !== "cumpleanos");

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Canjes</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Tus puntos: <span className="font-black text-red-600">{puntos} pts</span></p>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4 space-y-8">

            {/* Regalo de cumpleaños */}
            {canjeCumple && (
                <section className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">🎂 Regalo de cumpleaños</p>
                    <div className="relative bg-white text-black rounded-2xl shadow-md border-2 border-pink-300 p-5 flex flex-col gap-3 overflow-visible">
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-pink-500 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Cumpleaños 🎂</span>
                                </div>
                                <h2 className="text-base font-extrabold leading-tight mt-1">{canjeCumple.rewardId?.titulo || "Cena para 4 · 20% off"}</h2>
                                {canjeCumple.rewardId?.descripcion && (
                                    <p className="text-sm text-gray-500">{canjeCumple.rewardId.descripcion}</p>
                                )}
                                <span className="text-sm font-bold text-pink-500">🎁 Regalo · sin puntos</span>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">📅 Jueves · 20% off</span>
                                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">📅 Domingo · 10% off</span>
                                </div>
                                {canjeCumple.expiraEl && (
                                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        <Clock size={11} />
                                        Válido hasta el {formatExpira(canjeCumple.expiraEl)}
                                    </p>
                                )}
                            </div>
                            <span className="text-3xl shrink-0">🎂</span>
                        </div>
                        {canjeCumple.estado === "completado" ? (
                            <div className="flex flex-col gap-2">
                                <div className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-2.5 rounded-xl text-sm">
                                    <CheckCircle size={14} /> Canje aceptado
                                </div>
                                {reservaExistente ? (
                                    <div className="w-full bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 flex items-start gap-2">
                                        <CalendarDays size={15} className="text-pink-500 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-pink-700">Reserva registrada</p>
                                            <p className="text-xs text-gray-600 mt-0.5">
                                                {new Date(reservaExistente.fecha).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })} · {reservaExistente.hora}hs · {reservaExistente.comensales} personas
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{reservaExistente.estado}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setReservaModal(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95">
                                        <CalendarDays size={14} /> Hacer mi reserva 🎂
                                    </button>
                                )}
                            </div>
                        ) : canjeCumple.estado === "rechazado" ? (
                            <div className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 font-bold py-2.5 rounded-xl text-sm">
                                <XCircle size={14} /> Rechazado
                            </div>
                        ) : (
                            <button onClick={() => setCumpleVoucherOpen(true)}
                                className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95">
                                <Gift size={14} /> Presentar en caja
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/* Canjes disponibles */}
            {rewardsNormales.length > 0 && (
                <section className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Disponibles</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {rewardsNormales.map(r => {
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
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Mi historial</p>

                    {pendientes.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Esperando confirmación</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {pendientes.map(c => (
                                    c.tipo === "cumpleanos" ? (
                                        <button key={c._id} onClick={() => setCumpleVoucherOpen(true)}
                                            className="relative overflow-hidden rounded-2xl border border-pink-200 bg-pink-50 p-5 flex flex-col gap-2 text-left active:scale-[0.98] transition w-full">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl shrink-0">🎂</span>
                                                <h2 className="text-sm font-bold text-gray-900">{c.rewardId?.titulo}</h2>
                                            </div>
                                            {c.rewardId?.descripcion && <p className="text-xs text-gray-500">{c.rewardId.descripcion}</p>}
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-pink-600 font-extrabold text-xs">🎁 Regalo · sin puntos</span>
                                                <span className="text-xs bg-pink-100 text-pink-700 border border-pink-200 px-3 py-1 rounded-full font-semibold">PENDIENTE</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 font-semibold">Tocá para presentar en caja →</p>
                                        </button>
                                    ) : (
                                    <div key={c._id}
                                        className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                                            <h2 className="text-sm font-bold text-gray-900">{c.rewardId?.titulo}</h2>
                                        </div>
                                        {c.rewardId?.descripcion && <p className="text-xs text-gray-500">{c.rewardId.descripcion}</p>}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-amber-700 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold">PENDIENTE</span>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {completados.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Canjeados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {completados.map(c => (
                                    <button key={c._id} onClick={() => setVoucherOpen(c)}
                                        className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col gap-2 text-left hover:bg-emerald-100 transition active:scale-[0.98]">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                            <h2 className="text-sm font-bold text-gray-900">{c.rewardId?.titulo}</h2>
                                        </div>
                                        {c.rewardId?.descripcion && <p className="text-xs text-gray-500">{c.rewardId.descripcion}</p>}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-emerald-700 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold">CANJEADO</span>
                                        </div>
                                        <p className="text-xs text-gray-400">
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
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rechazados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {rechazados.map(c => (
                                    <div key={c._id}
                                        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col gap-2 opacity-70">
                                        <div className="flex items-center gap-3">
                                            <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                                            <h2 className="text-sm font-bold text-gray-700">{c.rewardId?.titulo}</h2>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-gray-500 font-extrabold">{c.puntosGastados} pts</span>
                                            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded-full font-semibold">RECHAZADO</span>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {new Date(c.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {rewardsNormales.length === 0 && canjes.length === 0 && !canjeCumple && (
                <p className="text-center text-gray-500">No hay canjes disponibles por el momento.</p>
            )}

            </div>

            {/* Modal hacer reserva de cumpleaños */}
            {reservaModal && canjeCumple && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={() => setReservaModal(false)}>
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 flex items-center gap-3">
                            <span className="text-2xl">🎂</span>
                            <div className="flex-1">
                                <p className="font-black text-white text-base">Reserva de cumpleaños</p>
                                <p className="text-xs text-white/80">Elegí cuándo querés usar tu regalo</p>
                            </div>
                            <button onClick={() => setReservaModal(false)} className="text-white/70 hover:text-white"><XCircle size={20} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Fecha</label>
                                <p className="text-[11px] text-amber-700 font-semibold mb-1.5">Solo disponible jueves (20% off) o domingo (10% off)</p>
                                <input type="date"
                                    min={new Date().toISOString().slice(0, 10)}
                                    value={reservaFecha}
                                    onChange={e => handleFechaCumple(e.target.value)}
                                    className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none ${reservaFechaError ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-pink-400"}`} />
                                {reservaFechaError && (
                                    <p className="text-xs text-red-600 font-semibold mt-1">{reservaFechaError}</p>
                                )}
                                {reservaFecha && !reservaFechaError && (
                                    <p className="text-xs text-emerald-700 font-bold mt-1">
                                        ✓ {diaCumple(reservaFecha).descuento}% de descuento aplicado
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Horario</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {HORAS_RESERVA.map(h => (
                                        <button key={h} onClick={() => setReservaHora(h)}
                                            className={`py-2 rounded-xl text-sm font-bold border-2 transition ${reservaHora === h ? "border-pink-500 bg-pink-500 text-white" : "border-gray-200 text-gray-700 hover:border-pink-300"}`}>
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Comensales</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setReservaComensales(n => Math.max(1, n - 1))}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold flex items-center justify-center hover:border-gray-400 transition">−</button>
                                    <span className="text-2xl font-black text-gray-900 min-w-[2rem] text-center">{reservaComensales}</span>
                                    <button onClick={() => setReservaComensales(n => n + 1)}
                                        className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold flex items-center justify-center hover:border-gray-400 transition">+</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Observaciones</label>
                                <textarea value={reservaNotas} onChange={e => setReservaNotas(e.target.value)}
                                    placeholder="Opcional (ej: cumpleaños de María)"
                                    rows={2}
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-pink-400 focus:outline-none resize-none" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100">
                            <button onClick={() => crearReservaCumple(canjeCumple._id)} disabled={reservaSaving || !reservaFecha || !reservaHora || !!reservaFechaError}
                                className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition">
                                {reservaSaving ? "Enviando..." : <><CalendarDays size={15} /> Confirmar reserva</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Voucher modal */}
            {/* Voucher modal cumpleaños */}
            {cumpleVoucherOpen && canjeCumple && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-6"
                    onClick={() => setCumpleVoucherOpen(false)}>
                    <div className="w-full max-w-sm bg-white text-black rounded-3xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 text-white px-6 py-6 text-center">
                            <p className="text-5xl mb-2">🎂</p>
                            <p className="text-xs font-black uppercase tracking-widest opacity-80">H. Morgan Bar</p>
                            <p className="text-xs opacity-60 mt-0.5">REGALO DE CUMPLEAÑOS</p>
                        </div>
                        <div className="px-6 py-6 text-center space-y-2">
                            <h2 className="text-2xl font-extrabold leading-tight">{canjeCumple.rewardId?.titulo || "Cena para 4 · 20% off"}</h2>
                            {canjeCumple.rewardId?.descripcion && (
                                <p className="text-sm text-gray-600">{canjeCumple.rewardId.descripcion}</p>
                            )}
                            <p className="text-pink-600 font-black text-sm mt-3">🎁 Sin costo — regalo de cumpleaños</p>
                            <div className="flex gap-2 justify-center mt-1 flex-wrap">
                                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">Jueves · 20% off</span>
                                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">Domingo · 10% off</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Generado el {new Date(canjeCumple.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </p>
                            {canjeCumple.expiraEl && (
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2 text-left">
                                    <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 font-semibold">
                                        Este regalo es válido solo durante el mes de tu cumpleaños.
                                        Vence el <span className="font-black">{formatExpira(canjeCumple.expiraEl)}</span>.
                                        Si no lo usás, se eliminará automáticamente.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-dashed border-gray-200 mx-6" />
                        <div className="px-6 py-4 flex items-center gap-3">
                            <Gift className="w-5 h-5 text-pink-500 shrink-0" />
                            <p className="text-xs text-gray-500">Mostrá esta pantalla al staff para que lo acepten en caja.</p>
                        </div>
                        <button onClick={() => setCumpleVoucherOpen(false)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 text-sm transition">
                            Cerrar
                        </button>
                    </div>
                </div>,
                document.body
            )}

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

