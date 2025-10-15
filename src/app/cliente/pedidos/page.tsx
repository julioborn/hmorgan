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
    ArrowUp,
    Icon,
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
    const [showScroll, setShowScroll] = useState(false);
    const [cargandoConfig, setCargandoConfig] = useState(true);
    const [direccionPrincipal, setDireccionPrincipal] = useState<string>("");
    const [direccionEnvio, setDireccionEnvio] = useState<string>("");
    const [usarOtraDireccion, setUsarOtraDireccion] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
    const [mostrarBurbuja, setMostrarBurbuja] = useState(false);

    // Cargar dirección del perfil
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
                const data = await res.json();
                if (res.ok && data?.direccion) {
                    setDireccionPrincipal(data.direccion);
                    setDireccionEnvio(data.direccion);
                }
            } catch (err) {
                console.error("Error cargando dirección del usuario:", err);
            }
        })();
    }, []);

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
                setCargandoConfig(false);
            }
        })();

        const handleScroll = () => setShowScroll(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    async function enviarPedido() {
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant }));

        if (seleccion.length === 0)
            return Swal.fire("⚠️", "Seleccioná al menos un ítem", "warning");

        console.log("➡️ Enviando pedido:", {
            tipoEntrega,
            usarOtraDireccion,
            direccionPrincipal,
            direccionEnvio,
        });

        if (tipoEntrega === "envio" && !(direccionEnvio || direccionPrincipal)) {
            return Swal.fire("⚠️", "Ingresá una dirección de envío", "warning");
        }

        const res = await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: seleccion,
                tipoEntrega,
                direccion:
                    tipoEntrega === "envio"
                        ? direccionEnvio || direccionPrincipal || ""
                        : undefined,
            }),
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
            confirmButtonColor: "#dc2626",
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

    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);

    // /// 💬 Mostrar la burbuja cuando aparece el carrito por primera vez
    // useEffect(() => {
    //     if (totalItems > 0) {
    //         // Solo mostrar si nunca se mostró antes
    //         if (!localStorage.getItem("burbujaMostrada")) {
    //             setMostrarBurbuja(true);
    //             localStorage.setItem("burbujaMostrada", "true");
    //             const hideTimer = setTimeout(() => setMostrarBurbuja(false), 5000);
    //             return () => clearTimeout(hideTimer);
    //         }
    //     }
    // }, [totalItems]);

    if (cargandoConfig) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader size={40} />
            </div>
        );
    }

    if (!activo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <UtensilsCrossed size={50} className="mb-4 text-red-600" />
                <h2 className="text-xl font-semibold mb-2 text-black">Pedidos no disponibles</h2>
                <p className="text-gray-500">
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

    return (
        <div className="p-5 pb-28 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-center text-black">Realizar Pedido</h1>

            {/* Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {categorias.map((cat: string) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;

                    const handleScroll = () => {
                        setCategoriaSeleccionada(cat);
                        const section = document.getElementById(cat.replace(/\s+/g, "-"));
                        if (section) {
                            const yOffset = -130; // ⬅️ aumentamos el espacio (ajustá si querés más o menos)
                            const y = section.getBoundingClientRect().top + window.scrollY + yOffset;
                            window.scrollTo({ top: y, behavior: "smooth" });
                        }
                    };

                    return (
                        <button
                            key={cat}
                            onClick={handleScroll}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border border-gray-200
             bg-white hover:bg-red-50 hover:scale-[1.03] transition-all duration-200 text-center"
                        >
                            <Icon size={36} className="mb-2 text-red-600" />
                            <span className="text-sm font-semibold tracking-wide text-black">
                                {cat}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Productos */}
            {categorias.map((cat) => {
                const Icon = categoryIcons[cat] || UtensilsCrossed;
                let productos = menu.filter((i) => i.categoria === cat);

                // ✅ Ordenar las pizzas: primero las comunes, luego las "1/2"
                if (cat === "PIZZAS") {
                    productos = productos.sort((a, b) => {
                        const aIsHalf = a.nombre.trim().startsWith("1/2");
                        const bIsHalf = b.nombre.trim().startsWith("1/2");
                        if (aIsHalf === bIsHalf) return 0; // ambos son o no son "1/2"
                        return aIsHalf ? 1 : -1; // las "1/2" van después
                    });
                }

                if (!productos.length) return null;

                return (
                    <motion.div
                        key={cat}
                        id={cat.replace(/\s+/g, "-")}
                        className="mb-16 pt-10 scroll-mt-24"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{
                            opacity: categoriaSeleccionada === cat ? 1 : 0.9,
                            y: categoriaSeleccionada === cat ? 0 : 40,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2 text-black">
                            <Icon size={24} className="text-red-600" /> {cat}
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {productos.map((item) => (
                                <motion.div
                                    key={item._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4 }}
                                    className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-lg mb-1 text-black">{item.nombre}</p>
                                        {item.descripcion && (
                                            <p className="text-sm text-gray-600 mb-2 leading-snug">{item.descripcion}</p>
                                        )}
                                        <p className="text-red-600 font-bold text-lg">
                                            ${formatPrice(item.precio)}
                                        </p>
                                    </div>

                                    <div className="flex justify-end mt-5">
                                        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                            <button
                                                onClick={() =>
                                                    setItems((prev) => ({
                                                        ...prev,
                                                        [item._id]: Math.max((prev[item._id] || 0) - 1, 0),
                                                    }))
                                                }
                                                className="w-12 h-12 text-red-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition"
                                            >
                                                −
                                            </button>

                                            <span className="w-12 text-center text-lg font-semibold text-black">
                                                {items[item._id] || 0}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    setItems((prev) => ({
                                                        ...prev,
                                                        [item._id]: (prev[item._id] || 0) + 1,
                                                    }))
                                                }
                                                className="w-12 h-12 text-red-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );
            })}

            {/* 🛒 Carrito flotante rojo sólido (con burbuja de ayuda) */}
            {totalItems > 0 && (
                <div className="fixed bottom-32 right-5 z-50 flex flex-col items-end gap-2">
                    {/* 💬 Burbuja flotante animada */}
                    <AnimatePresence>
                        {mostrarBurbuja && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                transition={{ duration: 0.5 }}
                                className="relative bg-white text-black text-sm font-medium shadow-lg border border-gray-200 px-4 py-2 rounded-xl"
                            >
                                Aquí podés ver tu pedido 🛒
                                <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white rotate-45 border-r border-b border-gray-200"></div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 🔴 Botón del carrito (entrada rápida con estela luminosa) */}
                    <div className="fixed bottom-32 right-5 z-50 flex flex-col items-end gap-2 overflow-visible">
                        <AnimatePresence>
                            {totalItems > 0 && (
                                <>
                                    {/* 🌟 Estela luminosa detrás del botón */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -300, scaleX: 0.2 }}
                                        animate={{
                                            opacity: [0.3, 0.6, 0],
                                            x: [-200, -80, 0],
                                            scaleX: [0.3, 1, 1.2],
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            ease: "easeOut",
                                        }}
                                        className="absolute bottom-0 right-0 w-[180px] h-[60px] 
                               bg-gradient-to-r from-red-500/60 to-transparent 
                               blur-xl rounded-full pointer-events-none"
                                    />

                                    {/* 🛒 Botón del carrito (crece desde su posición final) */}
                                    <motion.button
                                        layout
                                        initial={{ opacity: 0, scale: 1.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20,
                                            duration: 0.5,
                                            ease: [0.16, 1, 0.3, 1], // back-out suave
                                        }}
                                        onClick={() => setDrawerOpen(true)}
                                        className="relative px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full
    shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-3 font-bold text-lg
    active:scale-95 hover:from-red-500 hover:to-rose-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.8)]
    border border-white/10 backdrop-blur-sm transition-all duration-300 origin-bottom-right"
                                    >
                                        <motion.div
                                            key={totalItems}
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6 }}
                                            className="relative flex items-center justify-center"
                                        >
                                            <ShoppingCart
                                                size={28}
                                                strokeWidth={2.4}
                                                color="white"
                                                className="pointer-events-none"
                                            />
                                            <motion.span
                                                key={`badge-${totalItems}`}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow"
                                            >
                                                {totalItems}
                                            </motion.span>
                                        </motion.div>

                                        <motion.span
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.8 }}
                                            className="font-extrabold text-white"
                                        >
                                            ${formatPrice(total)}
                                        </motion.span>
                                    </motion.button>

                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* 🆙 Botón subir arriba */}
            <AnimatePresence>
                {showScroll && (
                    <motion.button
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 80 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="fixed bottom-16 right-5 p-4 rounded-full bg-black text-white 
                       shadow-lg hover:bg-gray-800 transition"
                    >
                        <ArrowUp size={20} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* 🛍 Drawer del carrito mejorado */}
            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDrawerOpen(false)}
                    >
                        <motion.div
                            className="relative bg-white rounded-t-3xl shadow-[0_-5px_40px_rgba(0,0,0,0.15)] 
                   max-h-[80vh] overflow-y-auto border-t border-gray-100 p-6"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 🔶 Brillo superior decorativo */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-gradient-to-r from-red-500 to-rose-400 rounded-full" />

                            {/* 🧾 Header */}
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-extrabold text-gray-900 tracking-wide">
                                    Tu pedido
                                </h2>
                                <button
                                    onClick={vaciarCarrito}
                                    className="flex items-center gap-1 text-red-500 hover:text-red-400 text-sm font-medium transition"
                                >
                                    <Trash2 size={18} /> Vaciar
                                </button>
                            </div>

                            {/* 🧺 Lista de productos */}
                            <div className="space-y-3">
                                {Object.entries(items)
                                    .filter(([_, cant]) => cant > 0)
                                    .map(([id, cant]) => {
                                        const item = menu.find((m) => m._id === id);
                                        if (!item) return null;

                                        return (
                                            <motion.div
                                                key={id}
                                                layout
                                                className="py-4 px-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md 
                     bg-white/80 transition-all flex flex-col"
                                            >
                                                {/* 🧾 Detalle del producto */}
                                                <div>
                                                    <p className="font-semibold text-gray-900 leading-tight">{item.nombre}</p>
                                                    {/* <p className="text-sm text-gray-500">${formatPrice(item.precio)} c/u</p> */}
                                                </div>

                                                {/* ➕➖ Controles de cantidad y subtotal */}
                                                <div className="flex justify-between items-center mt-3">
                                                    {/* Controles */}
                                                    <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                                        <button
                                                            onClick={() =>
                                                                setItems((prev) => ({
                                                                    ...prev,
                                                                    [id]: Math.max((prev[id] || 0) - 1, 0),
                                                                }))
                                                            }
                                                            className="w-8 h-8 flex items-center justify-center text-red-500 
                           hover:bg-gray-100 transition text-lg"
                                                        >
                                                            −
                                                        </button>

                                                        <span className="w-8 text-center font-semibold text-gray-800">
                                                            {cant}
                                                        </span>

                                                        <button
                                                            onClick={() =>
                                                                setItems((prev) => ({
                                                                    ...prev,
                                                                    [id]: (prev[id] || 0) + 1,
                                                                }))
                                                            }
                                                            className="w-8 h-8 flex items-center justify-center text-red-500 
                           hover:bg-gray-100 transition text-lg"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    {/* 💰 Subtotal + Eliminar */}
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-bold text-red-600 text-lg">
                                                            ${formatPrice(item.precio * cant)}
                                                        </p>
                                                        <button
                                                            onClick={() => eliminarProducto(id)}
                                                            className="text-gray-400 hover:text-red-500 transition"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>

                            {/* 💰 Total */}
                            <div className="mt-6 flex flex-col justify-center items-center bg-gradient-to-r from-red-50 to-white
                        border border-red-100 rounded-2xl py-4 px-6 shadow-inner">
                                <span className="font-semibold text-gray-800 text-lg">Total</span>
                                <span className="font-extrabold text-red-600 text-2xl">
                                    ${formatPrice(total)}
                                </span>
                            </div>

                            {/* 🚚 Tipo de entrega */}
                            <div className="mt-8 text-center">
                                <p className="mb-2 font-semibold text-gray-800">Tipo de entrega</p>
                                <select
                                    value={tipoEntrega}
                                    onChange={(e) => setTipoEntrega(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-gray-300 w-full text-center bg-white 
                       text-gray-900 font-medium focus:ring-2 focus:ring-red-400 focus:border-red-300 transition"
                                >
                                    <option value="retira">Retira en el bar</option>
                                    <option value="envio">Envío a domicilio</option>
                                </select>

                                {tipoEntrega === "envio" && (
                                    <div className="mt-4 text-left">
                                        {direccionPrincipal ? (
                                            <>
                                                <p className="text-sm text-gray-700 mb-2">
                                                    Dirección principal:{" "}
                                                    <span className="font-semibold">{direccionPrincipal}</span>
                                                </p>
                                                <label className="flex items-center gap-2 text-sm mb-2 text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={usarOtraDireccion}
                                                        onChange={(e) => setUsarOtraDireccion(e.target.checked)}
                                                        className="accent-red-500"
                                                    />
                                                    <span>Enviar a otra dirección</span>
                                                </label>
                                                {usarOtraDireccion && (
                                                    <input
                                                        value={direccionEnvio}
                                                        onChange={(e) => setDireccionEnvio(e.target.value)}
                                                        placeholder="Escribí la dirección de envío"
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 
                                 focus:ring-red-400 text-gray-900"
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-gray-700 mb-2">
                                                    No tenés una dirección guardada.
                                                </p>
                                                <input
                                                    value={direccionEnvio}
                                                    onChange={(e) => setDireccionEnvio(e.target.value)}
                                                    placeholder="Ingresá tu dirección"
                                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 
                               focus:ring-red-400 text-gray-900"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 🧠 Botón Finalizar Pedido */}
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={enviarPedido}
                                className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500
                     text-white font-semibold text-lg shadow-[0_0_25px_rgba(239,68,68,0.4)]
                     hover:shadow-[0_0_35px_rgba(239,68,68,0.6)] transition-all duration-300"
                            >
                                Finalizar pedido
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
