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

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Menú (Admin)</h1>

            {/* Formulario para agregar */}
            <div className="mb-10 flex flex-wrap gap-2">
                <input
                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nombre"
                    value={nuevo.nombre || ""}
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                />
                <input
                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Descripción"
                    value={nuevo.descripcion || ""}
                    onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                />
                <input
                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 w-28"
                    placeholder="Precio"
                    type="number"
                    value={nuevo.precio || 0}
                    onChange={(e) => setNuevo({ ...nuevo, precio: parseFloat(e.target.value) })}
                />
                <input
                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Categoría"
                    value={nuevo.categoria || ""}
                    onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
                />
                <button
                    onClick={agregarItem}
                    className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500"
                >
                    Agregar
                </button>
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
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-2 py-1 rounded flex-1"
                                                    value={editando.nombre}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, nombre: e.target.value })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-2 py-1 rounded flex-1"
                                                    value={editando.descripcion || ""}
                                                    onChange={(e) =>
                                                        setEditando({ ...editando, descripcion: e.target.value })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 px-2 py-1 rounded w-24"
                                                    type="number"
                                                    value={editando.precio}
                                                    onChange={(e) =>
                                                        setEditando({
                                                            ...editando,
                                                            precio: parseFloat(e.target.value),
                                                        })
                                                    }
                                                />
                                                <button
                                                    onClick={guardarEdicion}
                                                    className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditando(null)}
                                                    className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-500"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="font-bold">{i.nombre}</p>
                                                    <p className="text-sm opacity-70">{i.descripcion}</p>
                                                    <p className="text-sm text-emerald-400">
                                                        ${i.precio}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditando(i)}
                                                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarItem(i._id)}
                                                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500"
                                                    >
                                                        Eliminar
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
