"use client";
import { useState, useEffect } from "react";
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
    Wine,
    Coffee,
    GlassWater,
    CakeSlice,
    Hamburger,
    BottleWine,
    Beaker,
    Grape,
    ArrowUp,
    Milk,
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

    useEffect(() => {
        const handleScroll = () => setShowScroll(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll);
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

    return (
        <div className="p-3 relative">
            <h1 className="text-4xl font-extrabold mb-10 text-center tracking-tight bg-white bg-clip-text text-transparent">
                Menú
            </h1>

            {/* Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
                {categorias.map((cat: string) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    return (
                        <a
                            key={cat}
                            href={`#${cat.replace(/\s+/g, "-")}`}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md
                         bg-gradient-to-br from-emerald-600/20 to-slate-800/40
                         hover:from-emerald-600/40 hover:to-slate-800/60
                         hover:scale-105 transition-all duration-200 text-center"
                        >
                            <Icon size={36} className="mb-2 text-emerald-400" />
                            <span className="text-sm font-semibold tracking-wide">{cat}</span>
                        </a>
                    );
                })}
            </div>

            {/* Productos */}
            {categorias.map((cat: string) => {
                const Icon = categoryIcons[cat] || UtensilsCrossed;
                return (
                    <div key={cat} id={cat.replace(/\s+/g, "-")} className="mb-12 scroll-mt-20">
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                            <Icon size={26} className="text-emerald-400" />
                            {cat}
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items
                                .filter((i) => i.categoria === cat)
                                .map((i) => (
                                    <div
                                        key={i._id}
                                        className="group bg-white/5 rounded-2xl overflow-hidden shadow hover:shadow-emerald-500/10
                               transition-all duration-200 hover:scale-[1.02] border border-white/10"
                                    >
                                        {i.imagen && (
                                            <div className="relative h-40 w-full overflow-hidden">
                                                <img
                                                    src={i.imagen}
                                                    alt={i.nombre}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h3 className="text-lg font-bold mb-1">{i.nombre}</h3>
                                            {i.descripcion && (
                                                <p className="text-sm opacity-75 mb-2">{i.descripcion}</p>
                                            )}
                                            <p className="text-emerald-400 font-extrabold text-lg">
                                                ${formatPrice(i.precio)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            })}

            {/* Botón flotante */}
            {showScroll && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-6 right-6 p-4 rounded-full bg-emerald-600 text-white
                     shadow-lg shadow-emerald-600/30 backdrop-blur hover:bg-emerald-500 transition"
                >
                    <ArrowUp size={24} />
                </button>
            )}
        </div>
    );
}
