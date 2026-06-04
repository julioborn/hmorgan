"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, Plus, Minus, ShoppingCart,
    Send, ChevronLeft, CheckCircle, Printer, X,
} from "lucide-react";
import Loader from "@/components/Loader";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen?: string;
    activo: boolean;
};

type CartItem = {
    menuItemId: string;
    nombre: string;
    precio: number;
    cantidad: number;
};

type ActiveOrder = {
    _id: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    mesa: string;
    notaEmpleado?: string;
};

const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];

const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg",
    PIZZAS: "/pizzas.jpg",
    HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg",
    PICADAS: "/picada.jpg",
    ENSALADAS: "/ensaladas.jpg",
    FRITURAS: "/frituras.jpeg",
    BEBIDAS: "/bebidas.jpeg",
    "POSTRE Y CAFE": "/postreycafe.jpeg",
};

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef, PIZZAS: Pizza, HAMBURGUESAS: Hamburger, SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed, ENSALADAS: Salad, FRITURAS: UtensilsCrossed,
    BEBIDAS: Beer,
    CERVEZAS: Beer, VINOS: BottleWine, GASEOSAS: Milk, JARROS: CupSoda,
    COCKTAILS: Martini, WHISKY: GlassWater, MEDIDAS: Beaker,
    "POSTRE Y CAFE": CakeSlice,
};

