"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
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
    ArrowUp,
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
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

export default function ClienteMenuPage() {
    const { data: items } = useSWR<MenuItem[]>("/api/menu", fetcher);
    const [showScroll, setShowScroll] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);

    useEffect(() => {
        const handleScroll = () => setShowScroll(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!items) {
        return (
            <div className="p-12 flex justify-center">
                <Loader size={40} />
            </div>
        );
    }

    const categorias: string[] = Object.keys(categoryIcons).filter((cat) =>
        items.some((i) => i.categoria === cat)
    );

    const scrollToCategory = (cat: string) => {
        setCategoriaSeleccionada(cat);
        setShowScroll(true);
        const section = document.getElementById(cat.replace(/\s+/g, "-"));
        if (section) {
            const y = section.getBoundingClientRect().top + window.scrollY - 140;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Título */}
            <div className="px-5 pt-6 pb-2">
                <h1 className="text-3xl font-black text-black tracking-tight mb-1">Menú</h1>
                <p className="text-sm text-gray-400">Explorá nuestra carta completa</p>
            </div>

            {/* Categorías — pills horizontales scrollables */}
            <div className="flex gap-2 overflow-x-auto px-5 py-4 scrollbar-hide">
                {categorias.map((cat) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    const activo = categoriaSeleccionada === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => scrollToCategory(cat)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm flex-shrink-0 transition-all duration-200 border ${
                                activo
                                    ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/25"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600"
                            }`}
                        >
                            <Icon size={14} />
                            {cat}
                        </button>
                    );
                })}
            </div>

            <div className="h-px bg-gray-100 mx-5 mb-6" />

            {/* Productos por categoría */}
            <div className="px-5 pb-16">
                {categorias.map((cat) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    const productos = items
                        .filter((i) => i.categoria === cat)
                        .sort((a, b) => {
                            if (a.categoria === "PIZZAS" && b.categoria === "PIZZAS") {
                                const aEsMedia =
                                    a.nombre.toLowerCase().includes("1/2") ||
                                    a.nombre.toLowerCase().includes("media");
                                const bEsMedia =
                                    b.nombre.toLowerCase().includes("1/2") ||
                                    b.nombre.toLowerCase().includes("media");
                                if (aEsMedia && !bEsMedia) return 1;
                                if (!aEsMedia && bEsMedia) return -1;
                            }
                            return 0;
                        });

                    if (!productos.length) return null;

                    return (
                        <div
                            key={cat}
                            id={cat.replace(/\s+/g, "-")}
                            className="mb-12 scroll-mt-32"
                        >
                            {/* Header de categoría */}
                            <div className="flex items-center gap-3 mb-5">
                                <span className="block w-1 h-7 rounded-full bg-red-600 flex-shrink-0" />
                                <Icon size={20} className="text-red-600 flex-shrink-0" />
                                <h2 className="text-xl font-black text-black tracking-tight">{cat}</h2>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {productos.map((i) => (
                                    <motion.div
                                        key={i._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.35 }}
                                        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        {i.imagen && (
                                            <div className="relative h-44 w-full overflow-hidden">
                                                <img
                                                    src={i.imagen}
                                                    alt={i.nombre}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h3 className="font-bold text-base text-black leading-tight mb-1">
                                                {i.nombre}
                                            </h3>
                                            {i.descripcion && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                    {i.descripcion}
                                                </p>
                                            )}
                                            <span className="inline-block bg-red-50 text-red-600 font-extrabold text-sm px-3 py-1 rounded-full">
                                                ${formatPrice(i.precio)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Botón flotante scroll top */}
            <AnimatePresence>
                {showScroll && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="fixed bottom-20 right-5 z-[9999] p-3.5 rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-500 transition"
                    >
                        <ArrowUp size={22} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
