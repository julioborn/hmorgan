"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Ticket, Plus, X, Loader2, Star, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";

type TarjetaEntry = { _id: string; cantidad: number; metodoPago?: string; createdAt: string };
type EventoActivo = { _id: string; nombre: string; precioTarjeta?: number; tarjetas?: TarjetaEntry[] };

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

function agoLabel(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "ahora";
    if (diff < 60) return `hace ${diff} min`;
    return `hace ${Math.floor(diff / 60)}h`;
}

const METODO_LABEL: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transf.",
    tarjeta: "Tarjeta",
};

export default function EntradasEmpleadoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [eventos, setEventos] = useState<EventoActivo[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

    const [modal, setModal] = useState<{ eventoId: string; eventoNombre: string } | null>(null);
    const [cantidad, setCantidad] = useState("");
    const [metodo, setMetodo] = useState<"efectivo" | "transferencia">("efectivo");
    const [saving, setSaving] = useState(false);

    const fetchEventos = useCallback(async () => {
        const res = await fetch("/api/eventos?activo=true", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setEventos(
            Array.isArray(data)
                ? data.map((e: any) => ({
                      _id: e._id,
                      nombre: e.nombre,
                      precioTarjeta: e.precioTarjeta ?? 0,
                      tarjetas: e.tarjetas ?? [],
                  }))
                : []
        );
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!user || !["empleado", "admin", "superadmin", "cajero"].includes(user.role)) {
            router.replace("/");
            return;
        }
        Promise.all([
            fetchEventos(),
            fetch("/api/caja/status", { credentials: "include" })
                .then(r => r.json())
                .then(d => setCajaAbierta(!!d.abierta))
                .catch(() => setCajaAbierta(false)),
        ]).finally(() => setLoadingData(false));
    }, [loading, user, router, fetchEventos]);

    function abrirModal(ev: EventoActivo) {
        setCantidad("");
        setMetodo("efectivo");
        setModal({ eventoId: ev._id, eventoNombre: ev.nombre });
    }

    async function guardar() {
        if (!modal || !cantidad || Number(cantidad) < 1) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/eventos/${modal.eventoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "agregarTarjetas", cantidad: Number(cantidad), metodoPago: metodo }),
            });
            if (res.ok) {
                const { evento } = await res.json();
                setEventos(prev =>
                    prev.map(e =>
                        e._id === modal.eventoId
                            ? { ...e, tarjetas: evento.tarjetas ?? [], precioTarjeta: evento.precioTarjeta ?? e.precioTarjeta }
                            : e
                    )
                );
                setModal(null);
            }
        } finally { setSaving(false); }
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    return (
        <div className="max-w-lg mx-auto pb-24">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/empleado/anotador" className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Entradas</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Registro por evento</p>
                </div>
            </div>

            {/* Sin eventos */}
            {eventos.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Ticket size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Sin eventos activos</p>
                    <p className="text-sm mt-1">Cuando haya un evento abierto aparecerá aquí.</p>
                </div>
            )}

            {/* Eventos */}
            <div className="space-y-4">
                {eventos.map(ev => {
                    const tarjetas = ev.tarjetas ?? [];
                    const totalEnt = tarjetas.reduce((s, t) => s + t.cantidad, 0);
                    const precio = ev.precioTarjeta ?? 0;

                    return (
                        <div key={ev._id} className="rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden">

                            {/* Evento header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-amber-600">
                                <Star size={13} className="text-amber-200 shrink-0" />
                                <span className="font-black text-white flex-1 truncate">{ev.nombre}</span>
                                <div className="text-right">
                                    <p className="text-xs font-black text-amber-100">
                                        {totalEnt} entrada{totalEnt !== 1 ? "s" : ""}
                                    </p>
                                    {precio > 0 && totalEnt > 0 && (
                                        <p className="text-[10px] text-amber-200">{fmt(totalEnt * precio)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Lotes */}
                            <div className="px-4 py-3 space-y-2">
                                {tarjetas.length === 0 && (
                                    <p className="text-sm text-amber-600 italic py-1">Sin entradas registradas aún</p>
                                )}
                                {tarjetas.map(t => (
                                    <div key={t._id} className="flex items-center gap-2 rounded-xl bg-white border border-amber-100 px-3 py-2">
                                        <Ticket size={13} className="text-amber-400 shrink-0" />
                                        <span className="text-sm font-black text-gray-800">×{t.cantidad}</span>
                                        <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                                            {METODO_LABEL[t.metodoPago || "efectivo"] ?? t.metodoPago}
                                        </span>
                                        {precio > 0 && (
                                            <span className="text-sm font-semibold text-gray-500">{fmt(t.cantidad * precio)}</span>
                                        )}
                                        <span className="text-[11px] text-gray-400 ml-auto">{agoLabel(t.createdAt)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Botón agregar */}
                            {cajaAbierta !== false && (
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => abrirModal(ev)}
                                        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl transition active:scale-[0.98] text-sm">
                                        <Plus size={16} /> Agregar entradas
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <Ticket size={18} className="text-amber-600 shrink-0" />
                            <div className="flex-1">
                                <h2 className="font-black text-gray-900">Registrar entradas</h2>
                                <p className="text-xs text-gray-500">{modal.eventoNombre}</p>
                            </div>
                            <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>

                        <div className="px-5 py-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Cantidad de personas</label>
                                <input
                                    autoFocus type="number" inputMode="numeric" min="1"
                                    value={cantidad}
                                    onChange={e => setCantidad(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") guardar(); }}
                                    style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border border-black rounded-xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Forma de pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["efectivo", "transferencia"] as const).map(m => (
                                        <button key={m} onClick={() => setMetodo(m)}
                                            className={`py-3 rounded-xl text-sm font-black border-2 transition active:scale-95 ${metodo === m ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200"}`}>
                                            {m === "efectivo" ? "Efectivo" : "Transferencia"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 pb-5 flex gap-2">
                            <button onClick={() => setModal(null)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600">
                                Cancelar
                            </button>
                            <button onClick={guardar} disabled={!cantidad || Number(cantidad) < 1 || saving}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-black transition">
                                {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Registrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
