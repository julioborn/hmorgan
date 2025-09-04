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

    // Mostrar botón al hacer scroll
    useEffect(() => {
        const handleScroll = () => {
            setShowScroll(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!items) return <p className="p-6 text-center">Cargando menú...</p>;

    const categorias: string[] = Object.keys(categoryIcons).filter((cat) =>
        items.some((i) => i.categoria === cat)
    );

    return (
        <div className="p-3 relative">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center bg-white bg-clip-text text-transparent tracking-wide relative">
                Menú
            </h1>

            {/* Categorías como cuadros */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {categorias.map((cat: string) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    return (
                        <a
                            key={cat}
                            href={`#${cat.replace(/\s+/g, "-")}`}
                            className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-xl shadow hover:bg-emerald-600 hover:text-white transition text-center"
                        >
                            <Icon size={32} className="mb-2" />
                            <span className="text-sm font-medium">{cat}</span>
                        </a>
                    );
                })}
            </div>

            {/* Productos agrupados por categoría */}
            {categorias.map((cat: string) => (
                <div
                    key={cat}
                    id={cat.replace(/\s+/g, "-")}
                    className="mb-10 scroll-mt-20"
                >
                    <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">
                        {cat}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {items
                            .filter((i) => i.categoria === cat)
                            .map((i) => (
                                <div
                                    key={i._id}
                                    className="bg-white/10 backdrop-blur p-4 rounded-xl shadow hover:scale-105 transition"
                                >
                                    {i.imagen && (
                                        <img
                                            src={i.imagen}
                                            alt={i.nombre}
                                            className="w-full h-40 object-cover rounded-md mb-3"
                                        />
                                    )}
                                    <h3 className="text-lg font-bold">{i.nombre}</h3>
                                    {i.descripcion && (
                                        <p className="text-sm opacity-80 line-clamp-2">
                                            {i.descripcion}
                                        </p>
                                    )}
                                    <p className="mt-2 text-emerald-400 font-bold">
                                        ${formatPrice(i.precio)}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            ))}

            {/* Botón flotante "Volver arriba" */}
            {showScroll && (
                <button
                    onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="fixed bottom-6 right-6 p-3 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 transition"
                >
                    <ArrowUp size={24} />
                </button>
            )}
        </div>
    );
}
