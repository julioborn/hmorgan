"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Truck, MapPin, Phone, Clock, PackageCheck, Loader2, Bell, BellRing } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type Pedido = {
    _id: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    tipoEntrega?: string;
    direccion?: string;
    notaCliente?: string;
    notaEmpleado?: string;
    createdAt: string;
    userId?: { nombre: string; apellido: string; telefono?: string };
    repartidorAfuera?: boolean;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

export default function DeliveryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [avisandoId, setAvisandoId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user && user.role !== "delivery" && user.role !== "admin" && user.role !== "superadmin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    const fetchPedidos = useCallback(async () => {
        const r = await fetch("/api/pedidos", { credentials: "include" });
        const d = await r.json().catch(() => []);
        setPedidos(Array.isArray(d) ? d : []);
    }, []);

    useEffect(() => {
        fetchPedidos().finally(() => setLoadingData(false));
        const iv = setInterval(fetchPedidos, 8000);
        return () => clearInterval(iv);
    }, [fetchPedidos]);

    async function avisarCliente(p: Pedido) {
        setAvisandoId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: p._id, repartidorAfuera: true }),
            });
            await fetchPedidos();
        } finally {
            setAvisandoId(null);
        }
    }

    async function marcarEntregado(p: Pedido) {
        const nombreCliente = `${p.userId?.nombre ?? ""} ${p.userId?.apellido ?? ""}`.trim() || "el cliente";

        const r1 = await swalBase.fire({
            title: "¿Envío completado?",
            html: `Vas a marcar como <b>entregado</b> el pedido de <b>${nombreCliente}</b>.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
        });
        if (!r1.isConfirmed) return;

        const r2 = await swalBase.fire({
            title: "Confirmar entrega",
            text: "Esta acción no se puede deshacer. ¿Confirmás que el pedido ya fue entregado?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, entregado",
            cancelButtonText: "Cancelar",
        });
        if (!r2.isConfirmed) return;

        setUpdatingId(p._id);
        try {
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: p._id, estado: "entregado" }),
            });
            await fetchPedidos();
        } finally {
            setUpdatingId(null);
        }
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    const enCamino = pedidos.filter(p => p.estado === "listo");
    const entregados = pedidos.filter(p => p.estado === "entregado");

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="max-w-2xl mx-auto px-4">

                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-black rounded-xl p-2.5">
                        <Truck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Entregas</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {enCamino.length === 0 ? "Sin envíos en camino" : `${enCamino.length} envío${enCamino.length !== 1 ? "s" : ""} en camino`}
                        </p>
                    </div>
                </div>

                {enCamino.length === 0 ? (
                    <div className="text-center py-16">
                        <Truck size={56} className="mx-auto text-gray-100 mb-4" />
                        <p className="font-bold text-gray-400">No hay envíos pendientes</p>
                        <p className="text-sm text-gray-300 mt-1">Los pedidos en camino van a aparecer acá</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {enCamino.map(p => (
                            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-gray-900 truncate">
                                            {p.userId?.nombre} {p.userId?.apellido}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0 ml-2">
                                        En camino
                                    </span>
                                </div>

                                <div className="px-4 py-3 space-y-2.5">
                                    {p.direccion && (
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <MapPin size={15} className="text-red-500 mt-0.5 shrink-0" />
                                            <span className="font-semibold">{p.direccion}</span>
                                        </div>
                                    )}
                                    {p.userId?.telefono && (
                                        <a href={`tel:${p.userId.telefono}`} className="flex items-center gap-2 text-sm text-gray-700">
                                            <Phone size={15} className="text-emerald-600 shrink-0" />
                                            <span className="font-semibold">{p.userId.telefono}</span>
                                        </a>
                                    )}

                                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mt-1">
                                        {p.items.map((it, idx) => (
                                            <li key={idx} className="flex justify-between items-center px-3 py-2 bg-gray-50 text-sm">
                                                <span className="text-gray-700">
                                                    <span className="font-bold text-gray-400 mr-1.5">{it.cantidad}×</span>
                                                    {it.menuItemId?.nombre || "ítem"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {(p.notaCliente || p.notaEmpleado) && (
                                        <p className="text-xs text-amber-600 italic">📝 {p.notaCliente || p.notaEmpleado}</p>
                                    )}

                                    <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                                        <span>TOTAL</span>
                                        <span>${fmt(p.total)}</span>
                                    </div>

                                    {p.tipoEntrega === "envio" && (
                                        <button
                                            disabled={avisandoId === p._id || p.repartidorAfuera}
                                            onClick={() => avisarCliente(p)}
                                            className="w-full mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95"
                                        >
                                            {avisandoId === p._id ? <Loader2 size={16} className="animate-spin" /> : p.repartidorAfuera ? <BellRing size={16} /> : <Bell size={16} />}
                                            {p.repartidorAfuera ? "Cliente avisado" : "Avisar al cliente"}
                                        </button>
                                    )}

                                    <button
                                        disabled={updatingId === p._id}
                                        onClick={() => marcarEntregado(p)}
                                        className="w-full mt-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95"
                                    >
                                        {updatingId === p._id ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                                        Envío completado
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {entregados.length > 0 && (
                    <>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-8 mb-3">
                            Entregados · pendientes de cobro
                        </p>
                        <div className="space-y-2">
                            {entregados.map(p => (
                                <div key={p._id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-700 text-sm truncate">
                                            {p.userId?.nombre} {p.userId?.apellido}
                                        </p>
                                        {p.direccion && <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5"><MapPin size={11} />{p.direccion}</p>}
                                    </div>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 ml-2 flex items-center gap-1">
                                        <Clock size={11} /> Entregado
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
