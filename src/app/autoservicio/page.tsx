"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, X, Trash2, ShoppingCart, ChevronLeft, Tablet,
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

/* ─── CartDrawer ─────────────────────────────────────────────────── */
interface CartDrawerProps {
    items: Record<string, number>;
    menu: MenuItem[];
    notasProducto: Record<string, string>;
    onSetNotaProducto: (id: string, nota: string) => void;
    horarioPreferido: string;
    setHorarioPreferido: (v: string) => void;
    enviando: boolean;
    total: number;
    sesion: Sesion;
    onClose: () => void;
    onVaciar: () => void;
    onEliminar: (id: string) => void;
    onEnviar: () => void;
}

function CartDrawer({ items, menu, notasProducto, onSetNotaProducto, horarioPreferido, setHorarioPreferido, enviando, total, sesion, onClose, onVaciar, onEliminar, onEnviar }: CartDrawerProps) {
    return (
        <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="relative bg-white rounded-t-3xl max-h-[85dvh] overflow-y-auto p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            >
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
                                    <button onClick={() => onEliminar(id)} className="text-red-500 hover:text-red-700 p-1">
                                        <X size={18} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Observación para este producto"
                                    value={notasProducto[id] || ""}
                                    onChange={e => onSetNotaProducto(id, e.target.value)}
                                    style={{ fontSize: "16px" }}
                                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-gray-50"
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        Horario preferido <span className="font-normal normal-case text-gray-400">(opcional)</span>
                    </label>
                    <select
                        value={horarioPreferido}
                        onChange={e => setHorarioPreferido(e.target.value)}
                        style={{ fontSize: "16px" }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    >
                        <option value="">Seleccionar...</option>
                        <option value="20:30">20:30</option>
                        <option value="21:00">21:00</option>
                        <option value="21:30">21:30</option>
                        <option value="22:00">22:00</option>
                        <option value="22:30">22:30</option>
                        <option value="Apenas esté listo">Apenas esté listo</option>
                    </select>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-black text-lg text-black">Total</span>
                    <span className="font-black text-lg text-purple-600">${fmt(total)}</span>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={onVaciar} className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onEnviar} disabled={enviando}
                        className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-purple-700 transition active:scale-[0.98]">
                        {enviando ? "Enviando..." : `Confirmar pedido · $${fmt(total)}`}
                    </button>
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
    const [items, setItems] = useState<Record<string, number>>({});
    const [notasProducto, setNotasProducto] = useState<Record<string, string>>({});
    const [horarioPreferido, setHorarioPreferido] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [pedidoOk, setPedidoOk] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaSeleccionada]);

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
            } finally { setCargando(false); }
        })();
    }, [user]);

    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);
    const total = menu.reduce((acc, item) => acc + item.precio * (items[item._id] || 0), 0);

    async function enviarPedido() {
        if (!sesion || totalItems === 0) return;
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant, nota: notasProducto[id]?.trim() || undefined }));
        setEnviando(true);
        try {
            const res = await fetch("/api/pedidos", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: seleccion,
                    fuente: "autoservicio",
                    mesa: sesion.mesasNombres.join(", "),
                    tipoEntrega: "retira",
                    horarioPreferido: horarioPreferido.trim() || undefined,
                }),
            });
            if (res.ok) {
                setItems({});
                setNotasProducto({});
                setHorarioPreferido("");
                setDrawerOpen(false);
                setPedidoOk(true);
                setTimeout(() => setPedidoOk(false), 5000);
            }
        } finally { setEnviando(false); }
    }

    const vaciarCarrito = () => { setItems({}); setDrawerOpen(false); };
    const eliminarProducto = (id: string) => setItems(prev => { const u = { ...prev }; delete u[id]; return u; });

    if (authLoading || sesion === undefined || cargando) return (
        <div className="flex justify-center py-20"><Loader size={48} /></div>
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

    const getImage = (cat: string) => categoryConfigMap[cat]?.imageUrl || categoryImages[cat];
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    const categoriasNavegacion = [
        ...(menu.some(i => i.categoria === "MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...MAIN_ORDER.filter(cat => {
            if (cat === "BEBIDAS") return BEBIDAS_CATS.some(bc => menu.some(i => i.categoria === bc));
            return menu.some(i => i.categoria === cat);
        }),
    ];

    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const bg = getImage(cat);
        const pos = getPosition(cat);
        const isSpecial = cat === "MENÚ DEL DÍA";
        const count = cat === "BEBIDAS"
            ? menu.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : menu.filter(i => i.categoria === cat).length;
        return (
            <motion.button onClick={onClick} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`relative w-full rounded-2xl overflow-hidden shadow-md active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2 h-56" : "h-36"}`}>
                {bg ? <MenuImg src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} /> : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />}
                <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-black/75 via-black/10 to-transparent" : "from-black/85 via-black/30 to-black/10"}`} />
                {isSpecial && <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>}
                <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                    <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-[11px] font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    function CartButton() {
        return (
            <AnimatePresence>
                {totalItems > 0 && (
                    <div className="fixed bottom-32 right-5 z-[9999]">
                        <motion.button
                            layout
                            initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            onClick={() => setDrawerOpen(true)}
                            className="relative px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-full shadow-[0_0_25px_rgba(147,51,234,0.6)] flex items-center gap-3 font-bold text-lg active:scale-95 border border-white/10"
                        >
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

    /* Toast pedido ok */
    const toastOk = pedidoOk && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-2">
            ✓ Pedido enviado
        </div>
    );

    const cartDrawerProps: CartDrawerProps = {
        items, menu, notasProducto,
        onSetNotaProducto: (id, nota) => setNotasProducto(prev => ({ ...prev, [id]: nota })),
        horarioPreferido, setHorarioPreferido,
        enviando, total, sesion,
        onClose: () => setDrawerOpen(false),
        onVaciar: vaciarCarrito,
        onEliminar: eliminarProducto,
        onEnviar: enviarPedido,
    };

    /* ── Vista categorías ── */
    if (!categoriaSeleccionada) return (
        <div className="bg-white min-h-screen pb-10">
            {toastOk}
            <div className="px-5 pt-6 pb-2">
                <div className="flex items-center gap-2 mb-0.5">
                    <Tablet size={20} className="text-purple-600" />
                    <h1 className="text-3xl font-black text-black tracking-tight">Autoservicio</h1>
                </div>
                <p className="text-sm text-purple-500 font-semibold">
                    Mesa{sesion.mesasNombres.length > 1 ? "s" : ""} {sesion.mesasNombres.join(", ")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Elegí una categoría</p>
            </div>
            <div className="px-5 py-3 grid grid-cols-2 gap-3">
                {categoriasNavegacion.map((cat, idx) => (
                    <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaSeleccionada(cat)} />
                ))}
            </div>
            <Portal>
                <CartButton />
                <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
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
                    {subCats.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaSeleccionada(cat)} />
                    ))}
                </div>
                <Portal>
                    <CartButton />
                    <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
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
            </Portal>
        </div>
    );
}
