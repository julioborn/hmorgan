"use client";
import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    BottleWine, Milk, CupSoda, Martini, GlassWater, Beaker,
    CakeSlice, Hamburger, ChevronDown, ChevronUp, ChevronLeft,
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
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];

const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg",
    PIZZAS: "/pizzas.jpg",
    HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg",
    PICADAS: "/picada.jpg",
    ENSALADAS: "/ensaladas.jpg",
    FRITURAS: "/picada.jpg",
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

export default function AdminMenuPage() {
    const { data: items, mutate } = useSWR<MenuItem[]>("/api/menu", fetcher);
    const [nuevo, setNuevo] = useState<Partial<MenuItem>>({ nombre: "", descripcion: "", precio: 0, categoria: "" });
    const [editando, setEditando] = useState<MenuItem | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [selectCat, setSelectCat] = useState("");

    async function agregarItem() {
        await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevo),
        });
        mutate();
        setNuevo({ nombre: "", descripcion: "", precio: 0, categoria: "" });
        setSelectCat("");
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

    if (!items) return <div className="p-12 flex justify-center"><Loader size={40} /></div>;

    const formatNumber = (value: number | string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-AR").format(Number(value));
    };

    const catDbImage = (cat: string) => items.find((i) => i.categoria === cat && i.imagen)?.imagen ?? null;
    const getImage = (cat: string) => categoryImages[cat] || catDbImage(cat);

    const categoriasNavegacion = MAIN_ORDER.filter(cat => {
        if (cat === "BEBIDAS") return BEBIDAS_CATS.some(bc => items.some(i => i.categoria === bc));
        return items.some(i => i.categoria === cat);
    });

    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const Icon = categoryIcons[cat] || UtensilsCrossed;
        const bg = getImage(cat);
        const allItems = items ?? [];
        const count = cat === "BEBIDAS"
            ? allItems.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : allItems.filter(i => i.categoria === cat).length;
        return (
            <motion.button
                onClick={onClick}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative w-full h-32 rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-transform text-left"
            >
                {bg ? (
                    <img src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
                    <Icon size={26} className="text-gray-800" />
                </div>
                <div className="absolute left-[88px] bottom-5 right-5">
                    <p className="text-white font-black text-lg tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-xs font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    /* ── Main categories view ── */
    if (!categoriaActiva) {
        return (
            <div className="bg-white min-h-screen">
                <div className="px-5 pt-6 pb-4">
                    <h1 className="text-3xl font-black text-black tracking-tight mb-1">Menú</h1>
                    <p className="text-sm text-gray-400">Elegí una categoría para editar</p>
                </div>

                <div className="mx-5 mb-5 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
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
                                <input className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Nombre" value={nuevo.nombre || ""}
                                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
                                <input className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Precio" type="text"
                                    value={nuevo.precio ? new Intl.NumberFormat("es-AR").format(nuevo.precio) : ""}
                                    onChange={(e) => { const raw = e.target.value.replace(/\./g, ""); setNuevo({ ...nuevo, precio: parseFloat(raw) || 0 }); }} />
                                <select
                                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-500"
                                    value={selectCat}
                                    onChange={(e) => {
                                        setSelectCat(e.target.value);
                                        if (e.target.value !== "__nueva__") {
                                            setNuevo({ ...nuevo, categoria: e.target.value });
                                        } else {
                                            setNuevo({ ...nuevo, categoria: "" });
                                        }
                                    }}
                                >
                                    <option value="">Seleccioná una categoría</option>
                                    {[...new Set(items.map(i => i.categoria))].sort().map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="__nueva__">+ Nueva categoría...</option>
                                </select>
                            </div>
                            {selectCat === "__nueva__" && (
                                <input
                                    className="rounded-xl border border-red-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Nombre de la nueva categoría (ej: PASTAS)"
                                    value={nuevo.categoria || ""}
                                    onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value.toUpperCase() })}
                                />
                            )}
                            <textarea className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Descripción" value={nuevo.descripcion || ""}
                                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
                            <div className="flex justify-end">
                                <button onClick={agregarItem} className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition">
                                    Agregar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 pb-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoriasNavegacion.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── BEBIDAS subcategories view ── */
    if (categoriaActiva === "BEBIDAS") {
        const subCats = BEBIDAS_CATS.filter(bc => items.some(i => i.categoria === bc));
        return (
            <div className="bg-white min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setCategoriaActiva(null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ChevronLeft size={22} className="text-gray-800" />
                    </button>
                    <Beer size={18} className="text-red-600 shrink-0" />
                    <h1 className="font-black text-xl text-black tracking-tight">Bebidas</h1>
                </div>
                <div className="px-5 py-5 pb-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    const itemsCat = items.filter((i) => i.categoria === categoriaActiva);

    return (
        <div className="bg-white min-h-screen">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => { setCategoriaActiva(esBebida ? "BEBIDAS" : null); setEditando(null); }}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                    <ChevronLeft size={22} className="text-gray-800" />
                </button>
                <CatIcon size={18} className="text-red-600 shrink-0" />
                <h1 className="font-black text-xl text-black tracking-tight">{categoriaActiva}</h1>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={categoriaActiva}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22 }}
                    className="px-5 py-5 pb-16 space-y-2"
                >
                    {itemsCat.map((i) => (
                        <div key={i._id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {editando?._id === i._id ? (
                                <div className="flex-1 flex flex-col md:flex-row gap-3">
                                    <input className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black flex-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                                    <textarea className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black flex-1 resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-red-500"
                                        value={editando.descripcion || ""} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
                                    <input className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-black w-full md:w-24 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        type="text" value={formatNumber(editando.precio)}
                                        onChange={(e) => setEditando({ ...editando, precio: parseFloat(e.target.value.replace(/\./g, "")) || 0 })} />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={guardarEdicion} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition">Guardar</button>
                                        <button onClick={() => setEditando(null)} className="px-3 py-2 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-100 transition">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="font-bold text-black">{i.nombre}</p>
                                        <p className="text-sm text-gray-600">{i.descripcion}</p>
                                        <p className="text-sm font-semibold text-red-600">${formatPrice(i.precio)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-700">
                                            <input type="checkbox" checked={i.activo} onChange={() => toggleActivo(i)} className="accent-red-600 w-4 h-4 cursor-pointer" />{" "}Pedidos
                                        </label>
                                    </div>
                                    {i.categoria === "COCKTAILS" && (
                                        <div className="flex-shrink-0">
                                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                                <input type="checkbox" checked={i.ruleta ?? false}
                                                    onChange={async (e) => {
                                                        await fetch(`/api/menu/${i._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...i, ruleta: e.target.checked }) });
                                                        mutate();
                                                    }} className="accent-red-600 w-4 h-4" />
                                                Ruleta
                                            </label>
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end flex-shrink-0">
                                        <button onClick={() => setEditando(i)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-100 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => eliminarItem(i._id)} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
