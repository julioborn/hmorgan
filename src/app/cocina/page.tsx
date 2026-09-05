"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle, ChefHat, LogOut, Clock, X, UtensilsCrossed, ChevronLeft, Phone } from "lucide-react";
import MenuImg from "@/components/MenuImg";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";

const BEBIDAS_CATS = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);
const PICAR_CATS   = ["PICADAS", "FRITURAS"];
const MENU_ORDER   = ["PARRILLA","PIZZAS","HAMBURGUESAS","SANDWICHES","PICADAS Y FRITURAS","ENSALADAS","BEBIDAS","POSTRE Y CAFE"];
const DEMORA_MS    = 25 * 60 * 1000;

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg", PIZZAS: "/pizzas.jpg", HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg", "PICADAS Y FRITURAS": "/picada.jpg", ENSALADAS: "/ensaladas.jpg",
    BEBIDAS: "/bebidas.jpeg", "POSTRE Y CAFE": "/postreycafe.jpeg",
    "MENÚ DEL DÍA": "/menu-del-dia.jpeg",
    CERVEZAS: "/subcategoria-bebidas/cervezas.png", VINOS: "/subcategoria-bebidas/vinos.png",
    GASEOSAS: "/subcategoria-bebidas/gaseosas.png", JARROS: "/subcategoria-bebidas/jarros.png",
    COCKTAILS: "/subcategoria-bebidas/cocktails.png", WHISKY: "/subcategoria-bebidas/whisky.png",
    MEDIDAS: "/subcategoria-bebidas/medidas.png",
};

type ItemPase = {
    _id: string;
    nombre: string;
    cantidad: number;
    nota?: string;
    listo: boolean;
    opcionesSeleccionadas?: Record<string, string>;
};

type Pase = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    fuente: string;
    tipoEntrega?: string;
    deliveryNumero?: number;
    numeroDia?: number;
    direccion?: string;
    telefonoContacto?: string;
    eventoId?: string;
    horarioPreferido?: string;
    notaEmpleado?: string;
    notaCliente?: string;
    userId?: { _id: string; nombre: string; apellido: string };
    items: ItemPase[];
    estado: string;
    createdAt: string;
    updatedAt: string;
};

type MenuItemLite = {
    _id: string;
    nombre: string;
    precio: number;
    categoria: string;
    activo?: boolean;
    activoCliente?: boolean;
    descripcion?: string;
};

