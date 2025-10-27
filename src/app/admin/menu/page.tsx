"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
    UtensilsCrossed,
    Pizza,
    Beef,
    Sandwich,
    Salad,
    Beer,
    BottleWine,
    Milk,
    CupSoda,
    Martini,
    GlassWater,
    Beaker,
    CakeSlice,
    Hamburger,
    ChevronDown,
    ChevronUp,
    ArrowUp,
} from "lucide-react";
import Loader from "@/components/Loader";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen?: string;
    activo: boolean;
    ruleta?: boolean;
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

export default function AdminMenuPage() {
    const { data: items, mutate } = useSWR<MenuItem[]>("/api/menu", fetcher);
    const [nuevo, setNuevo] = useState<Partial<MenuItem>>({
        nombre: "",
        descripcion: "",
        precio: 0,
        categoria: "",
    });
    const [editando, setEditando] = useState<MenuItem | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const refs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToCategory = (cat: string) => {
        refs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    async function agregarItem() {
        await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevo),
        });
        mutate();
        setNuevo({ nombre: "", descripcion: "", precio: 0, categoria: "" });
    }

    async function eliminarItem(id: string) {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
        await fetch(`/api/menu/${id}`, { method: "DELETE" });
        mutate();
    }

    async function guardarEdicion() {
        if (!editando) return;
        await fetch(`/api/menu/${editando._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editando),
        });
        setEditando(null);
        mutate();
    }

    async function toggleActivo(item: MenuItem) {
        await fetch(`/api/menu/${item._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, activo: !item.activo }),
        });
        mutate();
    }

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

    const formatNumber = (value: number | string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-AR").format(Number(value));
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 relative">
            {/* 🔝 Barra fija de navegación por categorías */}
            <div className="bg-white border-b border-gray-200 shadow-sm py-3 px-4 flex overflow-x-auto gap-4 rounded-xl mb-6">
                {categorias.map((cat) => {
                    const Icon = categoryIcons[cat] || UtensilsCrossed;
                    return (
                        <button
                            key={cat}
                            onClick={() => scrollToCategory(cat)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 transition whitespace-nowrap"
                        >
                            <Icon size={18} className="text-red-600" />
                            <span className="font-medium">{cat}</span>
                        </button>
                    );
                })}
            </div>

            {/* 🧾 Título principal */}
            <h1 className="text-3xl font-extrabold mb-8 text-black text-center md:text-left">
                Menú (Administración)
            </h1>

            {/* ➕ Formulario de agregado */}
            <div className="mb-10 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full flex items-center justify-between text-lg font-bold text-red-600 hover:text-red-700 transition"
                >
                    <span>Agregar producto</span>
                    {showForm ? <ChevronUp /> : <ChevronDown />}
                </button>

                {showForm && (
                    <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Nombre"
                                value={nuevo.nombre || ""}
                                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                            />
                            <input
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Precio"
                                type="text"
                                value={
                                    nuevo.precio ? new Intl.NumberFormat("es-AR").format(nuevo.precio) : ""
                                }
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, "");
                                    setNuevo({ ...nuevo, precio: parseFloat(raw) || 0 });
                                }}
                            />
                            <input
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Categoría"
                                value={nuevo.categoria || ""}
                                onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
                            />
                        </div>

                        <textarea
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Descripción"
                            value={nuevo.descripcion || ""}
                            onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={agregarItem}
                                className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 📂 Listado por categorías */}
            {categorias.map((cat) => {
                const Icon = categoryIcons[cat] || UtensilsCrossed;
                return (
                    <div key={cat} ref={(el) => {
                        refs.current[cat] = el;
                    }}
                        className="mb-10 scroll-mt-24">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black border-b border-gray-200 pb-1">
                            <Icon size={22} className="text-red-600" /> {cat}
                        </h2>

                        <div className="space-y-2">
                            {items
                                .filter((i) => i.categoria === cat)
                                .map((i) => (
                                    <div
                                        key={i._id}
                                        className="p-4 bg-white border border-gray-200 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        {editando?._id === i._id ? (
                                            <div className="flex-1 flex flex-col md:flex-row gap-3">
                                                <input
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black flex-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    value={editando.nombre}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, nombre: e.target.value })
                                                    }
                                                />
                                                <textarea
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black flex-1 resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    value={editando.descripcion || ""}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, descripcion: e.target.value })
                                                    }
                                                />
                                                <input
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-black w-full md:w-24 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    type="text"
                                                    value={formatNumber(editando.precio)}
                                                    onChange={(e) =>
                                                        setEditando({
                                                            ...editando,
                                                            precio:
                                                                parseFloat(e.target.value.replace(/\./g, "")) || 0,
                                                        })
                                                    }
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={guardarEdicion}
                                                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditando(null)}
                                                        className="px-3 py-2 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-100 transition"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1">
                                                    <p className="font-bold text-black">{i.nombre}</p>
                                                    <p className="text-sm text-gray-600">{i.descripcion}</p>
                                                    <p className="text-sm font-semibold text-red-600">
                                                        ${formatPrice(i.precio)}
                                                    </p>
                                                </div>

                                                {/* Toggle activo */}
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={i.activo}
                                                            onChange={() => toggleActivo(i)}
                                                            className="accent-red-600 w-4 h-4 cursor-pointer"
                                                        />{" "}
                                                        Pedidos
                                                    </label>
                                                </div>

                                                {/* Ruleta solo para cócteles */}
                                                {i.categoria === "COCKTAILS" && (
                                                    <div className="flex-shrink-0">
                                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={i.ruleta ?? false}
                                                                onChange={async (e) => {
                                                                    await fetch(`/api/menu/${i._id}`, {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            ...i,
                                                                            ruleta: e.target.checked,
                                                                        }),
                                                                    });
                                                                    mutate();
                                                                }}
                                                                className="accent-red-600 w-4 h-4"
                                                            />
                                                            Ruleta
                                                        </label>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 justify-end flex-shrink-0">
                                                    <button
                                                        onClick={() => setEditando(i)}
                                                        className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-100 transition"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarItem(i._id)}
                                                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            })}

            {/* 🔺 Botón flotante volver arriba */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-16 right-6 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 transition"
                    aria-label="Volver arriba"
                >
                    <ArrowUp size={22} />
                </button>
            )}
        </div>
    );
}
