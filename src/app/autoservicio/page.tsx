"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    Tablet, ShoppingCart, X, Trash2, Plus, Minus, ChevronLeft,
    CheckCircle, Loader2,
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, CakeSlice, Hamburger, Milk, GlassWater,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";
import MenuImg from "@/components/MenuImg";

type Sesion = {
    _id: string;
    mesaNombre: string;
    usuariosIds: { _id: string; nombre: string; apellido: string; username: string }[];
};
type MenuItem = { _id: string; nombre: string; descripcion?: string; precio: number; categoria: string; imagen?: string; activo: boolean };
type CartItem = { cantidad: number; nota: string };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef, PIZZAS: Pizza, HAMBURGUESAS: Hamburger, SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed, ENSALADAS: Salad, FRITURAS: UtensilsCrossed,
    BEBIDAS: Beer, CERVEZAS: Beer, VINOS: GlassWater, GASEOSAS: Milk,
    JARROS: CupSoda, COCKTAILS: GlassWater, WHISKY: GlassWater, MEDIDAS: GlassWater,
    "POSTRE Y CAFE": CakeSlice, "MENÚ DEL DÍA": UtensilsCrossed,
};

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg", PIZZAS: "/pizzas.jpg", HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg", PICADAS: "/picada.jpg", ENSALADAS: "/ensaladas.jpg",
    FRITURAS: "/frituras.jpeg", BEBIDAS: "/bebidas.jpeg", "POSTRE Y CAFE": "/postreycafe.jpeg",
    CERVEZAS: "/subcategoria-bebidas/cervezas.png", VINOS: "/subcategoria-bebidas/vinos.png",
    GASEOSAS: "/subcategoria-bebidas/gaseosas.png", JARROS: "/subcategoria-bebidas/jarros.png",
    COCKTAILS: "/subcategoria-bebidas/cocktails.png", WHISKY: "/subcategoria-bebidas/whisky.png",
    MEDIDAS: "/subcategoria-bebidas/medidas.png", "MENÚ DEL DÍA": "/menu-del-dia.jpeg",
};

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

