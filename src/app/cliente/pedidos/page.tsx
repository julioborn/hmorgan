"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import {
    UtensilsCrossed,
    Pizza,
    Beef,
    Sandwich,
    Salad,
    Beer,
    CupSoda,
    Martini,
    BottleWine,
    GlassWater,
    Beaker,
    CakeSlice,
    Hamburger,
    Milk,
    X,
    Trash2,
    ShoppingCart,
    ArrowUp, // 🆕 botón subir
} from "lucide-react";
import Loader from "@/components/Loader";

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen?: string;
    activo: boolean;
};

const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef,
    PIZZAS: Pizza,
    HAMBURGUESAS: Hamburger,
    SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed,
    ENSALADAS: Salad,
    FRITURAS: UtensilsCrossed,
    CERVEZAS: Beer,
    VINOS: BottleWine,
    GASEOSAS: Milk,
    JARROS: CupSoda,
    COCKTAILS: Martini,
    WHISKY: GlassWater,
    MEDIDAS: Beaker,
    "POSTRE Y CAFE": CakeSlice,
};

export default function PedidosClientePage() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [activo, setActivo] = useState(false);
    const [items, setItems] = useState<Record<string, number>>({});
    const [tipoEntrega, setTipoEntrega] = useState("retira");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showScroll, setShowScroll] = useState(false); // 🆕 estado scroll
    const [cargandoConfig, setCargandoConfig] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const cfg = await fetch("/api/admin/config-pedidos").then((r) => r.json());
                setActivo(cfg.activo);

                if (cfg.activo) {
                    const menuRes = await fetch("/api/menu?activo=true");
                    const data = await menuRes.json();
                    setMenu(data);
                }
            } catch (error) {
                console.error("Error cargando configuración de pedidos:", error);
            } finally {
                setCargandoConfig(false); // ✅ solo acá
            }
        })();

        // 🆕 mostrar botón scroll al bajar
        const handleScroll = () => setShowScroll(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    async function enviarPedido() {
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant }));

        if (seleccion.length === 0)
            return Swal.fire("⚠️", "Selecciona al menos un ítem", "warning");

        const res = await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: seleccion, tipoEntrega }),
        });

        if (res.ok) {
            Swal.fire("✅", "Pedido enviado correctamente", "success");
            setItems({});
            setDrawerOpen(false);
        } else Swal.fire("❌", "Error al enviar el pedido", "error");
    }

    const vaciarCarrito = () => {
        Swal.fire({
            title: "¿Vaciar carrito?",
            text: "Se eliminarán todos los productos seleccionados.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, vaciar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#ef4444",
        }).then((r) => {
            if (r.isConfirmed) {
                setItems({});
                setDrawerOpen(false);
            }
        });
    };

    const eliminarProducto = (id: string) => {
        setItems((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    };

    // ⏳ Mientras carga la configuración
    if (cargandoConfig) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader size={40} />
            </div>
        );
    }

    // 🚫 Si los pedidos están desactivados
    if (!activo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-300">
                <UtensilsCrossed size={50} className="mb-4 text-rose-500" />
                <h2 className="text-xl font-semibold mb-2">Pedidos no disponibles</h2>
                <p className="text-gray-400">
                    En este momento no se están tomando pedidos. 🍽️
                </p>
            </div>
        );
    }

    const categorias = Object.keys(categoryIcons).filter((cat) =>
        menu.some((i) => i.categoria === cat)
    );

    const total = menu.reduce((acc, item) => {
        const cant = items[item._id] || 0;
        return acc + item.precio * cant;
    }, 0);

    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);

    return (
        <div className="p-4 pb-28 relative">
            <h1 className="text-3xl font-bold mb-8 text-center">Realizar Pedido</h1>

            {/* Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {categorias.map((cat) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    return (
                        <a
                            key={cat}
                            href={`#${cat.replace(/\s+/g, "-")}`}
                            className="flex flex-col items-center justify-center p-5 rounded-2xl shadow-md
               bg-gradient-to-br from-emerald-600/20 to-slate-800/40
               hover:from-emerald-600/40 hover:to-slate-800/60
               hover:scale-105 transition-all duration-200 text-center"
                        >
                            <Icon size={30} className="mb-2 text-emerald-400" />
                            <span className="text-sm font-semibold">{cat}</span>
                        </a>
                    );
                })}
            </div>

            {/* Productos por categoría */}
            {categorias.map((cat) => {
                const Icon = categoryIcons[cat] || UtensilsCrossed;
                const productos = menu.filter((i) => i.categoria === cat);
                if (!productos.length) return null;

                return (
                    <div key={cat} id={cat.replace(/\s+/g, "-")} className="mb-10 scroll-mt-20">
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                            <Icon size={24} className="text-emerald-400" /> {cat}
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {productos.map((item) => (
                                <div
                                    key={item._id}
                                    className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow
                   hover:shadow-emerald-500/10 transition-all"
                                >
                                    <p className="font-semibold text-lg">{item.nombre}</p>
                                    {item.descripcion && (
                                        <p className="text-sm text-gray-400">{item.descripcion}</p>
                                    )}
                                    <p className="mt-1 text-emerald-400 font-bold">
                                        ${formatPrice(item.precio)}
                                    </p>

                                    {/* Controles de cantidad */}
                                    <div className="flex items-center mt-3">
                                        <button
                                            onClick={() =>
                                                setItems((prev) => ({
                                                    ...prev,
                                                    [item._id]: Math.max((prev[item._id] || 0) - 1, 0),
                                                }))
                                            }
                                            className="px-3 py-1 bg-white/10 rounded-l-xl"
                                        >
                                            -
                                        </button>
                                        <input
                                            readOnly
                                            value={items[item._id] || 0}
                                            className="w-12 text-center bg-transparent border-t border-b border-white/10"
                                        />
                                        <button
                                            onClick={() =>
                                                setItems((prev) => ({
                                                    ...prev,
                                                    [item._id]: (prev[item._id] || 0) + 1,
                                                }))
                                            }
                                            className="px-3 py-1 bg-white/10 rounded-r-xl"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* 🛒 Carrito flotante */}
            {totalItems > 0 && (
                <motion.button
                    layout
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 120 }}
                    onClick={() => setDrawerOpen(true)}
                    className="fixed bottom-5 right-5 px-5 py-3 rounded-full bg-emerald-600 text-white 
            shadow-lg shadow-emerald-600/30 backdrop-blur-md flex items-center gap-3 
            font-semibold text-sm active:scale-95"
                >
                    <ShoppingCart size={20} />
                    <span>{totalItems} ítem{totalItems > 1 ? "s" : ""}</span>
                    <span className="font-bold">${formatPrice(total)}</span>
                </motion.button>
            )}

            {/* 🆕 Botón subir arriba */}
            <AnimatePresence>
                {showScroll && (
                    <motion.button
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 80 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="fixed bottom-5 left-5 p-4 rounded-full bg-white/10 border border-white/20 text-white 
              shadow-lg hover:bg-white/20 transition backdrop-blur-md"
                    >
                        <ArrowUp size={20} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Drawer del carrito */}
            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDrawerOpen(false)}
                    >
                        <motion.div
                            className="bg-slate-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto shadow-xl"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Tu pedido</h2>
                                <button
                                    onClick={vaciarCarrito}
                                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-sm"
                                >
                                    <Trash2 size={18} /> Vaciar
                                </button>
                            </div>

                            {Object.entries(items)
                                .filter(([_, cant]) => cant > 0)
                                .map(([id, cant]) => {
                                    const item = menu.find((m) => m._id === id);
                                    if (!item) return null;
                                    return (
                                        <motion.div
                                            key={id}
                                            layout
                                            className="flex justify-between items-center py-2 border-b border-white/10"
                                        >
                                            <div className="flex flex-col">
                                                <p className="font-semibold">{item.nombre}</p>
                                                <p className="text-sm text-gray-400">
                                                    {cant} × ${formatPrice(item.precio)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-emerald-400">
                                                    ${formatPrice(item.precio * cant)}
                                                </p>
                                                <button
                                                    onClick={() => eliminarProducto(id)}
                                                    className="text-gray-400 hover:text-rose-400 transition"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                            <div className="mt-4 flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span className="text-emerald-400">${formatPrice(total)}</span>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="mb-2 font-semibold">Tipo de entrega</p>
                                <select
                                    value={tipoEntrega}
                                    onChange={(e) => setTipoEntrega(e.target.value)}
                                    className="px-4 py-2 rounded-xl bg-white/10 w-full text-center"
                                >
                                    <option value="retira">Retira en el bar</option>
                                    <option value="envio">Envío a domicilio</option>
                                </select>
                            </div>

                            <button
                                onClick={enviarPedido}
                                className="w-full mt-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
                            >
                                Finalizar pedido
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