export default function CocinaPage() {
    const router = useRouter();
    const categoryConfigMap = useCategoryConfigs();
    const [tab, setTab] = useState<"comandas" | "menu">("comandas");
    const [subTab, setSubTab] = useState<"pendientes" | "finalizados">("pendientes");

    // ── Pases pendientes ──────────────────────────────────────────────────────
    const [pases, setPases] = useState<Pase[]>([]);
    const [loading, setLoading] = useState(true);
    const [marcando, setMarcando] = useState<string | null>(null);
    const [confirmarId, setConfirmarId] = useState<string | null>(null);
    const [marcandoItem, setMarcandoItem] = useState<string | null>(null);
    const [confirmarItem, setConfirmarItem] = useState<{ paseId: string; itemId: string; nombre: string } | null>(null);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const procesandoIdsRef = useRef<Set<string>>(new Set());
    const [nuevosIds, setNuevosIds] = useState<Set<string>>(new Set());
    const audioCtxRef = useRef<AudioContext | null>(null);
    // tick fuerza re-render cada minuto para actualizar timers
    const [, setTick] = useState(0);

    // ── Pases finalizados ─────────────────────────────────────────────────────
    const [pasesListo, setPasesListo] = useState<Pase[]>([]);
    const [loadingListo, setLoadingListo] = useState(false);
    const listoLoadedRef = useRef(false);

    function playNotificationSound() {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") ctx.resume();
            [0, 0.22].forEach((t, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = "sine"; osc.frequency.value = [880, 1100][i];
                gain.gain.setValueAtTime(0, ctx.currentTime + t);
                gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
                osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.35);
            });
        } catch { }
    }

    useEffect(() => {
        const iv = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(iv);
    }, []);

    const loadPases = useCallback(async () => {
        try {
            const res = await fetch("/api/cocina/pases", { credentials: "include" });
            if (res.status === 401) { router.replace("/login"); return; }
            const data = await res.json();
            if (!Array.isArray(data)) return;

            const currentIds = new Set(data.map((p: Pase) => p._id));
            const recienLlegados = new Set<string>();
            if (prevIdsRef.current.size > 0) {
                for (const id of currentIds) {
                    if (!prevIdsRef.current.has(id)) recienLlegados.add(id);
                }
            }
            prevIdsRef.current = currentIds;
            if (recienLlegados.size > 0) {
                playNotificationSound();
                setNuevosIds(prev => new Set([...prev, ...recienLlegados]));
                setTimeout(() => {
                    setNuevosIds(prev => {
                        const next = new Set(prev);
                        recienLlegados.forEach(id => next.delete(id));
                        return next;
                    });
                }, 5000);
            }

            if (procesandoIdsRef.current.size > 0) {
                setPases(prev => {
                    const prevMap = new Map(prev.map(p => [p._id, p]));
                    const result = data.map((p: Pase) =>
                        procesandoIdsRef.current.has(p._id) ? (prevMap.get(p._id) || p) : p
                    );
                    for (const id of procesandoIdsRef.current) {
                        if (!data.some((p: Pase) => p._id === id)) {
                            const local = prevMap.get(id);
                            if (local) result.push(local);
                        }
                    }
                    return result;
                });
            } else {
                setPases(data);
            }
        } catch { }
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        loadPases();
        const iv = setInterval(loadPases, 5000);
        return () => clearInterval(iv);
    }, [loadPases]);

    async function loadPasesListo() {
        if (loadingListo) return;
        setLoadingListo(true);
        try {
            const res = await fetch("/api/cocina/pases?estado=listo", { credentials: "include" });
            const data = await res.json();
            if (Array.isArray(data)) setPasesListo(data);
            listoLoadedRef.current = true;
        } catch { }
        finally { setLoadingListo(false); }
    }

    function handleSubTab(t: "pendientes" | "finalizados") {
        setSubTab(t);
        if (t === "finalizados" && !listoLoadedRef.current) loadPasesListo();
    }

    async function confirmarListo() {
        if (!confirmarId) return;
        const id = confirmarId;
        setConfirmarId(null);
        setMarcando(id);
        procesandoIdsRef.current.add(id);
        try {
            setPases(prev => prev.map(p =>
                p._id !== id ? p : { ...p, items: p.items.map(it => ({ ...it, listo: true })) }
            ));
            await fetch(`/api/cocina/pases/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "listo" }),
            });
            await new Promise(r => setTimeout(r, 700));
            setPases(prev => prev.filter(p => p._id !== id));
            listoLoadedRef.current = false;
        } catch {
            setPases(prev => prev.map(p =>
                p._id !== id ? p : { ...p, items: p.items.map(it => ({ ...it, listo: false })) }
            ));
        } finally {
            procesandoIdsRef.current.delete(id);
            setMarcando(null);
        }
    }

    async function marcarItemListo(paseId: string, itemId: string) {
        const key = `${paseId}:${itemId}`;
        if (marcandoItem === key) return;
        setMarcandoItem(key);
        setPases(prev => prev.map(p => {
            if (p._id !== paseId) return p;
            return { ...p, items: p.items.map(it => it._id === itemId ? { ...it, listo: true } : it) };
        }));
        try {
            const res = await fetch(`/api/cocina/pases/${paseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion: "itemListo", itemId }),
            });
            const data = await res.json();
            if (data.todosListos) {
                setPases(prev => prev.filter(p => p._id !== paseId));
                listoLoadedRef.current = false;
            }
        } catch {
            setPases(prev => prev.map(p => {
                if (p._id !== paseId) return p;
                return { ...p, items: p.items.map(it => it._id === itemId ? { ...it, listo: false } : it) };
            }));
        } finally { setMarcandoItem(null); }
    }

    function logout() {
        fetch("/api/auth/logout", { method: "POST", credentials: "include" })
            .finally(() => router.replace("/login"));
    }

    // ── Menú ──────────────────────────────────────────────────────────────────
    const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);
    const [menuLoading, setMenuLoading] = useState(false);
    const [catActiva, setCatActiva] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    async function loadMenu() {
        setMenuLoading(true);
        try {
            const data = await fetch("/api/menu", { credentials: "include" }).then(r => r.json()).catch(() => []);
            setMenuItems(Array.isArray(data) ? data : []);
        } finally { setMenuLoading(false); }
    }

    useEffect(() => { if (tab === "menu" && menuItems.length === 0) loadMenu(); }, [tab]);

    async function toggleDisponible(item: MenuItemLite) {
        const disponible = item.activo !== false && item.activoCliente !== false;
        setToggling(item._id);
        await fetch(`/api/menu/${item._id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify(disponible ? { activo: false, activoCliente: false } : { activo: true, activoCliente: true }),
        });
        setMenuItems(prev => prev.map(i => i._id === item._id ? { ...i, activo: !disponible, activoCliente: !disponible } : i));
        setToggling(null);
    }

    const getImage    = (cat: string) => categoryConfigMap[cat]?.imageUrl || categoryImages[cat] || null;
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    const todasCats = Array.from(new Set(menuItems.map(i => {
        if (BEBIDAS_CATS.has(i.categoria)) return "BEBIDAS";
        if (PICAR_CATS.includes(i.categoria)) return "PICADAS Y FRITURAS";
        return i.categoria;
    })));
    const catsSorted = [
        ...(todasCats.includes("MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...todasCats.filter(c => c !== "MENÚ DEL DÍA").sort((a, b) => {
            const ai = MENU_ORDER.indexOf(a), bi = MENU_ORDER.indexOf(b);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }),
    ];
    const productosCat = catActiva ? menuItems.filter(i =>
        catActiva === "BEBIDAS" ? BEBIDAS_CATS.has(i.categoria)
        : catActiva === "PICADAS Y FRITURAS" ? PICAR_CATS.includes(i.categoria)
        : i.categoria === catActiva
    ) : [];

    const paseAConfirmar = confirmarId ? pases.find(p => p._id === confirmarId) : null;

    function mesaLabel(p: Pase) {
        if (p.tipoEntrega === "envio") return p.deliveryNumero ? `Delivery #${p.deliveryNumero}` : "Delivery";
        if (p.fuente === "cliente") return p.numeroDia ? `Pedido #${p.numeroDia}` : "App";
        return p.mesa ? `Mesa ${p.mesa}` : (p.nombreComanda || "Sin mesa");
    }

    function renderPaseCard(p: Pase, opts: { finalizado?: boolean } = {}) {
        const { finalizado = false } = opts;
        const isNuevo    = !finalizado && nuevosIds.has(p._id);
        const isMarcando = !finalizado && marcando === p._id;
        const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
        const esDelivery = p.tipoEntrega === "envio";
        const esApp      = p.fuente === "cliente";
        const esEvento   = !!p.eventoId;
        const nombrePersona = p.userId ? `${p.userId.nombre} ${p.userId.apellido}` : null;
        const mozo       = p.fuente === "empleado" && nombrePersona ? nombrePersona : null;
        const cliente    = p.fuente === "cliente"  && nombrePersona ? nombrePersona : null;

        const msDemora   = Date.now() - new Date(p.createdAt).getTime();
        const minDemora  = Math.floor(msDemora / 60000);
        const esDemorada = !finalizado && msDemora > DEMORA_MS;

        return (
            <div key={p._id}
                className={`rounded-2xl border shadow-md overflow-hidden transition-all duration-500 ${
                    finalizado ? "border-gray-200 opacity-75"
                    : isNuevo ? "border-red-300 ring-2 ring-red-200"
                    : esDemorada ? "border-red-500 ring-2 ring-red-400"
                    : "border-gray-300"
                }`}>

                {/* Header */}
                <div className={`px-4 py-3 border-b ${
                    finalizado ? "bg-gray-50 border-gray-100"
                    : isNuevo || esDemorada ? "bg-red-50 border-red-100"
                    : "bg-gray-50 border-gray-100"
                }`}>
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {isNuevo   && <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Nuevo</span>}
                        {esDemorada && <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full">Demorada · {minDemora} min</span>}
                        {finalizado && <span className="text-[10px] font-black uppercase tracking-wide bg-emerald-600 text-white px-2 py-0.5 rounded-full">Entregado</span>}
                        {esDelivery && <span className="text-[10px] font-black uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-full">🛵 Delivery</span>}
                        {esEvento  && <span className="text-[10px] font-black uppercase tracking-wide bg-amber-400 text-black px-2 py-0.5 rounded-full">⭐ Evento</span>}
                        {esApp     && <span className="text-[10px] font-black uppercase tracking-wide bg-violet-600 text-white px-2 py-0.5 rounded-full">📱 App</span>}
                    </div>
                    {/* Mesa + hora */}
                    <div className="flex items-center justify-between">
                        <span className={`text-xl font-black ${finalizado ? "text-gray-500" : "text-black"}`}>{mesaLabel(p)}</span>
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Clock size={13} />
                            <span className="text-sm font-semibold">{hora}</span>
                        </div>
                    </div>
                    {/* Nombre comanda si aplica */}
                    {p.nombreComanda && p.fuente === "empleado" && (
                        <p className="text-sm font-bold text-gray-700 mt-0.5">{p.nombreComanda}</p>
                    )}
                    {/* Mozo / Cliente */}
                    {mozo && (
                        <p className="text-xs font-semibold mt-1 text-gray-600">👤 Mozo: <span className="font-black text-gray-800">{mozo}</span></p>
                    )}
                    {cliente && (
                        <p className="text-xs font-semibold mt-1 text-violet-700">📱 Cliente: <span className="font-black">{cliente}</span></p>
                    )}
                    {/* Delivery info */}
                    {esDelivery && p.direccion && (
                        <p className="text-xs font-semibold mt-1 text-blue-600">📍 {p.direccion}</p>
                    )}
                    {esDelivery && p.telefonoContacto && (
                        <p className="text-xs font-semibold mt-0.5 flex items-center gap-1 text-emerald-700">
                            <Phone size={11} className="shrink-0" />{p.telefonoContacto}
                        </p>
                    )}
                    {esDelivery && p.horarioPreferido && (
                        <p className="text-xs font-semibold mt-0.5 text-amber-700">🕐 Horario: {p.horarioPreferido}</p>
                    )}
                    {/* Notas */}
                    {p.notaEmpleado && (
                        <p className="text-xs font-semibold mt-1 text-orange-700 bg-orange-50 rounded-lg px-2 py-1">✏️ {p.notaEmpleado}</p>
                    )}
                    {p.notaCliente && (
                        <p className="text-xs font-semibold mt-1 text-orange-700 bg-orange-50 rounded-lg px-2 py-1">✏️ {p.notaCliente}</p>
                    )}
                </div>

                {/* Ítems */}
                <div className="px-4 py-4 space-y-2 bg-white">
                    {finalizado ? (
                        p.items.map(it => (
                            <div key={it._id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-emerald-50">
                                <span className="text-xl font-black min-w-[2rem] text-center text-emerald-500">{it.cantidad}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-emerald-700">{it.nombre}</p>
                                    {it.opcionesSeleccionadas && Object.keys(it.opcionesSeleccionadas).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {Object.entries(it.opcionesSeleccionadas).map(([k, v]) => (
                                                <span key={k} className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">{v}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            </div>
                        ))
                    ) : isMarcando ? (
                        p.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-emerald-50">
                                <span className="text-2xl font-black min-w-[2rem] text-center text-emerald-400">{it.cantidad}</span>
                                <p className="text-lg font-bold text-emerald-600 flex-1">{it.nombre}</p>
                                <CheckCircle size={18} className="text-emerald-500" />
                            </div>
                        ))
                    ) : (
                        <>
                            {p.items.filter(it => !it.listo).map(it => {
                                const itemKey = `${p._id}:${it._id}`;
                                const isMarcandoEste = marcandoItem === itemKey;
                                return (
                                    <div key={it._id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white border border-gray-200 shadow-sm">
                                        <span className="text-2xl font-black min-w-[2rem] text-center text-black">{it.cantidad}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-bold text-black">{it.nombre}</p>
                                            {it.opcionesSeleccionadas && Object.keys(it.opcionesSeleccionadas).length > 0 && (
                                                <div className="mt-0.5 flex flex-wrap gap-1">
                                                    {Object.entries(it.opcionesSeleccionadas).map(([k, v]) => (
                                                        <span key={k} className="text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full">{v}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {it.nota && <p className="text-sm text-amber-600 mt-0.5 italic">✏ {it.nota}</p>}
                                        </div>
                                        <button
                                            onClick={() => setConfirmarItem({ paseId: p._id, itemId: it._id, nombre: it.nombre })}
                                            disabled={isMarcandoEste}
                                            className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition active:scale-95 ${isMarcandoEste ? "border-gray-300 bg-gray-100 text-gray-400" : "border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50"}`}
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    </div>
                                );
                            })}

                            {p.items.some(it => !it.listo) && p.items.some(it => it.listo) && (
                                <div className="flex items-center gap-2 py-0.5">
                                    <div className="flex-1 h-px bg-red-200" />
                                    <span className="text-[10px] font-black uppercase tracking-wide text-red-400 px-1">Ya preparado · no repetir</span>
                                    <div className="flex-1 h-px bg-red-200" />
                                </div>
                            )}

                            {p.items.filter(it => it.listo).map(it => (
                                <div key={it._id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-red-50">
                                    <span className="text-xl font-black min-w-[2rem] text-center text-red-300">{it.cantidad}</span>
                                    <p className="text-base font-semibold text-red-400 line-through flex-1">{it.nombre}</p>
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-wide bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">Ya salió</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {!finalizado && (
                    <div className="px-4 pb-4 bg-white">
                        <button onClick={() => setConfirmarId(p._id)} disabled={isMarcando}
                            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-base py-3 rounded-xl transition active:scale-[0.98]">
                            <CheckCircle size={18} />
                            {isMarcando ? "Marcando..." : "Todo listo"}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-10">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <ChefHat size={22} className="text-black" />
                    <span className="text-lg font-black tracking-tight text-black">Cocina</span>
                </div>
                <div className="flex items-center gap-3">
                    {tab === "comandas" && subTab === "pendientes" && (
                        <span className="text-sm text-gray-400 font-medium">
                            {pases.length} orden{pases.length !== 1 ? "es" : ""}
                        </span>
                    )}
                    <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs principales */}
            <div className="px-4 pt-3 pb-3 bg-white border-b border-gray-200">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(["comandas", "menu"] as const).map(t => (
                        <button key={t} onClick={() => { setTab(t); setCatActiva(null); }}
                            className={`flex-1 py-2.5 text-sm font-black rounded-lg transition ${tab === t ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                            {t === "comandas" ? "Órdenes" : "Menú"}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── ÓRDENES ── */}
            {tab === "comandas" && (
                <>
                    {/* Sub-tabs */}
                    <div className="px-4 pt-2.5 pb-2.5 bg-white border-b border-gray-100">
                        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                            {(["pendientes", "finalizados"] as const).map(t => (
                                <button key={t} onClick={() => handleSubTab(t)}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition ${subTab === t ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {subTab === "pendientes" && (
                        loading ? (
                            <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Cargando...</div>
                        ) : pases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-3 text-gray-300">
                                <ChefHat size={52} />
                                <p className="text-lg font-semibold text-gray-400">Sin órdenes pendientes</p>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                                {pases.map(p => renderPaseCard(p))}
                            </div>
                        )
                    )}

                    {subTab === "finalizados" && (
                        loadingListo ? (
                            <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Cargando...</div>
                        ) : pasesListo.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-3">
                                <CheckCircle size={48} className="text-gray-200" />
                                <p className="text-base font-semibold text-gray-400">Sin órdenes finalizadas</p>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <p className="text-xs text-gray-400 font-medium">Últimas {pasesListo.length} finalizadas</p>
                                    <button onClick={() => { listoLoadedRef.current = false; loadPasesListo(); }}
                                        className="text-xs font-bold text-black underline underline-offset-2">Actualizar</button>
                                </div>
                                {pasesListo.map(p => renderPaseCard(p, { finalizado: true }))}
                            </div>
                        )
                    )}
                </>
            )}

            {/* ── MENÚ ── */}
            {tab === "menu" && (
                <div className="max-w-2xl mx-auto px-3 pt-4">
                    {menuLoading ? (
                        <div className="flex justify-center py-20 text-gray-400 text-sm">Cargando menú...</div>
                    ) : !catActiva ? (
                        <div className="grid grid-cols-2 gap-3">
                            {catsSorted.map(cat => {
                                const img = getImage(cat); const pos = getPosition(cat);
                                const isSpecial = cat === "MENÚ DEL DÍA";
                                const count = cat === "BEBIDAS" ? menuItems.filter(i => BEBIDAS_CATS.has(i.categoria)).length
                                    : cat === "PICADAS Y FRITURAS" ? menuItems.filter(i => PICAR_CATS.includes(i.categoria)).length
                                    : menuItems.filter(i => i.categoria === cat).length;
                                const off = cat === "BEBIDAS" ? menuItems.filter(i => BEBIDAS_CATS.has(i.categoria) && (i.activo === false || i.activoCliente === false)).length
                                    : cat === "PICADAS Y FRITURAS" ? menuItems.filter(i => PICAR_CATS.includes(i.categoria) && (i.activo === false || i.activoCliente === false)).length
                                    : menuItems.filter(i => i.categoria === cat && (i.activo === false || i.activoCliente === false)).length;
                                return (
                                    <button key={cat} onClick={() => setCatActiva(cat)}
                                        className={`relative h-32 rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2" : ""}`}>
                                        {img ? <MenuImg src={img} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} />
                                            : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />}
                                        <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-amber-900/80 via-amber-800/20 to-transparent" : "from-black/80 via-black/25 to-black/10"}`} />
                                        {isSpecial && <span className="absolute top-2 left-2 bg-white/90 text-amber-700 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">Hoy</span>}
                                        {off > 0 && <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{off} fuera</span>}
                                        <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                                            <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                                            <p className="text-white/70 text-[11px] mt-0.5">{count} productos</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setCatActiva(null)} className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-black mb-4 transition">
                                <ChevronLeft size={16} /> Categorías
                            </button>
                            <div className="flex items-center gap-2 mb-4">
                                <UtensilsCrossed size={18} className="text-gray-400" />
                                <h2 className="font-black text-lg text-black">{catActiva}</h2>
                            </div>
                            <div className="space-y-2">
                                {productosCat.map(item => {
                                    const disponible = item.activo !== false && item.activoCliente !== false;
                                    const isToggling = toggling === item._id;
                                    return (
                                        <div key={item._id} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${disponible ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-200 opacity-60"}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-base leading-tight ${disponible ? "text-black" : "text-gray-400 line-through"}`}>{item.nombre}</p>
                                                {item.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.descripcion}</p>}
                                            </div>
                                            <button onClick={() => !isToggling && toggleDisponible(item)} disabled={isToggling} className="shrink-0 flex flex-col items-center gap-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-wide ${disponible ? "text-emerald-600" : "text-red-500"}`}>{disponible ? "Disponible" : "Agotado"}</span>
                                                <div className={`relative flex h-6 w-11 cursor-pointer rounded-full items-center transition-colors duration-200 ${disponible ? "bg-emerald-500" : "bg-red-400"} ${isToggling ? "opacity-50" : ""}`}>
                                                    <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${disponible ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                                {productosCat.length === 0 && <p className="text-center text-gray-400 py-12">Sin productos en esta categoría.</p>}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Modal confirmar ítem */}
            {confirmarItem && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setConfirmarItem(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-600" /><p className="font-black text-gray-900">Confirmar ítem</p></div>
                            <button onClick={() => setConfirmarItem(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-base font-semibold text-gray-900">¿Marcar como listo?</p>
                            <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-gray-800">{confirmarItem.nombre}</span></p>
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={() => setConfirmarItem(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={() => { const { paseId, itemId } = confirmarItem; setConfirmarItem(null); marcarItemListo(paseId, itemId); }}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition">Sí, listo</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal confirmar todo listo */}
            {confirmarId && paseAConfirmar && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setConfirmarId(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2"><CheckCircle size={18} className="text-black" /><p className="font-black text-gray-900">Confirmar</p></div>
                            <button onClick={() => setConfirmarId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-base font-semibold text-gray-900">¿Todo listo para esta orden?</p>
                            <p className="text-sm text-gray-500 mt-1">{mesaLabel(paseAConfirmar)}</p>
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={() => setConfirmarId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={confirmarListo} className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-800 transition">Sí, listo</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