export default function AutoservicioPage() {
    const { user, loading: authLoading } = useAuth();
    const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [menuLoading, setMenuLoading] = useState(true);
    const [vista, setVista] = useState<"categorias" | string>("categorias");
    const [cart, setCart] = useState<Record<string, CartItem>>({});
    const [cartOpen, setCartOpen] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [pedidoOk, setPedidoOk] = useState(false);
    const { configs } = useCategoryConfigs();

    useEffect(() => {
        if (!user) return;
        fetch("/api/autoservicio", { credentials: "include" })
            .then(r => r.json())
            .then(d => setSesion(d.sesion ?? null))
            .catch(() => setSesion(null));
        fetch("/api/menu", { cache: "no-store" })
            .then(r => r.json())
            .then(d => setMenu(Array.isArray(d) ? d.filter((i: MenuItem) => i.activo) : []))
            .finally(() => setMenuLoading(false));
    }, [user]);

    const itemsEnCart = Object.values(cart).reduce((s, v) => s + v.cantidad, 0);
    const total = Object.entries(cart).reduce((s, [id, v]) => {
        const item = menu.find(m => m._id === id);
        return s + (item?.precio ?? 0) * v.cantidad;
    }, 0);

    function setQty(id: string, delta: number) {
        setCart(prev => {
            const cur = prev[id]?.cantidad ?? 0;
            const next = cur + delta;
            if (next <= 0) { const { [id]: _, ...rest } = prev; return rest; }
            return { ...prev, [id]: { cantidad: next, nota: prev[id]?.nota ?? "" } };
        });
    }

    function setNota(id: string, nota: string) {
        setCart(prev => ({ ...prev, [id]: { ...prev[id], cantidad: prev[id]?.cantidad ?? 1, nota } }));
    }

    async function enviarPedido() {
        if (!sesion || itemsEnCart === 0) return;
        setEnviando(true);
        try {
            const items = Object.entries(cart).map(([menuItemId, v]) => ({
                menuItemId, cantidad: v.cantidad, nota: v.nota || undefined,
            }));
            const res = await fetch("/api/pedidos", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items,
                    fuente: "autoservicio",
                    mesa: sesion.mesaNombre,
                    tipoEntrega: "retira",
                }),
            });
            if (res.ok) {
                setCart({});
                setCartOpen(false);
                setPedidoOk(true);
                setTimeout(() => setPedidoOk(false), 5000);
            }
        } finally { setEnviando(false); }
    }

    if (authLoading || sesion === undefined) return (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={40} /></div>
    );

    if (!user || sesion === null) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-purple-50 flex items-center justify-center">
                <Tablet size={40} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Sin sesión activa</h2>
            <p className="text-sm text-gray-500 max-w-xs">
                El mozo debe asignarte a una mesa para que puedas usar el autoservicio.
            </p>
        </div>
    );

    // Categorías disponibles
    const cats = [...new Set(menu.map(i => {
        if (BEBIDAS_CATS.includes(i.categoria)) return "BEBIDAS";
        return i.categoria;
    }))].sort((a, b) => {
        const ai = MAIN_ORDER.indexOf(a), bi = MAIN_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const categoriaActual = vista === "categorias" ? null : vista;
    const itemsCategoria = categoriaActual
        ? menu.filter(i => {
            if (categoriaActual === "BEBIDAS") return BEBIDAS_CATS.includes(i.categoria) || i.categoria === "BEBIDAS";
            return i.categoria === categoriaActual;
        })
        : [];

    const cfgCat = (cat: string) => configs.find(c => c.categoria === cat);

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* Header */}
            <div className="bg-black px-4 pt-5 pb-4 sticky top-0 z-20">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {vista !== "categorias" && (
                            <button onClick={() => setVista("categorias")} className="p-1 text-white/70 hover:text-white">
                                <ChevronLeft size={22} />
                            </button>
                        )}
                        <div>
                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Autoservicio</p>
                            <p className="text-white font-black text-lg leading-tight">Mesa {sesion.mesaNombre}</p>
                        </div>
                    </div>
                    <button onClick={() => setCartOpen(true)} className="relative p-2">
                        <ShoppingCart size={24} className="text-white" />
                        {itemsEnCart > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-purple-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                                {itemsEnCart}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4">
                {/* Banner pedido ok */}
                {pedidoOk && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-800">¡Pedido enviado!</p>
                            <p className="text-xs text-emerald-600">Lo estamos preparando.</p>
                        </div>
                    </div>
                )}

                {/* Vista categorías */}
                {vista === "categorias" && !menuLoading && (
                    <div className="grid grid-cols-2 gap-3">
                        {cats.map(cat => {
                            const cfg = cfgCat(cat);
                            const Icon = categoryIcons[cat] ?? UtensilsCrossed;
                            const img = cfg?.imagen || categoryImages[cat];
                            return (
                                <button key={cat} onClick={() => setVista(cat)}
                                    className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition">
                                    {img
                                        ? <img src={img} alt={cat} className="absolute inset-0 w-full h-full object-cover" />
                                        : <div className="absolute inset-0 bg-gray-100 flex items-center justify-center"><Icon size={32} className="text-gray-400" /></div>}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <span className="absolute bottom-3 left-3 text-white font-black text-sm leading-tight">{cfg?.label || cat}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Vista items de categoría */}
                {vista !== "categorias" && (
                    <div className="space-y-3">
                        {itemsCategoria.map(item => {
                            const qty = cart[item._id]?.cantidad ?? 0;
                            return (
                                <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-3 p-3">
                                    {item.imagen && (
                                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                                            <MenuImg src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm leading-tight">{item.nombre}</p>
                                            {item.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.descripcion}</p>}
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="font-black text-gray-900">${fmt(item.precio)}</p>
                                            {qty === 0 ? (
                                                <button onClick={() => setQty(item._id, 1)}
                                                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-[0.97]">
                                                    <Plus size={14} /> Agregar
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setQty(item._id, -1)}
                                                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="font-black text-gray-900 min-w-[1.2rem] text-center">{qty}</span>
                                                    <button onClick={() => setQty(item._id, 1)}
                                                        className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Carrito flotante */}
            {itemsEnCart > 0 && !cartOpen && (
                <div className="fixed bottom-6 inset-x-4 z-30 max-w-xl mx-auto left-0 right-0">
                    <button onClick={() => setCartOpen(true)}
                        className="w-full flex items-center justify-between bg-purple-600 hover:bg-purple-700 text-white px-5 py-4 rounded-2xl shadow-xl transition active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <span className="bg-purple-800/50 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">{itemsEnCart}</span>
                            <span className="font-bold">Ver pedido</span>
                        </div>
                        <span className="font-black">${fmt(total)}</span>
                    </button>
                </div>
            )}

            {/* Cart drawer */}
            {cartOpen && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center"
                    onClick={() => setCartOpen(false)}>
                    <div className="bg-white rounded-t-3xl w-full max-w-xl shadow-2xl max-h-[85vh] flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                            <h2 className="text-xl font-extrabold text-gray-900">Tu pedido</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCart({})} className="p-2 text-gray-400 hover:text-red-500 transition">
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={() => setCartOpen(false)} className="p-2 text-gray-400 hover:text-gray-700">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3">
                            {Object.entries(cart).map(([id, v]) => {
                                const item = menu.find(m => m._id === id);
                                if (!item) return null;
                                return (
                                    <div key={id} className="flex items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-gray-900 text-sm">{item.nombre}</p>
                                                <p className="font-black text-gray-900 text-sm">${fmt(item.precio * v.cantidad)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button onClick={() => setQty(id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus size={13} /></button>
                                                <span className="font-black text-sm min-w-[1rem] text-center">{v.cantidad}</span>
                                                <button onClick={() => setQty(id, 1)} className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center"><Plus size={13} /></button>
                                            </div>
                                            <input
                                                value={v.nota}
                                                onChange={e => setNota(id, e.target.value)}
                                                placeholder="Nota (opcional)"
                                                style={{ fontSize: "16px" }}
                                                className="mt-1.5 w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-600 font-semibold">Total</span>
                                <span className="text-xl font-black text-gray-900">${fmt(total)}</span>
                            </div>
                            <button onClick={enviarPedido} disabled={enviando}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition active:scale-[0.98]">
                                {enviando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                {enviando ? "Enviando..." : "Confirmar pedido"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
