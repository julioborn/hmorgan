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
import { swalBase } from "@/lib/swalConfig";
import Portal from "@/components/Portal";
import { useRouter } from "next/navigation";

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
    const [enviando, setEnviando] = useState(false);
    const router = useRouter();

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
                const cfg = await fetch("/api/config/pedidos", {
                    cache: "no-store",
                }).then((r) => r.json());

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

    useEffect(() => {
        if (!cargandoConfig && !activo) {
            router.replace("/"); // o "/cliente"
        }
    }, [activo, cargandoConfig, router]);

    async function enviarPedido() {
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant }));

        if (seleccion.length === 0)
            return swalBase.fire("⚠️", "Seleccioná al menos un ítem", "warning");

        if (tipoEntrega === "envio" && !(direccionEnvio || direccionPrincipal)) {
            return swalBase.fire("⚠️", "Ingresá una dirección de envío", "warning");
        }

        try {
            setEnviando(true);

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
                setDrawerOpen(false); // 👈 cerrar primero

                await swalBase.fire({
                    icon: "success",
                    title: "Pedido enviado correctamente",
                    timer: 2000,
                    showConfirmButton: false,
                });
                setItems({});
                setDrawerOpen(false);
            } else {
                swalBase.fire("❌", "Error al enviar el pedido", "error");
            }
        } catch (error) {
            swalBase.fire("❌", "Error de conexión", "error");
        } finally {
            setEnviando(false);
        }
    }

    const vaciarCarrito = () => {
        swalBase.fire({
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
                    En este momento no se están tomando pedidos.
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
        <div className="p-5 pb-28 bg-white min-h-screen">
            <h1 className="text-4xl font-extrabold mb-10 text-center text-black">Realizar Pedido</h1>

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
                                    className="p-5 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between"
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

            <Portal>
                {/* 🛒 Carrito flotante */}
                <AnimatePresence>
                    {totalItems > 0 && (
                        <div className="fixed bottom-32 right-5 z-[9999] flex flex-col items-end gap-2 overflow-visible">

                            {/* 💬 Burbuja de ayuda */}
                            <AnimatePresence>
                                {mostrarBurbuja && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        transition={{ duration: 0.4 }}
                                        className="relative bg-white text-black text-sm font-medium shadow-lg
                         border border-gray-200 px-4 py-2 rounded-xl"
                                    >
                                        Aquí podés ver tu pedido 🛒
                                        <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white rotate-45
                              border-r border-b border-gray-200" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* 🌟 Estela luminosa */}
                            <motion.div
                                initial={{ opacity: 0, x: -200, scaleX: 0.3 }}
                                animate={{
                                    opacity: [0.4, 0.7, 0],
                                    x: [-120, -40, 0],
                                    scaleX: [0.6, 1, 1.2],
                                }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute bottom-0 right-0 w-[180px] h-[60px]
                     bg-gradient-to-r from-red-500/60 to-transparent
                     blur-xl rounded-full pointer-events-none"
                            />

                            {/* 🛒 Botón carrito */}
                            <motion.button
                                layout
                                initial={{ opacity: 0, scale: 1.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 22,
                                }}
                                onClick={() => setDrawerOpen(true)}
                                className="relative px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600
                     text-white rounded-full shadow-[0_0_25px_rgba(239,68,68,0.6)]
                     flex items-center gap-3 font-bold text-lg
                     active:scale-95 hover:shadow-[0_0_40px_rgba(239,68,68,0.8)]
                     border border-white/10 backdrop-blur-sm"
                            >
                                <div className="relative flex items-center justify-center">
                                    <ShoppingCart size={28} strokeWidth={2.4} />
                                    <motion.span
                                        key={totalItems}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-2 -right-2 bg-white text-red-600
                         text-xs font-bold rounded-full w-5 h-5
                         flex items-center justify-center shadow"
                                    >
                                        {totalItems}
                                    </motion.span>
                                </div>

                                <span className="font-extrabold">
                                    ${formatPrice(total)}
                                </span>
                            </motion.button>
                        </div>
                    )}
                </AnimatePresence>

                {/* 🆙 Botón subir */}
                <AnimatePresence>
                    {showScroll && (
                        <motion.button
                            initial={{ opacity: 0, y: 80 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 80 }}
                            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                            className="fixed bottom-16 right-5 z-[9999]
                   p-4 rounded-full bg-black text-white
                   shadow-lg hover:bg-gray-800"
                        >
                            <ArrowUp size={20} />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* 🛍 Drawer del carrito */}
                <AnimatePresence>
                    {drawerOpen && (
                        <motion.div
                            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm
                   flex flex-col justify-end"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                        >
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative bg-white rounded-t-3xl
                     max-h-[80vh] overflow-y-auto p-6
                     pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
                            >
                                <h3 className="text-2xl font-extrabold mb-4 text-black">Tu pedido</h3>

                                {/* 🛒 Lista de productos */}
                                <div className="space-y-4">
                                    {Object.entries(items).map(([id, cant]) => {
                                        const producto = menu.find((m) => m._id === id);
                                        if (!producto || cant === 0) return null;

                                        return (
                                            <div
                                                key={id}
                                                className="flex justify-between items-center border-b pb-3"
                                            >
                                                <div>
                                                    <p className="font-semibold text-black">{producto.nombre}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {cant} × ${formatPrice(producto.precio)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-black">
                                                        ${formatPrice(producto.precio * cant)}
                                                    </span>

                                                    <button
                                                        onClick={() => eliminarProducto(id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 🧾 Total */}
                                <div className="flex justify-between items-center mt-6 text-lg font-bold">
                                    <span>Total</span>
                                    <span>${formatPrice(total)}</span>
                                </div>

                                {/* 🚚 Tipo de entrega */}
                                <div className="mt-6">
                                    <h4 className="font-semibold mb-2 text-black">Tipo de entrega</h4>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setTipoEntrega("retira")}
                                            className={`flex-1 py-2 rounded-xl border font-semibold ${tipoEntrega === "retira"
                                                ? "bg-red-600 text-white border-red-600"
                                                : "bg-white text-black border-gray-300"
                                                }`}
                                        >
                                            Retira
                                        </button>

                                        <button
                                            onClick={() => setTipoEntrega("envio")}
                                            className={`flex-1 py-2 rounded-xl border font-semibold ${tipoEntrega === "envio"
                                                ? "bg-red-600 text-white border-red-600"
                                                : "bg-white text-black border-gray-300"
                                                }`}
                                        >
                                            Envío
                                        </button>
                                    </div>
                                </div>

                                {/* 📍 Dirección */}
                                {tipoEntrega === "envio" && (
                                    <div className="mt-4">
                                        <input
                                            type="text"
                                            placeholder="Dirección de envío"
                                            value={direccionEnvio}
                                            onChange={(e) => setDireccionEnvio(e.target.value)}
                                            className="w-full border rounded-xl px-4 py-2"
                                        />
                                    </div>
                                )}

                                {/* 🧹 Vaciar carrito */}
                                <button
                                    onClick={vaciarCarrito}
                                    className="mt-6 w-full py-2 rounded-xl border border-red-600 text-red-600 font-semibold"
                                >
                                    Vaciar carrito
                                </button>

                                {/* ✅ Confirmar pedido */}
                                <button
                                    onClick={enviarPedido}
                                    disabled={enviando}
                                    className="mt-4 w-full py-3 rounded-xl bg-red-600 text-white font-bold
  disabled:opacity-50"
                                >
                                    {enviando ? "Enviando..." : "Confirmar pedido"}
                                </button>

                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Portal>

        </div>
    );
}
