"use client";
import useSWR from "swr";
import { useState } from "react";
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
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen?: string;
    activo: boolean;
};

// Función para formatear precios al estilo argentino
const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);

// Íconos por categoría
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

    if (!items) return <p className="p-6">Cargando menú...</p>;

    // Categorías en orden según categoryIcons
    const categorias: string[] = Object.keys(categoryIcons).filter((cat) =>
        items.some((i) => i.categoria === cat)
    );

    const formatNumber = (value: number | string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-AR").format(Number(value));
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Menú (Administración)</h1>

            {/* Formulario para agregar */}
            <div className="mb-10 bg-white/5 rounded-lg p-6 shadow-md">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full flex items-center justify-between text-md font-bold text-emerald-400 hover:text-emerald-300 transition"
                >
                    <span>Agregar Producto</span>
                    {showForm ? "−" : "+"}
                </button>

                {showForm && (
                    <div className="mt-6">
                        {/* Primera fila: Nombre - Precio - Categoría */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input
                                className="bg-slate-800 border border-slate-600 text-slate-100 
                       placeholder-slate-400 px-3 py-2 rounded 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Nombre"
                                value={nuevo.nombre || ""}
                                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                            />
                            <input
                                className="bg-slate-800 border border-slate-600 text-slate-100 
                       placeholder-slate-400 px-3 py-2 rounded 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Precio"
                                type="text"
                                value={nuevo.precio ? new Intl.NumberFormat("es-AR").format(nuevo.precio) : ""}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, "");
                                    setNuevo({ ...nuevo, precio: parseFloat(raw) || 0 });
                                }}
                            />
                            <input
                                className="bg-slate-800 border border-slate-600 text-slate-100 
                       placeholder-slate-400 px-3 py-2 rounded 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Categoría"
                                value={nuevo.categoria || ""}
                                onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
                            />
                        </div>

                        {/* Segunda fila: Descripción */}
                        <div className="mb-4">
                            <textarea
                                className="w-full bg-slate-800 border border-slate-600 text-slate-100 
                       placeholder-slate-400 px-3 py-2 rounded min-h-[80px] 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Descripción"
                                value={nuevo.descripcion || ""}
                                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                            />
                        </div>

                        {/* Botón */}
                        <div className="flex justify-end">
                            <button
                                onClick={agregarItem}
                                className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-500"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Listado por categorías */}
            {categorias.map((cat) => {
                const Icon = categoryIcons[cat] || UtensilsCrossed;
                return (
                    <div key={cat} className="mb-8">
                        <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-1 flex items-center gap-2">
                            <Icon size={20} /> {cat}
                        </h2>
                        <div className="space-y-2">
                            {items
                                .filter((i) => i.categoria === cat)
                                .map((i) => (
                                    <div
                                        key={i._id}
                                        className="p-3 bg-white/5 rounded flex justify-between items-center"
                                    >
                                        {editando?._id === i._id ? (
                                            <div className="flex-1 flex flex-col md:flex-row gap-2">
                                                <input
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 
                                                    placeholder-slate-400 px-2 py-1 rounded flex-1"
                                                    value={editando.nombre}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, nombre: e.target.value })
                                                    }
                                                />
                                                <textarea
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 
                                                    placeholder-slate-400 px-2 py-2 rounded flex-1 resize-y min-h-[40px] md:min-h-[60px]"
                                                    value={editando.descripcion || ""}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, descripcion: e.target.value })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 
                                                    placeholder-slate-400 px-2 py-1 rounded w-full md:w-24 text-right"
                                                    type="text"
                                                    value={formatNumber(editando.precio)}
                                                    onChange={(e) =>
                                                        setEditando({
                                                            ...editando,
                                                            precio: parseFloat(e.target.value.replace(/\./g, "")) || 0,
                                                        })
                                                    }
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={guardarEdicion}
                                                        className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditando(null)}
                                                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="font-bold">{i.nombre}</p>
                                                    <p className="text-sm opacity-70">{i.descripcion}</p>
                                                    <p className="text-sm text-emerald-400">
                                                        ${formatPrice(i.precio)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditando(i)}
                                                        className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarItem(i._id)}
                                                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500"
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
        </div>
    );
}
