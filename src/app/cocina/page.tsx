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

type Item = {
    _id: string;
    menuItemId: { nombre: string; precio: number; categoria?: string };
    cantidad: number;
    nota?: string;
    listo?: boolean;
};

type Pedido = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    fuente: string;
    estado: string;
    items: Item[];
    createdAt: string;
    userId?: { nombre: string; apellido: string };
    tipoEntrega?: string;
    eventoId?: string;
    telefonoContacto?: string;
    direccion?: string;
    deliveryNumero?: number;
    numeroDia?: number;
    horarioPreferido?: string;
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

function foodItems(items: Item[]) {
    return items.filter(it => {
        const cat = (it.menuItemId?.categoria || "").toUpperCase();
        return !BEBIDAS_CATS.has(cat);
    });
}

export default function CocinaPage() {
    const router = useRouter();
    const categoryConfigMap = useCategoryConfigs();
    const [tab, setTab] = useState<"comandas" | "menu">("comandas");

    // ── Comandas ──────────────────────────────────────────────────────────────
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [marcando, setMarcando] = useState<string | null>(null);
    const [confirmarId, setConfirmarId] = useState<string | null>(null);
    const [marcandoItem, setMarcandoItem] = useState<string | null>(null); // "pedidoId:itemId"
    const [confirmarItem, setConfirmarItem] = useState<{ pedidoId: string; itemId: string; nombre: string } | null>(null);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const [nuevosIds, setNuevosIds] = useState<Set<string>>(new Set());

    const loadPedidos = useCallback(async () => {
        try {
            const res = await fetch("/api/pedidos", { credentials: "include" });
            if (res.status === 401) { router.replace("/login"); return; }
            const data = await res.json();
            if (!Array.isArray(data)) return;

            const conComida = data.filter((p: Pedido) => foodItems(p.items).length > 0);
            conComida.sort((a: Pedido, b: Pedido) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const currentIds = new Set(conComida.map((p: Pedido) => p._id));
            const recienLlegados = new Set<string>();
            if (prevIdsRef.current.size > 0) {
                for (const id of currentIds) {
                    if (!prevIdsRef.current.has(id)) recienLlegados.add(id);
                }
            }
            prevIdsRef.current = currentIds;
            if (recienLlegados.size > 0) {
                setNuevosIds(prev => new Set([...prev, ...recienLlegados]));
                setTimeout(() => {
                    setNuevosIds(prev => {
                        const next = new Set(prev);
                        recienLlegados.forEach(id => next.delete(id));
                        return next;
                    });
                }, 5000);
            }
            setPedidos(conComida);
        } catch { }
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        loadPedidos();
        const iv = setInterval(loadPedidos, 5000);
        return () => clearInterval(iv);
    }, [loadPedidos]);

    async function confirmarListo() {
        if (!confirmarId) return;
        const id = confirmarId;
        setConfirmarId(null);
        setMarcando(id);
        try {
            // Poner todos los ítems en verde antes de sacar la card
            setPedidos(prev => prev.map(p =>
                p._id !== id ? p : { ...p, items: p.items.map(it => ({ ...it, listo: true })) }
            ));
            await fetch("/api/pedidos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, estado: "listo" }),
            });
            // Breve pausa para que se vea el verde antes de desaparecer
            await new Promise(r => setTimeout(r, 700));
            setPedidos(prev => prev.filter(p => p._id !== id));
        } catch { }
        finally { setMarcando(null); }
    }

    async function marcarItemListo(pedidoId: string, itemId: string) {
        const key = `${pedidoId}:${itemId}`;
        if (marcandoItem === key) return;
        setMarcandoItem(key);

        // Optimistic update
        setPedidos(prev => prev.map(p => {
            if (p._id !== pedidoId) return p;
            return { ...p, items: p.items.map(it => it._id === itemId ? { ...it, listo: true } : it) };
        }));

        try {
            const res = await fetch(`/api/pedidos/${pedidoId}/item-listo`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ itemId }),
            });
            const data = await res.json();
            if (data.todosListos) {
                // Comanda completa → sacar de la lista
                setPedidos(prev => prev.filter(p => p._id !== pedidoId));
            }
        } catch {
            // Revertir en caso de error
            setPedidos(prev => prev.map(p => {
                if (p._id !== pedidoId) return p;
                return { ...p, items: p.items.map(it => it._id === itemId ? { ...it, listo: false } : it) };
            }));
        } finally {
            setMarcandoItem(null);
        }
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

    useEffect(() => {
        if (tab === "menu" && menuItems.length === 0) loadMenu();
    }, [tab]);

    async function toggleDisponible(item: MenuItemLite) {
        const disponible = item.activo !== false && item.activoCliente !== false;
        setToggling(item._id);
        await fetch(`/api/menu/${item._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(disponible
                ? { activo: false, activoCliente: false }
                : { activo: true, activoCliente: true }),
        });
        setMenuItems(prev => prev.map(i => i._id === item._id
            ? { ...i, activo: !disponible, activoCliente: !disponible }
            : i
        ));
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

    const pedidoAConfirmar = confirmarId ? pedidos.find(p => p._id === confirmarId) : null;

    return (
        <div className="min-h-screen bg-white pb-10">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <ChefHat size={22} className="text-black" />
                    <span className="text-lg font-black tracking-tight text-black">Cocina</span>
                </div>
                <div className="flex items-center gap-3">
                    {tab === "comandas" && (
                        <span className="text-sm text-gray-400 font-medium">
                            {pedidos.length} comanda{pedidos.length !== 1 ? "s" : ""}
                        </span>
                    )}
                    <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white">
                {(["comandas", "menu"] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setCatActiva(null); }}
                        className={`flex-1 py-3 text-sm font-black uppercase tracking-wide transition ${tab === t ? "text-black border-b-2 border-black" : "text-gray-400"}`}>
                        {t === "comandas" ? "Comandas" : "Menú"}
                    </button>
                ))}
            </div>

            {/* ── COMANDAS ── */}
            {tab === "comandas" && (
                loading ? (
                    <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Cargando...</div>
                ) : pedidos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-3 text-gray-300">
                        <ChefHat size={52} />
                        <p className="text-lg font-semibold text-gray-400">Sin comandas en preparación</p>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
                        {pedidos.map(p => {
                            const comida = foodItems(p.items);
                            const esDelivery = p.tipoEntrega === "envio";
                            const esEvento   = !!p.eventoId;
                            const esApp      = p.fuente === "cliente";
                            const esBar      = p.fuente === "empleado" && !esDelivery;

                            const mesaLabel = esDelivery
                                ? (p.deliveryNumero ? `Delivery #${p.deliveryNumero}` : "Delivery")
                                : esApp
                                ? (p.numeroDia ? `Pedido #${p.numeroDia}` : "App")
                                : (p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || "Sin mesa");

                            // Para delivery de caja el userId es el cajero, no el destinatario
                            const mozo = esBar && p.userId
                                ? `${p.userId.nombre} ${p.userId.apellido}`.trim()
                                : null;
                            const clienteNombre = esApp && p.userId
                                ? `${p.userId.nombre} ${p.userId.apellido}`.trim()
                                : p.nombreComanda || null;

                            const hora = new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
                            const isNuevo = nuevosIds.has(p._id);
                            const isMarcando = marcando === p._id;

                            return (
                                <div key={p._id}
                                    className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${isNuevo ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"}`}>
                                    <div className={`px-4 py-3 border-b ${isNuevo ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                                        {/* Fila 1: badges de origen */}
                                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                            {isNuevo && <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Nuevo</span>}
                                            {esDelivery && <span className="text-[10px] font-black uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-full">🛵 Delivery</span>}
                                            {esEvento   && <span className="text-[10px] font-black uppercase tracking-wide bg-amber-400 text-black px-2 py-0.5 rounded-full">⭐ Evento</span>}
                                            {esApp      && <span className="text-[10px] font-black uppercase tracking-wide bg-violet-600 text-white px-2 py-0.5 rounded-full">📱 App</span>}
                                            {esBar      && <span className="text-[10px] font-black uppercase tracking-wide bg-gray-800 text-white px-2 py-0.5 rounded-full">🍽 Bar</span>}
                                        </div>
                                        {/* Fila 2: mesa/número + hora */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="text-xl font-black text-black leading-tight">{mesaLabel}</span>
                                                {(mozo || clienteNombre) && (
                                                    <span className="text-sm text-gray-400 truncate">
                                                        {mozo || clienteNombre}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 ml-2">
                                                <Clock size={13} />
                                                <span className="text-sm">{hora}</span>
                                            </div>
                                        </div>
                                        {/* Fila 3: dirección + teléfono (solo delivery) */}
                                        {esDelivery && p.direccion && (
                                            <p className="text-xs text-blue-600 font-semibold mt-1">📍 {p.direccion}</p>
                                        )}
                                        {esDelivery && p.telefonoContacto && (
                                            <p className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                                                <Phone size={11} className="shrink-0" />{p.telefonoContacto}
                                            </p>
                                        )}
                                        {/* Fila 4: horario preferido (app y delivery) */}
                                        {p.horarioPreferido && (
                                            <div className="mt-1.5 flex items-center gap-1.5 bg-amber-100 border border-amber-300 rounded-lg px-2 py-1">
                                                <Clock size={13} className="text-amber-700 shrink-0" />
                                                <span className="text-sm font-black text-amber-800">Entregar: {p.horarioPreferido}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-4 space-y-2 bg-white">
                                        {comida.map((it, idx) => {
                                            const itemKey = `${p._id}:${it._id}`;
                                            const isMarcandoEste = marcandoItem === itemKey;
                                            return (
                                                <div key={idx} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${it.listo ? "bg-emerald-50" : "bg-gray-50"}`}>
                                                    <span className={`text-2xl font-black min-w-[2rem] text-center leading-tight ${it.listo ? "text-emerald-400" : "text-black"}`}>
                                                        {it.cantidad}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-lg font-bold leading-tight ${it.listo ? "text-emerald-600" : "text-black"}`}>
                                                            {it.menuItemId?.nombre || "Ítem"}
                                                        </p>
                                                        {it.nota && <p className="text-sm text-amber-600 mt-0.5 italic">✏ {it.nota}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => !it.listo && setConfirmarItem({ pedidoId: p._id, itemId: it._id, nombre: it.menuItemId?.nombre || "ítem" })}
                                                        disabled={!!it.listo || isMarcandoEste}
                                                        className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition active:scale-95 ${
                                                            it.listo
                                                                ? "border-emerald-400 bg-emerald-400 text-white"
                                                                : isMarcandoEste
                                                                ? "border-gray-300 bg-gray-100 text-gray-400"
                                                                : "border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50"
                                                        }`}
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="px-4 pb-4 bg-white">
                                        <button onClick={() => setConfirmarId(p._id)} disabled={isMarcando}
                                            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-base py-3 rounded-xl transition active:scale-[0.98]">
                                            <CheckCircle size={18} />
                                            {isMarcando ? "Marcando..." : "Todo listo"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ── MENÚ ── */}
            {tab === "menu" && (
                <div className="max-w-2xl mx-auto px-3 pt-4">
                    {menuLoading ? (
                        <div className="flex justify-center py-20 text-gray-400 text-sm">Cargando menú...</div>
                    ) : !catActiva ? (
                        /* Grilla de categorías */
                        <div className="grid grid-cols-2 gap-3">
                            {catsSorted.map(cat => {
                                const img = getImage(cat);
                                const pos = getPosition(cat);
                                const isSpecial = cat === "MENÚ DEL DÍA";
                                const count = cat === "BEBIDAS"
                                    ? menuItems.filter(i => BEBIDAS_CATS.has(i.categoria)).length
                                    : cat === "PICADAS Y FRITURAS"
                                    ? menuItems.filter(i => PICAR_CATS.includes(i.categoria)).length
                                    : menuItems.filter(i => i.categoria === cat).length;
                                const off = cat === "BEBIDAS"
                                    ? menuItems.filter(i => BEBIDAS_CATS.has(i.categoria) && (i.activo === false || i.activoCliente === false)).length
                                    : cat === "PICADAS Y FRITURAS"
                                    ? menuItems.filter(i => PICAR_CATS.includes(i.categoria) && (i.activo === false || i.activoCliente === false)).length
                                    : menuItems.filter(i => i.categoria === cat && (i.activo === false || i.activoCliente === false)).length;
                                return (
                                    <button key={cat} onClick={() => setCatActiva(cat)}
                                        className={`relative h-32 rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2" : ""}`}>
                                        {img
                                            ? <MenuImg src={img} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} />
                                            : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />
                                        }
                                        <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-amber-900/80 via-amber-800/20 to-transparent" : "from-black/80 via-black/25 to-black/10"}`} />
                                        {isSpecial && <span className="absolute top-2 left-2 bg-white/90 text-amber-700 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">Hoy</span>}
                                        {off > 0 && (
                                            <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{off} fuera</span>
                                        )}
                                        <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                                            <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                                            <p className="text-white/70 text-[11px] mt-0.5">{count} productos</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Lista de productos */
                        <>
                            <button onClick={() => setCatActiva(null)}
                                className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-black mb-4 transition">
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
                                        <div key={item._id}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${disponible ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-200 opacity-60"}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-base leading-tight ${disponible ? "text-black" : "text-gray-400 line-through"}`}>
                                                    {item.nombre}
                                                </p>
                                                {item.descripcion && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.descripcion}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => !isToggling && toggleDisponible(item)}
                                                disabled={isToggling}
                                                className="shrink-0 flex flex-col items-center gap-0.5"
                                            >
                                                <span className={`text-[9px] font-black uppercase tracking-wide ${disponible ? "text-emerald-600" : "text-red-500"}`}>
                                                    {disponible ? "Disponible" : "Agotado"}
                                                </span>
                                                <div className={`relative flex h-6 w-11 cursor-pointer rounded-full items-center transition-colors duration-200 ${disponible ? "bg-emerald-500" : "bg-red-400"} ${isToggling ? "opacity-50" : ""}`}>
                                                    <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${disponible ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                                {productosCat.length === 0 && (
                                    <p className="text-center text-gray-400 py-12">Sin productos en esta categoría.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Modal confirmación ítem individual */}
            {confirmarItem && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                    onClick={() => setConfirmarItem(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-emerald-600" />
                                <p className="font-black text-gray-900">Confirmar ítem</p>
                            </div>
                            <button onClick={() => setConfirmarItem(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-base font-semibold text-gray-900">¿Marcar como listo?</p>
                            <p className="text-sm text-gray-500 mt-1">
                                <span className="font-bold text-gray-800">{confirmarItem.nombre}</span>
                            </p>
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={() => setConfirmarItem(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={() => {
                                const { pedidoId, itemId } = confirmarItem;
                                setConfirmarItem(null);
                                marcarItemListo(pedidoId, itemId);
                            }}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition">Sí, listo</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal confirmación listo */}
            {confirmarId && pedidoAConfirmar && createPortal(
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                    onClick={() => setConfirmarId(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-black" />
                                <p className="font-black text-gray-900">Confirmar</p>
                            </div>
                            <button onClick={() => setConfirmarId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-base font-semibold text-gray-900">¿Marcar como listo?</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {pedidoAConfirmar.mesa ? `Mesa ${pedidoAConfirmar.mesa}` : pedidoAConfirmar.nombreComanda || "Comanda"} — esto avisará al mozo.
                            </p>
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={() => setConfirmarId(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={confirmarListo}
                                className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-800 transition">Sí, listo</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
