"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, ChevronLeft,
} from "lucide-react";
import Loader from "@/components/Loader";
import MenuImg from "@/components/MenuImg";
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

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const PICAR_CATS   = ["PICADAS", "FRITURAS"];
const MAIN_ORDER   = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS Y FRITURAS", "ENSALADAS", "BEBIDAS", "POSTRE Y CAFE"];

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg",
    PIZZAS: "/pizzas.jpg",
    HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg",
    "PICADAS Y FRITURAS": "/picada.jpg",
    ENSALADAS: "/ensaladas.jpg",
    BEBIDAS: "/bebidas.jpeg",
    "POSTRE Y CAFE": "/postreycafe.jpeg",
    CERVEZAS: "/subcategoria-bebidas/cervezas.png",
    VINOS: "/subcategoria-bebidas/vinos.png",
    GASEOSAS: "/subcategoria-bebidas/gaseosas.png",
    JARROS: "/subcategoria-bebidas/jarros.png",
    COCKTAILS: "/subcategoria-bebidas/cocktails.png",
    WHISKY: "/subcategoria-bebidas/whisky.png",
    MEDIDAS: "/subcategoria-bebidas/medidas.png",
};

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef, PIZZAS: Pizza, HAMBURGUESAS: Hamburger, SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed, ENSALADAS: Salad, FRITURAS: UtensilsCrossed,
    BEBIDAS: Beer,
    CERVEZAS: Beer, VINOS: BottleWine, GASEOSAS: Milk, JARROS: CupSoda,
    COCKTAILS: Martini, WHISKY: GlassWater, MEDIDAS: Beaker,
    "POSTRE Y CAFE": CakeSlice,
};

export default function ClienteMenuPage() {
    const { data: items } = useSWR<MenuItem[]>("/api/menu?cliente=true", fetcher);
    const categoryConfigMap = useCategoryConfigs();
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const isPopNav = useRef(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaActiva]);

    useEffect(() => {
        if (categoriaActiva !== null && !isPopNav.current) {
            window.history.pushState(null, "");
        }
        isPopNav.current = false;
    }, [categoriaActiva]);

    useEffect(() => {
        const onPop = () => {
            if (categoriaActiva !== null) {
                isPopNav.current = true;
                const esBeb = BEBIDAS_CATS.includes(categoriaActiva);
                setCategoriaActiva(categoriaActiva === "BEBIDAS" ? null : esBeb ? "BEBIDAS" : null);
            }
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [categoriaActiva]);

    if (!items) return <div className="p-12 flex justify-center"><Loader size={40} /></div>;

    const todasCats = Array.from(new Set(items.map(i => i.categoria)));
    const categoriasNavegacion = [
        ...(items.some(i => i.categoria === "MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...MAIN_ORDER.filter(cat =>
            cat === "BEBIDAS"   ? BEBIDAS_CATS.some(bc => items.some(i => i.categoria === bc)) :
            cat === "PICADAS Y FRITURAS" ? PICAR_CATS.some(pc => items.some(i => i.categoria === pc)) :
            items.some(i => i.categoria === cat)),
        ...todasCats.filter(cat => !MAIN_ORDER.includes(cat) && !BEBIDAS_CATS.includes(cat) && !PICAR_CATS.includes(cat) && cat !== "MENÚ DEL DÍA"),
    ];

    const catDbImage = (cat: string) => items.find((i) => i.categoria === cat && i.imagen)?.imagen ?? null;
    const getImage = (cat: string) => {
        const cfg = categoryConfigMap[cat];
        return cfg?.imageUrl || categoryImages[cat] || catDbImage(cat);
    };
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const bg = getImage(cat);
        const imagePosition = getPosition(cat);
        const allItems = items ?? [];
        const count = cat === "BEBIDAS"    ? allItems.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : cat === "PICADAS Y FRITURAS" ? allItems.filter(i => PICAR_CATS.includes(i.categoria)).length
            : allItems.filter(i => i.categoria === cat).length;
        const isSpecial = cat === "MENÚ DEL DÍA";
        return (
            <motion.button
                onClick={onClick}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`relative w-full h-36 rounded-2xl overflow-hidden shadow-md active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2" : ""}`}
            >
                {bg ? (
                    <MenuImg src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: imagePosition }} />
                ) : (
                    <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-amber-900/85 via-amber-800/30 to-transparent" : "from-black/85 via-black/30 to-black/10"}`} />
                {isSpecial && <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>}
                <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                    <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-[11px] font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    /* ── Vista principal ── */
    if (!categoriaActiva) {
        return (
            <div className="bg-white min-h-screen">
                <div className="px-5 pt-6 pb-4">
                    <h1 className="text-3xl font-black text-black tracking-tight mb-1">Menú</h1>
                    <p className="text-sm text-gray-400">Elegí una categoría</p>
                </div>
                <div className="px-5 pb-10 grid grid-cols-2 gap-3">
                    {categoriasNavegacion.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── BEBIDAS: subcategorías ── */
    if (categoriaActiva === "BEBIDAS") {
        const subCats = BEBIDAS_CATS.filter((bc) => items.some((i) => i.categoria === bc));
        return (
            <div className="bg-white min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setCategoriaActiva(null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ChevronLeft size={22} className="text-gray-800" />
                    </button>
                    <Beer size={18} className="text-red-600 shrink-0" />
                    <h1 className="font-black text-xl text-black tracking-tight">Bebidas</h1>
                </div>
                <div className="px-5 py-5 pb-10 grid grid-cols-2 gap-3">
                    {subCats.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Items de categoría ── */
    const Icon = categoryIcons[categoriaActiva] || UtensilsCrossed;
    const esBebida = BEBIDAS_CATS.includes(categoriaActiva);
    const productos = items
        .filter((i) => categoriaActiva === "PICADAS Y FRITURAS" ? PICAR_CATS.includes(i.categoria) : i.categoria === categoriaActiva)
        .sort((a, b) => {
            const diff = ((a as any).order ?? 0) - ((b as any).order ?? 0);
            if (diff !== 0) return diff;
            if (categoriaActiva === "PIZZAS") {
                const aH = a.nombre.toLowerCase().includes("1/2") || a.nombre.toLowerCase().includes("media");
                const bH = b.nombre.toLowerCase().includes("1/2") || b.nombre.toLowerCase().includes("media");
                if (aH && !bH) return 1;
                if (!aH && bH) return -1;
            }
            return 0;
        });

    return (
        <div className="bg-white min-h-screen">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => setCategoriaActiva(esBebida ? "BEBIDAS" : null)}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                    <ChevronLeft size={22} className="text-gray-800" />
                </button>
                <Icon size={18} className="text-red-600 shrink-0" />
                <h1 className="font-black text-xl text-black tracking-tight">{categoriaActiva}</h1>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={categoriaActiva}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22 }}
                    className="px-5 py-5 pb-16"
                >
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productos.map((i) => (
                            <div
                                key={i._id}
                                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                {i.imagen && (
                                    <div className="relative h-44 w-full overflow-hidden">
                                        <MenuImg
                                            src={i.imagen}
                                            alt={i.nombre}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-bold text-base text-black leading-tight mb-1">{i.nombre}</h3>
                                    {i.descripcion && (
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{i.descripcion}</p>
                                    )}
                                    <span className="inline-block bg-red-50 text-red-600 font-extrabold text-sm px-3 py-1 rounded-full">
                                        ${formatPrice(i.precio)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
