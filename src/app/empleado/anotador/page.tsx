"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, Plus, Minus, ShoppingCart,
    Send, ChevronLeft, CheckCircle, Printer, X, MapPin, ChevronDown,
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
type MesaPlano = {
    _id: string; nombre: string; activa: boolean;
    x: number; y: number; forma: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string;
};
type SalonElPlano = {
    _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string;
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
    const [cart, setCart]             = useState<CartItem[]>([]);
    const [mesa, setMesa]             = useState("");
    const [nota, setNota]             = useState("");
    const [comensales, setComensales] = useState(2);
    const [clienteNombre, setClienteNombre] = useState("");
    const [clienteSearch, setClienteSearch] = useState("");
    const [clienteResults, setClienteResults] = useState<{_id:string;nombre:string;apellido:string}[]>([]);
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [mesasRegistradas, setMesasRegistradas] = useState<{ _id: string; nombre: string }[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [lastOrder, setLastOrder] = useState<{ items: CartItem[]; mesa: string; nota: string; timestamp: Date } | null>(null);
    const [activeOrder, setActiveOrder]           = useState<ActiveOrder | null>(null);
    const [activeOrderLoading, setActiveOrderLoading] = useState(false);
    const [comandaSeleccionada, setComandaseleccionada] = useState(false);
    // Floor plan picker
    const [mesaPickerOpen, setMesaPickerOpen] = useState(false);
    const [mesasPlano, setMesasPlano]         = useState<MesaPlano[]>([]);
    const [elementsPlano, setElementsPlano]   = useState<SalonElPlano[]>([]);
    const [ocupadasPlano, setOcupadasPlano]   = useState<Set<string>>(new Set());

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
        setComandaseleccionada(false);
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

    // Búsqueda de cliente con debounce
    useEffect(() => {
        if (clienteSearch.length < 2) { setClienteResults([]); return; }
        const t = setTimeout(async () => {
            const r = await fetch(`/api/empleado/buscar-cliente?q=${encodeURIComponent(clienteSearch)}`, { credentials: "include" });
            const d = await r.json().catch(() => []);
            setClienteResults(Array.isArray(d) ? d : []);
        }, 300);
        return () => clearTimeout(t);
    }, [clienteSearch]);

    async function openMesaPicker() {
        setMesaPickerOpen(true);
        const [mRes, elRes, pRes] = await Promise.all([
            fetch("/api/admin/mesas?all=true", { credentials: "include" }),
            fetch("/api/superadmin/salon", { credentials: "include" }),
            fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" }),
        ]);
        const [mData, elData, pData] = await Promise.all([mRes.json(), elRes.json(), pRes.json()]);
        setMesasPlano(Array.isArray(mData) ? mData : []);
        setElementsPlano(Array.isArray(elData) ? elData : []);
        if (Array.isArray(pData)) setOcupadasPlano(new Set(pData.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));
    }

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
            if (activeOrder && comandaSeleccionada) {
                // Agregar ítems a la comanda existente (solo si la eligieron explícitamente)
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
                        comensales: comensales || undefined,
                        nombreComanda: clienteNombre.trim() || undefined,
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
            setComandaseleccionada(false);
            setClienteNombre("");
            setClienteSearch("");
            setClienteResults([]);
            // Refrescar la comanda activa de la mesa (no borrar ni la mesa ni la comanda)
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
        if (cart.length === 0 && !activeOrder && !mesa) return null;

        const hayComanda = !!activeOrder;
        const hayCart    = cart.length > 0;

        return (
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 space-y-2">

                    {/* Fila 1: Mesa + comensales + expandir */}
                    <div className="flex gap-2 items-center">
                        <button onClick={openMesaPicker}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition shrink-0 ${mesa ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                            <MapPin className="w-3.5 h-3.5" />
                            {mesa ? `Mesa ${mesa}` : "Mesa"}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 shrink-0">
                            <button onClick={() => setComensales(c => Math.max(1, c - 1))} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">−</button>
                            <span className="text-sm font-bold text-gray-900 w-5 text-center">{comensales}</span>
                            <button onClick={() => setComensales(c => Math.min(20, c + 1))} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">+</button>
                            <span className="text-[10px] text-gray-400">p</span>
                        </div>
                        <input type="text" placeholder="Nota..." value={nota} onChange={e => setNota(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        {(hayComanda || hayCart) && (
                            <button onClick={() => setPanelExpanded(v => !v)}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0">
                                <ChevronDown className={`w-4 h-4 transition-transform ${panelExpanded ? "rotate-180" : ""}`} />
                            </button>
                        )}
                    </div>

                    {panelExpanded && (
                        <>
                            {/* Búsqueda de cliente */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Nombre del cliente (buscá o anotá)"
                                    value={clienteNombre || clienteSearch}
                                    onChange={e => {
                                        const v = e.target.value;
                                        setClienteSearch(v);
                                        if (!v) setClienteNombre("");
                                    }}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                                {clienteResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                        {clienteResults.map(c => (
                                            <button key={c._id} onClick={() => {
                                                setClienteNombre(`${c.nombre} ${c.apellido}`);
                                                setClienteSearch("");
                                                setClienteResults([]);
                                            }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm transition border-b border-gray-50 last:border-0">
                                                <span className="font-semibold text-gray-900">{c.nombre} {c.apellido}</span>
                                                <span className="text-gray-400 ml-2 text-xs">@{c.username}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Comanda activa — ticket style */}
                            {activeOrderLoading && <p className="text-xs text-gray-400 text-center py-1">Buscando comanda...</p>}
                            {activeOrder && !activeOrderLoading && (
                                <div className={`rounded-xl border overflow-hidden ${comandaSeleccionada ? "border-amber-500" : "border-amber-200"}`}>
                                    <button onClick={() => setComandaseleccionada(v => !v)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition ${comandaSeleccionada ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>
                                        <span>
                                            {comandaSeleccionada ? "✓ Editando" : "Comanda activa"}
                                            {(activeOrder as any).comensales > 0 ? ` · ${(activeOrder as any).comensales}p` : ""}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            ${formatPrice(activeOrder.total)}
                                            <ChevronDown className={`w-3 h-3 transition-transform ${comandaSeleccionada ? "rotate-180" : ""}`} />
                                        </span>
                                    </button>
                                    {/* Items de la comanda tipo ticket */}
                                    <div className="bg-white px-3 py-2 space-y-0.5">
                                        {activeOrder.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-0.5 border-b border-gray-50 last:border-0">
                                                <span className="text-gray-700">
                                                    <span className="font-bold text-gray-500 mr-1.5">{i.cantidad}×</span>
                                                    {i.menuItemId?.nombre || "ítem"}
                                                </span>
                                                <span className="text-gray-500 text-xs">${formatPrice((i.menuItemId?.precio || 0) * i.cantidad)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-xs font-black text-gray-900 pt-1 border-t border-gray-200 mt-1">
                                            <span>TOTAL</span>
                                            <span>${formatPrice(activeOrder.total)}</span>
                                        </div>
                                    </div>
                                    {comandaSeleccionada && (
                                        <p className="text-[10px] text-amber-600 text-center bg-amber-50 py-1">
                                            Agregá productos abajo y presioná Enviar
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Nuevos ítems en el carrito — ticket style */}
                            {cart.length > 0 && (
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-3 py-1.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {comandaSeleccionada ? "Agregar a comanda" : "Nuevo pedido"}
                                        </p>
                                    </div>
                                    <div className="bg-white px-3 py-2 space-y-0.5">
                                        {cart.map(c => (
                                            <div key={c.menuItemId} className="flex items-center justify-between py-0.5">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => removeFromCart(c.menuItemId)}
                                                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs transition">
                                                            −
                                                        </button>
                                                        <span className="text-sm font-bold text-gray-900 w-5 text-center">{c.cantidad}</span>
                                                        <button onClick={() => setCart(prev => prev.map(x => x.menuItemId === c.menuItemId ? { ...x, cantidad: x.cantidad + 1 } : x))}
                                                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs transition">
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-sm text-gray-800 truncate">{c.nombre}</span>
                                                </div>
                                                <span className="text-xs text-gray-500 shrink-0 ml-2">${formatPrice(c.precio * c.cantidad)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-xs font-black text-gray-900 pt-1 border-t border-gray-200 mt-1">
                                            <span>SUBTOTAL</span>
                                            <span>${formatPrice(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && <p className="text-red-600 text-xs text-center">{error}</p>}

                            {cart.length > 0 && (
                                <button onClick={enviarPedido} disabled={enviando}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                                    <Send className="w-4 h-4" />
                                    {enviando ? "Enviando..."
                                        : comandaSeleccionada && activeOrder
                                            ? `Agregar a comanda · $${formatPrice(total)}`
                                            : `Enviar al bar · $${formatPrice(total)}`
                                    }
                                </button>
                            )}
                        </>
                    )}

                    {/* Summary cuando está colapsado */}
                    {!panelExpanded && (hayComanda || hayCart) && (
                        <div className="flex items-center justify-between text-sm text-gray-600 px-1">
                            <span>
                                {hayComanda && <span className="text-amber-600 font-semibold">Comanda: ${formatPrice(activeOrder!.total)}</span>}
                                {hayComanda && hayCart && <span className="text-gray-400 mx-2">+</span>}
                                {hayCart && <span className="font-semibold">{cart.length} ítem{cart.length !== 1 ? "s" : ""} · ${formatPrice(total)}</span>}
                            </span>
                            {hayCart && (
                                <button onClick={enviarPedido} disabled={enviando}
                                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                    <Send className="w-3 h-3" />
                                    {enviando ? "..." : "Enviar"}
                                </button>
                            )}
                        </div>
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

            {/* Modal picker plano de mesas — bottom sheet en mobile */}
            {mesaPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4"
                     onClick={e => { if (e.target === e.currentTarget) setMesaPickerOpen(false); }}>
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
                            <MapPin size={16} className="text-gray-500" />
                            <h2 className="font-black text-gray-900 flex-1">Elegir mesa</h2>
                            <button onClick={() => setMesaPickerOpen(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 min-h-0">
                            {/* Canvas con altura fija responsive */}
                            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200"
                                 style={{ height: "clamp(200px, 60vw, 380px)" }}>
                                <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                                    {/* Elementos decorativos */}
                                    {elementsPlano.map(el => {
                                        const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                                        const isBarra = el.tipo === "barra";
                                        if (isLine) return (
                                            <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, width:el.tipo==="linea_h"?`${el.ancho}%`:"3px", height:el.tipo==="linea_v"?`${el.alto}%`:"3px", backgroundColor:el.color, borderRadius:"2px", transform:el.tipo==="linea_h"?"translateY(-50%)":"translateX(-50%)" }} />
                                        );
                                        return (
                                            <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, transform:"translate(-50%,-50%)", width:`${el.ancho}%`, height:`${el.alto}%`, minWidth:"32px", minHeight:"14px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"6px", backgroundColor:isBarra?"#b45309":el.color, border:isBarra?"2px solid #92400e":`1px solid ${el.color==="#fef3c7"?"#d97706":"#9ca3af"}60` }}>
                                                {el.label && <span style={{ fontSize:"clamp(6px,0.9vw,9px)", fontWeight:700, color:isBarra?"#fef3c7":"#374151", whiteSpace:"nowrap" }}>{el.label}</span>}
                                            </div>
                                        );
                                    })}
                                    {/* Mesas */}
                                    {mesasPlano.filter(m => m.activa).map(m => {
                                        const isOcupada  = ocupadasPlano.has(m.nombre);
                                        const isSelected = m.nombre === mesa;
                                        const isRound    = m.forma === "round" || m.forma === "oval";
                                        const isBanq     = m.tipo === "banqueta";
                                        const rot        = m.rotacion ?? 0;
                                        const w = m.ancho || (m.forma==="oval"?11:m.forma==="round"?5.5:7);
                                        const h = m.alto  || (m.forma==="oval"?5 :m.forma==="round"?5.5:5);
                                        let bg: string;
                                        if (isSelected) bg = "bg-blue-500 border-blue-600 text-white";
                                        else if (isBanq) bg = "bg-amber-700 border-amber-800 text-amber-100";
                                        else if (isOcupada) bg = "bg-red-400 border-red-500 text-white";
                                        else bg = "bg-emerald-500 border-emerald-600 text-white";
                                        return (
                                            <div key={m._id}
                                                onClick={() => { setMesa(m.nombre); setMesaPickerOpen(false); }}
                                                style={{ position:"absolute", left:`${m.x??10}%`, top:`${m.y??10}%`, transform:`translate(-50%,-50%) rotate(${rot}deg)`, width:`min(${w}%,${w*7}px)`, height:`min(${h}%,${h*7.5}px)`, minWidth:"24px", minHeight:"18px", borderRadius:isRound?"50%":"8px", cursor:"pointer", userSelect:"none", zIndex:2 }}
                                                className={`flex items-center justify-center border-2 ${bg} hover:brightness-110 active:scale-95 transition-all`}
                                            >
                                                <div style={{ transform:`rotate(${-rot}deg)`, fontSize:"clamp(6px,0.8vw,9px)", fontWeight:900 }}>{m.nombre}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Leyenda */}
                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Libre</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Ocupada</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Seleccionada</span>
                                {mesa && <span className="ml-auto font-semibold text-gray-700">Mesa {mesa} seleccionada</span>}
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => { setMesa(""); setMesaPickerOpen(false); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Sin mesa</button>
                            <button onClick={() => setMesaPickerOpen(false)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">
                                {mesa ? `Confirmar Mesa ${mesa}` : "Cerrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
