"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, ChevronRight, LockKeyhole, Star, X, ArrowLeftRight, User, Users, Search, Loader2, MessageCircle } from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type ClienteResult = { _id: string; nombre: string; apellido: string; username: string; telefono?: string; puntos?: number };

type Comanda = {
    _id: string;
    mesa?: string;
    comensales?: number;
    comensalesIds?: { _id: string; nombre: string; apellido: string }[];
    nombreComanda?: string;
    eventoId?: string;
    items: { _id?: string; menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number; nota?: string; listo?: boolean }[];
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
        case "preparando": return "bg-red-100 text-red-700";
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
    const [cajaFechaApertura, setCajaFechaApertura] = useState<Date | null>(null);
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
    const [comensalesModal, setComensalesModal] = useState<Comanda | null>(null);
    const [comensalesCount, setComensalesCount] = useState(0);
    const [comensalesIds, setComensalesIds] = useState<{ _id: string; nombre: string; apellido: string }[]>([]);
    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [clientesResultados, setClientesResultados] = useState<ClienteResult[]>([]);
    const [buscandoCliente, setBuscandoCliente] = useState(false);
    const [guardandoComensales, setGuardandoComensales] = useState(false);
    const [editingNota, setEditingNota] = useState<{ pedidoId: string; itemId: string; valor: string } | null>(null);
    const [sesionesAutoserv, setSesionesAutoserv] = useState<{ mesasNombres: string[] }[]>([]);

    // Solo las terminadas cobradas dentro de la sesión de caja actual
    const terminadasSesion = useMemo(() =>
        cajaFechaApertura
            ? comandasTerminadas.filter(c => new Date((c as any).updatedAt || (c as any).createdAt) >= cajaFechaApertura)
            : [],
        [comandasTerminadas, cajaFechaApertura]
    );

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

    // Si la caja cierra mientras el mozo está en "terminados", volver a "todas"
    useEffect(() => {
        if (cajaAbierta === false && filtro === "terminados") setFiltro("todas");
    }, [cajaAbierta, filtro]);

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
                .then(d => {
                    setCajaAbierta(!!d.abierta);
                    setCajaFechaApertura(d.fechaApertura ? new Date(d.fechaApertura) : null);
                })
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
        fetches.push(
            fetch("/api/autoservicio", { credentials: "include" })
                .then(r => r.json()).then(d => { if (Array.isArray(d)) setSesionesAutoserv(d); })
                .catch(() => {})
        );
        await Promise.all(fetches);
        setCambiarMesaModal(c);
    }

    async function guardarNota(pedidoId: string, itemId: string, nota: string) {
        await fetch(`/api/pedidos/${pedidoId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ accion: "editarNotaItem", itemId, nota }),
        });
        setEditingNota(null);
        fetchComandas();
    }

    async function ejecutarCambioMesa(comanda: Comanda, nuevaMesa: string) {
        const mesaOrigen = comanda.mesa ? `Mesa ${comanda.mesa}` : "Sin mesa";
        const { isConfirmed } = await swalBase.fire({
            title: comanda.mesa ? "¿Transferir mesa?" : "¿Asignar mesa?",
            html: `<p class="text-gray-600 text-sm">De <strong>${mesaOrigen}</strong> → <strong>Mesa ${nuevaMesa}</strong></p>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: comanda.mesa ? "Sí, transferir" : "Sí, asignar",
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

    function abrirComensalesModal(c: Comanda) {
        setComensalesModal(c);
        setComensalesCount(c.comensales || 0);
        setComensalesIds(c.comensalesIds || []);
        setBusquedaCliente("");
        setClientesResultados([]);
    }

    useEffect(() => {
        if (busquedaCliente.length < 2) { setClientesResultados([]); return; }
        const t = setTimeout(async () => {
            setBuscandoCliente(true);
            try {
                const r = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(busquedaCliente)}`, { credentials: "include" });
                const d = await r.json();
                setClientesResultados(Array.isArray(d) ? d : []);
            } finally { setBuscandoCliente(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [busquedaCliente]);

    async function guardarComensales() {
        if (!comensalesModal) return;
        setGuardandoComensales(true);
        try {
            await fetch(`/api/pedidos/${comensalesModal._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "actualizarComensales", comensales: comensalesCount }),
            });
            setComandas(prev => prev.map(c => c._id === comensalesModal._id
                ? { ...c, comensales: comensalesCount, comensalesIds }
                : c
            ));
            setComensalesModal(null);
        } finally { setGuardandoComensales(false); }
    }

    async function agregarComensal(cliente: ClienteResult) {
        if (!comensalesModal) return;
        if (comensalesIds.find(c => c._id === cliente._id)) return;
        await fetch(`/api/pedidos/${comensalesModal._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "actualizarComensales", agregarUserId: cliente._id }),
        });
        const nuevo = { _id: cliente._id, nombre: cliente.nombre, apellido: cliente.apellido };
        setComensalesIds(prev => [...prev, nuevo]);
        setBusquedaCliente("");
        setClientesResultados([]);
    }

    async function quitarComensal(userId: string) {
        if (!comensalesModal) return;
        await fetch(`/api/pedidos/${comensalesModal._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accion: "actualizarComensales", quitarUserId: userId }),
        });
        setComensalesIds(prev => prev.filter(c => c._id !== userId));
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

                {/* Tabs de filtro — 2 filas */}
                {(() => {
                    const cPreparando = comandas.filter(c => c.estado === "preparando").length;
                    const cListos     = comandas.filter(c => c.estado === "listo").length;
                    const cTerminados = terminadasSesion.length;
                    const fila1 = [
                        { key: "todas",      label: "Todas",      count: null as number | null },
                        ...(cajaAbierta !== false ? [{ key: "terminados", label: "Terminadas", count: cTerminados as number | null }] : []),
                    ];
                    const fila2 = [
                        { key: "preparando", label: "Preparando", count: cPreparando },
                        { key: "listo",      label: "Listas",     count: cListos },
                    ] as const;
                    const tabClass = (key: string) =>
                        `relative flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition
                        ${filtro === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`;
                    const bubble = (key: string, count: number) => (
                        <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center
                            ${key === "listo" ? "bg-green-500 text-white" : key === "terminados" ? "bg-black text-white" : "bg-red-600 text-white"}`}>
                            {count}
                        </span>
                    );
                    return (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                {fila1.map(t => (
                                    <button key={t.key} onClick={() => setFiltro(t.key as typeof filtro)} className={tabClass(t.key)}>
                                        {t.label}
                                        {t.count != null && t.count > 0 && bubble(t.key, t.count)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {fila2.map(t => (
                                    <button key={t.key} onClick={() => setFiltro(t.key)} className={tabClass(t.key)}>
                                        {t.label}
                                        {t.count > 0 && bubble(t.key, t.count)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Comandas */}
                <div>
                    {(() => {
                        const lista = filtro === "terminados"
                            ? terminadasSesion
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
                                                    <span className="flex items-center gap-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                        {c.comensales}<User size={11} />
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
                                        ) : c.items.map((it, idx) => {
                                            const isEditingThis = editingNota?.pedidoId === c._id && editingNota?.itemId === it._id;
                                            return (
                                            <div key={it._id || idx} className={`rounded-lg px-2 py-0.5 -mx-2 ${it.listo ? "bg-emerald-50" : ""}`}>
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className={it.listo ? "text-emerald-700" : "text-gray-700"}>
                                                        <span className={`font-bold mr-1.5 ${it.listo ? "text-emerald-500" : "text-gray-400"}`}>{it.cantidad}×</span>
                                                        {it.menuItemId?.nombre || "ítem"}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                        <span className={it.listo ? "text-emerald-500" : "text-gray-400"}>
                                                            ${fmt((it.menuItemId?.precio || 0) * it.cantidad)}
                                                        </span>
                                                        {it._id && (
                                                            <button
                                                                onClick={() => setEditingNota(isEditingThis ? null : { pedidoId: c._id, itemId: it._id!, valor: it.nota || "" })}
                                                                className={`p-1 rounded-lg transition ${isEditingThis || it.nota ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"}`}
                                                            >
                                                                <MessageCircle size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {it.nota && !isEditingThis && (
                                                    <p className="text-[11px] text-amber-700 italic mt-0.5 ml-5 break-words">✏ {it.nota}</p>
                                                )}
                                                {isEditingThis && (
                                                    <div className="mt-1.5 ml-5 flex gap-1.5">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingNota.valor}
                                                            onChange={e => setEditingNota(s => s ? { ...s, valor: e.target.value } : null)}
                                                            onKeyDown={e => { if (e.key === "Enter") guardarNota(c._id, it._id!, editingNota.valor); if (e.key === "Escape") setEditingNota(null); }}
                                                            placeholder="Nota del ítem…"
                                                            className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50"
                                                        />
                                                        <button onClick={() => guardarNota(c._id, it._id!, editingNota.valor)} className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black">OK</button>
                                                        <button onClick={() => setEditingNota(null)} className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold">✕</button>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
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
                                                    onClick={() => abrirCambiarMesa(c)}
                                                    className="flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl text-sm transition active:scale-95"
                                                    title={c.mesa ? "Transferir mesa" : "Asignar mesa"}>
                                                    <ArrowLeftRight size={14} />
                                                </button>
                                                <button
                                                    onClick={() => abrirComensalesModal(c)}
                                                    className="flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl text-sm transition active:scale-95"
                                                    title="Editar comensales">
                                                    <Users size={14} />
                                                    {(c.comensales || 0) > 0 && <span className="font-bold text-xs">{c.comensales}</span>}
                                                </button>
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

            {/* ── Modal comensales ── */}
            {comensalesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setComensalesModal(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-black px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="font-black text-white text-sm">Comensales</p>
                                <p className="text-xs text-white/60">{comensalesModal.mesa ? `Mesa ${comensalesModal.mesa}` : comensalesModal.nombreComanda || "Comanda"}</p>
                            </div>
                            <button onClick={() => setComensalesModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Contador */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Cantidad de personas</p>
                                <div className="flex items-center gap-4 justify-center">
                                    <button onClick={() => setComensalesCount(n => Math.max(0, n - 1))}
                                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xl transition active:scale-95">−</button>
                                    <span className="text-4xl font-black text-gray-900 w-12 text-center">{comensalesCount}</span>
                                    <button onClick={() => setComensalesCount(n => n + 1)}
                                        className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-700 text-white font-black text-xl transition active:scale-95">+</button>
                                </div>
                            </div>
                            {/* Comensales registrados */}
                            {comensalesIds.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Con cuenta en la app</p>
                                    <div className="space-y-1.5">
                                        {comensalesIds.map(c => (
                                            <div key={c._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <User size={13} className="text-gray-400" />
                                                    <span className="text-sm font-semibold text-gray-800">{c.nombre} {c.apellido}</span>
                                                </div>
                                                <button onClick={() => quitarComensal(c._id)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Búsqueda */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Agregar cliente con cuenta</p>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
                                        placeholder="Nombre, apellido o teléfono..."
                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                                    {buscandoCliente && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                                </div>
                                {clientesResultados.length > 0 && (
                                    <div className="mt-1.5 border border-gray-100 rounded-xl overflow-hidden">
                                        {clientesResultados.filter(r => !comensalesIds.find(c => c._id === r._id)).map(r => (
                                            <button key={r._id} onClick={() => agregarComensal(r)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left border-b last:border-0 border-gray-100 transition">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{r.nombre} {r.apellido}</p>
                                                    {r.telefono && <p className="text-xs text-gray-400">{r.telefono}</p>}
                                                </div>
                                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Agregar</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-4 pb-4">
                            <button onClick={guardarComensales} disabled={guardandoComensales}
                                className="w-full py-3 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-black rounded-xl transition flex items-center justify-center gap-2">
                                {guardandoComensales && <Loader2 size={15} className="animate-spin" />}
                                Guardar
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
                                <p className="font-black text-white text-sm">{cambiarMesaModal.mesa ? "Transferir mesa" : "Asignar mesa"}</p>
                                <p className="text-xs text-white/60">
                                    {cambiarMesaModal.mesa
                                        ? <>Actual: <span className="text-white font-bold">Mesa {cambiarMesaModal.mesa}</span> · Tocá una mesa disponible</>
                                        : "Tocá una mesa disponible para asignarla"
                                    }
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
                                            const tieneAutoservicio = !esActual && sesionesAutoserv.some(s => s.mesasNombres.includes(m.nombre));
                                            const ocupada   = !esActual && !tieneAutoservicio && !!comandas.find(c =>
                                                c.mesa === m.nombre && c._id !== cambiarMesaModal._id
                                            );
                                            const isBanq    = m.tipo === "banqueta";
                                            const isRound   = m.forma === "round" || m.forma === "oval";
                                            const rot       = m.rotacion ?? 0;
                                            const w         = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                                            const h         = m.alto  || (m.forma === "oval" ? 5  : m.forma === "round" ? 5.5 : 5);
                                            const bloqueada = isBanq || ocupada || tieneAutoservicio;
                                            const bg = esActual ? "bg-blue-500 border-blue-600 text-white ring-2 ring-blue-300"
                                                : isBanq           ? "bg-amber-700 border-amber-800 text-amber-100"
                                                : tieneAutoservicio ? "bg-purple-600 border-purple-700 text-white opacity-70"
                                                : ocupada          ? "bg-red-500 border-red-600 text-white opacity-70"
                                                :                    "bg-emerald-500 border-emerald-600 text-white";
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