export default function AnotadorPage() {
    const categoryConfigMap = useCategoryConfigs();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mesa, setMesa] = useState("");
    const [nota, setNota] = useState("");
    const [mesasRegistradas, setMesasRegistradas] = useState<{ _id: string; nombre: string }[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [lastOrder, setLastOrder] = useState<{ items: CartItem[]; mesa: string; nota: string; timestamp: Date } | null>(null);
    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
    const [activeOrderLoading, setActiveOrderLoading] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaActiva]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && user && user.role !== "empleado" && user.role !== "admin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        fetch("/api/menu")
            .then(res => res.json())
            .then(data => {
                const activos: MenuItem[] = Array.isArray(data) ? data.filter((i: MenuItem) => i.activo) : [];
                setMenuItems(activos);
            })
            .catch(() => setMenuItems([]))
            .finally(() => setLoadingMenu(false));

        fetch("/api/admin/mesas")
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setMesasRegistradas(data); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!mesa) { setActiveOrder(null); return; }
        setActiveOrderLoading(true);
        fetch(`/api/pedidos?mesa=${encodeURIComponent(mesa)}&activos=true`, { credentials: "include" })
            .then(r => r.json())
            .then((data: any[]) => {
                const order = Array.isArray(data) ? data.find(p => p.fuente === "empleado") : null;
                setActiveOrder(order || null);
            })
            .catch(() => setActiveOrder(null))
            .finally(() => setActiveOrderLoading(false));
    }, [mesa]);

    function addToCart(item: MenuItem) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item._id);
            if (existing) return prev.map(c => c.menuItemId === item._id ? { ...c, cantidad: c.cantidad + 1 } : c);
            return [...prev, { menuItemId: item._id, nombre: item.nombre, precio: item.precio, cantidad: 1 }];
        });
    }

    function removeFromCart(id: string) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === id);
            if (!existing) return prev;
            if (existing.cantidad === 1) return prev.filter(c => c.menuItemId !== id);
            return prev.map(c => c.menuItemId === id ? { ...c, cantidad: c.cantidad - 1 } : c);
        });
    }

    function getQuantity(id: string) {
        return cart.find(c => c.menuItemId === id)?.cantidad || 0;
    }

    const total = cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    const totalItems = cart.reduce((acc, i) => acc + i.cantidad, 0);

    async function enviarPedido() {
        if (cart.length === 0) return;
        setEnviando(true);
        setError("");
        try {
            let res: Response;
            if (activeOrder) {
                // Agregar ítems a la comanda existente
                res = await fetch(`/api/pedidos/${activeOrder._id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        items: cart.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad })),
                        notaEmpleado: nota.trim() || undefined,
                    }),
                });
            } else {
                // Crear nueva comanda
                res = await fetch("/api/pedidos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        items: cart.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad })),
                        tipoEntrega: "retira",
                        fuente: "empleado",
                        mesa: mesa.trim() || undefined,
                        notaEmpleado: nota.trim() || undefined,
                    }),
                });
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || err.error || "Error al enviar el pedido");
                return;
            }
            setLastOrder({ items: [...cart], mesa, nota, timestamp: new Date() });
            setCart([]);
            setNota("");
            // Refrescar comanda activa de la mesa (no limpiar mesa)
            if (mesa) {
                const updated = await fetch(`/api/pedidos?mesa=${encodeURIComponent(mesa)}&activos=true`, { credentials: "include" });
                const data = await updated.json().catch(() => []);
                const order = Array.isArray(data) ? data.find((p: any) => p.fuente === "empleado") : null;
                setActiveOrder(order || null);
            }
        } catch {
            setError("Error de conexión");
        } finally {
            setEnviando(false);
        }
    }

    if (loading || loadingMenu) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    const catDbImage = (cat: string) => menuItems.find((i) => i.categoria === cat && i.imagen)?.imagen ?? null;
    const getImage = (cat: string) => {
        const cfg = categoryConfigMap[cat];
        return cfg?.imageUrl || categoryImages[cat] || catDbImage(cat);
    };
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    const categoriasNavegacion = MAIN_ORDER.filter(cat => {
        if (cat === "BEBIDAS") return BEBIDAS_CATS.some(bc => menuItems.some(i => i.categoria === bc));
        return menuItems.some(i => i.categoria === cat);
    });

    function printComanda(order: { items: CartItem[]; mesa: string; nota: string; timestamp: Date }) {
        const hora = order.timestamp.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const rows = order.items.map(i =>
            `<div class="item"><span class="qty">${i.cantidad}x</span><span class="name">${i.nombre}</span></div>`
        ).join("");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Courier New',monospace;font-size:13px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:16px;letter-spacing:3px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            .mesa{text-align:center;font-size:15px;font-weight:bold;padding:4px 0}
            hr{border:none;border-top:1px dashed #000;margin:6px 0}
            .item{display:flex;gap:8px;padding:3px 0}
            .qty{font-weight:bold;min-width:26px}
            .name{flex:1}
            .nota{font-style:italic;font-size:12px;margin-top:6px;color:#444}
        </style></head><body>
        <h2>★ COMANDA ★</h2>
        <div class="sub">H. Morgan Bar</div>
        <div class="mesa">${order.mesa ? `MESA ${order.mesa}` : "SIN MESA"}</div>
        <div class="sub">${hora}</div>
        <hr/>${rows}<hr/>
        ${order.nota ? `<div class="nota">Nota: ${order.nota}</div>` : ""}
        </body></html>`;
        const w = window.open("", "_blank", "width=320,height=450,toolbar=0,menubar=0,scrollbars=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    function CartPanel() {
        if (cart.length === 0 && !activeOrder) return null;
        return (
            <div className="bg-white border-b border-gray-200 shadow-sm px-4 pt-3 pb-3">
                <div className="max-w-2xl mx-auto">
                    {/* Selector de mesa y nota — siempre visible si hay items o comanda activa */}
                    <div className="flex gap-2 mb-3">
                        {mesasRegistradas.length > 0 ? (
                            <select value={mesa} onChange={e => setMesa(e.target.value)}
                                className="w-36 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                                <option value="">Sin mesa</option>
                                {mesasRegistradas.map(m => <option key={m._id} value={m.nombre}>Mesa {m.nombre}</option>)}
                            </select>
                        ) : (
                            <input type="text" placeholder="Mesa (ej: 5)" value={mesa} onChange={e => setMesa(e.target.value)}
                                className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        )}
                        <input type="text" placeholder="Nota para el bar..." value={nota} onChange={e => setNota(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                    </div>

                    {/* Comanda activa de la mesa */}
                    {activeOrderLoading && (
                        <p className="text-xs text-gray-400 mb-2 text-center">Buscando comanda activa...</p>
                    )}
                    {activeOrder && !activeOrderLoading && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                            <p className="text-xs font-bold text-amber-700 mb-1.5">
                                Comanda activa · Mesa {activeOrder.mesa} · ${formatPrice(activeOrder.total)}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {activeOrder.items.map((i, idx) => (
                                    <span key={idx} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                        {i.cantidad}× {i.menuItemId?.nombre || "ítem"}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nuevos ítems en el carrito */}
                    {cart.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 max-h-14 overflow-y-auto">
                            {cart.map(c => (
                                <span key={c.menuItemId} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {c.nombre} ×{c.cantidad}
                                </span>
                            ))}
                        </div>
                    )}

                    {error && <p className="text-red-600 text-xs mb-2 text-center">{error}</p>}

                    {cart.length > 0 && (
                        <button onClick={enviarPedido} disabled={enviando}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                            <Send className="w-5 h-5" />
                            {enviando
                                ? "Enviando..."
                                : activeOrder
                                    ? `Agregar a Mesa ${mesa} · $${formatPrice(total)}`
                                    : `Enviar al bar · $${formatPrice(total)}`
                            }
                        </button>
                    )}
                </div>
            </div>
        );
    }

    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const Icon = categoryIcons[cat] || UtensilsCrossed;
        const bg = getImage(cat);
        const imagePosition = getPosition(cat);
        const count = cat === "BEBIDAS"
            ? menuItems.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : menuItems.filter(i => i.categoria === cat).length;
        return (
            <motion.button
                onClick={onClick}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative w-full h-40 rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-transform text-left"
            >
                {bg ? (
                    <img src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: imagePosition }} />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
                    <Icon size={26} className="text-red-700" />
                </div>
                <div className="absolute left-[88px] bottom-5 right-5">
                    <p className="text-white font-black text-lg tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-xs font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    function StickyHeader({ title, onBack, icon: Icon }: { title: string; onBack: () => void; icon?: React.ElementType }) {
        const I = Icon || UtensilsCrossed;
        return (
            <div className="bg-black text-white px-4 py-3 flex items-center gap-3">
                <button onClick={onBack} className="p-1 -ml-1"><ChevronLeft className="w-6 h-6" /></button>
                <I size={18} className="text-white/80 shrink-0" />
                <h1 className="text-xl font-bold flex-1">{title}</h1>
                {totalItems > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-bold">{totalItems}</span>
                    </div>
                )}
            </div>
        );
    }

    /* ── Main categories view ── */
    if (!categoriaActiva) {
        return (
            <div className="bg-white min-h-screen pb-6">
                <div className="sticky z-20" style={{ top: "calc(env(safe-area-inset-top) + 98px)" }}>
                    <StickyHeader title="Anotador de Pedidos" onBack={() => router.back()} icon={UtensilsCrossed} />
                    <CartPanel />
                </div>
                <div className="px-5 pt-5 pb-3">
                    <p className="text-sm text-gray-400">Elegí una categoría</p>
                </div>
                <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoriasNavegacion.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />
                    ))}
                </div>
                {lastOrder && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-2xl">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">¡Pedido enviado al bar!</p>
                            <p className="text-xs text-gray-400 truncate">
                                {lastOrder.mesa ? `Mesa ${lastOrder.mesa} · ` : ""}{lastOrder.items.length} ítem{lastOrder.items.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button onClick={() => printComanda(lastOrder)}
                            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0">
                            <Printer className="w-4 h-4" /> Comanda
                        </button>
                        <button onClick={() => setLastOrder(null)} className="p-1 text-gray-400 hover:text-white shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /* ── BEBIDAS subcategories view ── */
    if (categoriaActiva === "BEBIDAS") {
        const subCats = BEBIDAS_CATS.filter(bc => menuItems.some(i => i.categoria === bc));
        return (
            <div className="bg-white min-h-screen pb-6">
                <div className="sticky z-20" style={{ top: "calc(env(safe-area-inset-top) + 98px)" }}>
                    <StickyHeader title="Bebidas" onBack={() => setCategoriaActiva(null)} icon={Beer} />
                    <CartPanel />
                </div>
                <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subCats.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Items view ── */
    const esBebida = BEBIDAS_CATS.includes(categoriaActiva);
    const CatIcon = categoryIcons[categoriaActiva] || UtensilsCrossed;
    const itemsCat = menuItems
        .filter(i => i.categoria === categoriaActiva)
        .sort((a, b) => {
            const diff = ((a as any).order ?? 0) - ((b as any).order ?? 0);
            if (diff !== 0) return diff;
            if (categoriaActiva === "PIZZAS") {
                const aH = a.nombre.trim().startsWith("1/2");
                const bH = b.nombre.trim().startsWith("1/2");
                return aH === bH ? 0 : aH ? 1 : -1;
            }
            return 0;
        });

    return (
        <div className="bg-white min-h-screen pb-6">
            <div className="sticky z-20" style={{ top: "calc(env(safe-area-inset-top) + 98px)" }}>
                <StickyHeader
                    title={categoriaActiva}
                    onBack={() => setCategoriaActiva(esBebida ? "BEBIDAS" : null)}
                    icon={CatIcon}
                />
                <CartPanel />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={categoriaActiva}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22 }}
                    className="px-4 py-3 space-y-2 max-w-2xl mx-auto"
                >
                    {itemsCat.map(item => {
                        const qty = getQuantity(item._id);
                        return (
                            <div key={item._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-3">
                                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.nombre}</p>
                                    {item.descripcion && <p className="text-xs text-gray-500 truncate mt-0.5">{item.descripcion}</p>}
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                                        ${formatPrice(item.precio)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {qty > 0 ? (
                                        <>
                                            <button onClick={() => removeFromCart(item._id)}
                                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                                                <Minus className="w-4 h-4 text-gray-700" />
                                            </button>
                                            <span className="w-6 text-center font-bold text-gray-900 text-sm">{qty}</span>
                                            <button onClick={() => addToCart(item)}
                                                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition">
                                                <Plus className="w-4 h-4 text-white" />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => addToCart(item)}
                                            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition">
                                            <Plus className="w-4 h-4 text-white" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            </AnimatePresence>

            {lastOrder && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">¡Pedido enviado al bar!</p>
                        <p className="text-xs text-gray-400 truncate">
                            {lastOrder.mesa ? `Mesa ${lastOrder.mesa} · ` : ""}{lastOrder.items.length} ítem{lastOrder.items.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button onClick={() => printComanda(lastOrder)}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0">
                        <Printer className="w-4 h-4" /> Comanda
                    </button>
                    <button onClick={() => setLastOrder(null)} className="p-1 text-gray-400 hover:text-white shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
