"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, X, Trash2, ShoppingCart, ChevronLeft, Tablet,
    Bell, Receipt, ChevronDown, ChevronUp,
} from "lucide-react";
import Loader from "@/components/Loader";
import Portal from "@/components/Portal";
import { useAuth } from "@/context/auth-context";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";
import MenuImg from "@/components/MenuImg";

type Sesion = {
    _id: string;
    mesasNombres: string[];
    usuariosIds: { _id: string; nombre: string; apellido: string; username: string }[];
};
type MenuItem = { _id: string; nombre: string; descripcion?: string; precio: number; categoria: string; imagen?: string; activo: boolean };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg", PIZZAS: "/pizzas.jpg", HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg", PICADAS: "/picada.jpg", ENSALADAS: "/ensaladas.jpg",
    FRITURAS: "/frituras.jpeg", BEBIDAS: "/bebidas.jpeg", "POSTRE Y CAFE": "/postreycafe.jpeg",
    CERVEZAS: "/subcategoria-bebidas/cervezas.png", VINOS: "/subcategoria-bebidas/vinos.png",
    GASEOSAS: "/subcategoria-bebidas/gaseosas.png", JARROS: "/subcategoria-bebidas/jarros.png",
    COCKTAILS: "/subcategoria-bebidas/cocktails.png", WHISKY: "/subcategoria-bebidas/whisky.png",
    MEDIDAS: "/subcategoria-bebidas/medidas.png", "MENÚ DEL DÍA": "/menu-del-dia.jpeg",
};

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef, PIZZAS: Pizza, HAMBURGUESAS: Hamburger, SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed, ENSALADAS: Salad, FRITURAS: UtensilsCrossed,
    BEBIDAS: Beer, CERVEZAS: Beer, VINOS: BottleWine, GASEOSAS: Milk,
    JARROS: CupSoda, COCKTAILS: Martini, WHISKY: GlassWater, MEDIDAS: Beaker,
    "POSTRE Y CAFE": CakeSlice,
};

/* ─── CategoryCard — fuera del componente para evitar remount en cada render ── */
interface CategoryCardProps {
    cat: string; idx: number; bg: string | undefined; pos: string;
    isSpecial: boolean; count: number; onClick: () => void;
}
function CategoryCard({ cat, idx, bg, pos, isSpecial, count, onClick }: CategoryCardProps) {
    return (
        <motion.button onClick={onClick} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`relative w-full rounded-2xl overflow-hidden shadow-md active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2 h-56" : "h-36"}`}>
            {bg
                ? <MenuImg src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} />
                : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />
            }
            <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-black/75 via-black/10 to-transparent" : "from-black/85 via-black/30 to-black/10"}`} />
            {isSpecial && <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>}
            <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                <p className="text-white/60 text-[11px] font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
            </div>
        </motion.button>
    );
}

