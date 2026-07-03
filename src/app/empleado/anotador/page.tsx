"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, ChevronRight, Trash2, LockKeyhole, Star, X, ArrowLeftRight } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type Comanda = {
    _id: string;
    mesa?: string;
    comensales?: number;
    nombreComanda?: string;
    eventoId?: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    estado: string;
    createdAt: string;
    notaEmpleado?: string;
};

type EventoActivo = { _id: string; nombre: string };
type Toast = { id: string; msg: string; tipo: string };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

const ESTADO_LABEL: Record<string, string> = {
    pendiente: "Pendiente", aceptado: "Aceptado", preparando: "Preparando",
    listo: "¡Listo!", cobrado: "Cobrado", cancelado: "Cancelado",
};

function estadoBadgeClass(estado: string) {
    switch (estado) {
        case "pendiente":  return "bg-gray-200 text-gray-600";
        case "aceptado":   return "bg-blue-100 text-blue-700";
        case "preparando": return "bg-orange-100 text-orange-700";
        case "listo":      return "bg-green-500 text-white";
        case "cobrado":    return "bg-purple-500 text-white";
        case "cancelado":  return "bg-red-100 text-red-600";
        default:           return "bg-gray-100 text-gray-500";
    }
}

export default function AnotadorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [eventosActivos, setEventosActivos] = useState<EventoActivo[]>([]);
    const [eventoPickerModal, setEventoPickerModal] = useState(false);
    const [cambiarMesaModal, setCambiarMesaModal] = useState<Comanda | null>(null);
    const [mesasDisponibles, setMesasDisponibles] = useState<{ _id: string; nombre: string; tipo?: string; activa: boolean; x: number; y: number; forma: string; ancho?: number; alto?: number; rotacion?: number }[]>([]);
    const [elementsPlano, setElementsPlano] = useState<{ _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string }[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [filtro, setFiltro] = useState<"todas" | "preparando" | "listo" | "terminados">("todas");
    const [comandasTerminadas, setComandasTerminadas] = useState<Comanda[]>([]);
    const prevEstadosRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        if (!loading && user && !["empleado", "cajero", "admin", "superadmin"].includes(user.role)) {
            router.replace("/");
        }
    }, [user, loading, router]);

    // Pedir permiso de notificaciones al montar
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Detectar cambios de estado y notificar
    useEffect(() => {
        const prev = prevEstadosRef.current;
        if (prev.size > 0) {
            for (const c of comandas) {
                const prevEstado = prev.get(c._id);
                if (prevEstado && prevEstado !== c.estado && ["listo", "cobrado"].includes(c.estado)) {
                    const label = c.mesa ? `Mesa ${c.mesa}` : c.nombreComanda || "tu comanda";
                    const msg = c.estado === "listo"
                        ? `El pedido de ${label} está listo para retirar`
                        : `El pedido de ${label} fue cobrado`;
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification("Anotador", { body: msg, icon: "/icon.png" });
                    }
                    const toastId = Math.random().toString(36).slice(2);
                    setToasts(t => [...t, { id: toastId, msg, tipo: c.estado }]);
                    setTimeout(() => setToasts(t => t.filter(x => x.id !== toastId)), 5000);
                }
            }
        }
        prevEstadosRef.current = new Map(comandas.map(c => [c._id, c.estado]));
    }, [comandas]);

    const fetchComandas = useCallback(async () => {
        const propias = user?.role === "empleado" ? "&propias=true" : "";
        const [rActivas, rTerminadas] = await Promise.all([
            fetch(`/api/pedidos?activos=true&fuente=empleado${propias}`, { credentials: "include" }),
            fetch(`/api/pedidos?fuente=empleado${propias}&terminadosHoy=true`, { credentials: "include" }),
        ]);
        const dActivas = await rActivas.json().catch(() => []);
        const dTerminadas = await rTerminadas.json().catch(() => []);
        setComandas(Array.isArray(dActivas) ? dActivas : []);
        setComandasTerminadas(Array.isArray(dTerminadas) ? dTerminadas : []);
    }, [user?.role]);

    useEffect(() => {
        if (loading) return;
        Promise.all([
            fetchComandas(),
            fetch("/api/caja/status", { credentials: "include" })
                .then(r => r.json())
                .then(d => setCajaAbierta(!!d.abierta))
                .catch(() => setCajaAbierta(false)),
            fetch("/api/eventos?activo=true", { credentials: "include" })
                .then(r => r.json())
                .then(d => setEventosActivos(Array.isArray(d) ? d.map((e: any) => ({ _id: e._id, nombre: e.nombre })) : []))
                .catch(() => null),
        ]).finally(() => setLoadingData(false));

        const iv = setInterval(fetchComandas, 8000);
        return () => clearInterval(iv);
    }, [fetchComandas, loading]);

    async function abrirCambiarMesa(c: Comanda) {
        const fetches: Promise<void>[] = [];
        if (mesasDisponibles.length === 0) {
            fetches.push(
                fetch("/api/admin/mesas?all=true", { credentials: "include" })
                    .then(r => r.json()).then(d => setMesasDisponibles(Array.isArray(d) ? d : []))
                    .catch(() => {})
            );
        }
        if (elementsPlano.length === 0) {
            fetches.push(
                fetch("/api/superadmin/salon", { credentials: "include" })
                    .then(r => r.json()).then(d => { if (Array.isArray(d)) setElementsPlano(d); })
                    .catch(() => {})
            );
        }
        await Promise.all(fetches);
        setCambiarMesaModal(c);
    }

    async function ejecutarCambioMesa(comanda: Comanda, nuevaMesa: string) {
        const { isConfirmed } = await swalBase.fire({
            title: "¿Transferir mesa?",
            html: `<p class="text-gray-600 text-sm">De <strong>Mesa ${comanda.mesa}</strong> → <strong>Mesa ${nuevaMesa}</strong></p>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, transferir",
            cancelButtonText: "Cancelar",
        });
        if (!isConfirmed) return;
        await fetch(`/api/pedidos/${comanda._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "cambiarMesa", mesa: nuevaMesa }),
        });
        setCambiarMesaModal(null);
        fetchComandas();
    }

    async function eliminarComanda(id: string) {
        const r = await swalBase.fire({
            title: "¿Eliminar comanda?",
            text: "Se borrará definitivamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos?id=${id}`, { method: "DELETE", credentials: "include" });
        setComandas(prev => prev.filter(c => c._id !== id));
    }

    function handleNuevaComanda() {
        if (eventosActivos.length > 0) {
            setEventoPickerModal(true);
        } else {
            router.push("/empleado/anotador/menu");
        }
    }

    function irAMenu(eventoId?: string) {
        setEventoPickerModal(false);
        const url = eventoId
            ? `/empleado/anotador/menu?eventoId=${eventoId}`
            : "/empleado/anotador/menu";
        router.push(url);
    }

    if (loading || loadingData) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-white pb-24">

            {/* Toasts de notificación */}
            <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id}
                        className={`w-full max-w-sm px-4 py-3 rounded-2xl shadow-xl font-bold text-sm pointer-events-auto flex items-center gap-3
                            ${t.tipo === "listo" ? "bg-green-500 text-white" : "bg-purple-600 text-white"}`}>
                        <span className="text-lg">{t.tipo === "listo" ? "🟢" : "✅"}</span>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">

                {eventosActivos.length > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Star size={14} className="text-amber-500 shrink-0" />
                        <p className="text-sm font-bold text-amber-700 truncate">
                            {eventosActivos.length === 1
                                ? `Evento activo: ${eventosActivos[0].nombre}`
                                : `${eventosActivos.length} eventos activos`}
                        </p>
                    </div>
                )}

                {cajaAbierta === false && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-5 py-4">
                        <LockKeyhole size={18} className="text-gray-400 shrink-0" />
                        <div>
                            <p className="font-bold text-gray-600 text-sm">Caja cerrada</p>
                            <p className="text-xs text-gray-400">Solo lectura hasta que abran la caja</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div>
                    <h1 className="font-black text-2xl text-gray-900 tracking-tight">Comandas</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Anotador de pedidos</p>
                </div>

                {cajaAbierta !== false && (
                    <button onClick={handleNuevaComanda}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition active:scale-[0.98] shadow-sm text-base">
                        <Plus size={20} /> Nueva comanda
                    </button>
                )}

                {/* Tabs de filtro */}
                {(() => {
                    const cPreparando = comandas.filter(c => c.estado === "preparando").length;
                    const cListos     = comandas.filter(c => c.estado === "listo").length;
                    const cTerminados = comandasTerminadas.length;
                    const tabs = [
                        { key: "todas",      label: "Todas",      count: null },
                        { key: "preparando", label: "Preparando", count: cPreparando },
                        { key: "listo",      label: "Listos",     count: cListos },
                        { key: "terminados", label: "Terminados", count: cTerminados },
                    ] as const;
                    return (
                        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                            {tabs.map(t => (
                                <button key={t.key}
                                    onClick={() => setFiltro(t.key)}
                                    className={`relative flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition
                                        ${filtro === t.key
                                            ? "bg-gray-900 text-white"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    {t.label}
                                    {t.count != null && t.count > 0 && (
                                        <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center
                                            ${t.key === "listo"      ? "bg-green-500 text-white"
                                            : t.key === "terminados" ? "bg-purple-500 text-white"
                                            :                          "bg-orange-500 text-white"}`}>
                                            {t.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })()}

                {/* Comandas */}
                <div>
                    {(() => {
                        const lista = filtro === "terminados"
                            ? comandasTerminadas
                            : filtro === "preparando"
                            ? comandas.filter(c => c.estado === "preparando")
                            : filtro === "listo"
                            ? comandas.filter(c => c.estado === "listo")
                            : comandas;

                        const esTerminados = filtro === "terminados";

                        if (lista.length === 0) return (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl">
                                <UtensilsCrossed size={40} className="mx-auto text-gray-200 mb-3" />
                                <p className="font-bold text-gray-400 text-sm">
                                    {esTerminados ? "Sin comandas terminadas hoy" : "Sin comandas en esta sección"}
                                </p>
                                {!esTerminados && cajaAbierta !== false && (
                                    <p className="text-xs text-gray-300 mt-1">Presioná "Nueva comanda" para empezar</p>
                                )}
                            </div>
                        );

                        return (
                        <div className="space-y-3">
                            {lista.map(c => {
                                const eventoNombre = c.eventoId ? (eventosActivos.find(e => e._id === c.eventoId)?.nombre ?? null) : null;
                                const titulo = eventoNombre ?? (c.mesa ? `Mesa ${c.mesa}` : c.nombreComanda || "Sin mesa");
                                return (
                                <div key={c._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                                    {/* Header de la card */}
                                    <div className="relative px-4 pt-3 pb-2.5 bg-gray-50 border-b border-gray-100">
                                        {/* Estado — esquina superior derecha */}
                                        <span className={`absolute top-3 right-4 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${estadoBadgeClass(c.estado)}`}>
                                            {ESTADO_LABEL[c.estado] ?? c.estado}
                                        </span>

                                        {/* Título principal */}
                                        <div className="pr-24 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-gray-900 text-base leading-tight">{titulo}</p>
                                                {!!c.comensales && (
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                        {c.comensales}p
                                                    </span>
                                                )}
                                            </div>

                                            {/* Badge evento */}
                                            {eventoNombre && (
                                                <span className="inline-block mt-1 text-[10px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    Evento
                                                </span>
                                            )}

                                            {/* Nombre comanda (solo si hay mesa y nombre adicional) */}
                                            {!eventoNombre && c.nombreComanda && c.mesa && (
                                                <p className="text-sm text-gray-500 font-semibold mt-0.5 truncate">{c.nombreComanda}</p>
                                            )}
                                        </div>

                                        {/* Hora + total en fila inferior */}
                                        <div className="flex items-center justify-between mt-2 pr-1">
                                            <p className="text-xs text-gray-400">
                                                {new Date(c.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                            <p className="text-base font-black text-gray-900">${fmt(c.total)}</p>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="px-4 py-3 space-y-1">
                                        {c.items.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">Sin ítems todavía</p>
                                        ) : c.items.map((it, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-700">
                                                    <span className="font-bold text-gray-400 mr-1.5">{it.cantidad}×</span>
                                                    {it.menuItemId?.nombre || "ítem"}
                                                </span>
                                                <span className="text-gray-400 shrink-0 ml-2">
                                                    ${fmt((it.menuItemId?.precio || 0) * it.cantidad)}
                                                </span>
                                            </div>
                                        ))}
                                        {c.notaEmpleado && (
                                            <p className="text-xs text-amber-600 italic mt-1.5">📝 {c.notaEmpleado}</p>
                                        )}
                                        {c.items.length > 0 && (
                                            <div className="flex justify-between text-xs font-black text-gray-900 pt-2 mt-1 border-t border-gray-100">
                                                <span>TOTAL</span>
                                                <span>${fmt(c.total)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Acciones — solo en comandas activas */}
                                    {cajaAbierta !== false && !esTerminados && (
                                        <div className="px-4 pb-3 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => eliminarComanda(c._id)}
                                                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl text-sm transition active:scale-95">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                                {c.mesa && (
                                                    <button
                                                        onClick={() => abrirCambiarMesa(c)}
                                                        className="flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl text-sm transition active:scale-95"
                                                        title="Transferir mesa">
                                                        <ArrowLeftRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => router.push(`/empleado/anotador/menu?id=${c._id}`)}
                                                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition active:scale-95">
                                                <Plus size={14} /> Agregar
                                                <ChevronRight size={13} className="opacity-60" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                        );
                    })()}
                </div>

            </div>

            {/* Modal selector de evento */}
            {eventoPickerModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">¿Para quién es la comanda?</h2>
                            <button onClick={() => setEventoPickerModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-4 py-4 space-y-2.5">
                            <button onClick={() => irAMenu()}
                                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-gray-200 hover:border-gray-400 bg-white transition active:scale-95 text-left">
                                <div>
                                    <p className="font-black text-gray-900">Cliente normal</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Comanda estándar sin evento</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 shrink-0" />
                            </button>
                            {eventosActivos.map(ev => (
                                <button key={ev._id} onClick={() => irAMenu(ev._id)}
                                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-amber-300 hover:border-amber-500 bg-amber-50 transition active:scale-95 text-left">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Evento</span>
                                        </div>
                                        <p className="font-black text-amber-900">{ev.nombre}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-amber-400 shrink-0" />
                                </button>
                            ))}
                        </div>
                        <div className="px-4 pb-4">
                            <button onClick={() => setEventoPickerModal(false)}
                                className="w-full py-2.5 text-sm text-gray-500 font-semibold hover:text-gray-700 transition">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal transferir mesa ── */}
            {cambiarMesaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setCambiarMesaModal(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-black px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="font-black text-white text-sm">Transferir mesa</p>
                                <p className="text-xs text-white/60">
                                    Actual: <span className="text-white font-bold">Mesa {cambiarMesaModal.mesa}</span>
                                    {" · "}Tocá una mesa disponible
                                </p>
                            </div>
                            <button onClick={() => setCambiarMesaModal(null)} className="text-white/60 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Leyenda */}
                        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-3 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Actual</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Disponible</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Ocupada</span>
                        </div>

                        {/* Plano */}
                        <div className="px-4 pb-4">
                            {mesasDisponibles.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">Cargando mesas…</p>
                            ) : (
                                <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
                                    <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                                        {elementsPlano.map(el => {
                                            const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                                            const isBarra = el.tipo === "barra";
                                            if (isLine) return (
                                                <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: el.tipo === "linea_h" ? `${el.ancho}%` : "3px", height: el.tipo === "linea_v" ? `${el.alto}%` : "3px", backgroundColor: el.color, borderRadius: "2px", transform: el.tipo === "linea_h" ? "translateY(-50%)" : "translateX(-50%)" }} />
                                            );
                                            return (
                                                <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%,-50%)", width: `${el.ancho}%`, height: `${el.alto}%`, minWidth: "32px", minHeight: "14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", backgroundColor: isBarra ? "#b45309" : el.color, border: isBarra ? "2px solid #92400e" : `1px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}60` }}>
                                                    {el.label && <span style={{ fontSize: "clamp(6px,0.9vw,9px)", fontWeight: 700, color: isBarra ? "#fef3c7" : "#374151", whiteSpace: "nowrap" }}>{el.label}</span>}
                                                </div>
                                            );
                                        })}
                                        {mesasDisponibles.filter(m => m.activa).map(m => {
                                            const esActual  = m.nombre === cambiarMesaModal.mesa;
                                            const ocupada   = !esActual && !!comandas.find(c =>
                                                c.mesa === m.nombre && c._id !== cambiarMesaModal._id
                                            );
                                            const isBanq    = m.tipo === "banqueta";
                                            const isRound   = m.forma === "round" || m.forma === "oval";
                                            const rot       = m.rotacion ?? 0;
                                            const w         = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                                            const h         = m.alto  || (m.forma === "oval" ? 5  : m.forma === "round" ? 5.5 : 5);
                                            const bloqueada = isBanq || ocupada;
                                            const bg = esActual ? "bg-blue-500 border-blue-600 text-white ring-2 ring-blue-300"
                                                : isBanq      ? "bg-amber-700 border-amber-800 text-amber-100"
                                                : ocupada     ? "bg-red-500 border-red-600 text-white opacity-70"
                                                :               "bg-emerald-500 border-emerald-600 text-white";
                                            return (
                                                <div key={m._id}
                                                    onClick={() => !bloqueada && !esActual && ejecutarCambioMesa(cambiarMesaModal, m.nombre)}
                                                    style={{ position: "absolute", left: `${m.x ?? 10}%`, top: `${m.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: bloqueada || esActual ? "default" : "pointer", userSelect: "none", zIndex: 2 }}
                                                    className={`flex items-center justify-center border-2 ${bg} ${!bloqueada && !esActual ? "transition-all active:scale-95 hover:brightness-110" : ""}`}>
                                                    <div style={{ transform: `rotate(${-rot}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <span style={{ fontSize: "clamp(5px,0.8vw,9px)", fontWeight: 900 }}>{isBanq ? `B${m.nombre}` : m.nombre}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