/* ─── CartDrawer ─────────────────────────────────────────────────── */
interface CartDrawerProps {
    items: Record<string, number>; menu: MenuItem[]; notasProducto: Record<string, string>;
    onSetNotaProducto: (id: string, nota: string) => void; enviando: boolean; error: string;
    total: number; sesion: Sesion; onClose: () => void; onVaciar: () => void;
    onEliminar: (id: string) => void; onEnviar: () => void;
}
function CartDrawer({ items, menu, notasProducto, onSetNotaProducto, enviando, error, total, sesion, onClose, onVaciar, onEliminar, onEnviar }: CartDrawerProps) {
    const [confirmando, setConfirmando] = useState(false);
    return (
        <motion.div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }} onClick={e => e.stopPropagation()}
                className="relative bg-white rounded-t-3xl max-h-[85dvh] overflow-y-auto p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="flex items-center gap-2 mb-1">
                    <Tablet size={18} className="text-purple-600" />
                    <h3 className="text-2xl font-extrabold text-black">Tu pedido</h3>
                </div>
                <p className="text-xs text-purple-500 font-semibold mb-4">
                    Mesa{sesion.mesasNombres.length > 1 ? "s" : ""} {sesion.mesasNombres.join(", ")}
                </p>
                <div className="space-y-3">
                    {Object.entries(items).map(([id, cant]) => {
                        const producto = menu.find(m => m._id === id);
                        if (!producto || cant === 0) return null;
                        return (
                            <div key={id} className="border-b pb-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-black">{producto.nombre}</p>
                                        <p className="text-sm text-gray-500">×{cant} — ${fmt(producto.precio * cant)}</p>
                                    </div>
                                    <button onClick={() => onEliminar(id)} className="text-red-500 hover:text-red-700 p-1"><X size={18} /></button>
                                </div>
                                <input type="text" placeholder="Observación para este producto"
                                    value={notasProducto[id] || ""} onChange={e => onSetNotaProducto(id, e.target.value)}
                                    style={{ fontSize: "16px" }}
                                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-gray-50" />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-black text-lg text-black">Total</span>
                    <span className="font-black text-lg text-purple-600">${fmt(total)}</span>
                </div>
                {error && <p className="mt-3 text-sm text-red-600 font-semibold text-center">{error}</p>}
                <div className="flex gap-3 mt-4">
                    <button onClick={() => { onVaciar(); setConfirmando(false); }}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                        <Trash2 size={16} />
                    </button>
                    {!confirmando ? (
                        <button onClick={() => setConfirmando(true)} disabled={enviando}
                            className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-purple-700 transition active:scale-[0.98]">
                            {`Confirmar pedido · $${fmt(total)}`}
                        </button>
                    ) : (
                        <div className="flex-1 flex flex-col gap-2">
                            <p className="text-center text-sm font-bold text-gray-700">¿Confirmás el pedido?</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmando(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold transition active:scale-[0.97]">
                                    Revisar
                                </button>
                                <button onClick={onEnviar} disabled={enviando}
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm disabled:opacity-50 transition active:scale-[0.97]">
                                    {enviando ? "Enviando..." : "Sí, enviar"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─── Página principal ─────────────────────────────────────────── */
export default function AutoservicioPage() {
    const { user, loading: authLoading } = useAuth();
    const categoryConfigMap = useCategoryConfigs();

    const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
    const catRef = useRef<string | null>(null);
    catRef.current = categoriaSeleccionada;

    const [items, setItems] = useState<Record<string, number>>({});
    const [notasProducto, setNotasProducto] = useState<Record<string, string>>({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [pedidoOk, setPedidoOk] = useState(false);
    const [pedidoError, setPedidoError] = useState("");

    // Comanda activa — todos los usuarios de la sesión
    const [comanda, setComanda] = useState<{ pedidos: any[]; totalGeneral: number }>({ pedidos: [], totalGeneral: 0 });
    const [comandaOpen, setComandaOpen] = useState(true);
    const [llamadaEnviada, setLlamadaEnviada] = useState<Set<"mozo" | "cuenta">>(new Set());
    const [llamarConfirm, setLlamarConfirm] = useState<"mozo" | "cuenta" | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaSeleccionada]);

    // Interceptar back del navegador/iOS para navegar dentro del autoservicio
    useEffect(() => {
        if (categoriaSeleccionada !== null) {
            window.history.pushState({ autoservicio: categoriaSeleccionada }, "");
        }
    }, [categoriaSeleccionada]);

    useEffect(() => {
        function handlePop() {
            const current = catRef.current;
            if (current !== null) {
                setCategoriaSeleccionada(BEBIDAS_CATS.includes(current) ? "BEBIDAS" : null);
            }
        }
        window.addEventListener("popstate", handlePop);
        return () => window.removeEventListener("popstate", handlePop);
    }, []);

    async function fetchComanda() {
        try {
            const res = await fetch("/api/autoservicio/comanda", { credentials: "include" });
            const data = await res.json();
            setComanda(prev => {
                const sig = (data.pedidos ?? []).map((p: any) => `${p._id}:${p.estado}:${p.total}`).join(",");
                const ant = prev.pedidos.map((p: any) => `${p._id}:${p.estado}:${p.total}`).join(",");
                return sig === ant ? prev : { pedidos: data.pedidos ?? [], totalGeneral: data.totalGeneral ?? 0 };
            });
        } catch { }
    }

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const [sesRes, menuRes] = await Promise.all([
                    fetch("/api/autoservicio", { credentials: "include" }),
                    fetch("/api/menu?cliente=true"),
                ]);
                const sesData = await sesRes.json();
                setSesion(sesData.sesion ?? null);
                const menuData = await menuRes.json();
                setMenu(Array.isArray(menuData) ? menuData.filter((i: MenuItem) => i.activo) : []);
                await fetchComanda();
            } finally { setCargando(false); }
        })();
    }, [user]);

    // Polling comanda — solo re-renderiza si algo cambió
    useEffect(() => {
        if (!user) return;
        const iv = setInterval(fetchComanda, 5000);
        return () => clearInterval(iv);
    }, [user]);

    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);
    const total = menu.reduce((acc, item) => acc + item.precio * (items[item._id] || 0), 0);

    // Agrupar pedidos de la comanda por usuario
    const usuariosComanda = comanda.pedidos.reduce((acc: Record<string, { nombre: string; items: any[]; total: number }>, p: any) => {
        const uid = p.userId?._id || "unknown";
        const nombre = [p.userId?.nombre, p.userId?.apellido].filter(Boolean).join(" ") || "Usuario";
        if (!acc[uid]) acc[uid] = { nombre, items: [], total: 0 };
        acc[uid].items.push(...(p.items || []));
        acc[uid].total += p.total || 0;
        return acc;
    }, {});

    function llamar(tipo: "mozo" | "cuenta") {
        if (llamadaEnviada.has(tipo)) return;
        setLlamarConfirm(tipo);
    }

    async function confirmarLlamar() {
        if (!llamarConfirm) return;
        const tipo = llamarConfirm;
        setLlamarConfirm(null);
        setLlamadaEnviada(prev => new Set([...prev, tipo]));
        setTimeout(() => setLlamadaEnviada(prev => { const s = new Set(prev); s.delete(tipo); return s; }), 60000);
        await fetch("/api/llamar-mozo", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo }),
        }).catch(() => { });
    }

    async function enviarPedido() {
        if (!sesion || totalItems === 0) return;
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant, nota: notasProducto[id]?.trim() || undefined }));
        setEnviando(true);
        setPedidoError("");
        try {
            const res = await fetch("/api/pedidos", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: seleccion, fuente: "autoservicio",
                    mesa: sesion.mesasNombres.join(", "), tipoEntrega: "retira",
                }),
            });
            if (res.ok) {
                setItems({});
                setNotasProducto({});
                setDrawerOpen(false);
                setPedidoOk(true);
                setTimeout(() => setPedidoOk(false), 5000);
                await fetchComanda(); // refrescar inmediatamente
            } else {
                const data = await res.json().catch(() => ({}));
                setPedidoError(data.message || "Error al enviar el pedido");
            }
        } catch {
            setPedidoError("Error de conexión");
        } finally { setEnviando(false); }
    }

    const vaciarCarrito = () => { setItems({}); setDrawerOpen(false); };
    const eliminarProducto = (id: string) => setItems(prev => { const u = { ...prev }; delete u[id]; return u; });

    if (authLoading || sesion === undefined || cargando) return (
        <div className="flex justify-center py-20"><Loader size={48} /></div>
    );

    if (!user || sesion === null) return (
        <div className="bg-white flex flex-col items-center justify-center gap-4 px-6 text-center"
            style={{ minHeight: "calc(100dvh - calc(env(safe-area-inset-top) + 98px))" }}>
            <div className="w-20 h-20 rounded-3xl bg-purple-50 flex items-center justify-center">
                <Tablet size={40} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Sin sesión activa</h2>
            <p className="text-sm text-gray-500 max-w-xs">
                El mozo debe asignarte a una mesa para que puedas usar el autoservicio.
            </p>
        </div>
    );

    const getImage = (cat: string) => categoryConfigMap[cat]?.imageUrl || categoryImages[cat];
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    const categoriasNavegacion = [
        ...(menu.some(i => i.categoria === "MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...MAIN_ORDER.filter(cat => {
            if (cat === "BEBIDAS") return BEBIDAS_CATS.some(bc => menu.some(i => i.categoria === bc));
            return menu.some(i => i.categoria === cat);
        }),
    ];

    function CartButton() {
        return (
            <AnimatePresence>
                {totalItems > 0 && (
                    <div className="fixed bottom-32 right-5 z-[9999]">
                        <motion.button layout
                            initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            onClick={() => setDrawerOpen(true)}
                            className="relative px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-full shadow-[0_0_25px_rgba(147,51,234,0.6)] flex items-center gap-3 font-bold text-lg active:scale-95 border border-white/10">
                            <div className="relative flex items-center justify-center">
                                <ShoppingCart size={28} strokeWidth={2.4} />
                                <motion.span key={totalItems} initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                                    {totalItems}
                                </motion.span>
                            </div>
                            <span className="font-extrabold">${fmt(total)}</span>
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    const toastOk = pedidoOk && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-2">
            ✓ Pedido enviado
        </div>
    );

    const cartDrawerProps: CartDrawerProps = {
        items, menu, notasProducto,
        onSetNotaProducto: (id, nota) => setNotasProducto(prev => ({ ...prev, [id]: nota })),
        enviando, error: pedidoError, total, sesion,
        onClose: () => setDrawerOpen(false),
        onVaciar: vaciarCarrito,
        onEliminar: eliminarProducto,
        onEnviar: enviarPedido,
    };

    const llamarModal = llamarConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4" onClick={() => setLlamarConfirm(null)}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <p className="text-lg font-black text-gray-900 mb-1">
                    {llamarConfirm === "mozo" ? "¿Llamar al mozo?" : "¿Pedir la cuenta?"}
                </p>
                <p className="text-sm text-gray-500 mb-5">
                    {llamarConfirm === "mozo" ? "El mozo irá a tu mesa de inmediato." : "Se le avisará al mozo para traerte la cuenta."}
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setLlamarConfirm(null)}
                        className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancelar</button>
                    <button onClick={confirmarLlamar}
                        className={`flex-1 py-3 rounded-xl text-sm font-black text-white ${llamarConfirm === "mozo" ? "bg-red-600" : "bg-gray-900"}`}>
                        {llamarConfirm === "mozo" ? "Llamar" : "Pedir cuenta"}
                    </button>
                </div>
            </div>
        </div>
    );

    /* ── Vista categorías ── */
    if (!categoriaSeleccionada) return (
        <div className="bg-white min-h-screen pb-10">
            {toastOk}
            <div className="px-5 pt-6 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                    <Tablet size={20} className="text-purple-600" />
                    <h1 className="text-3xl font-black text-black tracking-tight">Autoservicio</h1>
                </div>
                <p className="text-sm text-purple-500 font-semibold">
                    Mesa{sesion.mesasNombres.length > 1 ? "s" : ""} {sesion.mesasNombres.join(", ")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Elegí una categoría</p>
            </div>

            {/* Comanda activa — agrupada por usuario */}
            {comanda.pedidos.length > 0 && (
                <div className="px-5 mb-3">
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl overflow-hidden">
                        <button onClick={() => setComandaOpen(v => !v)}
                            className="w-full px-4 py-3 flex items-center justify-between active:bg-purple-100 transition">
                            <div className="flex items-center gap-2">
                                <Receipt size={14} className="text-purple-600" />
                                <span className="text-xs font-black text-purple-700 uppercase tracking-wider">Cuenta de la mesa</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-purple-700">${fmt(comanda.totalGeneral)}</span>
                                {comandaOpen ? <ChevronUp size={14} className="text-purple-500" /> : <ChevronDown size={14} className="text-purple-500" />}
                            </div>
                        </button>
                        {comandaOpen && (
                            <div className="border-t border-purple-100">
                                {Object.entries(usuariosComanda).map(([uid, u]) => (
                                    <div key={uid}>
                                        {/* Nombre del usuario */}
                                        <div className="flex items-center justify-between px-4 py-2 bg-purple-100/40">
                                            <span className="text-xs font-black text-purple-700">{u.nombre}</span>
                                            <span className="text-xs font-bold text-purple-500">${fmt(u.total)}</span>
                                        </div>
                                        {/* Items del usuario */}
                                        <div className="divide-y divide-purple-50">
                                            {u.items.map((it: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 px-4 py-2">
                                                    <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-black text-purple-700 shrink-0">
                                                        {it.cantidad}
                                                    </span>
                                                    <span className="flex-1 text-sm text-gray-700 truncate">{it.menuItemId?.nombre || "Ítem"}</span>
                                                    {it.menuItemId?.precio != null && (
                                                        <span className="text-xs font-bold text-gray-500 shrink-0">
                                                            ${fmt(it.menuItemId.precio * it.cantidad)}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center px-4 py-3 bg-purple-100/60 border-t border-purple-100">
                                    <span className="text-xs font-black text-purple-700 uppercase tracking-wider">Total mesa</span>
                                    <span className="text-base font-black text-purple-700">${fmt(comanda.totalGeneral)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Llamar mozo / Pedir cuenta */}
            <div className="px-5 mb-4 flex gap-3">
                <button onClick={() => llamar("mozo")} disabled={llamadaEnviada.has("mozo")}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                        ${llamadaEnviada.has("mozo") ? "bg-red-50 border-2 border-red-200 text-red-600 cursor-default" : "bg-red-600 text-white"}`}>
                    <Bell size={18} />
                    {llamadaEnviada.has("mozo") ? "¡En camino!" : "Llamar mozo"}
                </button>
                <button onClick={() => llamar("cuenta")} disabled={llamadaEnviada.has("cuenta")}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                        ${llamadaEnviada.has("cuenta") ? "bg-gray-100 border-2 border-gray-200 text-gray-500 cursor-default" : "bg-gray-900 text-white"}`}>
                    <Receipt size={18} />
                    {llamadaEnviada.has("cuenta") ? "¡Avisado!" : "Pedir cuenta"}
                </button>
            </div>

            <div className="px-5 py-1 grid grid-cols-2 gap-3">
                {categoriasNavegacion.map((cat, idx) => {
                    const bg = getImage(cat);
                    const pos = getPosition(cat);
                    const isSpecial = cat === "MENÚ DEL DÍA";
                    const count = cat === "BEBIDAS"
                        ? menu.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
                        : menu.filter(i => i.categoria === cat).length;
                    return <CategoryCard key={cat} cat={cat} idx={idx} bg={bg} pos={pos} isSpecial={isSpecial} count={count} onClick={() => setCategoriaSeleccionada(cat)} />;
                })}
            </div>
            <Portal>
                <CartButton />
                <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
                {llamarModal}
            </Portal>
        </div>
    );

    /* ── Vista subcategorías bebidas ── */
    if (categoriaSeleccionada === "BEBIDAS") {
        const subCats = BEBIDAS_CATS.filter(bc => menu.some(i => i.categoria === bc));
        return (
            <div className="bg-white min-h-screen pb-10">
                {toastOk}
                <div className="sticky top-0 z-10 bg-white shadow-sm">
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                        <button onClick={() => setCategoriaSeleccionada(null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                            <ChevronLeft size={22} className="text-gray-800" />
                        </button>
                        <Beer size={18} className="text-purple-600 shrink-0" />
                        <h1 className="font-black text-xl text-black tracking-tight flex-1">Bebidas</h1>
                        {totalItems > 0 && (
                            <button onClick={() => setDrawerOpen(true)} className="relative p-2">
                                <ShoppingCart size={24} className="text-gray-800" />
                                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalItems}</span>
                            </button>
                        )}
                    </div>
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
                        {categoriasNavegacion.map(cat => (
                            <button key={cat} onClick={() => setCategoriaSeleccionada(cat)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${cat === "BEBIDAS" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-5 py-5 grid grid-cols-2 gap-3">
                    {subCats.map((cat, idx) => {
                        const bg = getImage(cat);
                        const pos = getPosition(cat);
                        const count = menu.filter(i => i.categoria === cat).length;
                        return <CategoryCard key={cat} cat={cat} idx={idx} bg={bg} pos={pos} isSpecial={false} count={count} onClick={() => setCategoriaSeleccionada(cat)} />;
                    })}
                </div>
                <Portal>
                    <CartButton />
                    <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
                    {llamarModal}
                </Portal>
            </div>
        );
    }

    /* ── Vista ítems de categoría ── */
    const esBebida = BEBIDAS_CATS.includes(categoriaSeleccionada);
    const CatIcon = categoryIcons[categoriaSeleccionada] || UtensilsCrossed;
    const productos = menu
        .filter(i => i.categoria === categoriaSeleccionada)
        .sort((a, b) => {
            const diff = ((a as any).order ?? 0) - ((b as any).order ?? 0);
            if (diff !== 0) return diff;
            if (categoriaSeleccionada === "PIZZAS") {
                const aH = a.nombre.trim().startsWith("1/2");
                const bH = b.nombre.trim().startsWith("1/2");
                return aH === bH ? 0 : aH ? 1 : -1;
            }
            return 0;
        });

    const subCatsBebidas = BEBIDAS_CATS.filter(bc => menu.some(i => i.categoria === bc));
    const stripCats = esBebida ? subCatsBebidas : categoriasNavegacion;

    return (
        <div className="bg-white min-h-screen">
            {toastOk}
            <div className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                    <button onClick={() => setCategoriaSeleccionada(esBebida ? "BEBIDAS" : null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ChevronLeft size={22} className="text-gray-800" />
                    </button>
                    <CatIcon size={18} className="text-purple-600 shrink-0" />
                    <h1 className="font-black text-xl text-black tracking-tight flex-1">{categoriaSeleccionada}</h1>
                    {totalItems > 0 && (
                        <button onClick={() => setDrawerOpen(true)} className="relative p-2">
                            <ShoppingCart size={24} className="text-gray-800" />
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalItems}</span>
                        </button>
                    )}
                </div>
                <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
                    {stripCats.map(cat => (
                        <button key={cat} onClick={() => setCategoriaSeleccionada(cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${cat === categoriaSeleccionada ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={categoriaSeleccionada} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
                    className="px-5 py-5 pb-32">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {productos.map(item => (
                            <div key={item._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
                                {item.imagen && (
                                    <div className="relative h-40 w-full overflow-hidden">
                                        <img src={item.imagen} alt={item.nombre} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-1 justify-between">
                                    <div>
                                        <p className="font-semibold text-base text-black leading-tight mb-1">{item.nombre}</p>
                                        {item.descripcion && <p className="text-xs text-gray-500 mb-2 leading-snug">{item.descripcion}</p>}
                                        <span className="inline-block bg-purple-50 text-purple-600 font-extrabold text-sm px-3 py-1 rounded-full">
                                            ${fmt(item.precio)}
                                        </span>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <button onClick={() => setItems(p => ({ ...p, [item._id]: Math.max((p[item._id] || 0) - 1, 0) }))}
                                                className="w-11 h-11 text-purple-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition">−</button>
                                            <span className="w-10 text-center text-lg font-semibold text-black">{items[item._id] || 0}</span>
                                            <button onClick={() => setItems(p => ({ ...p, [item._id]: (p[item._id] || 0) + 1 }))}
                                                className="w-11 h-11 text-purple-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            <Portal>
                <CartButton />
                <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
                {llamarModal}
            </Portal>
        </div>
    );
}
